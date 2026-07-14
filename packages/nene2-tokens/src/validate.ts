/**
 * validate:themes — 第5の強制レイヤ（スキーマ検査）。TH-07 / AM-1 / AM-4 / AM-6。
 *
 * fail-closed: 検査不能（構文不明・評価不能・悬空・循環）は全て error。
 * 空虚合格を出さない（G-6）。
 */

import {
  CONTRACT_TOKENS,
  CONTRACT_VERSION,
  CONTRAST_PAIRS,
  EXCLUDED_NAMESPACES,
  ORDINAL_SUFFIX_PATTERN,
  RESERVED_TOKEN_NAMES,
  SYNONYM_BANS,
  isContractTokenName,
  isExtensionTokenName,
} from './contract.js';
import { ColorEvalError, contrastRatio } from './color.js';
import { GrammarError, parseTokenValue, type ParsedValue } from './grammar.js';
import { parseThemeFile, isRootScopeSelector, type Block } from './parser.js';
import { resolveBlock, transitiveDependents } from './resolve.js';
import { computeFillForScope } from './themegen.js';

export interface Diagnostic {
  severity: 'error' | 'warning';
  rule: string;
  file: string;
  line?: number;
  message: string;
}

export interface ValidateOptions {
  /** serve/suite stage1 の :root ラッパ＋widget スコープセレクタを受理（R2⑩ --container） */
  container?: boolean;
  /** --container 時に root 扱いする widget スコープセレクタ（例 '.nene-widget-root'） */
  containerSelector?: string;
  /** 局所スコープ単独ファイル（scoped-themes 台帳登録分）の親ブランドテーマ CSS ソース */
  parentSource?: string;
}

export interface ValidateResult {
  file: string;
  diagnostics: Diagnostic[];
  ok: boolean;
}

const REPAIR_FILL = (file: string) => `repair: npx nene2-tokens fill ${file}`;

function declMap(block: Block): Map<string, string> {
  const m = new Map<string, string>();
  for (const d of block.decls) m.set(d.name, d.value);
  return m;
}

