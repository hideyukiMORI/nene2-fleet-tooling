import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CODEMOD_MAP_V1,
  ORIGIN_TABLE,
  REMEDIATION_V1,
  SUITE_TABLE,
  VAULT_TABLE,
  classifyTokenName,
  mapTokenName,
  mapTokenSet,
} from './codemod-map.js';

describe('codemod mapping table v1 (versioned)', () => {
  it('is versioned (M-1: 使い捨てスクリプト化 MUST NOT)', () => {
    expect(CODEMOD_MAP_V1.version).toBe('1.0.2');
    expect(CODEMOD_MAP_V1.contract).toBe('1.0');
  });

  it('applies the R2⑥(B) decided mappings', () => {
    expect(mapTokenName('--color-fg')).toBe('--color-text-primary');
    expect(mapTokenName('--color-fg-muted')).toBe('--color-text-muted');
    expect(mapTokenName('--color-fg-faint')).toBe('--color-text-faint');
    expect(mapTokenName('--color-fg-inverse')).toBe('--color-text-inverse');
    expect(mapTokenName('--color-ok')).toBe('--color-success');
    expect(mapTokenName('--color-warning')).toBe('--color-warn');
    expect(mapTokenName('--color-accent-contrast')).toBe('--color-on-accent');
  });

  it('applies the AM-3 additions', () => {
    expect(mapTokenName('--color-accent-weak')).toBe('--color-accent-soft');
    expect(mapTokenName('--color-brand-violet')).toBe('--color-x-brand-violet');
    expect(mapTokenName('--color-danger-hover')).toBe('--color-x-danger-hover');
  });

  it('generic *-ink → on-* rule (⑥(B))', () => {
    expect(mapTokenName('--color-accent-ink')).toBe('--color-on-accent');
  });

  it('origin table: primary/muted → text-primary/text-muted', () => {
    expect(mapTokenName('--color-primary', 'origin')).toBe('--color-text-primary');
    expect(mapTokenName('--color-muted', 'origin')).toBe('--color-text-muted');
  });

  it('vault table: line→border (decided) and the individual table rows', () => {
    expect(mapTokenName('--color-line', 'vault')).toBe('--color-border');
    expect(mapTokenName('--color-line-strong', 'vault')).toBe('--color-border-strong');
    expect(mapTokenName('--color-bg', 'vault')).toBe('--color-surface');
    expect(mapTokenName('--color-navy', 'vault')).toBe('--color-accent');
    expect(mapTokenName('--color-on-navy', 'vault')).toBe('--color-on-accent');
    expect(mapTokenName('--color-warning-ink', 'vault')).toBe('--color-on-warn');
    expect(mapTokenName('--color-brass', 'vault')).toBe('--color-x-brass');
    expect(mapTokenName('--color-text', 'vault')).toBe('--color-text-primary');
  });

  it('contract & extension names pass through unchanged', () => {
    expect(mapTokenName('--color-text-primary')).toBe('--color-text-primary');
    expect(mapTokenName('--color-x-approved')).toBe('--color-x-approved');
    expect(mapTokenName('--shadow-focus')).toBe('--shadow-focus');
  });

  it('unknown color keys map to null (caller must reject — silent drop prohibited)', () => {
    expect(mapTokenName('--color-mystery-role')).toBeNull();
  });

  it('non-contract categories go to mechanical x- namespacing (AM-3 scope)', () => {
    expect(mapTokenName('--radius-md')).toBe('--radius-x-md');
    expect(mapTokenName('--font-sans')).toBe('--font-x-sans');
    expect(mapTokenName('--shadow-glow')).toBe('--shadow-x-glow');
  });
});

/* ------------------------------------------------------------------ */
/* #24 point5 — classifyTokenName の型で contract/rename/passthrough/reject を区別 */
/* ------------------------------------------------------------------ */

