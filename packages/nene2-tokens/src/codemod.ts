/**
 * 語彙 codemod ランナー v1 — 配管のみ（#15 / 規約 05 §6.6 T-4 MUST）。
 *
 * **責務分界（最重要）**: このモジュールは *写像判断を一切持たない*。
 * 「どのトークンがどの契約名へ写るか」の正本は `codemod-map.ts` の
 * `CODEMOD_MAP_V1` / `mapTokenSet()` ただ一つ（versioned）。ここにあるのは
 *
 *   1. テーマ CSS の宣言済みトークン名を集める（parser.ts に委譲）
 *   2. その名前集合を `mapTokenSet()` に渡して rename 対を **機械導出** する
 *   3. トークン rename を **Tailwind v4 の namespace→utility 規則** で class rename へ翻訳する
 *   4. 単一パス・全パターン alternation の置換器を組む
 *
 * だけである。3 の表（`NAMESPACE_UTILITY_ROOTS`）は Tailwind の規則であって
 * NeNe 語彙の写像判断ではない — 新しい写像を発明したくなったら codemod-map.ts へ行くこと。
 *
 * 由来: nene-payout#159（W1 初弾）で使った使い捨て配管ドライバの恒久化。
 * T-4 が「使い捨てスクリプト化 MUST NOT」と言う以上、実行物はここ（配布物）に居るのが正しい。
 */

import {
  CODEMOD_MAP_VERSION,
  mapTokenSet,
  tailwindNamespaceOf,
  type MappingTableId,
} from './codemod-map.js';
import { parseThemeFile } from './parser.js';

/** ランナー名（M-1: 移行 PR 本文に「codemod 名・version」を書くための正本） */
export const CODEMOD_NAME = '@hideyukimori/nene2-tokens/codemod';

/** ランナーの版。写像表の版（CODEMOD_MAP_VERSION）とは独立に上げる。 */
export const CODEMOD_VERSION = '1.0.0';

/** codemod が失敗を報告する唯一の型（fail-closed — silent drop 禁止）。 */
export class CodemodError extends Error {}

export interface Rename {
  readonly from: string;
  readonly to: string;
}

/** class rename を機械導出できなかった token rename（silent skip 禁止 — 必ず報告する）。 */
export interface UnmappedRename {
  readonly from: string;
  readonly to: string;
  readonly reason: string;
}

export interface CodemodPlan {
  readonly codemod: string;
  readonly codemodVersion: string;
  /** 写像表の版（M-1 の PR 本文要件） */
  readonly mapVersion: string;
  readonly table: MappingTableId;
  /** テーマの `--x: …` 宣言から導出したトークン改名（`var(--x)` 参照の置換に使う） */
  readonly tokenRenames: readonly Rename[];
  /** トークン改名から Tailwind v4 規則で翻訳した utility class 改名 */
  readonly classRenames: readonly Rename[];
  /** class 翻訳不能だった token rename（namespace が変わる等）— 手当対象として開示する */
  readonly unmapped: readonly UnmappedRename[];
}

/**
 * Tailwind v4 の「namespace → その namespace のトークンを値に取る utility ルート」表。
 *
 * **これは Tailwind の規則であって NeNe 語彙の写像判断ではない**（責務分界の要）。
 * 網羅の出典は v4 docs の functional utilities。payout#159 の実弾ドライバの表を踏襲する。
 */
export const NAMESPACE_UTILITY_ROOTS: Readonly<Record<string, readonly string[]>> = {
  color: [
    'text',
    'bg',
    'border',
    'border-t',
    'border-r',
    'border-b',
    'border-l',
    'border-x',
    'border-y',
    'decoration',
    'divide',
    'outline',
    'ring',
    'ring-offset',
    'accent',
    'caret',
    'fill',
    'stroke',
    'shadow',
    'inset-shadow',
    'from',
    'via',
    'to',
    'placeholder',
  ],
  spacing: [
    'p',
    'px',
    'py',
    'pt',
    'pr',
    'pb',
    'pl',
    'ps',
    'pe',
    'm',
    'mx',
    'my',
    'mt',
    'mr',
    'mb',
    'ml',
    'ms',
    'me',
    'gap',
    'gap-x',
    'gap-y',
    'space-x',
    'space-y',
    'w',
    'h',
    'size',
    'min-w',
    'min-h',
    'max-w',
    'max-h',
    'inset',
    'inset-x',
    'inset-y',
    'top',
    'right',
    'bottom',
    'left',
    'start',
    'end',
    'translate-x',
    'translate-y',
    'scroll-m',
    'scroll-p',
    'indent',
    'basis',
  ],
  radius: [
    'rounded',
    'rounded-t',
    'rounded-r',
    'rounded-b',
    'rounded-l',
    'rounded-tl',
    'rounded-tr',
    'rounded-br',
    'rounded-bl',
    'rounded-s',
    'rounded-e',
    'rounded-ss',
    'rounded-se',
    'rounded-es',
    'rounded-ee',
  ],
  shadow: ['shadow', 'inset-shadow', 'text-shadow'],
  font: ['font'],
  // v4 は `--font-weight-*` からも `font-*` utility を生成する（`--font-*` の family と同じ
  // class ルートを共有する）。これが無いと `--font-weight-medium → --font-weight-x-medium` の
  // 改名に対応する `font-medium → font-x-medium` が導出されず、class だけ旧名で取り残されて
  // Tailwind 既定値へ無言フォールバックする（#17）。
  // 実測（4.3.2）: `--font-weight-x-medium` → `.font-x-medium { font-weight: … }`。
  // 注意: `--font-<k>` と `--font-weight-<k>` が同じキー k を持つと class が衝突する
  //（実測では family が勝つ）。その衝突は下の classIndex が fail-closed で検出する。
  'font-weight': ['font'],
};

