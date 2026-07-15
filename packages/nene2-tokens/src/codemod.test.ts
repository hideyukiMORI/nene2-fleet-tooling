import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CODEMOD_NAME,
  CODEMOD_VERSION,
  CodemodError,
  NAMESPACE_UTILITY_ROOTS,
  applyRenames,
  buildPlan,
  buildRenameIndex,
  collectDeclaredTokenNames,
  deriveClassRenames,
  namespaceOf,
  reentrantRenames,
} from './codemod.js';
import { CODEMOD_MAP_VERSION } from './codemod-map.js';

/**
 * nene-payout#159（W1 初弾）の **移行前** テーマ現物。
 * 期待値は PR #159 の実測（テーマ 12 トークン rename・TSX 133 置換＝
 * text-accent-contrast×10・spacing 系×109・rounded-md×14）と突き合わせてある。
 */
const payoutBefore = readFileSync(
  fileURLToPath(new URL('./__fixtures__/payout-w1-before.css', import.meta.url)),
  'utf8',
);

describe('codemod runner — versioning (T-4 / M-1)', () => {
  it('exposes a stable codemod name and version for the migration PR body', () => {
    expect(CODEMOD_NAME).toBe('@hideyukimori/nene2-tokens/codemod');
    expect(CODEMOD_VERSION).toBe('1.0.0');
  });

  it('stamps the mapping table version into the plan (写像判断の出所を開示する)', () => {
    const plan = buildPlan(payoutBefore, 'common');
    expect(plan.mapVersion).toBe(CODEMOD_MAP_VERSION);
    expect(plan.codemod).toBe(CODEMOD_NAME);
    expect(plan.table).toBe('common');
  });
});

describe('namespaceOf — Tailwind v4 namespace 照合', () => {
  it('matches longer namespaces before their prefixes (--font-weight-* が font に食われない)', () => {
    expect(namespaceOf('--font-weight-medium')).toBe('font-weight');
    expect(namespaceOf('--font-size-body')).toBe('font');
    expect(namespaceOf('--inset-shadow-glow')).toBe('inset-shadow');
    expect(namespaceOf('--text-shadow-sm')).toBe('text-shadow');
    expect(namespaceOf('--shadow-sm')).toBe('shadow');
  });

  it('falls back to the leading segment for unknown namespaces', () => {
    expect(namespaceOf('--line-height-body')).toBe('line');
  });

  it('yields no utility roots for namespaces v4 does not generate utilities from', () => {
    expect(NAMESPACE_UTILITY_ROOTS['line']).toBeUndefined();
    expect(NAMESPACE_UTILITY_ROOTS['font-weight']).toBeUndefined();
  });
});

describe('collectDeclaredTokenNames', () => {
  it('collects declarations from a *pre-migration* theme (移行前テーマで動かないと使えない)', () => {
    const names = collectDeclaredTokenNames(payoutBefore);
    expect(names).toHaveLength(20);
    expect(names).toContain('--color-accent-contrast');
    expect(names).toContain('--spacing-inline-md');
  });

  it('is fail-closed on a theme with no declarations (G-6: 空虚合格禁止)', () => {
    expect(() => collectDeclaredTokenNames('@theme {\n}\n')).toThrow(CodemodError);
  });

  it('is fail-closed on structural errors', () => {
    expect(() => collectDeclaredTokenNames('@theme {\n  color: red;\n}\n')).toThrow(CodemodError);
  });
});

