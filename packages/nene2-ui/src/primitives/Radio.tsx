import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../lib/cx.js';
import { CONTROL_CLASS } from '../lib/states.js';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Localized label. Rendered inside the control's own `<label>`. */
  label: ReactNode;
  /** Radios only mean anything in a group; `name` is what makes them one. */
  name: string;
}

const DOT_CLASS = `border border-border accent-accent ${CONTROL_CLASS}`;

/**
 * One option in a radio group, with its label.
 *
 * 🔴 `name` is required, unlike on a bare `<input type="radio">`. A radio without a name is
 * its own group of one: it can be checked but never unchecked, and arrow keys do not move
 * between the options. Nothing about the rendered page shows this, so it survives review.
 *
 * 🔴 This does not take the `FormField` wiring. A group of radios shares one label and one
 * error, so the id and `aria-describedby` belong on a `<fieldset>` around the group, not on
 * each option — putting them here would give every option the same id.
 */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { label, name, className, ...rest },
  ref,
) {
  return (
    <label className="inline-flex items-center gap-x-2xs font-sans text-text-primary">
      <input ref={ref} type="radio" name={name} className={cx(DOT_CLASS, className)} {...rest} />
      {label}
    </label>
  );
});
