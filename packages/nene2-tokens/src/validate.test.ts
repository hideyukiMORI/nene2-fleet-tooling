import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateThemeSource, type Diagnostic } from './validate.js';
import { fillSource } from './themegen.js';

const REFERENCE = readFileSync(
  fileURLToPath(new URL('../themes/reference.css', import.meta.url)),
  'utf8',
);

const rules = (ds: Diagnostic[]) => ds.filter((d) => d.severity === 'error').map((d) => d.rule);

describe('validate:themes — positive', () => {
  it('reference theme passes with zero errors (calibration condition AM-6)', () => {
    const r = validateThemeSource('reference.css', REFERENCE);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('accepts :root wrapper with --container (serve/suite stage1 — R2⑩)', () => {
    const plain = REFERENCE.replace('@theme {', ':root {');
    expect(validateThemeSource('plain.css', plain, { container: true }).ok).toBe(true);
    // 同じ入力は --container なしでは受理しない
    expect(validateThemeSource('plain.css', plain).ok).toBe(false);
  });
});

describe('validate:themes — negative (each check actually fires)', () => {
  it('missing root contract key = parity error that does NOT claim `fill` repairs it (#16 — fill is a no-op on root, TH-03/TH-07: root keys are hand-authored)', () => {
    const broken = REFERENCE.replace(/^\s*--color-scrim:.*$\n/m, '');
    const r = validateThemeSource('t.css', broken);
    expect(rules(r.diagnostics)).toContain('parity');
    const message = r.diagnostics.find((d) => d.rule === 'parity')!.message;
    expect(message).not.toContain('nene2-tokens fill');
    expect(message).toContain('no mechanical repair');
    expect(message).toContain('reference.css');
  });

  it('#16 negative control: `fill` really is a no-op on root parity errors, so the old REPAIR_FILL message was fail-open (validate still red after "repair")', () => {
    const broken = REFERENCE.replace(/^\s*--color-scrim:.*$\n/m, '');
    expect(validateThemeSource('t.css', broken).ok).toBe(false);
    // running the exact repair the old message advertised does not change the file at all
    expect(fillSource(broken)).toBe(broken);
    // ...and validate is therefore still red after "repair"
    expect(validateThemeSource('t.css', fillSource(broken)).ok).toBe(false);
  });

  it('missing pragma = error (theme files are themegen-managed — AM-1)', () => {
    const broken = REFERENCE.replace(/^\/\* @nene2-contract.*\*\/\n/, '');
    expect(rules(validateThemeSource('t.css', broken).diagnostics)).toContain('pragma');
  });

  it('older contract pragma = outdated warning, not broken (AM-1)', () => {
    const older = REFERENCE.replace('@nene2-contract 1.0', '@nene2-contract 0.9');
    const r = validateThemeSource('t.css', older);
    expect(r.diagnostics.some((d) => d.severity === 'warning' && d.rule === 'outdated')).toBe(true);
    expect(rules(r.diagnostics)).not.toContain('pragma');
  });

  it('@theme inline = error (TH-04 silent freeze)', () => {
    const broken = REFERENCE.replace('@theme {', '@theme inline {');
    expect(rules(validateThemeSource('t.css', broken).diagnostics)).toContain('theme-inline');
  });

  it('bare --color-primary = reserved-name error (R2⑥(B))', () => {
    const broken = REFERENCE.replace(
      '@theme {',
      '@theme {\n  --color-primary: oklch(50% 0.1 250);',
    );
    expect(rules(validateThemeSource('t.css', broken).diagnostics)).toContain('reserved-name');
  });

  it('ordinal suffix = error (field fg-muted-2 / suite fg-2 counter-exemplar)', () => {
    const broken = REFERENCE.replace('@theme {', '@theme {\n  --color-surface-2: oklch(90% 0 0);');
    expect(rules(validateThemeSource('t.css', broken).diagnostics)).toContain('ordinal-suffix');
  });

  it('synonym double names = error with codemod hint (ok/fg/line/warning/-ink)', () => {
    for (const decl of [
      '--color-ok: oklch(50% 0.1 150);',
      '--color-fg: oklch(20% 0 0);',
      '--color-line: oklch(88% 0 0);',
      '--color-warning: oklch(70% 0.1 85);',
      '--color-accent-ink: oklch(99% 0 0);',
    ]) {
      const broken = REFERENCE.replace('@theme {', `@theme {\n  ${decl}`);
      const r = validateThemeSource('t.css', broken);
      expect(rules(r.diagnostics), decl).toContain('synonym-ban');
    }
  });

  it('non-contract non-x token = contract-vocabulary error (TK-03)', () => {
    const broken = REFERENCE.replace('@theme {', '@theme {\n  --color-sidebar: oklch(20% 0 0);');
    expect(rules(validateThemeSource('t.css', broken).diagnostics)).toContain(
      'contract-vocabulary',
    );
  });

  it('raw hex = grammar error', () => {
    const broken = REFERENCE.replace('oklch(97% 0.006 75)', '#faf7f2');
    expect(rules(validateThemeSource('t.css', broken).diagnostics)).toContain('grammar');
  });

  it('dangling var() = error (TK-04 悬空参照)', () => {
    const broken = REFERENCE.replace('var(--color-surface-raised))', 'var(--color-border-subtle))');
    const r = validateThemeSource('t.css', broken);
    expect(rules(r.diagnostics)).toContain('dangling-ref');
  });

  it('--breakpoint-* declaration and var() reference = error (Case D silent failure)', () => {
    const decl = REFERENCE.replace('@theme {', '@theme {\n  --breakpoint-lg: 64rem;');
    expect(rules(validateThemeSource('t.css', decl).diagnostics)).toContain('excluded-namespace');
    const ref = REFERENCE.replace(
      '--color-x-approved: oklch(50% 0.14 155);',
      '--color-x-approved: var(--container-lg);',
    );
    expect(rules(validateThemeSource('t.css', ref).diagnostics)).toContain('excluded-namespace');
  });

  it('normal property inside theme block = structure error (AM-9 token-only)', () => {
    const broken = REFERENCE.replace('@theme {', '@theme {\n  color-scheme: light;');
    expect(rules(validateThemeSource('t.css', broken).diagnostics)).toContain('structure');
  });

  it('contrast violation = error naming the pair and ratio (deliberate-fail probe)', () => {
    const broken = REFERENCE.replace(
      '--color-text-muted: oklch(50% 0.02 75);',
      '--color-text-muted: oklch(80% 0.02 75);',
    );
    const r = validateThemeSource('t.css', broken);
    const contrast = r.diagnostics.filter((d) => d.rule === 'contrast');
    expect(contrast.length).toBeGreaterThan(0);
    expect(contrast[0]!.message).toMatch(/text-muted on surface .* < 4\.5:1/);
  });

  it('focus pair is checked at 3:1 (AM-3 / WCAG 2.4.11)', () => {
    const broken = REFERENCE.replace(
      '--color-focus-ring: oklch(52% 0.15 245);',
      '--color-focus-ring: oklch(92% 0.02 245);',
    );
    const r = validateThemeSource('t.css', broken);
    expect(r.diagnostics.some((d) => d.rule === 'contrast' && /focus-ring/.test(d.message))).toBe(
      true,
    );
  });
});

describe('validate:themes — reference closure (TH-06 W-5 / AM-4)', () => {
  const base = [
    '/* @nene2-contract 1.0 @themegen 1.0.0-rc.1 */',
    REFERENCE.split('\n').slice(1).join('\n'),
  ].join('\n');

  it('root-scope [data-theme] override passes without redeclaring chains (T2/T3/S1)', () => {
    // reference.css の dark ブロックがまさにこの形（-soft 連鎖を再宣言していない）
    expect(validateThemeSource('t.css', base).ok).toBe(true);
  });

  it('local scope overriding a chain input without redeclaring dependents = closure FAIL', () => {
    // records 休眠バグの実形: 入力（accent）だけ上書きし、-soft 連鎖が親の値で凍結する
    const localScope = `
.nene-public[data-theme='y2k'] {
  --color-accent: oklch(70% 0.2 300);
}
`;
    const r = validateThemeSource('t.css', base + localScope);
    const closure = r.diagnostics.filter((d) => d.rule === 'closure');
    expect(closure.length).toBeGreaterThan(0);
    expect(closure[0]!.message).toContain('accent-soft');
    expect(closure[0]!.message).toContain('nene2-tokens fill');
  });

  it('same override on the root scope element passes (scope kind decides, not the override)', () => {
    const rootScope = `
[data-theme='y2k'] {
  --color-accent: oklch(70% 0.2 300);
}
`;
    const r = validateThemeSource('t.css', base + rootScope);
    expect(r.diagnostics.filter((d) => d.rule === 'closure')).toEqual([]);
  });
});
