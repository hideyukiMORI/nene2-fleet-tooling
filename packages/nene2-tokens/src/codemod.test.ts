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
import { CODEMOD_MAP_VERSION, classifyTokenName } from './codemod-map.js';

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
    const plan = buildPlan(payoutMappable, 'common');
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

  it('returns null for unknown namespaces — 発明しない (C part-1 #92)', () => {
    // かつては先頭セグメント 'line' を発明し、dead token `--line-x-height-body`（#17）と
    // re-run の silent 二重送り（#90 実測）の発生源だった。
    expect(namespaceOf('--line-height-body')).toBeNull();
    expect(namespaceOf('--z-modal')).toBeNull();
  });

  it('yields no utility roots for namespaces v4 does not generate utilities from', () => {
    // `--line-height-*` は v4 namespace ではない（v4 の line-height は `--leading-*`）。
    expect(NAMESPACE_UTILITY_ROOTS['line']).toBeUndefined();
  });

  // #17 の訂正: v4 は `--font-weight-*` から `font-*` utility を **生成する**
  //（実測 tailwindcss 4.3.2: `--font-weight-medium` → `.font-medium { font-weight: … }`）。
  // 旧テストはこれを undefined と固定しており、事実に反する思い込みを pin していた。
  // そのため `font-medium → font-x-medium` が導出されず silent skip になっていた。
  it('does generate font-* utilities from the --font-weight-* namespace (#17)', () => {
    expect(NAMESPACE_UTILITY_ROOTS['font-weight']).toEqual(['font']);
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

/**
 * C part-1（#92）: 現物 payout theme は `--line-height-body`（v4 namespace 外）を含むため、
 * buildPlan はそこで loud stop する（(i)reject — 語彙判断が写像表に入るまで撃たせない）。
 * 翻訳系のテストはこの 1 宣言を除いた theme（payoutMappable）で行う。
 */
const payoutMappable = payoutBefore.replace(/^\s*--line-height-body:.*\n/m, '');

describe('buildPlan — payout#159 現物での機械導出', () => {
  const plan = buildPlan(payoutMappable, 'common');

  it('refuses the 現物 payout theme — --line-height-body has no v4 namespace ((i)reject・C part-1 #92)', () => {
    // v1.1.0 までは 'line' を発明して `--line-x-height-body` を吐いていた（dead token）。
    // 語彙の再ホーム（--leading-x-body 等）は語彙判断＝C part-2 に据え置き（#17 と同じ線）。
    expect(() => buildPlan(payoutBefore, 'common')).toThrow(/--line-height-body/);
  });

  // NOTE(#17): `--font-weight-medium` の行だけ payout#159 の**実際の出力と異なる**。
  // #159 は写像表 v1.0.0 の naive x- 送りで `--font-x-weight-medium` を吐いており、それは
  // v4 の font-family namespace のキー `x-weight-medium` に変質していた（実測 4.3.2:
  // `.font-x-weight-medium { font-family: … }`）。#159 の payout では `font-medium` が
  // Tailwind 既定の 500 へ無言フォールバックし、payout の authored 値も 500 だったため
  // **偶然**無害だった。v1.0.2 は namespace を保存するので font-weight 値が実際に生き残る。
  // 既に移行済みの payout 現物との差分は PR 本文で開示済み（payout 側の追随は別 issue）。
  // NOTE(C part-1 #92): PR #159 実測は 12 rename（`--line-height-body → --line-x-height-body`
  // を含む）。この行は fallback の namespace 発明が吐いた dead token であり、C part-1 で
  // rename ではなく **reject** になった（上のテストで固定）。残り 11 行は #159 実測と一致。
  it('derives exactly the 11 mappable token renames PR #159 measured (#17/#92)', () => {
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
      { from: '--font-weight-medium', to: '--font-weight-x-medium' },
      { from: '--radius-md', to: '--radius-x-md' },
    ]);
  });

  // #17: naive 送りが v4 の multi-segment namespace を割っていた回帰の固定。
  // `--font-size-*` は 'font' が v4 namespace なので x- 送りされる（--font-x-size-*）。
  // `--line-height-*` は v4 namespace 外＝ C part-1（#92）で reject（上のテスト）。
  // 「legacy 綴りを v4 namespace へ再ホームするか（--font-size-body → --text-x-body・
  // --line-height-body → --leading-x-body 等）」は語彙判断なので据え置きのまま — C part-2 へ。
  it('preserves the v4 namespace when inserting x- (#17)', () => {
    expect(classifyTokenName('--font-weight-medium')).toEqual({
      kind: 'rename',
      name: '--font-weight-x-medium',
    });
    expect(classifyTokenName('--inset-shadow-glow')).toEqual({
      kind: 'rename',
      name: '--inset-shadow-x-glow',
    });
    expect(classifyTokenName('--text-shadow-glow')).toEqual({
      kind: 'rename',
      name: '--text-shadow-x-glow',
    });
    expect(classifyTokenName('--drop-shadow-glow')).toEqual({
      kind: 'rename',
      name: '--drop-shadow-x-glow',
    });
    // 未知 namespace（v4 に無い）は x-送りせず reject（C part-1 #92 — v1.1.0 までは
    // `--z-x-modal` を発明していた）
    expect(classifyTokenName('--z-modal').kind).toBe('reject');
  });

  it('still rejects empty-key names (`--font-`) — 写像を発明しない (#17 回帰)', () => {
    // namespace 照合が「キーが空でも一致する」ため、非空要件を明示的に保つ必要がある。
    for (const bad of ['--font-', '--font-weight-', '--spacing-', '--z-']) {
      expect(classifyTokenName(bad).kind).toBe('reject');
    }
  });

  it('derives the font-weight class rename that used to be silently skipped (#17)', () => {
    // roots['font-weight'] が未登録だったため `font-medium` は改名されず、テーマ側だけ
    // 改名されて Tailwind 既定値へ無言フォールバックしていた。
    const index = buildRenameIndex(plan);
    expect(index.get('font-medium')).toBe('font-x-medium');
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

  it('rejects already-x-sent unknown-namespace tokens instead of re-sending (#90 の根治)', () => {
    // v1.1.0 実測: `--line-x-height-body → --line-x-x-height-body`・`--z-x-modal → --z-x-x-modal`
    // （fallback の namespace 再発明による silent 二重送り）。C part-1 後は loud reject。
    expect(classifyTokenName('--line-x-height-body').kind).toBe('reject');
    expect(classifyTokenName('--z-x-modal').kind).toBe('reject');
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

  it('derives nothing for a rename whose source has no v4 namespace (ns=null は class 翻訳対象なし)', () => {
    // buildPlan 経由では未知 namespace は写像段で reject 済み（C part-1 #92）だが、
    // 直接 API には表決定の prefix-less rename が正当に到達する。v4 は namespace 外の
    // トークンから utility を生成しないので、class 翻訳対象は存在しない＝空が正。
    expect(
      deriveClassRenames([{ from: '--line-height-body', to: '--line-x-height-body' }]),
    ).toEqual({ classRenames: [], unmapped: [] });
    // suite の prefix-less 改名（--bg → --color-surface）
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
    const index = buildRenameIndex(buildPlan(payoutMappable, 'common'));
    const reentrant = reentrantRenames(index);
    expect(reentrant).toContainEqual({ from: 'gap-inline-sm', to: 'gap-x-inline-sm' });
    // 索引には gap-x ルート由来のキーが実在する＝2 回目の実行で gap-x-x- になる
    expect(index.get('gap-x-inline-sm')).toBe('gap-x-x-inline-sm');
  });

  it('reports nothing re-entrant when no target is itself a source', () => {
    expect(reentrantRenames(new Map([['a', 'b']]))).toEqual([]);
  });
});

/**
 * #17 の衝突面（gap-x / space-x / inset-x / border-x）の写像表テスト。
 *
 * x- 送りは `gap-x-*`（column-gap）・`inset-x-*`（inset-inline）という **v4 実在の軸ルート**と
 * 字面が衝突する。ここで固定するのは「軸ルート側のクラスも独立に改名されるので、移行を
 * **完了すれば**軸の意味論は保たれる」という不変条件。
 */
describe('x- 送りの字面衝突面 — 軸ルート（#17）', () => {
  const index = buildRenameIndex(buildPlan(payoutMappable, 'common'));

  it('renames the axis-root classes independently (軸の意味は移行完了後に保たれる)', () => {
    // 非軸ルート: gap[inline-sm] → gap[x-inline-sm]
    expect(index.get('gap-inline-sm')).toBe('gap-x-inline-sm');
    // 軸ルート: column-gap[inline-sm] → column-gap[x-inline-sm]（x- が 2 つ並ぶ綴りが正）
    expect(index.get('gap-x-inline-sm')).toBe('gap-x-x-inline-sm');
    expect(index.get('inset-x-inline-sm')).toBe('inset-x-x-inline-sm');
    expect(index.get('space-x-inline-sm')).toBe('space-x-x-inline-sm');
  });

  it('does not touch border-x-* (border 幅/色は --spacing-* namespace ではない)', () => {
    expect(index.get('border-x-inline-sm')).toBeUndefined();
  });
});

/**
 * Tailwind v4 の **実 emit** に対する実測テスト（tailwindcss は root devDependency）。
 *
 * #17 の根本原因は「v4 の namespace 意味論についての思い込みが、どこでも実測されていなかった」
 * こと（`NAMESPACE_UTILITY_ROOTS['font-weight']` を undefined と pin した旧テストが実例）。
 * ここだけは Tailwind 本体に emit させて突き合わせ、思い込みが再び固定されるのを防ぐ。
 */
describe('Tailwind v4 emit 実測 — x- 送りが namespace 意味論を保存する（#17）', () => {
  const emit = async (theme: string, candidates: string[]): Promise<string> => {
    const { compile } = await import('tailwindcss');
    const compiler = await compile(`@theme { ${theme} }\n@tailwind utilities;`, {
      base: '/',
      loadStylesheet: async () => ({ base: '/', content: '' }),
    });
    return compiler.build(candidates);
  };

  it('keeps --font-weight-* in the font-weight namespace (naive 送りは font-family へ変質した)', async () => {
    const css = await emit(`--font-weight-x-medium: 555; --font-x-weight-medium: 556;`, [
      'font-x-medium',
      'font-x-weight-medium',
    ]);
    // v1.0.2 の出力 — font-weight のまま
    expect(css).toContain('font-weight: var(--font-weight-x-medium)');
    // v1.0.0/v1.0.1 の出力 — font-family に変質していた（#17 の事象そのもの）
    expect(css).toContain('font-family: var(--font-x-weight-medium)');
  });

  it('resolves the gap-x collision to the non-axis reading post-migration (綱渡りの実測)', async () => {
    const css = await emit(`--spacing-x-inline-sm: 4px;`, ['gap-x-inline-sm', 'gap-x-x-inline-sm']);
    // `gap-x-inline-sm` は column-gap ではなく gap[x-inline-sm] に解決される
    expect(css).toContain('.gap-x-inline-sm {\n  gap: var(--spacing-x-inline-sm);');
    // 軸ルートを保ちたければ x- が 2 つ要る＝上の写像表テストの綴りが正しい
    expect(css).toContain('.gap-x-x-inline-sm {\n  column-gap: var(--spacing-x-inline-sm);');
  });
});

describe('applyRenames — 単一パス（逐次置換の二重置換事故の回帰テスト）', () => {
  const plan = buildPlan(payoutMappable, 'common');
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
