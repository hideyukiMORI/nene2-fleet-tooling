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
  primary: 'bg-accent text-on-accent',
  secondary: 'bg-surface-raised text-text-primary border-border',
  danger: 'bg-danger text-on-accent',
  // No fill and no border: for the third action in a row, where two framed buttons would
  // compete with each other. nene-vault ships this variant already.
  ghost: 'bg-transparent text-text-primary',
};

const SIZE_CLASS: Record<NonNullable<ButtonProps['size']>, string> = {
  md: 'px-x-slot-button-pad-x py-x-slot-button-pad-y',
  sm: 'px-x-slot-button-sm-pad-x py-x-slot-button-sm-pad-y',
};

// 🔴 `border border-transparent` is load-bearing. Height comes from the padding, so the
// `secondary` variant — the only one with a visible border — would otherwise stand 2px
// taller than the others. nene-vault puts a primary and a secondary side by side in seven
// modal footers, where that shows up as a step (measured 2026-08-23); its own Button carries
// the same transparent border for the same reason.
const BASE_CLASS = `rounded-x-slot-button border border-transparent font-sans font-medium ${CLICKABLE_CLASS}`;

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