describe('buildPlan — payout#159 現物での機械導出', () => {
  const plan = buildPlan(payoutBefore, 'common');

  it('derives exactly the 12 token renames PR #159 measured', () => {
    expect(plan.tokenRenames).toEqual([
      { from: '--color-accent-contrast', to: '--color-on-accent' },
      { from: '--spacing-inline-sm', to: '--spacing-x-inline-sm' },
      { from: '--spacing-inline-md', to: '--spacing-x-inline-md' },
      { from: '--spacing-stack-sm', to: '--spacing-x-stack-sm' },
      { from: '--spacing-stack-md', to: '--spacing-x-stack-md' },
      { from: '--spacing-stack-lg', to: '--spacing-x-stack-lg' },
      { from: '--font-family-sans', to: '--font-x-family-sans' },
      { from: '--font-size-body', to: '--font-x-size-body' },
      { from: '--font-size-heading', to: '--font-x-size-heading' },
      { from: '--line-height-body', to: '--line-x-height-body' },
      { from: '--font-weight-medium', to: '--font-x-weight-medium' },
      { from: '--radius-md', to: '--radius-x-md' },
    ]);
  });

  it('leaves contract tokens alone (surface/text-primary/accent/danger/shadow-sm)', () => {
    const renamed = plan.tokenRenames.map((r) => r.from);
    for (const stable of [
      '--color-surface',
      '--color-surface-raised',
      '--color-text-primary',
      '--color-text-muted',
      '--color-border',
      '--color-accent',
      '--color-danger',
      '--shadow-sm',
    ]) {
      expect(renamed).not.toContain(stable);
    }
  });

  it('translates token renames into the utility class renames payout actually needed', () => {
    const index = buildRenameIndex(plan);
    // spacing utility — 109 箇所 dead 化を防いだ本体
    expect(index.get('px-inline-md')).toBe('px-x-inline-md');
    expect(index.get('py-stack-sm')).toBe('py-x-stack-sm');
    expect(index.get('gap-inline-sm')).toBe('gap-x-inline-sm');
    expect(index.get('mx-stack-lg')).toBe('mx-x-stack-lg');
    // radius utility — rounded-md×14
    expect(index.get('rounded-md')).toBe('rounded-x-md');
    // color utility — text-accent-contrast×10
    expect(index.get('text-accent-contrast')).toBe('text-on-accent');
    expect(index.get('bg-accent-contrast')).toBe('bg-on-accent');
    // var(--) 参照の置換にトークン改名も索引へ入る
    expect(index.get('--spacing-inline-md')).toBe('--spacing-x-inline-md');
  });

  it('derives no class renames for namespaces without utilities (--line-height-*)', () => {
    const index = buildRenameIndex(plan);
    expect(index.has('leading-body')).toBe(false);
    expect(index.has('line-height-body')).toBe(false);
  });

  it('reports nothing as unmapped for payout (全 rename が namespace 保存)', () => {
    expect(plan.unmapped).toEqual([]);
  });
});

describe('buildPlan — fail-closed', () => {
  it('refuses unknown color tokens (silent drop 禁止)', () => {
    const theme = '@theme {\n  --color-totally-unknown: red;\n}\n';
    expect(() => buildPlan(theme, 'common')).toThrow(/unknown token/);
  });

  it('refuses when 2 sources collapse onto one target (silent 上書き禁止)', () => {
    // ok → success と success → success が同一座席に集中する
    const theme = '@theme {\n  --color-ok: green;\n  --color-success: lime;\n}\n';
    expect(() => buildPlan(theme, 'common')).toThrow(/conflict/);
  });
});

