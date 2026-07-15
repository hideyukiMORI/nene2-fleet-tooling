/**
 * Stylelint 2枚組の検出プローブ（規約 05 §3 — 会議R1⑤⑨・R2⑥・R3⑩M-2・R4 AM-9/AM-10決定）。
 * 正例（corporate 対）と故意 fail（broken 対・unlayered.css）の両方向を検査する。
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import stylelint from 'stylelint';
import { describe, expect, it } from 'vitest';

import distributedConfig from '../src/stylelint/index.js';
import nene2StylelintPlugin from '../src/stylelint/plugin.js';

const fixtureDir = fileURLToPath(new URL('./fixtures/styles/', import.meta.url));

// テストでは plugin をオブジェクト直参照に差し替える（配布形はビルド後の subpath 解決 —
// 文字列解決の検証は check:cli 系スモークの管轄）
const config = { ...distributedConfig, plugins: [nene2StylelintPlugin] };

async function lintFile(relPath: string, overrideConfig = config) {
  const result = await stylelint.lint({
    files: path.join(fixtureDir, relPath),
    config: overrideConfig,
    cwd: fixtureDir,
  });
  const fileResult = result.results[0];
  return (fileResult?.warnings ?? []).map((w) => ({ rule: w.rule ?? '', text: w.text }));
}

describe('テーマファイル override（非 .components — AM-9 token-only）', () => {
  it('正例 corporate.css は違反 0', async () => {
    expect(await lintFile('src/shared/ui/theme/themes/corporate.css')).toEqual([]);
  });

  it('故意 fail broken.css — 通常プロパティ・非スコープセレクタ・@layer base 混入を検知', async () => {
    const warnings = await lintFile('src/shared/ui/theme/themes/broken.css');
    const byRule = warnings.filter((w) => w.rule === 'nene2/themes-token-only');
    expect(byRule.some((w) => w.text.includes('font-family'))).toBe(true); // 通常プロパティ
    expect(byRule.some((w) => w.text.includes('.button'))).toBe(true); // 非スコープセレクタ
    expect(byRule.some((w) => w.text.includes('@layer'))).toBe(true); // @layer base 混入
  });

  it('override の明示除外により .components.css に themes-token-only が適用されない', async () => {
    const warnings = await lintFile('src/shared/ui/theme/themes/corporate.components.css');
    expect(warnings.some((w) => w.rule === 'nene2/themes-token-only')).toBe(false);
  });
});

describe('.components 対（AM-9 全ルール @layer components 内）', () => {
  it('故意 fail broken.components.css — @layer components 外のルールを検知', async () => {
    const warnings = await lintFile('src/shared/ui/theme/themes/broken.components.css');
    expect(warnings.some((w) => w.rule === 'nene2/all-rules-in-components-layer')).toBe(true);
  });

  it('正例 corporate.components.css — allowlist を registries 生成 override で与えると green', async () => {
    // 台帳由来 secondary は機械生成 override として合成する（AM-10/AM-13(ii) の合成形）
    const withAllowlist = {
      ...config,
      overrides: [
        ...(config.overrides ?? []),
        {
          files: ['**/*.components.css'],
          rules: {
            'nene2/layer-components-allowlist': [true, { allowedClasses: ['.badge'] }],
          },
        },
      ],
    };
    expect(
      await lintFile('src/shared/ui/theme/themes/corporate.components.css', withAllowlist),
    ).toEqual([]);
  });

  it('fail-closed: allowlist 未指定（台帳不在）では @layer components の全クラスが FAIL（G-6）', async () => {
    const warnings = await lintFile('src/shared/ui/theme/themes/corporate.components.css');
    expect(warnings.some((w) => w.rule === 'nene2/layer-components-allowlist')).toBe(true);
  });
});

describe('canonical cascade header と @theme ブロック（#19 正例較正）', () => {
  it('index.css の @layer 順序宣言文（legacy を含む）は manifest 制の対象外・違反 0', async () => {
    expect(await lintFile('src/index.css')).toEqual([]);
  });

  it('ブランドテーマ（@theme 直値＋.components @import＋dark 上書き — TH-02/03・参照テーマ形）は違反 0', async () => {
    expect(await lintFile('src/shared/ui/theme/themes/brand.css')).toEqual([]);
  });

  it('@theme ブロック内の通常プロパティは従来どおり検知する', async () => {
    const { results } = await stylelint.lint({
      code: '@theme {\n  --color-accent: oklch(0.5 0.1 250);\n  font-family: serif;\n}\n',
      config,
      codeFilename: path.join(fixtureDir, 'src/shared/ui/theme/themes/code-probe.css'),
    });
    const warnings = results[0]?.warnings ?? [];
    expect(
      warnings.some((w) => w.rule === 'nene2/themes-token-only' && w.text.includes('font-family')),
    ).toBe(true);
  });
});

