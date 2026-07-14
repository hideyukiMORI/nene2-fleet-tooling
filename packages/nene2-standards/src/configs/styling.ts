/**
 * nene2.styling — known-utility fast path＋style prop 規律（規約 05 §2.2.4）。
 *
 * no-restricted-syntax の styling 7セレクタは合成規律により configs/restrictions.ts に統合済み。
 *
 * known-utility fast path（会議R2⑥(B)・R4 AM-13決定）:
 * - severity 'warn' は起草時プレースホルダのまま（O-5/O-6 — 詳細は README）。実効 severity は
 *   ファイル単位で legacy manifest から機械生成（掲載=off・それ以外=error）— W1 配線。
 * - detectComponentClasses: true 明記（false 既定のままだとフリート数千件偽陽性 — AM-13）。
 * - severity の正本は check:tw-oracle（O-5: 食い違いは仕様・常に oracle が正）。
 *
 * entryPoint seam（fleet-tooling#21・payout#161 実弾テストで発覚）:
 * - better-tailwindcss の entryPoint は「アプリ実 entry」（O-3 MUST）＝アプリ固有であり、単一
 *   ハードコード既定では表現できない。既定は FSD 正準のテーマ入口 `src/shared/ui/theme/index.css`
 *   （init-scan の CANONICAL_NON_LEGACY と一致・AM-8(a) canonical cascade header の置き場と共有）へ
 *   寄せ、per-repo の上書きは `stylingWith({ entryPoint })` seam で受ける（配布断片の無改変合成という
 *   規律＝製品側 raw rule 直書き MUST NOT と両立させるため）。
 * - entry 不在は G-6（検査不能=unknown・空虚合格禁止）に従い fail-loud。黙って全テーマユーティリティを
 *   unknown へ化けさせる（better-tailwindcss は entry 未発見時に既定 tailwind theme へ silent fallback
 *   する — payout で 218 件偽陽性の実測）のではなく、設定エラーとして即 throw する。
 */
import { existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

import betterTailwindcss from 'eslint-plugin-better-tailwindcss';
import type { Linter } from 'eslint';

import { nene2Plugin } from '../eslint-plugin/index.js';
import { APP_GLOB } from './restrictions.js';

/**
 * FSD 正準のテーマ入口。`@import 'tailwindcss'`＋`@theme` はここ（`src/main.tsx` が import する
 * canonical cascade header の置き場）。init-scan の CANONICAL_NON_LEGACY と同一パス。
 */
export const CANONICAL_THEME_ENTRY = 'src/shared/ui/theme/index.css';

/** styling seam のオプション。`entryPoint` は per-repo の Tailwind 実 entry（O-3 MUST）。 */
export interface StylingOptions {
  /** アプリの Tailwind entry css（cwd 相対 or 絶対）。既定は FSD 正準 `src/shared/ui/theme/index.css`。 */
  entryPoint?: string;
  /** entry 存在検査の基準ディレクトリ。既定は `process.cwd()`（lint 実行 cwd＝frontend/）。 */
  cwd?: string;
}

/**
 * nene2.styling の per-repo entryPoint seam（fleet-tooling#21）。
 *
 * `stylingWith({ entryPoint })` で製品の実 entry を受け取り、known-utility fast path の
 * `better-tailwindcss/no-unknown-classes` に配線する。entry が存在しなければ **fail-loud**（throw）。
 *
 * これは未決の妥協ではなく G-6 の適用: better-tailwindcss は entry 未発見時に既定 tailwind theme へ
 * silent fallback し、テーマ固有ユーティリティ（`bg-surface`・`px-inline-md` 等）を全て unknown へ
 * 化けさせる（＝偽陽性洪水・payout#161 で 218 件実測）。検査不能を黙って通さず、設定エラーとして
 * 1 回明示 FAIL させる。
 */
export function stylingWith(options: StylingOptions = {}): Linter.Config[] {
  const entryPoint = options.entryPoint ?? CANONICAL_THEME_ENTRY;
  const cwd = options.cwd ?? process.cwd();
  const resolved = isAbsolute(entryPoint) ? entryPoint : resolve(cwd, entryPoint);

  if (!existsSync(resolved)) {
    throw new Error(
      `[nene2/styling] Tailwind entry point not found: ${resolved}\n` +
        `  configured entryPoint: ${JSON.stringify(entryPoint)} (cwd: ${cwd})\n` +
        `  known-utility fast path (better-tailwindcss/no-unknown-classes) requires the app's real\n` +
        `  Tailwind entry (O-3 MUST). Without it every theme utility (bg-surface, px-inline-md, …)\n` +
        `  is silently treated as unknown — 218 false positives in payout#161.\n` +
        `  Fix: pass this repo's entry via nene2.stylingWith({ entryPoint: '<path>' }).\n` +
        `  FSD canonical default is '${CANONICAL_THEME_ENTRY}'; the W0.starter layout is 'src/index.css'.\n` +
        `  This is a fail-loud config error (G-6: 検査不能=unknown・空虚合格禁止), not a lint warning.`,
    );
  }

  return [
    {
      name: 'nene2/styling/known-utility',
      files: [APP_GLOB],
      plugins: { 'better-tailwindcss': betterTailwindcss as never },
      rules: {
        // W0a 確定値: rule-id = better-tailwindcss/no-unknown-classes（v4.6.1 実在確認済み）。
        // entryPoint 既定は FSD 正準 src/shared/ui/theme/index.css（fleet-tooling#21・05 §10.2 の
        // W0.starter 前提を fleet 正準へ是正）。per-repo 上書きは本 seam の引数で。
        'better-tailwindcss/no-unknown-classes': [
          'warn',
          { detectComponentClasses: true, entryPoint },
        ],
      },
    },
    {
      // inline style 禁止・唯一の例外は CSS 変数注入（会議R1⑤・R5 AM-8(f)決定）。
      // W0a 確定値: react/forbid-dom-props では例外判定（キー全 '--' 始まり・値リテラル色禁止・
      // 非リテラル値は注入器台帳照合）を表現できないため custom rule に一本化（05 §2.2.4 補足の
      // 実装確定事項 — forbid-dom-props との併用は唯一の許可形を自分で誤検知するため置かない）。
      name: 'nene2/styling/style-prop',
      files: [APP_GLOB],
      plugins: { nene2: nene2Plugin as never },
      rules: {
        // injectorFiles は registries の injector エントリから機械生成（W1 配線・正本は台帳 — G-7）
        'nene2/style-prop-css-vars-only': ['error', { injectorFiles: [] }],
      },
    },
  ];
}

/**
 * 後方互換の静的合成形（`...nene2.styling`）。既定 entryPoint は FSD 正準
 * `src/shared/ui/theme/index.css`。
 *
 * NOTE: fail-loud の存在検査は **import 時に throw させない**ため本静的配列には掛けていない
 * （config モジュール import は副作用ゼロが安全 — 別 export だけ欲しいツール・非正準レイアウト repo を
 * 巻き込まない）。per-repo entry の指定と entry 不在 fail-loud を得るには `stylingWith({ entryPoint })`
 * を使う（コピペ正本は `...nene2.stylingWith()` — README 参照）。
 */
export const styling: Linter.Config[] = [
  {
    name: 'nene2/styling/known-utility',
    files: [APP_GLOB],
    plugins: { 'better-tailwindcss': betterTailwindcss as never },
    rules: {
      'better-tailwindcss/no-unknown-classes': [
        'warn',
        { detectComponentClasses: true, entryPoint: CANONICAL_THEME_ENTRY },
      ],
    },
  },
  {
    name: 'nene2/styling/style-prop',
    files: [APP_GLOB],
    plugins: { nene2: nene2Plugin as never },
    rules: {
      'nene2/style-prop-css-vars-only': ['error', { injectorFiles: [] }],
    },
  },
];