describe('deriveClassRenames — Tailwind 側の機械翻訳（写像判断は入力済み）', () => {
  it('distributes a spacing rename over every spacing utility root', () => {
    const { classRenames } = deriveClassRenames([
      { from: '--spacing-inline-md', to: '--spacing-x-inline-md' },
    ]);
    const index = new Map(classRenames.map((r) => [r.from, r.to]));
    expect(index.get('p-inline-md')).toBe('p-x-inline-md');
    expect(index.get('gap-y-inline-md')).toBe('gap-y-x-inline-md');
    expect(index.get('max-w-inline-md')).toBe('max-w-x-inline-md');
  });

  it('derives nothing for a namespace with no utility roots', () => {
    expect(
      deriveClassRenames([{ from: '--line-height-body', to: '--line-x-height-body' }]),
    ).toEqual({ classRenames: [], unmapped: [] });
    // suite の prefix-less 改名（--bg → --color-surface）も namespace 'bg' に roots が無い
    expect(deriveClassRenames([{ from: '--bg', to: '--color-surface' }])).toEqual({
      classRenames: [],
      unmapped: [],
    });
  });

  it('discloses (not silently skips) a namespace-changing rename — 防御枝', () => {
    // 写像表 v1.0.1 では到達しない形。表が育ったときに silent skip しないことを固定する。
    const { classRenames, unmapped } = deriveClassRenames([
      { from: '--spacing-inline-md', to: '--color-surface' },
    ]);
    expect(classRenames).toEqual([]);
    expect(unmapped).toEqual([
      {
        from: '--spacing-inline-md',
        to: '--color-surface',
        reason: expect.stringContaining('namespace changes'),
      },
    ]);
  });

  it('refuses when one class would map to two different targets', () => {
    expect(() =>
      deriveClassRenames([
        { from: '--color-fg', to: '--color-text-primary' },
        { from: '--color-fg', to: '--color-text-muted' },
      ]),
    ).toThrow(/class rename conflict/);
  });
});

describe('reentrantRenames — 2 回撃つと壊れる対の開示（#17 の字面衝突）', () => {
  it('flags gap-inline-sm → gap-x-inline-sm as re-entrant (gap-x ルートが再マッチする)', () => {
    const index = buildRenameIndex(buildPlan(payoutBefore, 'common'));
    const reentrant = reentrantRenames(index);
    expect(reentrant).toContainEqual({ from: 'gap-inline-sm', to: 'gap-x-inline-sm' });
    // 索引には gap-x ルート由来のキーが実在する＝2 回目の実行で gap-x-x- になる
    expect(index.get('gap-x-inline-sm')).toBe('gap-x-x-inline-sm');
  });

  it('reports nothing re-entrant when no target is itself a source', () => {
    expect(reentrantRenames(new Map([['a', 'b']]))).toEqual([]);
  });
});

describe('applyRenames — 単一パス（逐次置換の二重置換事故の回帰テスト）', () => {
  const plan = buildPlan(payoutBefore, 'common');
  const index = buildRenameIndex(plan);

  it('does NOT double-replace gap-inline-sm into gap-x-x-inline-sm (payout 35件誤置換の回帰)', () => {
    const out = applyRenames('flex items-center gap-inline-sm', index);
    expect(out.text).toBe('flex items-center gap-x-inline-sm');
    expect(out.text).not.toContain('gap-x-x-');
    expect(out.count).toBe(1);
  });

  it('keeps variant colon prefixes', () => {
    const out = applyRenames('hover:bg-accent-contrast md:px-inline-md', index);
    expect(out.text).toBe('hover:bg-on-accent md:px-x-inline-md');
    expect(out.count).toBe(2);
  });

  it('respects class boundaries (部分一致で撃たない)', () => {
    const out = applyRenames('px-inline-mdx px-inline-md-2 xpx-inline-md', index);
    expect(out.text).toBe('px-inline-mdx px-inline-md-2 xpx-inline-md');
    expect(out.count).toBe(0);
  });

  it('rewrites var(--) references', () => {
    const out = applyRenames('var(--spacing-inline-md)', index);
    expect(out.text).toBe('var(--spacing-x-inline-md)');
  });

  it('counts every occurrence — 109 spacing utilities stay live (payout 実測の模擬)', () => {
    const spacing = [
      'px-inline-md',
      'py-stack-sm',
      'gap-inline-sm',
      'gap-stack-md',
      'px-inline-sm',
    ];
    // payout 実測と同じ 109 箇所を組み立てる
    const occurrences: string[] = [];
    for (let i = 0; i < 109; i++) occurrences.push(spacing[i % spacing.length]!);
    const source = occurrences.join(' ');
    const out = applyRenames(source, index);
    expect(out.count).toBe(109);
    // 全部が x- 送り後の綴りになっている＝ dead 化しない
    expect(out.text.split(' ').every((c) => c.includes('-x-'))).toBe(true);
    expect(out.text).not.toContain('-x-x-');
  });
});
