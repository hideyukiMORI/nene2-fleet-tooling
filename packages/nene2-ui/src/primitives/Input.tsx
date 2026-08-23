import { forwardRef, type InputHTMLAttributes } from 'react';
import { cx } from '../lib/cx.js';
import { CONTROL_CLASS } from '../lib/states.js';
import { useFieldWiring } from '../forms/field-context.js';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

const BASE_CLASS = `w-full rounded-x-slot-control border border-x-slot-control-border bg-x-slot-control-bg px-x-slot-control-pad-x py-x-slot-control-pad-y font-sans text-x-slot-control-size pointer-coarse:text-x-slot-control-touch-size text-x-slot-control-fg placeholder:text-x-slot-control-placeholder ${CONTROL_CLASS}`;

/**
 * Text input primitive. forwardRef so it works directly with react-hook-form `register`.
 * Visual values come from theme tokens only.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className,
    id,
    'aria-invalid': ariaInvalid,
    'aria-describedby': ariaDescribedBy,
    'aria-required': ariaRequired,
    ...rest
  },
  ref,
) {
  const wiring = useFieldWiring({ id, ariaInvalid, ariaDescribedBy, ariaRequired });

  return <input ref={ref} className={cx(BASE_CLASS, className)} {...wiring} {...rest} />;
});
