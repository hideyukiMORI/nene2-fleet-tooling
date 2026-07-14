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
 */
import betterTailwindcss from 'eslint-plugin-better-tailwindcss';
import type { Linter } from 'eslint';

import { nene2Plugin } from '../eslint-plugin/index.js';
import { APP_GLOB } from './restrictions.js';

export const styling: Linter.Config[] = [
  {
    name: 'nene2/styling/known-utility',
    files: [APP_GLOB],
    plugins: { 'better-tailwindcss': betterTailwindcss as never },
    rules: {
      // W0a 確定値: rule-id = better-tailwindcss/no-unknown-classes（v4.6.1 実在確認済み）。
      // entryPoint 既定 src/index.css は W0.starter のスターター同梱現物で最終確定（05 §10.2）。
      'better-tailwindcss/no-unknown-classes': [
        'warn',
        { detectComponentClasses: true, entryPoint: 'src/index.css' },
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
