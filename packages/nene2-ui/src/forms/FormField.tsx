import { useMemo, type ReactNode } from 'react';
import { FieldContext } from './field-context.js';

export interface FormFieldProps {
  /** id of the control this field labels; the control picks it up automatically. */
  id: string;
  /** Localized label. */
  label: string;
  /** Localized error message, or null when valid. */
  error?: string | null;
  children: ReactNode;
}

/**
 * Labelled form field wrapper: associates a `<label>` with its control and renders a
 * validation error that assistive technology can reach.
 *
 * 🔴 The control no longer has to opt in. v0.1 documented that the control was "responsible
 * for setting `aria-describedby`", and the fleet did not do it — nene-vault marks fields
 * invalid 16 times and links the reason zero times (measured 2026-08-23). A field's own
 * error message is the field's job, so `FormField` publishes the ids through context and
 * the kit's controls read them. A control from outside the kit still works; it simply gets
 * the label association it always had.
 */
export function FormField({ id, label, error = null, children }: FormFieldProps) {
  const errorId = error === null ? null : `${id}-error`;
  const value = useMemo(() => ({ id, errorId }), [id, errorId]);

  return (
    <FieldContext.Provider value={value}>
      <div className="flex flex-col gap-x-inline-sm">
        <label htmlFor={id} className="font-sans font-medium text-text-primary">
          {label}
        </label>
        {children}
        {errorId === null ? null : (
          <p id={errorId} role="alert" className="font-sans text-danger">
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}