describe('base.css — @layer base の唯一の家（ST-08・K-7 の base 経由再来の閉鎖）', () => {
  const baseEntry = 'src/shared/ui/theme/base.css';

  async function lintBaseCode(code: string) {
    const { results } = await stylelint.lint({
      code,
      config,
      codeFilename: path.join(fixtureDir, baseEntry),
    });
    return (results[0]?.warnings ?? []).map((w) => ({ rule: w.rule ?? '', text: w.text }));
  }

  it('正例 base.css（vault 現物の @layer base を正準の家へ移した形）は違反 0', async () => {
    expect(await lintFile(baseEntry)).toEqual([]);
  });

  it('class セレクタは FAIL — allowlist 迂回の閉鎖（field 現物 .tnum が該当）', async () => {
    const warnings = await lintBaseCode(
      '@layer base {\n  .tnum {\n    font-variant-numeric: tabular-nums;\n  }\n}\n',
    );
    const byRule = warnings.filter((w) => w.rule === 'nene2/base-element-only');
    expect(byRule.some((w) => w.text.includes('.tnum'))).toBe(true);
  });

  it("子孫位置の class も FAIL（全 class トークン照合 — AM-25' と同型）", async () => {
    const warnings = await lintBaseCode(
      '@layer base {\n  body .wrapper {\n    margin: 0;\n  }\n}\n',
    );
    expect(
      warnings.some((w) => w.rule === 'nene2/base-element-only' && w.text.includes('.wrapper')),
    ).toBe(true);
  });

  it('id / 属性セレクタも FAIL', async () => {
    const idWarnings = await lintBaseCode('@layer base {\n  #app {\n    margin: 0;\n  }\n}\n');
    expect(idWarnings.some((w) => w.rule === 'nene2/base-element-only')).toBe(true);
    const attrWarnings = await lintBaseCode('@layer base {\n  a[href] {\n    margin: 0;\n  }\n}\n');
    expect(
      attrWarnings.some((w) => w.rule === 'nene2/base-element-only' && w.text.includes('[href]')),
    ).toBe(true);
  });

  it('custom property 宣言は FAIL — トークンの家は themes/*.css（AM-9 の双対）', async () => {
    const warnings = await lintBaseCode(
      '@layer base {\n  html {\n    --color-accent: oklch(0.5 0.1 250);\n  }\n}\n',
    );
    expect(
      warnings.some(
        (w) => w.rule === 'nene2/base-element-only' && w.text.includes('--color-accent'),
      ),
    ).toBe(true);
  });

  it('トップレベルの @import / 無レイヤ規則 / @layer base 以外は FAIL', async () => {
    const importWarnings = await lintBaseCode("@import './anything.css';\n");
    expect(importWarnings.some((w) => w.rule === 'nene2/base-element-only')).toBe(true);
    const unlayered = await lintBaseCode('body {\n  margin: 0;\n}\n');
    expect(unlayered.some((w) => w.rule === 'nene2/base-element-only')).toBe(true);
    const otherLayer = await lintBaseCode(
      '@layer components {\n  body {\n    margin: 0;\n  }\n}\n',
    );
    expect(otherLayer.some((w) => w.rule === 'nene2/base-element-only')).toBe(true);
  });

  it('@layer base 内の @keyframes は FAIL・@media は許可', async () => {
    const kf = await lintBaseCode(
      '@layer base {\n  @keyframes fade {\n    0% {\n      opacity: 0;\n    }\n  }\n}\n',
    );
    expect(
      kf.some((w) => w.rule === 'nene2/base-element-only' && w.text.includes('@keyframes')),
    ).toBe(true);
    const media = await lintBaseCode(
      '@layer base {\n  @media (prefers-reduced-motion: reduce) {\n    * {\n      animation-duration: 0.01ms;\n    }\n  }\n}\n',
    );
    expect(media.some((w) => w.rule === 'nene2/base-element-only')).toBe(false);
  });

  it('base.css 以外の @layer base ブロックは FAIL（場所の閉鎖 — 閉文法の迂回不能化）', async () => {
    const { results } = await stylelint.lint({
      code: '@layer base {\n  .anything {\n    margin: 0;\n  }\n}\n',
      config,
      codeFilename: path.join(fixtureDir, 'src/app/somewhere.css'),
    });
    expect((results[0]?.warnings ?? []).some((w) => w.rule === 'nene2/layer-base-location')).toBe(
      true,
    );
  });

  it('canonical header の @layer 順序宣言文は場所違反にならない（#19 と同じ分界）', async () => {
    expect(await lintFile('src/index.css')).toEqual([]);
  });
});

