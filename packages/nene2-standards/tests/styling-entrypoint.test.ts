/**
 * nene2.styling entryPoint seam の回帰テスト（fleet-tooling#21・payout#161 実弾テスト由来）。
 *
 * 検証:
 * 1. 既定パス解決 — stylingWith() は FSD 正準 `src/shared/ui/theme/index.css` を配線する。
 * 2. 上書き seam — stylingWith({ entryPoint }) は per-repo entry を配線する。
 * 3. fail-loud — entry 不在時は throw する（G-6: 検査不能=unknown・空虚合格禁止。better-tailwindcss の
 *    entry 未発見 silent fallback＝偽陽性洪水を黙って通さない）。
 * 4. payout 形 fixture 回帰 — 正準 entry では合法テーマユーティリティが偽陽性化しない（218 が起きない）・
 *    誤 entry では偽陽性化する（配布既定 'src/index.css' が FSD レイアウトで壊れる実証）。
 * 5. 故意 fail — 正準 entry でも真に存在しないクラスは検出される（検出は live）。
 */
import { fileURLToPath } from 'node:url';

import { ESLint, type Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import { beforeAll, describe, expect, it } from 'vitest';

import { stylingWith, styling, CANONICAL_THEME_ENTRY } from '../src/index.js';

const fixtureDir = fileURLToPath(new URL('./fixtures/styling-entry/', import.meta.url));

const UNKNOWN_RULE = 'better-tailwindcss/no-unknown-classes';

/** parser（typescript-eslint）＋ styling 断片のみで lint し、known-utility の message を返す。 */
async function lintWith(entryPoint: string): Promise<Linter.LintMessage[]> {
  const config: Linter.Config[] = [
    {
      files: ['**/*.tsx'],
      languageOptions: {
        parser: tseslint.parser as never,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
    },
    ...stylingWith({ entryPoint, cwd: fixtureDir }),
  ];
  const eslint = new ESLint({ cwd: fixtureDir, overrideConfigFile: true, overrideConfig: config });
  const results = await eslint.lintFiles(['src/**/*.tsx']);
  return results.flatMap((r) => r.messages).filter((m) => m.ruleId === UNKNOWN_RULE);
}

function unknownClasses(msgs: Linter.LintMessage[]): string[] {
  return msgs
    .map((m) => /Unknown class detected: (.+)$/m.exec(m.message)?.[1])
    .filter((c): c is string => Boolean(c));
}

describe('nene2.styling — entryPoint 既定と seam（fleet-tooling#21）', () => {
  it('stylingWith() の既定 entryPoint は FSD 正準 src/shared/ui/theme/index.css', () => {
    const config = stylingWith({ cwd: fixtureDir });
    const known = config.find((c) => c.name === 'nene2/styling/known-utility');
    const rule = known?.rules?.[UNKNOWN_RULE] as [string, { entryPoint: string }];
    expect(rule[1].entryPoint).toBe('src/shared/ui/theme/index.css');
    expect(CANONICAL_THEME_ENTRY).toBe('src/shared/ui/theme/index.css');
  });

  it('後方互換の静的 styling も既定 entryPoint は FSD 正準（src/index.css から是正）', () => {
    const known = styling.find((c) => c.name === 'nene2/styling/known-utility');
    const rule = known?.rules?.[UNKNOWN_RULE] as [string, { entryPoint: string }];
    expect(rule[1].entryPoint).toBe(CANONICAL_THEME_ENTRY);
  });

  it('stylingWith({ entryPoint }) は per-repo entry を配線する（上書き seam）', () => {
    const config = stylingWith({ entryPoint: 'src/index.css', cwd: fixtureDir });
    const known = config.find((c) => c.name === 'nene2/styling/known-utility');
    const rule = known?.rules?.[UNKNOWN_RULE] as [string, { entryPoint: string }];
    expect(rule[1].entryPoint).toBe('src/index.css');
  });

  it('entry 不在時は fail-loud（throw）— silent fail-open しない（G-6）', () => {
    expect(() => stylingWith({ entryPoint: 'src/does-not-exist.css', cwd: fixtureDir })).toThrow(
      /Tailwind entry point not found/,
    );
  });

  it('entry 存在時は throw しない', () => {
    expect(() => stylingWith({ entryPoint: CANONICAL_THEME_ENTRY, cwd: fixtureDir })).not.toThrow();
  });
});

describe('payout 形 fixture 回帰 — 218 偽陽性が起きないこと（fleet-tooling#21）', () => {
  let canonical: Linter.LintMessage[];
  let shippedDefault: Linter.LintMessage[];

  beforeAll(async () => {
    canonical = await lintWith(CANONICAL_THEME_ENTRY);
    // 配布既定 'src/index.css'（W0.starter レイアウト）— FSD 形 repo では bare entry で theme 未ロード
    shippedDefault = await lintWith('src/index.css');
  }, 120_000);

  it('FSD 正準 entry では合法テーマユーティリティが偽陽性化しない（bg-surface / px-inline-md 等）', () => {
    const classes = unknownClasses(canonical);
    for (const legit of [
      'bg-surface',
      'border-border',
      'px-inline-md',
      'py-stack-sm',
      'gap-inline-sm',
    ]) {
      expect(classes, `${legit} は合法ユーティリティ — unknown にならない`).not.toContain(legit);
    }
  });

  it('故意 fail — 真に存在しないクラス zzz-not-a-real-class-xyz は正準 entry でも検出される（検出は live）', () => {
    expect(unknownClasses(canonical)).toContain('zzz-not-a-real-class-xyz');
  });

  it('配布既定 src/index.css（誤 entry）では同じ合法ユーティリティが偽陽性化する（payout#161 の 218 と同型）', () => {
    const classes = unknownClasses(shippedDefault);
    expect(classes).toContain('bg-surface');
    expect(classes).toContain('px-inline-md');
    // 誤 entry の偽陽性件数は正準 entry の真陽性件数より多い（洪水）。
    expect(shippedDefault.length).toBeGreaterThan(canonical.length);
  });
});
