/**
 * `nene2-check init --scan` — 許可リスト / legacy manifest 初期値の走査生成
 * （規約 05 §6.6 T-3・会議R4 AM-10・R5 決定 = AM-10 の「人間の記憶力で列挙値を決めない」）。
 *
 * - 生成はゲート導入 PR の一度きり: 対象台帳（同一 repo・同一 kind のエントリ）が既存なら
 *   **実行拒否**（R5: ラチェット一周リセットの禁止）。
 * - `--check` は読み取り専用の再走査 — 未分類 selector / 未登録ファイルを報告する
 *   （conformance styling green 条件「再走査で未分類 selector 0」の入力）。
 * - maxLines は pinned prettier 整形後の行数（AM-14/AM-25' — 整形非決定下の行数に正準性はない）・
 *   maxBytes はソース実バイト数。
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import baseStylelintConfig from '../stylelint/index.js';
import stylelintPlugins from '../stylelint/plugin.js';
import { classTokens, layerParamsInclude } from '../stylelint/helpers.js';
import type {
  ComponentsAllowlistEntry,
  RegistriesDocument,
  RegistryEntry,
} from '../registries/schema.js';
import { enumerateStyleSources } from './scan-coverage.js';

export interface InitScanResult {
  /** @layer components 内の class トークン（完全一致列挙の初期値） */
  allowedClasses: string[];
  /** legacy manifest 初期値（テーマ正準配置・index.css 以外の css） */
  legacyManifest: Array<{ path: string; maxLines: number; maxBytes: number }>;
  /** (rule,file) 別の構造ルール違反件数（P2-A4 — lint-baseline frozenCount の実測初期値） */
  lintBaselines: Array<{ rule: string; file: string; frozenCount: number }>;
  /** 500行超の助言 warning（AM-25' — MUST ではない） */
  advisories: string[];
}

const CANONICAL_NON_LEGACY = [/^src\/shared\/ui\/theme\//, /^src\/index\.css$/];
const ADVISORY_LINES = 500;

/**
 * lint-baseline 集計から除外するルール（P2-A4 F1）。この2つは components-allowlist /
 * legacy-manifest kind が別途 seat 済み＝ (rule,file) baseline に入れると二重計上になる。
 */
const LINT_BASELINE_EXCLUDED_RULES = new Set<string>([
  'nene2/layer-components-allowlist',
  'nene2/layer-legacy-manifest-only',
]);

/**
 * (rule,file) 別に構造ルール違反を実測する（P2-A4）。base config を programmatic 実行し
 * （合成 config でなく＝allowlist は構造 warning を変えず・初回 scan の循環回避＝F2）、
 * seat 済みルール（F1 除外集合）以外の warning を (rule,file) で集計する。
 * plugin はモジュールパス文字列でなくオブジェクトを直接渡す（自己参照の解決を避ける）。
 * frozenCount>0 のもののみ返す（green は entry 0＝AM-14 と一貫・F4）。
 */
export async function scanLintBaselines(cwd: string): Promise<InitScanResult['lintBaselines']> {
  const sources = enumerateStyleSources(cwd).filter((p) => p.endsWith('.css'));
  if (sources.length === 0) return [];
  const stylelint = (await import('stylelint')).default;
  const runnable = { ...baseStylelintConfig, plugins: stylelintPlugins };
  const { results } = await stylelint.lint({
    files: sources.map((rel) => path.join(cwd, rel)),
    config: runnable,
  });
  const counts = new Map<string, number>();
  for (const r of results) {
    const rel = path.relative(cwd, r.source ?? '');
    for (const w of r.warnings) {
      if (!w.rule || LINT_BASELINE_EXCLUDED_RULES.has(w.rule)) continue;
      const key = `${w.rule}\t${rel}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([key, frozenCount]) => {
      const [rule, file] = key.split('\t');
      return { rule: rule ?? '', file: file ?? '', frozenCount };
    })
    .sort((a, b) => a.rule.localeCompare(b.rule) || a.file.localeCompare(b.file));
}

async function formattedLineCount(source: string): Promise<number> {
  // pinned prettier（workspace 同梱）で整形してから数える
  const prettier = await import('prettier');
  const formatted = await prettier.format(source, { parser: 'css' });
  return formatted.split('\n').filter((l) => l !== '').length;
}

export async function initScan(cwd: string): Promise<InitScanResult> {
  const postcss = (await import('postcss')).default;
  const sources = enumerateStyleSources(cwd).filter((p) => p.endsWith('.css'));
  const allowed = new Set<string>();
  const legacyManifest: InitScanResult['legacyManifest'] = [];
  const advisories: string[] = [];

  for (const rel of sources) {
    const abs = path.join(cwd, rel);
    const raw = readFileSync(abs);
    const text = raw.toString('utf8');

    // @layer components の class トークン収集（許可リスト初期値）
    try {
      const root = postcss.parse(text, { from: abs });
      root.walkAtRules('layer', (at) => {
        if (!layerParamsInclude(at.params, 'components')) return;
        at.walkRules((rule) => {
          for (const token of classTokens(rule.selector)) allowed.add(token);
        });
      });
    } catch (e) {
      advisories.push(`${rel}: CSS パース不能（手動確認が必要）: ${(e as Error).message}`);
      continue;
    }

    // legacy manifest 初期値（テーマ正準配置・エントリ css 以外）
    if (!CANONICAL_NON_LEGACY.some((re) => re.test(rel))) {
      const maxLines = await formattedLineCount(text);
      const entry = { path: rel, maxLines, maxBytes: raw.byteLength };
      legacyManifest.push(entry);
      if (maxLines > ADVISORY_LINES) {
        advisories.push(
          `${rel}: ${maxLines} 行 > ${ADVISORY_LINES}（助言的閾値 — AM-25'。ゲートではない）`,
        );
      }
    }
  }

  const lintBaselines = await scanLintBaselines(cwd);

  return {
    allowedClasses: [...allowed].sort(),
    legacyManifest,
    lintBaselines,
    advisories,
  };
}

