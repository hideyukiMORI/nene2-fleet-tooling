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
