import { describe, expect, it } from 'vitest';
import { CODEMOD_MAP_V1, REMEDIATION_V1, mapTokenName } from './codemod-map.js';

describe('codemod mapping table v1 (versioned)', () => {
  it('is versioned (M-1: 使い捨てスクリプト化 MUST NOT)', () => {
    expect(CODEMOD_MAP_V1.version).toBe('1.0.0');
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
    expect(mapTokenName('--breakpoint-lg')).toBeNull();
  });

  it('non-contract categories go to mechanical x- namespacing (AM-3 scope)', () => {
    expect(mapTokenName('--radius-md')).toBe('--radius-x-md');
    expect(mapTokenName('--font-sans')).toBe('--font-x-sans');
    expect(mapTokenName('--shadow-glow')).toBe('--shadow-x-glow');
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
