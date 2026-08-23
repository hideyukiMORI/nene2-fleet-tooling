import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx.js';
import { CONTROL_CLASS } from '../lib/states.js';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  children: ReactNode;
}

const VARIANT_CLASS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-accent text-on-accent',
  secondary: 'bg-surface-raised text-text-primary border border-border',
  danger: 'bg-danger text-on-accent',
};

const BASE_CLASS = `rounded-x-slot-button px-x-slot-button-pad-x py-x-slot-button-pad-y font-sans font-medium ${CONTROL_CLASS}`;

export function Button({
  variant = 'primary',
  children,
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={cx(BASE_CLASS, VARIANT_CLASS[variant], className)} {...rest}>
      {children}
    </button>
  );
}
