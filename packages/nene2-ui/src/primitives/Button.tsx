import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx.js';
import { CLICKABLE_CLASS } from '../lib/states.js';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  /**
   * Two sizes, not a length. `sm` for dense rows and toolbars.
   *
   * Structure, not a design value: the caller picks one of two arrangements and cannot
   * write a padding of its own (design principle 3).
   */
  size?: 'md' | 'sm';
  children: ReactNode;
}

const VARIANT_CLASS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-x-slot-button-primary-bg text-x-slot-button-primary-fg',
  secondary:
    'bg-x-slot-button-secondary-bg text-x-slot-button-secondary-fg border-x-slot-button-secondary-border',
  danger: 'bg-x-slot-button-danger-bg text-x-slot-button-danger-fg',
  // No fill and no border: for the third action in a row, where two framed buttons would
  // compete with each other. nene-vault ships this variant already.
  ghost: 'bg-transparent text-x-slot-button-ghost-fg',
};

const SIZE_CLASS: Record<NonNullable<ButtonProps['size']>, string> = {
  md: 'px-x-slot-button-pad-x py-x-slot-button-pad-y text-x-slot-button-size',
  sm: 'px-x-slot-button-sm-pad-x py-x-slot-button-sm-pad-y text-x-slot-button-sm-size',
};

// 🔴 `inline-flex`, so the button places what is inside it. A `<button>` is `inline-block`
// by default, which leaves an icon and its label on a shared baseline rather than centred —
// visible as a half-pixel of drift on every icon button, and invisible in a diff. The kit
// already takes responsibility for the size of an `<svg>` in here (`SVG_BOUND`); taking
// responsibility for where it sits is the other half of the same job, and leaving one to the
// caller while doing the other is the asymmetry nene-vault had to work around by writing
// `inline-flex` at the call site.
//
// ⚠️ This changes rendering. A text-only button is laid out by flex rather than by inline
// flow, so it no longer sits on the surrounding text's baseline the way an inline-block does.
// Inside a paragraph that is visible; in the button rows and toolbars these are actually used
// in, it is not. `inline-flex` rather than `flex` keeps the element from claiming a line.
//
// 🔴 `border border-transparent` is load-bearing. Height comes from the padding, so the
// `secondary` variant — the only one with a visible border — would otherwise stand 2px
// taller than the others. nene-vault puts a primary and a secondary side by side in seven
// modal footers, where that shows up as a step (measured 2026-08-23); its own Button carries
// the same transparent border for the same reason.
// 🔴 `[&_svg]:max-*` bounds a raw `<svg>` child without sizing it. An svg with no width or
// height attribute lays out at the replaced-element default of 300x150; a `max-height` pulls
// it back and, because a `viewBox` gives the element an intrinsic ratio, the width follows.
// `max-width` covers the svg that has no viewBox either.
//
// 🔴 Not `[&_svg]:size-*`. That would outrank the plain `h-5 w-5` an `Icon` sets on itself
// — an arbitrary variant compiles to a descendant selector, which is more specific than a
// single class — so `<Icon size="sm">` inside a button would render at the button's size
// instead of its own. A maximum cannot collide with a height: different property, and it
// leaves anything already smaller alone.
const SVG_BOUND = '[&_svg]:max-h-x-slot-button-icon [&_svg]:max-w-x-slot-button-icon';

const BASE_CLASS = `rounded-x-slot-button border border-transparent inline-flex items-center justify-center gap-x-slot-button-gap font-sans font-x-slot-button ${SVG_BOUND} ${CLICKABLE_CLASS}`;

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(BASE_CLASS, SIZE_CLASS[size], VARIANT_CLASS[variant], className)}
      {...rest}
    >
      {children}
    </button>
  );
}
