import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cx } from '../lib/cx.js';
import { CLICKABLE_CLASS } from '../lib/states.js';

export interface SwitchProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'type'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Localized label. A switch with no name is a mystery toggle. */
  label: string;
}

/**
 * An on/off control that takes effect immediately.
 *
 * 🔴 A `<button role="switch">`, not a styled checkbox. The common shape is an
 * `<input type="checkbox">` with a sliding track drawn over it, which assistive technology
 * announces as "checkbox, not checked" — the wrong control, in the wrong tense. A checkbox
 * states an intention that a later Save applies; a switch *is* the action. Different
 * meanings get different elements.
 *
 * `aria-checked` carries the state; the visible track is decoration on top of it.
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, onCheckedChange, label, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cx(
        'inline-flex items-center rounded-x-slot-switch border border-border px-x-slot-switch-pad-x py-x-slot-switch-pad-y font-sans',
        checked ? 'bg-accent text-on-accent' : 'bg-surface text-text-muted',
        CLICKABLE_CLASS,
        className,
      )}
      {...rest}
    >
      {label}
    </button>
  );
});