describe('sub-layer（ST-06 — ルート名予約・nene-vault#212 実測由来）', () => {
  async function lintAs(code: string, rel: string) {
    const { results } = await stylelint.lint({
      code,
      config,
      codeFilename: path.join(fixtureDir, rel),
    });
    return (results[0]?.warnings ?? []).map((w) => ({ rule: w.rule ?? '', text: w.text }));
  }

  const COMPONENTS_FILE = 'src/shared/ui/theme/themes/corporate.components.css';

  it('vault 現物の sub-layer 形（main / responsive）は sub-layer 系の違反 0', async () => {
    const warnings = await lintAs(
      '@layer components {\n  @layer main, responsive;\n  @layer main { .badge { color: red } }\n' +
        '  @layer responsive { @media (max-width: 640px) { .badge { color: blue } } }\n}\n',
      COMPONENTS_FILE,
    );
    expect(warnings.some((w) => w.rule === 'nene2/no-reserved-sublayer-name')).toBe(false);
    expect(warnings.some((w) => w.rule === 'nene2/layer-base-location')).toBe(false);
  });

  it('sub-layer 名 base は no-reserved-sublayer-name で落ちる（layer-base-location の誤検知ではなく）', async () => {
    const warnings = await lintAs(
      '@layer components {\n  @layer base { .badge { color: red } }\n}\n',
      COMPONENTS_FILE,
    );
    expect(
      warnings.some((w) => w.rule === 'nene2/no-reserved-sublayer-name' && w.text.includes('base')),
    ).toBe(true);
    // #33 の誤検知回帰: 入れ子 base は components.base であってルート base ではない
    expect(warnings.some((w) => w.rule === 'nene2/layer-base-location')).toBe(false);
  });

  it('sub-layer 名 legacy も予約語として落ちる（layer-legacy-manifest-only の誤検知も同時に説明）', async () => {
    const warnings = await lintAs(
      '@layer components {\n  @layer legacy { .badge { color: red } }\n}\n',
      COMPONENTS_FILE,
    );
    expect(warnings.some((w) => w.rule === 'nene2/no-reserved-sublayer-name')).toBe(true);
  });

  it('入れ子の sub-layer 順序宣言文でも予約語を検知する', async () => {
    const warnings = await lintAs(
      '@layer components {\n  @layer base, responsive;\n  @layer responsive { .badge { color: red } }\n}\n',
      COMPONENTS_FILE,
    );
    expect(warnings.some((w) => w.rule === 'nene2/no-reserved-sublayer-name')).toBe(true);
  });

  it('回帰: base.css 以外のトップレベル @layer base は従来どおり layer-base-location で落ちる', async () => {
    const warnings = await lintAs(
      '@layer base {\n  body { margin: 0 }\n}\n',
      'src/app/somewhere.css',
    );
    expect(warnings.some((w) => w.rule === 'nene2/layer-base-location')).toBe(true);
    expect(warnings.some((w) => w.rule === 'nene2/no-reserved-sublayer-name')).toBe(false);
  });

  it('回帰: base.css 正例と canonical header 順序宣言文は違反 0 のまま', async () => {
    expect(await lintFile('src/shared/ui/theme/base.css')).toEqual([]);
    expect(await lintFile('src/index.css')).toEqual([]);
  });
});

