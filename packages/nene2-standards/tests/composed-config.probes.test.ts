/**
 * 合成済み最終 config への検出プローブ（規約 05 §2.2 冒頭 [C:パッケージテスト] MUST）。
 *
 * 「重複定義が潰し得るレイヤ位置」のフィクスチャ（features / shared/ui / client.ts / tests）で
 * 各禁止につき最低1本を検知する。gate-integrity（severity 照合）では統合ミスを検出できない
 * （置換後も severity は error のまま — 会議R4 AM-16 の合成 config への適用）。
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { ESLint, type Linter } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

const fixtureDir = fileURLToPath(new URL('./fixtures/probe-app/', import.meta.url));

type MessagesByFile = Map<string, Linter.LintMessage[]>;

let messagesByFile: MessagesByFile;
let eslint: ESLint;

function messagesFor(relPath: string): Linter.LintMessage[] {
  const abs = path.join(fixtureDir, relPath);
  return messagesByFile.get(abs) ?? [];
}

function ruleIdsFor(relPath: string): Set<string> {
  return new Set(messagesFor(relPath).map((m) => m.ruleId ?? ''));
}

beforeAll(async () => {
  // resolver の project: ['tsconfig.json'] は実行 cwd 相対 — 製品での実行形（frontend/ から
  // 実行）と同じ条件を作るため、config モジュールの評価前に fixture へ chdir する
  process.chdir(fixtureDir);
  const { composedConfig } = await import('../src/index.js');
  eslint = new ESLint({
    cwd: fixtureDir,
    overrideConfigFile: true,
    overrideConfig: composedConfig(),
  });
  const results = await eslint.lintFiles(['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}']);
  messagesByFile = new Map(results.map((r) => [r.filePath, r.messages]));
}, 120_000);

describe('検出プローブ — api（A-1/A-2/R1③）', () => {
  it('features 位置で生 fetch を検知する（bare/window/globalThis の3形）', () => {
    const msgs = messagesFor('src/features/probe-slice/fetch-probe.ts');
    expect(msgs.some((m) => m.ruleId === 'no-restricted-globals')).toBe(true);
    const syntax = msgs.filter((m) => m.ruleId === 'no-restricted-syntax');
    expect(syntax.some((m) => m.message.includes('window.fetch'))).toBe(true);
    expect(syntax.some((m) => m.message.includes('globalThis.fetch'))).toBe(true);
  });

  it('features 位置（css pattern 追加集合）でも axios/zustand/CSS-in-JS 禁止が生きている', () => {
    const msgs = messagesFor('src/features/probe-slice/imports-probe.ts');
    const restricted = msgs.filter((m) => m.ruleId === 'no-restricted-imports');
    for (const name of ['axios', 'zustand', 'styled-components', '@emotion/react']) {
      expect(
        restricted.some((m) => m.message.includes(name) || msgText(m, name)),
        `${name} import が検知されること`,
      ).toBe(true);
    }
  });

  it('スライス跨ぎ相対 import（../../）と集約バレル @/shared/ui を検知する', () => {
    const msgs = messagesFor('src/features/probe-slice/imports-probe.ts');
    const restricted = msgs.filter((m) => m.ruleId === 'no-restricted-imports');
    expect(restricted.some((m) => m.message.includes('スライス跨ぎ'))).toBe(true);
    expect(restricted.some((m) => m.message.includes('集約バレル'))).toBe(true);
  });

  it('per-component import（@/shared/ui/<component>）は禁止されない（#19 正例プローブ）', () => {
    const restricted = messagesFor('src/features/probe-slice/allowed-imports-probe.ts').filter(
      (m) => m.ruleId === 'no-restricted-imports',
    );
    expect(restricted).toEqual([]);
  });

  it('features からの .css import を検知する（AM-8(c)）', () => {
    const msgs = messagesFor('src/features/probe-slice/css-probe.ts');
    expect(
      msgs.some((m) => m.ruleId === 'no-restricted-imports' && m.message.includes('CSS の import')),
    ).toBe(true);
  });

  it('useSuspenseQuery の新規使用を検知する（R1③）', () => {
    expect(ruleIdsFor('src/features/probe-slice/suspense-probe.ts')).toContain(
      '@typescript-eslint/no-restricted-imports',
    );
  });

  it('client.ts は A-1 例外（fetch 系 error 0）— AM-20 の唯一の例外パス', () => {
    const msgs = messagesFor('src/shared/api/client.ts');
    expect(msgs.some((m) => m.ruleId === 'no-restricted-globals')).toBe(false);
    expect(
      msgs.some((m) => m.ruleId === 'no-restricted-syntax' && m.message.includes('fetch')),
    ).toBe(false);
  });
});

describe('検出プローブ — fsd 境界（R1①）', () => {
  it('shared → features の下位→上位 import を検知する（zones）', () => {
    expect(ruleIdsFor('src/shared/probe/boundary-probe.ts')).toContain(
      'import-x/no-restricted-paths',
    );
  });
});

describe('検出プローブ — styling（R1⑤・R2⑥・R4 AM-5/AM-8/AM-13）', () => {
  it('styling 7セレクタ全てを features 位置で検知する', () => {
    const syntax = messagesFor('src/features/probe-slice/styling-probe.tsx').filter(
      (m) => m.ruleId === 'no-restricted-syntax',
    );
    const expects = [
      'arbitrary value',
      'dark: variant',
      '文字列補間',
      'data-theme の JS 付与',
      'data-theme 読み取り',
      'setProperty',
      'style 要素注入',
    ];
    for (const needle of expects) {
      expect(
        syntax.some((m) => m.message.includes(needle)),
        `styling セレクタ「${needle}」が検知されること`,
      ).toBe(true);
    }
  });

  it('arbitrary VARIANT（data-[tone=x]: 等）は誤検知せず、variant 下の arbitrary VALUE は検知する（#142）', () => {
    const msgs = messagesFor('src/features/probe-slice/arbitrary-variant-probe.tsx').filter(
      (m) => m.ruleId === 'no-restricted-syntax' && m.message.includes('arbitrary value'),
    );
    // fixture 内の flag 対象は hover:p-[17px] の1行のみ（data-[tone=x]:… / [&:nth-child]:… は許容）
    expect(msgs).toHaveLength(1);
    expect(msgs[0].message).toContain('arbitrary value');
  });

  it('style prop は CSS 変数注入のみ許可（nene2/style-prop-css-vars-only）', () => {
    const msgs = messagesFor('src/features/probe-slice/style-prop-probe.tsx').filter(
      (m) => m.ruleId === 'nene2/style-prop-css-vars-only',
    );
    // 非 CSS 変数キー・リテラル色・非リテラル未登録の3件のみ（許可形は検知しない）
    expect(msgs).toHaveLength(3);
    const lines = msgs.map((m) => m.line).sort((a, b) => a - b);
    expect(new Set(lines).size).toBe(3);
  });

  it('known-utility fast path が unknown class を warn で検知する（severity プレースホルダ）', () => {
    const msgs = messagesFor('src/features/probe-slice/unknown-class-probe.tsx').filter(
      (m) => m.ruleId === 'better-tailwindcss/no-unknown-classes',
    );
    expect(msgs.length).toBeGreaterThan(0);
    expect(msgs.every((m) => m.severity === 1)).toBe(true); // O-6 生成前の起草プレースホルダ = warn
  });
});

describe('検出プローブ — i18n / a11y（R1②⑦・AM-18）', () => {
  it('Intl 直呼び・toLocaleString・lang 代入を検知する', () => {
    const syntax = messagesFor('src/features/probe-slice/intl-probe.ts').filter(
      (m) => m.ruleId === 'no-restricted-syntax',
    );
    expect(syntax.some((m) => m.message.includes('Intl 直呼び'))).toBe(true);
    expect(syntax.some((m) => m.message.includes('nene2-i18n/format'))).toBe(true);
    expect(syntax.some((m) => m.message.includes('lang 属性'))).toBe(true);
  });

  it('shared/ui からの @/shared/i18n import を検知し、base 禁止（axios）も生きている', () => {
    const restricted = messagesFor('src/shared/ui/probe/ui-probe.tsx').filter(
      (m) => m.ruleId === 'no-restricted-imports',
    );
    expect(restricted.some((m) => m.message.includes('required prop'))).toBe(true);
    expect(restricted.some((m) => m.message.includes('A-1'))).toBe(true);
  });

  it('jsx-a11y strict が有効（img alt 欠落）', () => {
    expect(ruleIdsFor('src/features/probe-slice/a11y-probe.tsx')).toContain('jsx-a11y/alt-text');
  });

  it('カタログの家（shared/i18n/messages）は lint 対象で、Intl 禁止は適用されたまま', async () => {
    const cfg = (await eslint.calculateConfigForFile(
      path.join(fixtureDir, 'src/shared/i18n/messages/ja.ts'),
    )) as { rules: Record<string, unknown[]> };
    const entry = cfg.rules['no-restricted-syntax'];
    expect(entry).toBeDefined();
    const selectors = (entry as [number, ...{ selector: string }[]]).slice(1) as {
      selector: string;
    }[];
    expect(selectors.some((s) => s.selector.includes('Intl'))).toBe(true);
  });
});

describe('検出プローブ — testing（R2⑧）', () => {
  it('vi.mock(client) と getByTestId を tests/** で検知する', () => {
    const syntax = messagesFor('tests/msw-probe.fixture.ts').filter(
      (m) => m.ruleId === 'no-restricted-syntax',
    );
    expect(syntax.some((m) => m.message.includes('MSW'))).toBe(true);
    expect(syntax.some((m) => m.message.includes('testid-allowlist'))).toBe(true);
  });
});

describe('合成規律 — (ルール, ファイル) ごとの実効定義がちょうど1つ（05 §2.2 冒頭 MUST）', () => {
  // 統合ミス（後勝ち全置換）が起きると実効セレクタ集合が欠ける — calculateConfigForFile 実測
  //（05 §10.2 の「calculateConfigForFile 方式は実測未実施」の実測を兼ねる）
  it('app ファイルの no-restricted-syntax は api+styling+i18n の統合集合', async () => {
    const cfg = (await eslint.calculateConfigForFile(
      path.join(fixtureDir, 'src/features/probe-slice/intl-probe.ts'),
    )) as { rules: Record<string, unknown[]> };
    const selectors = (cfg.rules['no-restricted-syntax'] ?? []).slice(1) as {
      selector: string;
    }[];
    const set = selectors.map((s) => s.selector).join('\n');
    expect(set).toContain("object.name='window'"); // api
    expect(set).toContain('dark:'); // styling
    expect(set).toContain('Intl'); // i18n
  });

  it('client.ts は fetch セレクタのみ免除・styling/i18n セレクタは適用されたまま', async () => {
    const cfg = (await eslint.calculateConfigForFile(
      path.join(fixtureDir, 'src/shared/api/client.ts'),
    )) as { rules: Record<string, unknown[]> };
    expect((cfg.rules['no-restricted-globals'] ?? [])[0]).toBe(0); // off（登録済み例外）
    expect((cfg.rules['no-restricted-imports'] ?? [])[0]).toBe(0); // off（登録済み例外）
    const selectors = (cfg.rules['no-restricted-syntax'] ?? []).slice(1) as {
      selector: string;
    }[];
    const set = selectors.map((s) => s.selector).join('\n');
    expect(set).not.toContain("property.name='fetch'");
    expect(set).toContain('dark:');
    expect(set).toContain('Intl');
  });
});

function msgText(m: Linter.LintMessage, name: string): boolean {
  // no-restricted-imports のメッセージにパッケージ名が含まれない ESLint 版のフォールバック
  return (m.message.match(/'[^']+'/)?.[0] ?? '').includes(name);
}
