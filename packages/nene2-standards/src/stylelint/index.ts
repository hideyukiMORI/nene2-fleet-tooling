/**
 * @hideyukimori/nene2-standards/stylelint — 配布実体（規約 05 §3.2 が意味論の正本）。
 *
 * 製品側 stylelint.config.js（コピペ正本 — 05 §3.1）:
 * `export default { extends: ['@hideyukimori/nene2-standards/stylelint'] };`
 *
 * 台帳由来 secondary（layer-components-allowlist の allowedClasses / legacy manifest の files）は
 * ここでは**未指定＝fail-closed（空集合）**。実効値は registries から機械生成した override を
 * ゲート導入 PR（W1）で合成する — 手書き列挙 MUST NOT（会議R4 AM-10/AM-13(ii)決定・G-7）。
 */
import type { Config } from 'stylelint';

const config: Config = {
  plugins: ['@hideyukimori/nene2-standards/stylelint-plugin'],
  rules: {
    'declaration-no-important': true, // !important MUST NOT・例外なし（会議R1⑤決定）
    'selector-max-id': 0, // ID セレクタ MUST NOT（会議R1⑤決定）
    'selector-max-specificity': '0,2,0', // 単一クラス＋状態擬似/属性1個（会議R1⑤決定）
    'nene2/no-unlayered-css': true, // 無レイヤ CSS MUST NOT（themes/*.css は下で除外）
    'nene2/no-theme-inline': true, // @theme inline MUST NOT（会議R2⑥決定）
    'nene2/data-theme-selector-location': true, // [data-theme] は themes/*.css 内のみ（会議R2⑥決定）
    'nene2/layer-components-allowlist': true, // registries 許可リスト（完全一致列挙 — 会議R4 AM-10決定）
    'nene2/layer-legacy-manifest-only': true, // @layer legacy は manifest 列挙ファイルのみ（会議R3⑩M-2決定）
    'nene2/layer-base-location': true, // @layer base ブロックは base.css 内のみ（ST-08 — base の家は1つ）
    'color-no-hex': true, // 生 hex の theme 外直書き MUST NOT（会議R1⑤決定）
    'function-disallowed-list': ['rgb', 'rgba', 'hsl', 'hsla'], // 色は oklch/color-mix（会議R1⑤決定）
  },
  overrides: [
    {
      // テーマファイル（非 .components）: token-only 文法（会議R4 AM-9決定）。
      // `*.css` は `*.components.css` にもマッチするため明示除外 MUST（05 §3.2 注記 —
      // 除外なしだと第2 override と順序依存の null 上書きになる）。
      // 実測（2026-07-14・stylelint 16.14 / micromatch）: 05 §3.2 起草形の `!` 否定パターンは
      // 配列内で「否定に合致しない全ファイル」を match させ override が全 CSS に適用される
      // （空虚どころか過剰適用 — fail-open）。除外は extglob `!(*.components)` で表現する
      // （配布物が正 — 文書へ追随 PR）。
      files: ['**/src/shared/ui/theme/themes/!(*.components).css'],
      rules: {
        'nene2/no-unlayered-css': null, // テーマ上書きブロックは無レイヤが正（会議R2⑥決定・実測T9）
        'nene2/themes-token-only': true,
        'nene2/data-theme-selector-location': null,
      },
    },
    {
      // .components 対は全ルール @layer components 内（会議R4 AM-9決定）
      files: ['**/src/shared/ui/theme/themes/*.components.css'],
      rules: { 'nene2/all-rules-in-components-layer': true },
    },
    {
      // base.css: @layer base の唯一の家（ST-08）。element-only 閉文法 = AM-9 token-only の双対。
      // layer-base-location はこのファイルでは当然 green になるため null 化は不要（自己一致）。
      files: ['**/src/shared/ui/theme/base.css'],
      rules: { 'nene2/base-element-only': true },
    },
  ],
};

export default config;
