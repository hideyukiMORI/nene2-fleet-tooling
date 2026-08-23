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
 * first ship scheduled for migration — sets `aria-invalid` on **3 fields** and links the
 * reason **zero times**: assistive technology is told the field is wrong and never told
 * why. nene-payout sets it on 26 fields and links the reason zero times as well.
 *
 * (Counted as JSX props only. A plain `grep -r aria-invalid` over nene-vault's frontend
 * returns 14, not 3: the other eleven are 8 test assertions, 2 comment lines and 1 Tailwind
 * `aria-invalid:` variant selector. Likewise nene-payout's single `aria-describedby` hit is
 * a comment, so its real count is zero, not one. Both of those wrong numbers reached a draft
 * of this comment — written down here so the next person to recount lands on the same one.)
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
