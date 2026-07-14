import { describe, expect, it } from 'vitest';
import { contrastRatio, mixOklch, parseOklchLiteral, relativeLuminance } from './color.js';

describe('static color evaluation', () => {
  it('white/black contrast is 21:1 (WCAG anchor)', () => {
    const white = parseOklchLiteral('oklch(100% 0 0)');
    const black = parseOklchLiteral('oklch(0% 0 0)');
    expect(contrastRatio(white, black)).toBeCloseTo(21, 1);
    expect(relativeLuminance(white)).toBeCloseTo(1, 3);
    expect(relativeLuminance(black)).toBeCloseTo(0, 3);
  });
  it('parses percentage and numeric forms', () => {
    expect(parseOklchLiteral('oklch(62% 0.17 72)').l).toBeCloseTo(0.62);
    expect(parseOklchLiteral('oklch(0.62 0.17 72)').l).toBeCloseTo(0.62);
    expect(parseOklchLiteral('oklch(50% 0.1 30 / 40%)').alpha).toBeCloseTo(0.4);
  });
  it('color-mix with transparent scales alpha (premultiplied — scrim form)', () => {
    const black = parseOklchLiteral('oklch(0% 0 0)');
    const transparent = { l: 0, c: 0, h: NaN, alpha: 0 };
    const scrim = mixOklch(black, 55, transparent, 45);
    expect(scrim.alpha).toBeCloseTo(0.55);
    expect(scrim.l).toBeCloseTo(0);
  });
  it('50/50 mix of white and black lands mid-lightness', () => {
    const white = parseOklchLiteral('oklch(100% 0 0)');
    const black = parseOklchLiteral('oklch(0% 0 0)');
    expect(mixOklch(white, 50, black, 50).l).toBeCloseTo(0.5);
  });
  it('alpha foreground composites over background before contrast', () => {
    const white = parseOklchLiteral('oklch(100% 0 0)');
    const halfBlack = parseOklchLiteral('oklch(0% 0 0 / 0.5)');
    const ratio = contrastRatio(halfBlack, white);
    expect(ratio).toBeGreaterThan(1);
    expect(ratio).toBeLessThan(21);
  });
  it('refuses contrast against non-opaque background (fail-closed)', () => {
    const white = parseOklchLiteral('oklch(100% 0 0)');
    const halfBlack = parseOklchLiteral('oklch(0% 0 0 / 0.5)');
    expect(() => contrastRatio(white, halfBlack)).toThrow();
  });
});
