import { describe, expect, it } from 'vitest';
import { GrammarError, parseColorValue, parseShadowValue, parseTokenValue } from './grammar.js';

describe('TK-04 closed value grammar — positive', () => {
  it('accepts oklch literals (incl. alpha form)', () => {
    expect(parseColorValue('oklch(62% 0.17 72)').kind).toBe('color');
    expect(parseColorValue('oklch(0% 0 0 / 0.5)').kind).toBe('color');
    expect(parseColorValue('oklch(70% 0.14 72 / 35%)').kind).toBe('color');
  });
  it('accepts var() refs and collects them', () => {
    const v = parseColorValue('var(--color-accent)');
    expect([...v.refs]).toEqual(['--color-accent']);
  });
  it('accepts color-mix with optional weight percentages (AM-6 calibration form)', () => {
    const v = parseColorValue(
      'color-mix(in oklch, var(--color-accent) 12%, var(--color-surface-raised))',
    );
    expect([...v.refs]).toEqual(['--color-accent', '--color-surface-raised']);
    expect(parseColorValue('color-mix(in oklch, black 55%, transparent)').kind).toBe('color');
    expect(parseColorValue('color-mix(in oklch, white, black)').kind).toBe('color');
  });
  it('accepts the 3 keyword colors', () => {
    for (const kw of ['transparent', 'white', 'black']) {
      expect(parseColorValue(kw).kind).toBe('color');
    }
  });
  it('accepts shadow composite values (color components in closed grammar)', () => {
    const v = parseShadowValue(
      '0 0 0 3px color-mix(in oklch, var(--color-focus-ring) 35%, transparent)',
    );
    expect([...v.refs]).toEqual(['--color-focus-ring']);
    expect(parseShadowValue('0 1px 2px oklch(0% 0 0 / 0.05)').kind).toBe('shadow');
    expect(parseShadowValue('inset 0 1px 2px black, 0 2px 8px oklch(0% 0 0 / 0.1)').kind).toBe(
      'shadow',
    );
  });
});

describe('TK-04 closed value grammar — negative (fail-closed)', () => {
  const bad = [
    '#d09a3e', // hex
    'rgba(208, 154, 62, 0.12)', // rgb family
    'hsl(30 50% 50%)',
    'currentColor', // statically unevaluable — AM-6/R4 REJECTED
    'initial', // TH-03/TK-04 閉文法に initial は無い
    'linear-gradient(white, black)', // unknown function
    'color-mix(in srgb, white, black)', // non-oklch space
    'color-mix(in oklch, white)', // arity
    'var(--color-accent, #fff)', // fallback (second source of truth)
    'red', // non-allowlisted keyword
  ];
  for (const value of bad) {
    it(`rejects '${value}'`, () => {
      expect(() => parseColorValue(value)).toThrow(GrammarError);
    });
  }
  it('rejects hex inside shadow composite', () => {
    expect(() => parseShadowValue('0 1px 2px #00000014')).toThrow(GrammarError);
  });
  it('rejects shadow layers without 2–4 lengths', () => {
    expect(() => parseShadowValue('black')).toThrow(GrammarError);
  });
});

describe('composite grammar for non-color/shadow x- extension categories', () => {
  it('accepts lengths / identifiers / strings', () => {
    expect(parseTokenValue('--radius-x-md', '0.375rem').kind).toBe('composite');
    expect(parseTokenValue('--font-x-sans', "'Inter', system-ui, sans-serif").kind).toBe(
      'composite',
    );
  });
  it('still bans raw hex / rgb', () => {
    expect(() => parseTokenValue('--border-x-glow', '1px solid #fff')).toThrow(GrammarError);
    expect(() => parseTokenValue('--color-x-brand', 'rgb(1 2 3)')).toThrow(GrammarError);
  });
});