/**
 * 走査結果を **registries エントリ**（貼れる正本形）に変換する（#65 Piece 3 — components-allowlist
 * kind の emit）。id を付与し `validateRegistries` を通る形にする（CLI が loose に吐いていた
 * `allowedClasses`/`legacyManifest` は id 欠落で registries-invalid だった）。
 * - components-allowlist: repo 単位で1エントリ（classes が非空のときのみ — 空なら entry を持たない）。
 * - legacy-manifest: ファイルごと1エントリ。
 * 値は走査実測（手書き列挙 MUST NOT — AM-10/G-7）。
 */
export function initScanEntries(scan: InitScanResult, repo: string): RegistryEntry[] {
  const slug = (s: string): string => s.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  const entries: RegistryEntry[] = [];
  if (scan.allowedClasses.length > 0) {
    entries.push({
      kind: 'components-allowlist',
      id: `${repo}-components-allowlist`,
      repo,
      classes: scan.allowedClasses,
    });
  }
  for (const e of scan.legacyManifest) {
    entries.push({
      kind: 'legacy-manifest',
      id: `${repo}-legacy-${slug(e.path)}`,
      repo,
      path: e.path,
      maxLines: e.maxLines,
      maxBytes: e.maxBytes,
    });
  }
  // lint-baseline: (rule,file) ごと1エントリ（frozenCount>0 のみ・走査実測＝手書き MUST NOT）。
  for (const lb of scan.lintBaselines) {
    entries.push({
      kind: 'lint-baseline',
      id: `${repo}-lb-${slug(lb.rule)}-${slug(lb.file)}`,
      repo,
      rule: lb.rule,
      file: lb.file,
      frozenCount: lb.frozenCount,
      initializedBy: 'init --scan',
    });
  }
  return entries;
}

/** 対象台帳が既存かどうか（既存なら init --scan は実行拒否 — T-3/R5）。 */
export function ledgersAlreadyInitialized(
  registries: RegistriesDocument,
  repo: string,
): { legacyManifest: boolean; componentsAllowlist: boolean; lintBaseline: boolean } {
  return {
    legacyManifest: registries.entries.some((e) => e.kind === 'legacy-manifest' && e.repo === repo),
    componentsAllowlist: registries.entries.some(
      (e) => e.kind === 'components-allowlist' && e.repo === repo,
    ),
    lintBaseline: registries.entries.some((e) => e.kind === 'lint-baseline' && e.repo === repo),
  };
}

export interface InitCheckReport {
  unregisteredClasses: string[];
  unregisteredLegacyFiles: string[];
}

/** `--check`（読み取り専用再走査）: 台帳との差分を報告する。 */
export async function initCheck(
  cwd: string,
  repo: string,
  registries: RegistriesDocument,
): Promise<InitCheckReport> {
  const scan = await initScan(cwd);
  const manifestPaths = new Set(
    registries.entries
      .filter((e) => e.kind === 'legacy-manifest' && e.repo === repo)
      .map((e) => (e as { path: string }).path),
  );
  // components-allowlist kind（#65）が正本台帳。登録済みクラスを引いた差分＝「未分類 selector」
  // （styling green 条件 = 未分類 0）。未登録 repo は台帳空＝全 class が未分類（fail-closed）。
  const registeredClasses = new Set(
    registries.entries
      .filter(
        (e): e is ComponentsAllowlistEntry => e.kind === 'components-allowlist' && e.repo === repo,
      )
      .flatMap((e) => e.classes),
  );
  return {
    unregisteredClasses: scan.allowedClasses.filter((c) => !registeredClasses.has(c)),
    unregisteredLegacyFiles: scan.legacyManifest
      .map((e) => e.path)
      .filter((p) => !manifestPaths.has(p)),
  };
}