describe('classifyTokenName (fatal null と pass-through を型で区別 — #24)', () => {
  it('already-contract/extension token → kind:contract', () => {
    expect(classifyTokenName('--color-surface')).toEqual({
      kind: 'contract',
      name: '--color-surface',
    });
    expect(classifyTokenName('--color-x-approved')).toEqual({
      kind: 'contract',
      name: '--color-x-approved',
    });
  });
  it('renamed token → kind:rename', () => {
    expect(classifyTokenName('--color-fg')).toEqual({
      kind: 'rename',
      name: '--color-text-primary',
    });
  });
  it('excluded namespace → kind:passthrough (NOT reject — legit Tailwind @theme token)', () => {
    expect(classifyTokenName('--breakpoint-lg')).toEqual({
      kind: 'passthrough',
      name: '--breakpoint-lg',
    });
    expect(classifyTokenName('--container-form')).toEqual({
      kind: 'passthrough',
      name: '--container-form',
    });
  });
  it('unknown color token → kind:reject (fail-closed)', () => {
    const r = classifyTokenName('--color-mystery-role');
    expect(r.kind).toBe('reject');
  });
  it('mapTokenName: passthrough returns the name (non-null); only reject is null', () => {
    // #24 point5 の挙動変更: 除外 namespace は fatal null ではなく pass-through
    expect(mapTokenName('--breakpoint-lg')).toBe('--breakpoint-lg');
    expect(mapTokenName('--container-main')).toBe('--container-main');
    expect(mapTokenName('--color-mystery-role')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* #23 — SUITE_TABLE（prefix-less 全名写像・PR #381 実証済み）              */
/* ------------------------------------------------------------------ */

describe('#23 SUITE_TABLE (prefix-less vocabulary)', () => {
  it('every SUITE_TABLE key maps to its recorded target and never NULL', () => {
    for (const [bare, target] of Object.entries(SUITE_TABLE)) {
      expect(mapTokenName(`--${bare}`, 'suite')).toBe(target);
    }
  });

  it('single-segment prefix-less names no longer fall to NULL (#23 原因3)', () => {
    // 旧: --bg / --r / --shadow は汎用 x- 送り正規表現でハイフン不一致 → NULL
    expect(mapTokenName('--bg', 'suite')).toBe('--color-surface');
    expect(mapTokenName('--r', 'suite')).toBe('--r-x-base');
    expect(mapTokenName('--shadow', 'suite')).toBe('--shadow-md');
    expect(mapTokenName('--fg-2', 'suite')).toBe('--color-text-muted');
    expect(mapTokenName('--brand-strong', 'suite')).toBe('--color-x-brand-strong');
  });

  it('already-contract --shadow-lg is left untouched (not in SUITE_TABLE)', () => {
    expect(mapTokenName('--shadow-lg', 'suite')).toBe('--shadow-lg');
  });

  it('mapping counts: 16 contract-rename + 27 x- extension = 43 mapped (44th name --shadow-lg is already contract, untouched)', () => {
    const targets = Object.values(SUITE_TABLE);
    const xSend = targets.filter((t) => /^--[a-z0-9]+-x-/.test(t));
    const contract = targets.filter((t) => !/^--[a-z0-9]+-x-/.test(t));
    expect(targets.length).toBe(43);
    expect(xSend.length).toBe(27);
    expect(contract.length).toBe(16);
    // PR #381 の「契約名 rename 17」= 16 rename + 不変 --shadow-lg（既に契約名・非収載）
    expect(mapTokenName('--shadow-lg', 'suite')).toBe('--shadow-lg');
  });

  it('the whole suite vocabulary maps with 0 NULL and 0 conflicts', () => {
    const names = Object.keys(SUITE_TABLE).map((k) => `--${k}`);
    const r = mapTokenSet(names, 'suite');
    expect(r.rejected).toEqual([]);
    expect(r.conflicts).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* #24 — ORIGIN_TABLE をフル現物列挙に拡張 + 衝突裁定 + breakpoint pass-through */
/* ------------------------------------------------------------------ */

describe('#24 ORIGIN_TABLE (full 現物 enumeration)', () => {
  it('accent 衝突の裁定: contrast→on-accent / ink→x-accent-ink (別値・別座席)', () => {
    expect(mapTokenName('--color-accent-contrast', 'origin')).toBe('--color-on-accent');
    expect(mapTokenName('--color-accent-ink', 'origin')).toBe('--color-x-accent-ink');
  });
  it('warning 系: soft→warn-soft / ink→on-warn (契約語彙)', () => {
    expect(mapTokenName('--color-warning', 'origin')).toBe('--color-warn');
    expect(mapTokenName('--color-warning-soft', 'origin')).toBe('--color-warn-soft');
    expect(mapTokenName('--color-warning-ink', 'origin')).toBe('--color-on-warn');
  });
  it('status ink (現物): danger/success/info → on-<role>', () => {
    expect(mapTokenName('--color-danger-ink', 'origin')).toBe('--color-on-danger');
    expect(mapTokenName('--color-success-ink', 'origin')).toBe('--color-on-success');
    expect(mapTokenName('--color-info-ink', 'origin')).toBe('--color-on-info');
  });
  it('neutral (契約ロール外) → x- 送り (on-neutral は契約に無い)', () => {
    expect(mapTokenName('--color-neutral-soft', 'origin')).toBe('--color-x-neutral-soft');
    expect(mapTokenName('--color-neutral-ink', 'origin')).toBe('--color-x-neutral-ink');
  });
  it('overlay → scrim (契約) / accent-glow → x- (装飾)', () => {
    expect(mapTokenName('--color-overlay', 'origin')).toBe('--color-scrim');
    expect(mapTokenName('--color-accent-glow', 'origin')).toBe('--color-x-accent-glow');
  });
  it('breakpoint/container namespace → pass-through (NOT fatal null — #24 point4)', () => {
    for (const n of [
      '--breakpoint-narrow',
      '--breakpoint-tablet',
      '--breakpoint-rail',
      '--breakpoint-wide',
      '--container-form',
      '--container-form-wide',
      '--container-main',
    ]) {
      expect(classifyTokenName(n, 'origin').kind).toBe('passthrough');
      expect(mapTokenName(n, 'origin')).toBe(n);
    }
  });

  it('the real origin themes (default.css + dark.css) map with 0 NULL — faithful 実測', () => {
    const names = new Set<string>();
    for (const f of ['./__fixtures__/origin-default.css', './__fixtures__/origin-dark.css']) {
      const src = readFileSync(fileURLToPath(new URL(f, import.meta.url)), 'utf8');
      for (const m of src.matchAll(/^\s*(--[a-z][a-z0-9-]*)\s*:/gim)) names.add(m[1]!);
    }
    expect(names.size).toBeGreaterThan(40);
    const nulls = [...names].filter((n) => mapTokenName(n, 'origin') === null);
    expect(nulls).toEqual([]);
  });

  it('the real origin themes map with 0 conflicts (accent-ink disambiguation resolves it)', () => {
    const names = new Set<string>();
    for (const f of ['./__fixtures__/origin-default.css', './__fixtures__/origin-dark.css']) {
      const src = readFileSync(fileURLToPath(new URL(f, import.meta.url)), 'utf8');
      for (const m of src.matchAll(/^\s*(--[a-z][a-z0-9-]*)\s*:/gim)) names.add(m[1]!);
    }
    const r = mapTokenSet([...names], 'origin');
    expect(r.rejected).toEqual([]);
    expect(r.conflicts).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* #24 point2 — ink 規則バグ (warning-ink → on-warning) の回帰                */
/* ------------------------------------------------------------------ */

describe('#24 ink-rule bug (*-ink fires before warning→warn synonym)', () => {
  it('warning-ink → on-warn (契約語彙) — NOT the contract-external on-warning', () => {
    // COMMON 表経路（origin 表に無くても）でも正規化が ink 規則より先に効く
    expect(mapTokenName('--color-warning-ink', 'common')).toBe('--color-on-warn');
    expect(mapTokenName('--color-warning-ink')).not.toBe('--color-on-warning');
  });
  it('ok-ink → on-success (同義正規化 ok→success を ink より先に)', () => {
    expect(mapTokenName('--color-ok-ink', 'common')).toBe('--color-on-success');
  });
  it('normal roles still use the plain ink rule', () => {
    expect(mapTokenName('--color-danger-ink', 'common')).toBe('--color-on-danger');
  });
});

/* ------------------------------------------------------------------ */
/* #25 — 個別表引きを契約短絡より先に評価する（vault surface→surface-raised）    */
/* ------------------------------------------------------------------ */

describe('#25 table lookup precedes the contract short-circuit', () => {
  it('vault --color-surface → --color-surface-raised (NOT swallowed by contract short-circuit)', () => {
    // vault の surface は pre-contract 名（カード面）で、契約名 --color-surface と綴り衝突する。
    // 契約短絡が先だと --color-surface のまま素通り → bg→surface と潰し合う（#25）。
    expect(mapTokenName('--color-surface', 'vault')).toBe('--color-surface-raised');
    expect(VAULT_TABLE['surface']).toBe('surface-raised');
  });
  it('vault bg and surface no longer collide on --color-surface', () => {
    // bg → --color-surface, surface → --color-surface-raised: 別座席
    expect(mapTokenName('--color-bg', 'vault')).toBe('--color-surface');
    expect(mapTokenName('--color-surface', 'vault')).toBe('--color-surface-raised');
    const r = mapTokenSet(
      Object.keys(VAULT_TABLE).map((k) => `--color-${k}`),
      'vault',
    );
    expect(r.rejected).toEqual([]);
    expect(r.conflicts).toEqual([]);
  });
  it('common table names that are also contract-spelled still short-circuit when not in table', () => {
    // 表に無い契約名はそのまま（改名しない）
    expect(mapTokenName('--color-surface', 'common')).toBe('--color-surface');
    expect(mapTokenName('--color-warn', 'common')).toBe('--color-warn');
  });
});

/* ------------------------------------------------------------------ */
/* #24 point3 — 衝突検出の一般化（複数ソース→単一ターゲットは error 停止）        */
/* ------------------------------------------------------------------ */

describe('#24 mapTokenSet conflict detection (silent overwrite prohibited — G-6)', () => {
  it('flags 2+ distinct sources landing on the same target', () => {
    // accent-contrast と accent-ink を naive に両方 on-accent へ写像すると衝突する（origin 表以前の姿）。
    // COMMON 経路: accent-contrast→on-accent、accent-ink→(ink 規則)→on-accent の2ソース。
    const r = mapTokenSet(['--color-accent-contrast', '--color-accent-ink'], 'common');
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0]!.target).toBe('--color-on-accent');
    expect(r.conflicts[0]!.sources).toEqual(['--color-accent-contrast', '--color-accent-ink']);
  });
  it('origin table disambiguates the same pair → 0 conflicts', () => {
    const r = mapTokenSet(['--color-accent-contrast', '--color-accent-ink'], 'origin');
    expect(r.conflicts).toEqual([]);
  });
  it('rejects are reported, not thrown', () => {
    const r = mapTokenSet(['--color-mystery-role', '--color-fg'], 'common');
    expect(r.rejected.map((x) => x.from)).toEqual(['--color-mystery-role']);
    expect(r.renames).toContainEqual({ from: '--color-fg', to: '--color-text-primary' });
  });
  it('passthrough (excluded namespace) is bucketed separately from renames/rejects', () => {
    const r = mapTokenSet(['--breakpoint-lg', '--color-fg'], 'common');
    expect(r.passthrough).toEqual(['--breakpoint-lg']);
    expect(r.rejected).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* origin table full enumeration is present (regression on 現物列挙)          */
/* ------------------------------------------------------------------ */

describe('ORIGIN_TABLE completeness', () => {
  it('carries the pre-contract origin color vocabulary (#24 追加分)', () => {
    for (const k of [
      'primary',
      'muted',
      'accent-contrast',
      'accent-ink',
      'accent-glow',
      'warning-soft',
      'warning-ink',
      'neutral-soft',
      'neutral-ink',
      'overlay',
    ]) {
      expect(ORIGIN_TABLE[k]).toBeDefined();
    }
  });
});

describe('remediation list v1 (同梱 — R2⑩)', () => {
  it('includes payout dead classes and records silent no-op items', () => {
    const froms = REMEDIATION_V1.map((r) => r.from);
    expect(froms).toContain('text-primary'); // payout 17（text-muted と合算）
    expect(froms).toContain('text-text-secondary'); // records 16
    expect(froms).toContain('text-text'); // records ×9 (R5)
    expect(froms).toContain('--color-surface-sunken'); // records root 不在 (R5 訂正1)
    expect(froms).toContain('text-body'); // payout typography (AI-18 必須収載)
  });
  it('unconfirmed remediation targets are explicitly flagged (誠実性ガード)', () => {
    const unconfirmed = REMEDIATION_V1.filter((r) => !r.confirmed);
    expect(unconfirmed.length).toBeGreaterThan(0);
    for (const r of unconfirmed) expect(r.source).toContain('起草判断');
  });
});
