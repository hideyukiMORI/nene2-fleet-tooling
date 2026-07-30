/**
 * 艦が Tailwind を使っているかの**実測**判定（#163）。
 *
 * ## なぜ要るか
 *
 * canonical は `better-tailwindcss/no-unknown-classes` を武装して配る。この検査器は
 * **Tailwind の実 entry を要求する**ので、非 Tailwind の艦では
 *
 * - entry が無くて throw する（＝検査不能）か
 * - 既定 theme へ silent fallback して**偽陽性洪水**になる（payout#161 で 218件実測の型）
 *
 * のどちらかにしかならない。ところが gate-integrity はこの状態を
 * 「実効 severity < canonical（差異登録なき緩和）」＝**違反**として報告していた。
 * **検査不能を違反として罰している**ので、fail-closed の原則（検査不能=unknown・空虚合格禁止）
 * から見て canonical 側の問題（concierge 照会・fleet 横断実測 2026-07-29）。
 *
 * 非 Tailwind は **concierge / serve / corpus / suite の4艦**（fleet 実測）。1艦なら registries の
 * 差異登録で表現するのが妥当だが、**4艦は例外ではなく構造**であり、同じ差異登録を4艦に手書きさせるのは
 * G-7（合成を被検査者の手から取り上げる・手書き列挙 MUST NOT）に反する。→ canonical 側で表現する。
 *
 * ## 判定は依存の実測で行う（自己申告に依存しない — G-7）
 *
 * 艦の `package.json` の依存に `tailwindcss` / `@tailwindcss/*` があるかで見る。
 * 「eslint.config.js が styling 軸を展開しているか」では判定しない——それは
 * **被検査者の申告**であり、「展開していない」ことを理由に検査対象外にすると
 * 「外せば緩和が消える」抜け道になる。
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** 依存として Tailwind を示す名前（v4 は `@tailwindcss/vite` 等のプラグイン経由もある）。 */
const TAILWIND_DEP = /^(tailwindcss|@tailwindcss\/.+)$/;

/** gate-integrity の照合対象から外すルール（Tailwind 実 entry を要求する検査器）。 */
export const TAILWIND_DEPENDENT_RULES: readonly string[] = [
  'better-tailwindcss/no-unknown-classes',
];

type Manifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

function manifestDeps(file: string): string[] {
  try {
    const json = JSON.parse(readFileSync(file, 'utf8')) as Manifest;
    return [
      ...Object.keys(json.dependencies ?? {}),
      ...Object.keys(json.devDependencies ?? {}),
      ...Object.keys(json.peerDependencies ?? {}),
      ...Object.keys(json.optionalDependencies ?? {}),
    ];
  } catch {
    return [];
  }
}

export interface TailwindPresence {
  /** Tailwind 依存を実測できたか */
  present: boolean;
  /** 判定根拠（details にそのまま出せる文言） */
  reason: string;
}

/**
 * `cwd`（＝gate-integrity が測るディレクトリ）とその親1段の `package.json` を見て判定する。
 *
 * 親1段まで見るのは、フロントが `frontend/` にある艦で依存がそこに宣言される一方、
 * リポ直下の manifest に宣言される艦もあるため（フリート実測）。**見つからなければ
 * 「非 Tailwind」と断定せず、判定不能を `present: false` の理由に明記する**
 * （呼び出し側が details に出して読み手が切り分けられるようにする）。
 */
export function detectTailwind(cwd: string): TailwindPresence {
  const candidates = [path.join(cwd, 'package.json'), path.join(path.dirname(cwd), 'package.json')];
  const seen: string[] = [];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    seen.push(file);
    const hit = manifestDeps(file).find((name) => TAILWIND_DEP.test(name));
    if (hit)
      return {
        present: true,
        reason: `${path.basename(path.dirname(file))}/package.json に ${hit}`,
      };
  }
  if (seen.length === 0) {
    return { present: false, reason: 'package.json が見つからない（cwd とその親を確認）' };
  }
  return {
    present: false,
    reason: `依存に tailwindcss / @tailwindcss/* が無い（確認: ${seen.length}件の package.json）`,
  };
}
