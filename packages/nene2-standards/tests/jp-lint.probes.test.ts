/**
 * JP lint 3ノード化の検出プローブ 6本＋除外の有限列挙（AI-19・会議R4 AM-16・R5 文字域修正 —
 * 「lint の昇格には検出プローブ添付・自己テスト同梱 MUST」の適用）。
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { ESLint, type Linter } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

const fixtureDir = fileURLToPath(new URL('./fixtures/probe-app/', import.meta.url));

let eslint: ESLint;

beforeAll(async () => {
  process.chdir(fixtureDir);
  const { composedConfig } = await import('../src/index.js');
  eslint = new ESLint({
    cwd: fixtureDir,
    overrideConfigFile: true,
    overrideConfig: composedConfig(),
  });
}, 120_000);

async function jpMessages(relPath: string): Promise<Linter.LintMessage[]> {
  const results = await eslint.lintFiles([relPath]);
  return (results[0]?.messages ?? []).filter(
    (m) =>
      m.ruleId === 'no-restricted-syntax' &&
      (m.message.includes('t() 経由') || m.message === '同上。'),
  );
}

describe('JP lint 3ノード（I18N-16 プローブ表 6本）', () => {
  it('プローブ 1〜6 を全て検知する（Literal / JSXText / TemplateElement / 属性 / 半角カナ / 〆）', async () => {
    const msgs = await jpMessages('src/features/probe-slice/jp-probe.tsx');
    const lines = new Set(msgs.map((m) => m.line));
    // fixture の行: 3=Literal '保存しました' / 4=Template `合計 ${n} 件` / 5=半角カナ /
    // 6=〆 / 9=JSXText / 10=aria-label 属性 Literal
    for (const line of [3, 4, 5, 6, 9, 10]) {
      expect(lines, `line ${line} のプローブが検知されること`).toContain(line);
    }
    expect(msgs.length).toBeGreaterThanOrEqual(6);
  }, 60_000);

  it('除外の有限列挙: カタログの家（shared/i18n/messages）は JP literal 免除・Intl 禁止は維持', async () => {
    const msgs = await jpMessages('src/shared/i18n/messages/ja.ts');
    expect(msgs).toEqual([]); // ja.ts は '閉じる' を含むが免除
    const cfg = (await eslint.calculateConfigForFile(
      path.join(fixtureDir, 'src/shared/i18n/messages/ja.ts'),
    )) as { rules: Record<string, unknown[]> };
    const selectors = (cfg.rules['no-restricted-syntax'] ?? []).slice(1) as {
      selector: string;
    }[];
    expect(selectors.some((s) => s.selector.includes('Intl'))).toBe(true); // 免除は JP のみ
  }, 60_000);

  it('除外の有限列挙: テストファイルは JP lint 対象外（R2⑦補記）・testing セレクタは適用', async () => {
    const cfg = (await eslint.calculateConfigForFile(
      path.join(fixtureDir, 'tests/msw-probe.fixture.ts'),
    )) as { rules: Record<string, unknown[]> };
    const selectors = ((cfg.rules['no-restricted-syntax'] ?? []).slice(1) as { selector: string }[])
      .map((s) => s.selector)
      .join('\n');
    expect(selectors).not.toContain('JSXText'); // JP 3ノードなし
    expect(selectors).toContain('ByTestId'); // testing 統合は生きている
  });

  it('client.ts（fetch 例外の座席）でも JP lint は適用されたまま', async () => {
    const cfg = (await eslint.calculateConfigForFile(
      path.join(fixtureDir, 'src/shared/api/client.ts'),
    )) as { rules: Record<string, unknown[]> };
    const selectors = ((cfg.rules['no-restricted-syntax'] ?? []).slice(1) as { selector: string }[])
      .map((s) => s.selector)
      .join('\n');
    expect(selectors).toContain('JSXText');
  });
});
