import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../lib/cx.js';
import { CONTROL_CLASS } from '../lib/states.js';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Localized label. Rendered inside the control's own `<label>`. */
  label: ReactNode;
  /** Radios only mean anything in a group; `name` is what makes them one. */
  name: string;
}

const DOT_CLASS = `size-x-slot-choice-box shrink-0 border border-x-slot-choice-border accent-x-slot-choice-accent ${CONTROL_CLASS}`;

/**
 * One option in a radio group, with its label.
 *
 * 🔴 `name` is required, unlike on a bare `<input type="radio">`. A radio without a name is
 * its own group of one: it can be checked but never unchecked, and arrow keys do not move
 * between the options. Nothing about the rendered page shows this, so it survives review.
 *
 * 🔴 `cursor-pointer`, the gap and the box size are the component's, for the same reason as
 * on `Checkbox`: `className` reaches the `<input>`, and those belong to the `<label>`.
 * nene-vault's radios share one label style with its checkboxes, so the same hole was here.
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
    <label className="inline-flex cursor-pointer items-center gap-x-slot-choice-gap font-sans text-x-slot-choice-size text-x-slot-choice-fg">
      <input ref={ref} type="radio" name={name} className={cx(DOT_CLASS, className)} {...rest} />
      {label}
    </label>
  );
});