/**
 * トークン名の namespace を返す（既知 v4 namespace を長い順に照合 → 失敗時は先頭セグメント）。
 *
 * 正本は写像表側の `TAILWIND_V4_NAMESPACES`（#17）。**x- 送りと class 翻訳が同じ1枚を見る**
 * ことが不変条件 — かつてここだけが `font-weight` を知っていて写像表が知らなかったため、
 * `--font-weight-medium` の namespace が x- 送りで割れても class 側は気づけなかった。
 */
export const namespaceOf = tailwindNamespaceOf;

/**
 * テーマ CSS が **宣言している** カスタムプロパティ名を出現順・重複排除で集める。
 * `var(--x)` の参照は拾わない（parser.ts の宣言解析に委譲 — 正規表現で再実装しない）。
 */
export function collectDeclaredTokenNames(themeSource: string): readonly string[] {
  const parsed = parseThemeFile(themeSource);
  if (parsed.errors.length > 0) {
    const e = parsed.errors[0]!;
    throw new CodemodError(
      `theme file has structural errors — fix before codemod: ${e.message} (line ${e.line})`,
    );
  }
  const names: string[] = [];
  const seen = new Set<string>();
  for (const block of parsed.blocks) {
    for (const decl of block.decls) {
      if (seen.has(decl.name)) continue;
      seen.add(decl.name);
      names.push(decl.name);
    }
  }
  if (names.length === 0) {
    throw new CodemodError(
      'no token declarations found in theme — refusing to report an empty plan (G-6: 検査不能は green ではない)',
    );
  }
  return names;
}

/**
 * テーマから rename 計画を機械導出する。写像判断は `mapTokenSet()`（= 写像表）に完全委譲。
 *
 * fail-closed:
 *  - 未知トークン（reject）が 1 つでもあれば停止（silent drop 禁止）
 *  - 複数ソース → 単一ターゲットの衝突があれば停止（G-6 同型・silent 上書き禁止）
 *  - 2 つの token rename が同一 class を別ターゲットへ写す場合も停止
 */
export function buildPlan(themeSource: string, table: MappingTableId = 'common'): CodemodPlan {
  const names = collectDeclaredTokenNames(themeSource);
  const mapped = mapTokenSet(names, table);

  if (mapped.rejected.length > 0) {
    throw new CodemodError(
      `unknown token(s) in theme — refusing (silent drop is prohibited):\n` +
        mapped.rejected.map((r) => `  ${r.from} — ${r.reason}`).join('\n'),
    );
  }
  if (mapped.conflicts.length > 0) {
    throw new CodemodError(
      `token mapping conflict(s) — 2+ sources map to a single target (silent overwrite prohibited):\n` +
        mapped.conflicts.map((c) => `  ${c.target} ← ${c.sources.join(', ')}`).join('\n'),
    );
  }

  const { classRenames, unmapped } = deriveClassRenames(mapped.renames);

  return {
    codemod: CODEMOD_NAME,
    codemodVersion: CODEMOD_VERSION,
    mapVersion: CODEMOD_MAP_VERSION,
    table,
    tokenRenames: mapped.renames,
    classRenames,
    unmapped,
  };
}

export interface ClassRenameResult {
  readonly classRenames: readonly Rename[];
  readonly unmapped: readonly UnmappedRename[];
}

/**
 * トークン改名を Tailwind v4 の namespace→utility 規則で class 改名へ翻訳する（純関数）。
 *
 * **写像判断はしない** — 入力の rename 対は写像表が既に決めたもの。ここがやるのは
 * 「`--spacing-inline-md → --spacing-x-inline-md` なら spacing namespace の utility ルート
 * （p/px/py/gap/…）に `-inline-md → -x-inline-md` を配る」という Tailwind 側の機械翻訳だけ。
 */
