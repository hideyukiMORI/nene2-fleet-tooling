import { useMemo, type ReactNode } from 'react';
import { FieldContext } from './field-context.js';

export interface FormFieldProps {
  /** id of the control this field labels; the control picks it up automatically. */
  id: string;
  /** Localized label. */
  label: string;
  /** Localized error message, or null when valid. */
  error?: string | null;
  /**
   * Localized help text, shown under the control and read out with it.
   *
   * 🔴 Under the control, not beside the label — see `labelAdornment` for that. Three ships
   * ship a prop called `hint` and they do not agree on where it goes: nene-vault and
   * nene-profile put it under the control, nene-invoice puts it inside the `<label>`. One
   * name, two placements, so picking either one silently moves the other's text.
   */
  hint?: ReactNode;
  /** Small node rendered beside the label — a keyboard hint, a unit, a link. */
  labelAdornment?: ReactNode;
  /** Marks the control `aria-required`. Carries no visible text of its own. */
  required?: boolean;
  /**
   * Visible required marker, rendered after the label when `required` is set.
   *
   * 🔴 Separate from `required` on purpose. `required` is meaning and needs no words;
   * a marker is presentation and does need them, and the kit ships no strings (principle 4).
   * Folding the two together would mean the kit picking "*" for every locale.
   */
  requiredMarker?: ReactNode;
  children: ReactNode;
}

/**
 * Labelled form field wrapper: associates a `<label>` with its control, and links the
 * control to its help text and its validation error.
 *
 * 🔴 The control no longer has to opt in. v0.1 documented that the control was "responsible
 * for setting `aria-describedby`", and the fleet did not do it — nene-vault sets
 * `aria-invalid` on 3 fields and links the reason zero times (measured 2026-08-23; see
 * field-context.ts for how that number differs from a raw grep). A field's own error message
 * is the field's job, so `FormField` publishes the ids through context and the kit's controls
 * read them. A control from outside the kit still works; it simply gets the label association
 * it always had.
 *
 * 🔴 The hint stays visible when there is an error. nene-profile hides it in that case, and
 * that is the moment the user most needs it; the error is read first instead.
 */
export function FormField({
  id,
  label,
  error = null,
  hint,
  labelAdornment,
  required = false,
  requiredMarker,
  children,
}: FormFieldProps) {
  const errorId = error === null ? null : `${id}-error`;
  const hintId = hint === undefined || hint === null ? null : `${id}-hint`;
  const value = useMemo(() => ({ id, errorId, hintId, required }), [id, errorId, hintId, required]);

  return (
    <FieldContext.Provider value={value}>
      <div className="flex flex-col gap-x-slot-field-gap">
        <label
          htmlFor={id}
          className="font-sans font-x-slot-field-label text-x-slot-field-label-size text-x-slot-field-label"
        >
          {label}
          {required && requiredMarker !== undefined && requiredMarker !== null ? (
            <span className="text-x-slot-field-error-fg">{requiredMarker}</span>
          ) : null}
          {labelAdornment}
        </label>
        {children}
        {hintId === null ? null : (
          <span
            id={hintId}
            className="font-sans text-x-slot-field-hint-size text-x-slot-field-hint"
          >
            {hint}
          </span>
        )}
        {errorId === null ? null : (
          <p
            id={errorId}
            role="alert"
            className="font-sans text-x-slot-field-error-size text-x-slot-field-error"
          >
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}
