import { forwardRef, type InputHTMLAttributes } from 'react';
import { cx } from '../lib/cx.js';
import { CONTROL_CLASS } from '../lib/states.js';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

const BASE_CLASS = `w-full rounded-x-md border border-border bg-surface-raised px-x-inline-sm py-x-stack-sm font-sans text-text-primary placeholder:text-text-muted ${CONTROL_CLASS}`;

/**
 * Text input primitive. forwardRef so it works directly with react-hook-form `register`.
 * Visual values come from theme tokens only.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cx(BASE_CLASS, className)} {...rest} />;
});