export function deriveClassRenames(tokenRenames: readonly Rename[]): ClassRenameResult {
  const classIndex = new Map<string, string>();
  const classRenames: Rename[] = [];
  const unmapped: UnmappedRename[] = [];

  for (const { from, to } of tokenRenames) {
    const ns = namespaceOf(from);
    if (ns === null) continue;
    // namespace を跨ぐ改名は機械翻訳できない — **utility ルートの有無より先に**判定して開示する。
    // 旧実装は roots===undefined を先に見て continue していたため、`--font-weight-medium →
    // --font-x-weight-medium`（roots['font-weight'] が未登録だった）が silent skip となり、
    // #17 の namespace 破壊が計画にも NOTE にも出なかった（fail-closed 原則の穴）。
    if (!to.startsWith(`--${ns}-`)) {
      unmapped.push({
        from,
        to,
        reason: `namespace changes ('${ns}' → other) — utility class rename cannot be derived mechanically; handle manually`,
      });
      continue;
    }
    // v4 が utility を生成しない namespace（--z-* 等）— namespace は保存されているので
    // 改名漏れではない。class 置換は発生しない。
    const roots = NAMESPACE_UTILITY_ROOTS[ns];
    if (roots === undefined) continue;
    const oldKey = from.slice(`--${ns}-`.length);
    const newKey = to.slice(`--${ns}-`.length);
    for (const root of roots) {
      const classFrom = `${root}-${oldKey}`;
      const classTo = `${root}-${newKey}`;
      const existing = classIndex.get(classFrom);
      if (existing !== undefined) {
        if (existing === classTo) continue;
        throw new CodemodError(
          `class rename conflict: '${classFrom}' would map to both '${existing}' and '${classTo}' — resolve in the mapping table first`,
        );
      }
      classIndex.set(classFrom, classTo);
      classRenames.push({ from: classFrom, to: classTo });
    }
  }
  return { classRenames, unmapped };
}

/**
 * 置換索引（class rename ∪ token rename）。トークン改名は `var(--x)` 参照の書き換えに要る。
 */
export function buildRenameIndex(plan: CodemodPlan): ReadonlyMap<string, string> {
  const index = new Map<string, string>();
  for (const { from, to } of plan.classRenames) index.set(from, to);
  for (const { from, to } of plan.tokenRenames) index.set(from, to);
  return index;
}

/**
 * **再入 rename**（rename 先が、それ自身また別の rename 元でもある対）を洗い出す。
 *
 * 単一パス実行の中では安全（1 回しか撃たない）が、**同じ計画で 2 回走らせると壊れる**:
 * `gap-inline-sm → gap-x-inline-sm` を撃った後にもう一度走らせると、`gap-x` ルート由来の
 * `gap-x-inline-sm → gap-x-x-inline-sm` が発火する（実測）。計画はテーマから導出されるので、
 * **正順（テーマを extract→generate で先に移行する）なら 2 回目の計画は空になり no-op** に
 * なる。ここで洗い出すのは「テーマ未移行のまま 2 回撃つ」誤用の被害範囲。
 *
 * 字面衝突そのものの是非は hideyukiMORI/nene2-fleet-tooling#17（x- 送りの namespace 意味論）。
 */
export function reentrantRenames(index: ReadonlyMap<string, string>): readonly Rename[] {
  const out: Rename[] = [];
  for (const [from, to] of index) {
    if (index.has(to)) out.push({ from, to });
  }
  return out;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 単一パス・全パターン alternation の置換正規表現を組む。
 *
 * **逐次 replace は禁止**（payout 実測の事故）: `gap-inline-sm → gap-x-inline-sm` を当てた後に
 * `gap-x` ルート由来の `gap-x-inline-sm → gap-x-x-inline-sm` が再マッチし二重置換になる
 * （payout で 35 件誤置換 — 単一パス化で解消）。索引の全キーを 1 本の alternation にして
 * 1 回の走査で撃つことがこの関数の存在理由。
 *
 * class 境界: `(^|[^a-zA-Z0-9_-])<class>(?![a-zA-Z0-9_-])`。前方の 1 文字を消費するので
 * variant のコロン prefix（`hover:bg-…`）は保持される。
 */
export function buildRenameRegex(index: ReadonlyMap<string, string>): RegExp | null {
  const keys = [...index.keys()].sort(
    (a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0),
  );
  if (keys.length === 0) return null;
  return new RegExp(
    `(^|[^a-zA-Z0-9_-])(${keys.map(escapeRegExp).join('|')})(?![a-zA-Z0-9_-])`,
    'g',
  );
}

export interface ApplyResult {
  readonly text: string;
  readonly count: number;
}

/** 索引を単一パスで当てる。戻り値の count は置換回数。 */
export function applyRenames(text: string, index: ReadonlyMap<string, string>): ApplyResult {
  const re = buildRenameRegex(index);
  if (re === null) return { text, count: 0 };
  let count = 0;
  const out = text.replace(re, (_m: string, pre: string, hit: string) => {
    count++;
    return `${pre}${index.get(hit)!}`;
  });
  return { text: out, count };
}
