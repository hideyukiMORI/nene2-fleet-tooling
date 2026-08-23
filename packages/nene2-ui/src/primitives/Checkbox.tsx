import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../lib/cx.js';
import { CONTROL_CLASS } from '../lib/states.js';
import { useFieldWiring } from '../forms/field-context.js';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Localized label. Rendered inside the control's own `<label>`. */
  label: ReactNode;
}

const BOX_CLASS = `size-x-slot-choice-box shrink-0 rounded-x-slot-control border border-x-slot-choice-border accent-x-slot-choice-accent ${CONTROL_CLASS}`;

/**
 * A checkbox and its label, as one part.
 *
 * 🔴 The label is not optional and not a sibling. The recurring shape in the fleet is an
 * `<input>` next to a `<label>` whose `htmlFor` is missing or stale — which loses nothing
 * visible, and loses the ability to click the text to toggle the box, plus the name the
 * control is announced by. Making the label a prop means it cannot be forgotten.
 *
 * 🔴 `cursor-pointer` and the gap live here rather than being left to the caller, because
 * the caller cannot reach them: `className` is forwarded to the `<input>`, and both belong
 * to the `<label>` that wraps it. nene-vault carries them on the label in its own
 * implementation (measured 2026-08-23, checking Tailwind classes and CSS both), so a
 * migration that could not set them would lose the pointer cursor on every choice in the
 * product — visible to a mouse user, invisible in a diff.
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
    <label className="inline-flex cursor-pointer items-center gap-x-slot-choice-gap font-sans text-x-slot-choice-size text-x-slot-choice-fg">
      <input ref={ref} type="checkbox" className={cx(BOX_CLASS, className)} {...wiring} {...rest} />
      {label}
    </label>
  );
});
