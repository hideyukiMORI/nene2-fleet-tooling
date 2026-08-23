import { describe, expect, it } from 'vitest';
import { cx } from './cx.js';

describe('cx', () => {
  it('joins the parts it is given', () => {
    expect(cx('a', 'b')).toBe('a b');
  });

  it('drops falsy parts so conditional classes are safe', () => {
    expect(cx('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('puts the caller class last so it can override the kit (escape hatch)', () => {
    // 🔴 This is the regression this helper exists for: before `cx`, spreading
    // `{...rest}` after `className` made a caller's class REPLACE the kit's styling.
    expect(cx('bg-accent', 'bg-surface')).toBe('bg-accent bg-surface');
  });
});
