import { forwardRef, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cx } from '../lib/cx.js';
import { CONTROL_CLASS } from '../lib/states.js';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode;
}

const BASE_CLASS = `w-full rounded-x-md border border-border bg-surface-raised px-x-inline-sm py-x-stack-sm font-sans text-text-primary ${CONTROL_CLASS}`;

/**
 * Select primitive. forwardRef so it works directly with react-hook-form `register`.
 * Visual values come from theme tokens only.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { children, className, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={cx(BASE_CLASS, className)} {...rest}>
      {children}
    </select>
  );
});
