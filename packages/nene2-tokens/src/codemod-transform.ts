/**
 * 語彙 codemod の jscodeshift transform（規約 05 §6.6 T-4 MUST — 実行物の本体）。
 *
 * 標準の jscodeshift transform 署名なので、同梱 CLI（`nene2-tokens codemod`）からも
 * 素の jscodeshift からも叩ける:
 *
 *   npx jscodeshift -t node_modules/@hideyukimori/nene2-tokens/dist/codemod-transform.js \
 *     --parser=tsx --theme=src/shared/ui/theme/themes/default.css --map=common src
 *
 * ## 出力方式（設計上の要点 — 施主/評議会の追認対象）
 *
 * AST は **書き換えない**。jscodeshift で「class 文字列がソースのどこに居るか」を特定し、
 * その **文字範囲だけを原文に差し戻す**（splice）。`root.toSource()` は使わない。理由:
 *
 *  - recast の printer は変更した StringLiteral を `options.quote` で**必ず引用符ごと刷り直す**
 *    （printer.js: `case "StringLiteral": return fromString(nodeStr(n.value, options))` —
 *    `extra.raw` は参照されない）。recast の quote 設定は 1 つしかなく JSX 属性にも同じ物が効く。
 *  - フリートの prettier は `singleQuote: true` かつ `jsxSingleQuote` 既定 false。つまり
 *    JS 文字列は `'…'`・JSX 属性は `"…"` が正。**どの quote 設定でも片方が必ず崩れる**（実測）。
 *  - splice なら引用符・空白・セミコロンに一切触れないので、入力が prettier 固定点なら
 *    出力も prettier 固定点のまま（T-1 の themegen と同じ流儀）。repo ごとに prettier 設定が
 *    割れている（payout は semi:false・本リポは semi:true）フリートで設定非依存になる。
 *  - 既マージの nene-payout#159 の diff は引用符が保存されている。splice はその diff を再現する。
 *
 * ## 走査対象
 *
 * 文字列リテラルと template literal の生チャンク。**className 属性に限定しない** —
 * payout 現物に `const base = 'block rounded-md px-inline-md …'` のような JSX 外の
 * class 文字列があり、限定すると取り漏らす（実測）。module specifier は除外する。
 */

import { readFileSync } from 'node:fs';
import type { API, FileInfo, Options, Transform } from 'jscodeshift';
import type { ASTPath } from 'jscodeshift';
import {
  CodemodError,
  applyRenames,
  buildPlan,
  buildRenameIndex,
  type CodemodPlan,
} from './codemod.js';
import type { MappingTableId } from './codemod-map.js';

export interface CodemodTransformOptions extends Options {
  /** 事前に組んだ計画（CLI からの in-process 実行用 — 毎ファイル再導出しない） */
  plan?: CodemodPlan;
  /** テーマ CSS のパス（素の jscodeshift から叩くとき用） */
  theme?: string;
  /** 写像表 ID（既定 common） */
  map?: MappingTableId;
}

/** 素の jscodeshift 実行時、テーマからの計画導出はプロセス内で 1 度きりにする。 */
const planCache = new Map<string, CodemodPlan>();

function resolvePlan(options: CodemodTransformOptions): CodemodPlan {
  if (options.plan) return options.plan;
  const theme = options.theme;
  if (typeof theme !== 'string' || theme.length === 0) {
    throw new CodemodError(
      'codemod requires a theme: pass --theme=<path to theme css> (the rename plan is derived from it — this transform invents no mappings)',
    );
  }
  const table: MappingTableId = options.map ?? 'common';
  const key = `${theme}\u0000${table}`;
  let plan = planCache.get(key);
  if (!plan) {
    let source: string;
    try {
      source = readFileSync(theme, 'utf8');
    } catch (e) {
      throw new CodemodError(`cannot read theme ${theme}: ${(e as Error).message} (fail-closed)`);
    }
    plan = buildPlan(source, table);
    planCache.set(key, plan);
  }
  return plan;
}

/** import/export の module specifier か（`'./px-inline-md'` を class と誤認しない）。 */
function isModuleSpecifier(path: ASTPath): boolean {
  const parent = path.parent?.node as { type?: string } | undefined;
  if (!parent?.type) return false;
  return (
    parent.type === 'ImportDeclaration' ||
    parent.type === 'ExportNamedDeclaration' ||
    parent.type === 'ExportAllDeclaration' ||
    parent.type === 'ImportExpression' ||
    parent.type === 'TSImportType' ||
    parent.type === 'TSExternalModuleReference'
  );
}

interface Edit {
  start: number;
  end: number;
  text: string;
}

interface Ranged {
  start?: number | null;
  end?: number | null;
}

export interface TransformResult {
  readonly text: string;
  /** 置換回数（CLI が M-1 用の実測値として報告する） */
  readonly count: number;
}

/**
 * 置換を適用した結果を返す（変更なしなら undefined = jscodeshift の「触っていない」表現）。
 * 公開して単体テスト・CLI から直接叩けるようにする。
 */
export function applyToSourceDetailed(
  source: string,
  j: API['jscodeshift'],
  index: ReadonlyMap<string, string>,
): TransformResult | undefined {
  if (index.size === 0) return undefined;
  const root = j(source);
  const edits: Edit[] = [];
  let count = 0;

  const spliceRange = (start: number | null | undefined, end: number | null | undefined): void => {
    if (typeof start !== 'number' || typeof end !== 'number' || end <= start) return;
    const original = source.slice(start, end);
    const applied = applyRenames(original, index);
    if (applied.count > 0) {
      edits.push({ start, end, text: applied.text });
      count += applied.count;
    }
  };

  // 文字列リテラルの中身（引用符の内側だけ — 引用符には触れない）
  root.find(j.StringLiteral).forEach((path) => {
    if (isModuleSpecifier(path)) return;
    const node = path.node as unknown as Ranged;
    if (typeof node.start !== 'number' || typeof node.end !== 'number') return;
    spliceRange(node.start + 1, node.end - 1);
  });

  // template literal の生チャンク（`${}` の外側の literal 部分のみ）
  root.find(j.TemplateElement).forEach((path) => {
    const node = path.node as unknown as Ranged;
    spliceRange(node.start, node.end);
  });

  if (edits.length === 0) return undefined;

  edits.sort((a, b) => a.start - b.start);
  let out = '';
  let cursor = 0;
  for (const edit of edits) {
    // AST 由来の範囲は入れ子にならない（StringLiteral と TemplateElement は互いに素）
    if (edit.start < cursor) continue;
    out += source.slice(cursor, edit.start) + edit.text;
    cursor = edit.end;
  }
  out += source.slice(cursor);
  return { text: out, count };
}

/** `applyToSourceDetailed` の文字列版（jscodeshift transform の戻り値そのもの）。 */
export function applyToSource(
  source: string,
  j: API['jscodeshift'],
  index: ReadonlyMap<string, string>,
): string | undefined {
  return applyToSourceDetailed(source, j, index)?.text;
}

const transform: Transform = (file: FileInfo, api: API, options: CodemodTransformOptions) => {
  const plan = resolvePlan(options);
  const index = buildRenameIndex(plan);
  return applyToSource(file.source, api.jscodeshift, index);
};

export default transform;

/** jscodeshift に tsx パーサを使わせる（`.ts`/`.tsx` 両方を 1 本で扱う）。 */
export const parser = 'tsx';
