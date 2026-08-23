import type { ReactNode } from 'react';

export interface FormFieldProps {
  /** id of the control this field labels; must match the control's `id`. */
  id: string;
  /** Localized label. */
  label: string;
  /** Localized error message, or null when valid. */
  error?: string | null;
  children: ReactNode;
}

/**
 * Labelled form field wrapper: associates a <label> with its control and renders a
 * validation error with an aria-describedby link for assistive tech.
 *
 * The control is responsible for setting `aria-describedby={`${id}-error`}` when it
 * renders an error, so the association survives arbitrary control implementations.
 */
export function FormField({ id, label, error = null, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-x-inline-sm">
      <label htmlFor={id} className="font-sans font-medium text-text-primary">
        {label}
      </label>
      {children}
      {error !== null ? (
        <p id={`${id}-error`} role="alert" className="font-sans text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
