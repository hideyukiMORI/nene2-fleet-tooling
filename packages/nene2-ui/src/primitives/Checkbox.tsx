import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../lib/cx.js';
import { CONTROL_CLASS } from '../lib/states.js';
import { useFieldWiring } from '../forms/field-context.js';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Localized label. Rendered inside the control's own `<label>`. */
  label: ReactNode;
}

const BOX_CLASS = `rounded-x-md border border-border accent-accent ${CONTROL_CLASS}`;

/**
 * A checkbox and its label, as one part.
 *
 * 🔴 The label is not optional and not a sibling. The recurring shape in the fleet is an
 * `<input>` next to a `<label>` whose `htmlFor` is missing or stale — which loses nothing
 * visible, and loses the ability to click the text to toggle the box, plus the name the
 * control is announced by. Making the label a prop means it cannot be forgotten.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    label,
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

  return (
    <label className="inline-flex items-center gap-x-2xs font-sans text-text-primary">
      <input ref={ref} type="checkbox" className={cx(BOX_CLASS, className)} {...wiring} {...rest} />
      {label}
    </label>
  );
});
