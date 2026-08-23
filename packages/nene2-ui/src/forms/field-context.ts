import { createContext, useContext, type AriaAttributes } from 'react';

export interface FieldContextValue {
  /** id the label points at, and the control must carry. */
  id: string;
  /** id of the rendered error message, or null when the field is valid. */
  errorId: string | null;
}

export const FieldContext = createContext<FieldContextValue | null>(null);

// `| undefined` is explicit because the package builds with `exactOptionalPropertyTypes`:
// an absent prop and a prop set to undefined are different types, and these are the latter.
export interface FieldWiring {
  id?: string | undefined;
  'aria-invalid'?: AriaAttributes['aria-invalid'] | undefined;
  'aria-describedby'?: string | undefined;
}

/**
 * Wire a control to the `FormField` around it.
 *
 * 🔴 Why this is not the caller's job, though v0.1 said it was. `FormField` used to carry
 * this in a doc comment:
 *
 *   > The control is responsible for setting aria-describedby={`${id}-error`} when it
 *   > renders an error
 *
 * Measured across the fleet on 2026-08-23, that delegation did not hold. nene-vault — the
 * first ship scheduled for migration — writes `aria-invalid` **16 times and
 * `aria-describedby` zero times**: assistive technology is told the field is wrong and
 * never told why. nene-payout is 26 against 1.
 *
 * A contract a component states in prose and leaves to its callers is a contract that will
 * be half-kept. The kit knows the error's id, so the kit does the wiring.
 *
 * Explicit props always win — a caller with its own error region can still say so.
 */
export function useFieldWiring(explicit: {
  id?: string | undefined;
  ariaInvalid?: AriaAttributes['aria-invalid'] | undefined;
  ariaDescribedBy?: string | undefined;
}): FieldWiring {
  const field = useContext(FieldContext);

  if (field === null) {
    return {
      id: explicit.id,
      'aria-invalid': explicit.ariaInvalid,
      'aria-describedby': explicit.ariaDescribedBy,
    };
  }

  return {
    id: explicit.id ?? field.id,
    'aria-invalid': explicit.ariaInvalid ?? (field.errorId === null ? undefined : true),
    'aria-describedby': explicit.ariaDescribedBy ?? field.errorId ?? undefined,
  };
}