describe('@import の二重レイヤ指定（ST-06 — components.components / base.base の閉鎖）', () => {
  async function lintAs(code: string, rel: string) {
    const { results } = await stylelint.lint({
      code,
      config,
      codeFilename: path.join(fixtureDir, rel),
    });
    return (results[0]?.warnings ?? []).map((w) => ({ rule: w.rule ?? '', text: w.text }));
  }

  it('自リポ CSS の @import に layer(components) を付けると FAIL（vault themes/default.css:14 の現物形）', async () => {
    const warnings = await lintAs(
      "@import './default.components.css' layer(components);\n@theme {\n  --color-surface: oklch(97% 0.006 75);\n}\n",
      'src/shared/ui/theme/themes/default.css',
    );
    expect(warnings.some((w) => w.rule === 'nene2/no-double-layer-import')).toBe(true);
  });

  it('layer() を落とした形は green（是正後）', async () => {
    const warnings = await lintAs(
      "@import './default.components.css';\n@theme {\n  --color-surface: oklch(97% 0.006 75);\n}\n",
      'src/shared/ui/theme/themes/default.css',
    );
    expect(warnings.some((w) => w.rule === 'nene2/no-double-layer-import')).toBe(false);
  });

  it('index.css の components 群 @import に layer(components) を付けると FAIL', async () => {
    const warnings = await lintAs(
      "@import './components/data-table.css' layer(components);\n",
      'src/shared/ui/theme/index.css',
    );
    expect(warnings.some((w) => w.rule === 'nene2/no-double-layer-import')).toBe(true);
  });

  it('base.css の @import に layer(base) を付けると FAIL（ST-06 是正の機械強制）', async () => {
    const warnings = await lintAs("@import './base.css' layer(base);\n", 'src/index.css');
    expect(warnings.some((w) => w.rule === 'nene2/no-double-layer-import')).toBe(true);
  });

  it('適用外: vendor の @import url(…) layer(vendor) は green（会議 AM-8(b) 決定）', async () => {
    const warnings = await lintAs(
      "@import url('../../../node_modules/katex/dist/katex.css') layer(vendor);\n",
      'src/shared/ui/theme/index.css',
    );
    expect(warnings.some((w) => w.rule === 'nene2/no-double-layer-import')).toBe(false);
  });

  it("適用外: bare package の @import 'tailwindcss' theme(static) は green", async () => {
    const warnings = await lintAs(
      "@import 'tailwindcss' theme(static);\n@import './active.css';\n",
      'src/shared/ui/theme/index.css',
    );
    expect(warnings.some((w) => w.rule === 'nene2/no-double-layer-import')).toBe(false);
  });
});

describe('一般 CSS（テーマ外）', () => {
  it('故意 fail unlayered.css — 無レイヤ・!important・ID・hex・rgb()・[data-theme] 場所違反', async () => {
    const warnings = await lintFile('src/app/unlayered.css');
    const rules = new Set(warnings.map((w) => w.rule));
    expect(rules).toContain('nene2/no-unlayered-css');
    expect(rules).toContain('declaration-no-important');
    expect(rules).toContain('selector-max-id');
    expect(rules).toContain('color-no-hex');
    expect(rules).toContain('function-disallowed-list');
    expect(rules).toContain('nene2/data-theme-selector-location');
  });

  it('layered.css — @layer 内は無レイヤ扱いにならない・allowlist と legacy manifest は fail-closed', async () => {
    const warnings = await lintFile('src/app/layered.css');
    expect(warnings.some((w) => w.rule === 'nene2/no-unlayered-css')).toBe(false);
    // 台帳未指定 → @layer components 全クラス FAIL・@layer legacy 未登録 FAIL（G-6）
    expect(warnings.some((w) => w.rule === 'nene2/layer-components-allowlist')).toBe(true);
    expect(warnings.some((w) => w.rule === 'nene2/layer-legacy-manifest-only')).toBe(true);
  });

  it('前方一致の僭称（.data-table-foo-custom）は allowlist 完全一致で FAIL（AM-10）', async () => {
    const withAllowlist = {
      ...config,
      overrides: [
        {
          files: ['**/layered.css'],
          rules: {
            'nene2/layer-components-allowlist': [true, { allowedClasses: ['.data-table'] }],
            'nene2/layer-legacy-manifest-only': [true, { files: ['src/app/layered.css'] }],
          },
        },
      ],
    };
    const warnings = await lintFile('src/app/layered.css', withAllowlist);
    const allowlistWarnings = warnings.filter((w) => w.rule === 'nene2/layer-components-allowlist');
    expect(allowlistWarnings.some((w) => w.text.includes('.data-table-foo-custom'))).toBe(true);
    expect(allowlistWarnings.some((w) => w.text.includes('".data-table"'))).toBe(false);
    // manifest 登録済みなので legacy は green
    expect(warnings.some((w) => w.rule === 'nene2/layer-legacy-manifest-only')).toBe(false);
  });

  it('@theme inline を検知する（R2⑥ silent freeze）', async () => {
    const { results } = await stylelint.lint({
      code: '@theme inline {\n  --color-accent: oklch(0.5 0.1 250);\n}\n',
      config,
    });
    expect((results[0]?.warnings ?? []).some((w) => w.rule === 'nene2/no-theme-inline')).toBe(true);
  });
});
