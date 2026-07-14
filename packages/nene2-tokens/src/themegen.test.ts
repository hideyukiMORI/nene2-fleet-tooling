import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';
import { describe, expect, it } from 'vitest';
import {
  ThemegenError,
  computeFillForScope,
  extractTheme,
  fillSource,
  generateTheme,
  toPlain,
  toTheme,
  type ThemeDocument,
} from './themegen.js';
import { validateThemeSource } from './validate.js';

const REFERENCE = readFileSync(
  fileURLToPath(new URL('../themes/reference.css', import.meta.url)),
  'utf8',
);

/** 参照テーマから往復した ThemeDocument（テスト入力） */
const doc = (): ThemeDocument => extractTheme(REFERENCE);

describe('themegen — determinism (MUST: same input → bit-identical output)', () => {
  it('two consecutive runs produce byte-identical output', () => {
    expect(generateTheme(doc())).toBe(generateTheme(doc()));
  });

  it('override entry order does not change the output (canonical sort)', () => {
    const a = doc();
    const b = doc();
    b.theme = Object.fromEntries(Object.entries(b.theme).reverse());
    if (b.scopes) {
      for (const sel of Object.keys(b.scopes)) {
        b.scopes[sel] = Object.fromEntries(Object.entries(b.scopes[sel]!).reverse());
      }
    }
    expect(generateTheme(a)).toBe(generateTheme(b));
  });

  it("generated output is a fixed point of pinned prettier (R5 AM-1'')", async () => {
    const out = generateTheme(doc());
    const formatted = await format(out, { parser: 'css', printWidth: 100, singleQuote: true });
    expect(formatted).toBe(out);
  });

  it('generated output passes validate:themes (generator and validator agree)', () => {
    const out = generateTheme(doc());
    const r = validateThemeSource('generated.css', out);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });
});

describe('themegen --plain (serve/suite stage1 wrapper conversion — R2⑩)', () => {
  it('@theme ↔ :root roundtrip is lossless', () => {
    const plain = toPlain(REFERENCE);
    expect(plain).toContain(':root {');
    expect(plain).not.toContain('@theme {');
    expect(toTheme(plain)).toBe(REFERENCE);
  });
  it('generate --plain emits :root wrapper that validates with --container', () => {
    const out = generateTheme(doc(), { plain: true });
    expect(out).toContain(':root {');
    expect(validateThemeSource('plain.css', out, { container: true }).ok).toBe(true);
  });
});

describe('extract → map → generate (順序固定・未知キー reject)', () => {
  it('applies the codemod mapping table before emitting (i18n §2-3)', () => {
    const old = `/* @nene2-contract 1.0 @themegen 1.0.0-rc.1 */
@theme {
  --color-fg: oklch(20% 0.02 75);
  --color-ok: oklch(50% 0.14 155);
  --color-warning: oklch(70% 0.15 85);
  --color-accent: oklch(48% 0.13 72);
  --color-accent-weak: color-mix(in oklch, var(--color-accent) 12%, white);
}
`;
    const extracted = extractTheme(old);
    expect(Object.keys(extracted.theme).sort()).toEqual(
      [
        '--color-accent',
        '--color-accent-soft',
        '--color-fg', // ← ではなく text-primary（下の assert が正）
        '--color-success',
        '--color-warn',
      ]
        .map((k) => (k === '--color-fg' ? '--color-text-primary' : k))
        .sort(),
    );
    // 値の中の var(--旧名) も写像される
    expect(extracted.theme['--color-accent-soft']).toContain('var(--color-accent)');
  });

  it('rejects unknown keys with an error — silent drop is prohibited', () => {
    const unknown = `/* @nene2-contract 1.0 @themegen 1.0.0-rc.1 */
@theme {
  --color-mystery-role: oklch(50% 0.1 100);
}
`;
    expect(() => extractTheme(unknown)).toThrow(ThemegenError);
    expect(() => extractTheme(unknown)).toThrow(/mystery-role/);
  });

  it('generate rejects unknown keys in the document (no silent drop)', () => {
    const d = doc();
    d.theme['--color-mystery'] = 'oklch(50% 0.1 100)';
    expect(() => generateTheme(d)).toThrow(ThemegenError);
  });
});

describe('fill (AM-1 — 局所スコープの充足はツール維持)', () => {
  const baseWithLocal = `${REFERENCE}
.nene-public[data-theme='y2k'] {
  --color-accent: oklch(60% 0.2 300);
}
`;

  it('computeFillForScope re-emits derivations of overridden inputs (deterministic)', () => {
    const base = new Map([
      ['--color-accent', 'oklch(48% 0.13 72)'],
      ['--color-accent-soft', 'color-mix(in oklch, var(--color-accent) 12%, white)'],
      ['--color-border', 'oklch(88% 0.01 75)'],
    ]);
    const authored = new Map([['--color-accent', 'oklch(60% 0.2 300)']]);
    const fill = computeFillForScope(base, authored);
    expect([...fill.keys()]).toEqual(['--color-accent-soft']);
    expect(fill.get('--color-accent-soft')).toBe(
      'color-mix(in oklch, var(--color-accent) 12%, white)',
    );
  });

  it('fillSource writes the fill region and validate then passes closure', () => {
    const before = validateThemeSource('t.css', baseWithLocal);
    expect(before.diagnostics.some((d) => d.rule === 'closure')).toBe(true);

    const filled = fillSource(baseWithLocal);
    const after = validateThemeSource('t.css', filled);
    expect(after.diagnostics.filter((d) => d.rule === 'closure')).toEqual([]);
    expect(after.diagnostics.filter((d) => d.rule === 'fill')).toEqual([]);
    expect(filled).toContain('@nene2-fill:start');
    expect(filled).toContain('@nene2-fill:end');
  });

  it('fill is idempotent (fixed point — themegen --check semantics)', () => {
    const once = fillSource(baseWithLocal);
    expect(fillSource(once)).toBe(once);
  });

  it('hand-edited fill region = validate FAIL with repair command (F-1 regen compare)', () => {
    const filled = fillSource(baseWithLocal);
    const tampered = filled.replace(
      /(@nene2-fill:start[^]*?)var\(--color-accent\) 12%/,
      '$1var(--color-accent) 50%',
    );
    expect(tampered).not.toBe(filled);
    const r = validateThemeSource('t.css', tampered);
    const fillErr = r.diagnostics.filter((d) => d.rule === 'fill');
    expect(fillErr.length).toBeGreaterThan(0);
    expect(fillErr[0]!.message).toContain('nene2-tokens fill');
  });

  it('scoped theme file without root block requires --parent (fail-closed)', () => {
    const scopedOnly = `/* @nene2-contract 1.0 @themegen 1.0.0-rc.1 */
.nene-public[data-theme='y2k'] {
  --color-accent: oklch(60% 0.2 300);
}
`;
    expect(() => fillSource(scopedOnly)).toThrow(/--parent/);
    const filled = fillSource(scopedOnly, REFERENCE);
    expect(filled).toContain('@nene2-fill:start');
  });
});
