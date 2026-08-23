import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../lib/cx.js';
import { CONTROL_CLASS } from '../lib/states.js';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Localized label. Rendered inside the control's own `<label>`. */
  label: ReactNode;
  /**
   * Classes for the `<input>` itself. `className` goes to the `<label>`, which is this
   * part's root — see the note below.
   */
  inputClassName?: string;
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
 * 🔴 `className` lands on the `<label>`, which is this part's root — the same place it
 * lands in every other component the kit ships. Until 0.10.0 it went to the `<input>`
 * instead, so nothing the caller wrote could reach the root: `self-start` inside a flex
 * row, a width, a margin. nene-vault had to wrap each choice in a `<div>` to say them
 * (found while migrating, 2026-08-23). Use `inputClassName` for the box itself.
 *
 * 🔑 This is the cause behind a symptom the kit already answered once. In wave 2 the
 * report was that `cursor-pointer` could not be set, because it belongs to the label; the
 * kit took `cursor-pointer` and the gap on itself. That was right as far as it went, and
 * it left the reason intact — every other label-level property stayed unreachable.
 * Fixing what a report names is not the same as fixing what it is about.
 *
 * `cursor-pointer` and the gap still live here: they are not decisions a product should
 * have to repeat at every call site. nene-vault carries them on the label in its own
 * implementation (measured 2026-08-23), so a migration that could not set them would lose
 * the pointer cursor on every choice — visible to a mouse user, invisible in a diff.
 */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { label, name, className, inputClassName, ...rest },
  ref,
) {
  return (
    <label
      className={cx(
        'inline-flex cursor-pointer items-center gap-x-slot-choice-gap font-sans text-x-slot-choice-size text-x-slot-choice-fg',
        className,
      )}
    >
      <input
        ref={ref}
        type="radio"
        name={name}
        className={cx(DOT_CLASS, inputClassName)}
        {...rest}
      />
      {label}
    </label>
  );
});
