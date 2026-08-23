import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cx } from '../lib/cx.js';
import { CONTROL_CLASS } from '../lib/states.js';
import { useFieldWiring } from '../forms/field-context.js';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const BASE_CLASS = `w-full rounded-x-slot-control border border-border bg-surface-raised px-x-slot-control-pad-x py-x-slot-control-pad-y font-sans text-x-slot-control-size text-text-primary placeholder:text-text-muted ${CONTROL_CLASS}`;

/**
 * Multi-line text input. Deliberately identical to `Input` apart from the element, so the
 * two never drift: five ships wrote their own `Textarea.tsx` and the kit shipped without
 * one, which is how a control ends up with five different focus rings.
 *
 * No `rows` default and no auto-resize — height is a screen's decision, and every ship that
 * wanted one set it on the element already.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
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

  return <textarea ref={ref} className={cx(BASE_CLASS, className)} {...wiring} {...rest} />;
});