export function validateThemeSource(
  file: string,
  source: string,
  opts: ValidateOptions = {},
): ValidateResult {
  const diagnostics: Diagnostic[] = [];
  const error = (rule: string, message: string, line?: number) =>
    diagnostics.push({
      severity: 'error',
      rule,
      file,
      message,
      ...(line !== undefined ? { line } : {}),
    });
  const warn = (rule: string, message: string, line?: number) =>
    diagnostics.push({
      severity: 'warning',
      rule,
      file,
      message,
      ...(line !== undefined ? { line } : {}),
    });

  const parsed = parseThemeFile(source);

  // 0. 構造（token-only 文法）
  for (const e of parsed.errors) error('structure', e.message, e.line);

  // 1. 契約版プラグマ（AM-1: 欠落 error・outdated は broken と区別して警告）
  if (!parsed.pragma) {
    error(
      'pragma',
      `missing contract pragma '/* @nene2-contract ${CONTRACT_VERSION} @themegen <ver> */' — theme files are themegen-managed (handwriting the pragma is prohibited; run themegen)`,
    );
  } else if (parsed.pragma.contract !== CONTRACT_VERSION) {
    const declared = Number.parseFloat(parsed.pragma.contract);
    const latest = Number.parseFloat(CONTRACT_VERSION);
    if (Number.isFinite(declared) && declared < latest) {
      warn(
        'outdated',
        `contract ${parsed.pragma.contract} < latest ${CONTRACT_VERSION} (outdated, not broken) — repair: npx nene2-tokens fill --upgrade ${file}`,
        parsed.pragma.line,
      );
    } else {
      error(
        'pragma',
        `contract version '${parsed.pragma.contract}' is unknown to this validator (latest: ${CONTRACT_VERSION}) — fail-closed`,
        parsed.pragma.line,
      );
    }
  }

  // 2. @theme inline（TH-04 MUST NOT）
  if (parsed.themeInline) {
    error(
      'theme-inline',
      '@theme inline is prohibited (silent freeze: values are baked into utilities and [data-theme] overrides become dead code — R2⑥(A))',
    );
  }

  // 3. ブロック台帳
  const themeBlocks = parsed.blocks.filter((b) => b.kind === 'theme' && b.selector === '@theme');
  const containerBlocks = parsed.blocks.filter((b) => b.kind === 'container');
  if (themeBlocks.length > 1)
    error('structure', `more than one @theme block (${themeBlocks.length})`);
  if (containerBlocks.length > 0 && !opts.container) {
    error(
      'container',
      ':root wrapper found — only accepted with --container (serve/suite stage1 / widget themes)',
      containerBlocks[0]!.line,
    );
  }
  const rootBlock: Block | undefined =
    themeBlocks[0] ?? (opts.container ? containerBlocks[0] : undefined);

  // 4. 宣言の名前検査＋値の閉文法（全ブロック）
  const parsedDecls = new Map<Block, Map<string, ParsedValue>>();
  for (const block of parsed.blocks) {
    const map = new Map<string, ParsedValue>();
    parsedDecls.set(block, map);
    for (const d of block.decls) {
      // 予約語（TK-03）
      if ((RESERVED_TOKEN_NAMES as readonly string[]).includes(d.name)) {
        error(
          'reserved-name',
          `'${d.name}' is reserved — the brand role name is 'accent' (R2⑥(B); origin --color-primary is a rename target)`,
          d.line,
        );
        continue;
      }
      // 除外名前空間（R2⑥(A) B2）
      if (EXCLUDED_NAMESPACES.some((ns) => d.name.startsWith(ns))) {
        error(
          'excluded-namespace',
          `'${d.name}' — the --breakpoint-*/--container-* namespace is excluded from the theme contract (silent media-query failure, Case D)`,
          d.line,
        );
        continue;
      }
      const isX = isExtensionTokenName(d.name);
      if (!isX && !isContractTokenName(d.name)) {
        // 名前パターン（契約語彙の設計に対する検査 — x- 拡張には適用しない）
        const synonym = SYNONYM_BANS.find((s) => s.pattern.test(d.name));
        if (synonym) {
          error('synonym-ban', `'${d.name}': ${synonym.message}`, d.line);
          continue;
        }
        if (ORDINAL_SUFFIX_PATTERN.test(d.name)) {
          error(
            'ordinal-suffix',
            `'${d.name}': ordinal suffixes are prohibited — express strength with -muted / -faint vocabulary (R2⑥(B))`,
            d.line,
          );
          continue;
        }
        error(
          'contract-vocabulary',
          `'${d.name}' is neither a contract v1 token nor a declared extension token (--<cat>-x-<name>) — TK-03`,
          d.line,
        );
        continue;
      }
      // 値の閉文法（TK-04）
      try {
        const pv = parseTokenValue(d.name, d.value);
        map.set(d.name, pv);
        for (const ref of pv.refs) {
          if (EXCLUDED_NAMESPACES.some((ns) => ref.startsWith(ns))) {
            error(
              'excluded-namespace',
              `var(${ref}) — referencing the --breakpoint-*/--container-* namespace is prohibited (emits invalid CSS with no error — Case D)`,
              d.line,
            );
          }
        }
      } catch (e) {
        if (e instanceof GrammarError) error('grammar', `${d.name}: ${e.message}`, d.line);
        else throw e;
      }
    }
  }

  // 5. parity（ブランドテーマ = root ブロックを持つファイルのみ）
  if (rootBlock) {
    const declared = new Set(rootBlock.decls.map((d) => d.name));
    const missing = CONTRACT_TOKENS.names.filter((n) => !declared.has(n));
    if (missing.length > 0) {
      error(
        'parity',
        `contract v${CONTRACT_VERSION} keys missing from ${rootBlock.selector} block (${missing.length}): ${missing.join(', ')} — ${REPAIR_FILL(file)}`,
        rootBlock.line,
      );
    }
  }

  // 6. 悬空参照（同一ファイル内解決 — root は root 内・スコープは root∪スコープ）
  const rootDecls = rootBlock ? declMap(rootBlock) : new Map<string, string>();
  let parentDecls = new Map<string, string>();
  if (opts.parentSource !== undefined) {
    const parent = parseThemeFile(opts.parentSource);
    const parentRoot = parent.blocks.find((b) => b.kind === 'theme' || b.kind === 'container');
    if (!parentRoot) {
      error('parent', '--parent file has no @theme/:root block — fail-closed');
    } else {
      parentDecls = declMap(parentRoot);
    }
  }
  for (const block of parsed.blocks) {
    const local = declMap(block);
    const visible = new Set([
      ...parentDecls.keys(),
      ...rootDecls.keys(),
      ...(block === rootBlock ? [] : local.keys()),
    ]);
    for (const d of block.decls) {
      const pv = parsedDecls.get(block)?.get(d.name);
      if (!pv) continue;
      for (const ref of pv.refs) {
        if (!visible.has(ref)) {
          error(
            'dangling-ref',
            `${d.name}: var(${ref}) does not resolve within this file — dangling reference (TK-04)`,
            d.line,
          );
        }
      }
    }
  }

  // 7. 参照クロージャ（AM-4: 全トークン参照グラフ・局所スコープのみ FAIL）
  const baseDecls = new Map([...parentDecls, ...rootDecls]);
  const baseParsed = new Map<string, { refs: Set<string> }>();
  for (const [name, value] of baseDecls) {
    try {
      baseParsed.set(name, parseTokenValue(name, value));
    } catch {
      /* grammar error already reported (or lives in parent = 親ファイル自身の validate で報告) */
    }
  }
  const graph = new Map<string, Set<string>>();
  for (const [name, pv] of baseParsed) graph.set(name, pv.refs);
  for (const block of parsed.blocks) {
    if (block === rootBlock) continue;
    if (block.kind !== 'scope') continue;
    if (isRootScopeSelector(block.selector, opts.containerSelector)) continue; // root スコープ: 連鎖は自動追従 = PASS
    const local = declMap(block);
    for (const overridden of local.keys()) {
      const dependents = transitiveDependents(graph, overridden);
      for (const dep of dependents) {
        if (!local.has(dep)) {
          error(
            'closure',
            `local scope '${block.selector}' overrides '${overridden}' but dependent '${dep}' is not redeclared in the scope — stale chained value would leak (TH-06 W-5). ${REPAIR_FILL(file)}`,
            block.line,
          );
        }
      }
    }
  }

  // 8. fill 再生成比較（F-1: 決定的に再計算して比較・不一致 FAIL）
  const fillBase = new Map([...parentDecls, ...rootDecls]);
  if (fillBase.size > 0) {
    for (const block of parsed.blocks) {
      if (block === rootBlock || block.kind !== 'scope') continue;
      if (isRootScopeSelector(block.selector, opts.containerSelector)) continue;
      const authored = new Map(
        block.decls.filter((d) => d.region === 'authored').map((d) => [d.name, d.value]),
      );
      const actualFill = block.decls.filter((d) => d.region === 'fill');
      const expected = computeFillForScope(fillBase, authored);
      const actualMap = new Map(actualFill.map((d) => [d.name, d.value]));
      const mismatch =
        expected.size !== actualMap.size || [...expected].some(([n, v]) => actualMap.get(n) !== v);
      if (mismatch) {
        error(
          'fill',
          `fill region of '${block.selector}' does not match deterministic regeneration (${expected.size} expected / ${actualMap.size} present) — ${REPAIR_FILL(file)}`,
          block.line,
        );
      }
    }
  }

  // 9. WCAG AA コントラスト（ペア表 v1 — 検査不能は fail-closed）
  const checkPairs = (decls: Map<string, string>, label: string, requireAll: boolean) => {
    const resolver = resolveBlock(decls);
    for (const pair of CONTRAST_PAIRS) {
      const fgName = `--color-${pair.fg}`;
      const bgName = `--color-${pair.bg}`;
      if (!decls.has(fgName) || !decls.has(bgName)) {
        if (requireAll) {
          error(
            'contrast',
            `${label}: pair ${pair.fg}/${pair.bg} not checkable (token missing) — fail-closed`,
          );
        } else {
          warn(
            'contrast-unchecked',
            `${label}: pair ${pair.fg}/${pair.bg} not declared in this scope — checked against parent theme only if --parent is given`,
          );
        }
        continue;
      }
      try {
        const fg = resolver.resolveColor(fgName);
        const bg = resolver.resolveColor(bgName);
        const value = contrastRatio(fg, bg);
        if (value < pair.min) {
          error(
            'contrast',
            `${label}: ${pair.fg} on ${pair.bg} = ${value.toFixed(2)}:1 < ${pair.min}:1 (WCAG AA, ${pair.kind}) — fix the authored value, not the generated fill`,
          );
        }
      } catch (e) {
        if (e instanceof ColorEvalError || e instanceof GrammarError) {
          error(
            'contrast',
            `${label}: pair ${pair.fg}/${pair.bg} not statically evaluable — ${e.message} (fail-closed)`,
          );
        } else throw e;
      }
    }
  };
  if (rootBlock && rootBlock.decls.length > 0) {
    const parityOk = CONTRACT_TOKENS.names.every((n) => rootDecls.has(n));
    if (parityOk) checkPairs(new Map([...parentDecls, ...rootDecls]), rootBlock.selector, true);
    // parity 欠落時は parity error が既に出ている（重ねて contrast error を量産しない）
  }
  for (const block of parsed.blocks) {
    if (block === rootBlock || block.kind !== 'scope') continue;
    const merged = new Map([...parentDecls, ...rootDecls, ...declMap(block)]);
    const complete = CONTRACT_TOKENS.names.every((n) => merged.has(n));
    checkPairs(merged, block.selector, complete);
  }

  return { file, diagnostics, ok: !diagnostics.some((d) => d.severity === 'error') };
}
