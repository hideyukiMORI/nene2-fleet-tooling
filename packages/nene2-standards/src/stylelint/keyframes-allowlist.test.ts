/**
 * #116 回帰: layer-components-allowlist は @layer components 内にネストした
 * @keyframes のフレーム行（from / to / percentage）を class として reject しない。
 * 兄弟ルール（noUnlayeredCss 等）と一貫。init-scan も keyframe を class 収集しないので、
 * 罰する側だけが keyframe を見る非対称＝生成 baseline で緑到達不能を潰す（D-invoice pilot 実測）。
 * 本リポの programmatic stylelint 実行テスト（init-scan.test.ts と同型）。
 */
import stylelint from 'stylelint';
import { describe, expect, it } from 'vitest';

import plugins from './plugin.js';

const allowlistOnly = (allowedClasses: string[]) => ({
  plugins,
  rules: { 'nene2/layer-components-allowlist': [true, { allowedClasses }] },
});

async function allowlistWarnings(css: string, allowedClasses: string[]): Promise<string[]> {
  const { results } = await stylelint.lint({ code: css, config: allowlistOnly(allowedClasses) });
  return results[0].warnings
    .filter((w) => w.rule === 'nene2/layer-components-allowlist')
    .map((w) => w.text);
}

describe('layer-components-allowlist — @keyframes フレームのスキップ（#116）', () => {
  it('@layer components 内の @keyframes フレーム（from/to）は reject しない', async () => {
    const css = `@layer components {
  .spinner { animation: spin 1s linear infinite; }
  @keyframes spin {
    from { opacity: 0; }
    to { opacity: 1; }
  }
}
`;
    expect(await allowlistWarnings(css, ['.spinner'])).toEqual([]);
  });

  it('percentage フレーム（0% / 100%）も reject しない', async () => {
    const css = `@layer components {
  .bar { animation: grow 1s; }
  @keyframes grow {
    0% { width: 0; }
    100% { width: 100%; }
  }
}
`;
    expect(await allowlistWarnings(css, ['.bar'])).toEqual([]);
  });

  it('未登録の実 class は依然 reject する（keyframe スキップが穴を開けていない）', async () => {
    const css = `@layer components {
  .known { color: red; }
  .unknown { color: blue; }
}
`;
    const warnings = await allowlistWarnings(css, ['.known']);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('.unknown');
  });
});
