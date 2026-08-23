import { createContext, useContext, type AriaAttributes } from 'react';

export interface FieldContextValue {
  /** id the label points at, and the control must carry. */
  id: string;
  /** id of the rendered error message, or null when the field is valid. */
  errorId: string | null;
  /** id of the rendered hint, or null when there is no hint. */
  hintId: string | null;
  /** Whether the field must be filled in. */
  required: boolean;
}

export const FieldContext = createContext<FieldContextValue | null>(null);

// `| undefined` is explicit because the package builds with `exactOptionalPropertyTypes`:
// an absent prop and a prop set to undefined are different types, and these are the latter.
export interface FieldWiring {
  id?: string | undefined;
  'aria-invalid'?: AriaAttributes['aria-invalid'] | undefined;
  'aria-describedby'?: string | undefined;
  'aria-required'?: AriaAttributes['aria-required'] | undefined;
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
 * 🔴 The same is true of hints. nene-invoice, nene-vault and nene-profile each render one,
 * and none of the three links it — so the help text is visible and never read out. The kit
 * puts both ids on the control, the error first, because once a field is wrong the reason
 * matters more than the advice.
 *
 * A contract a component states in prose and leaves to its callers is a contract that will
 * be half-kept. The kit knows the ids, so the kit does the wiring.
 *
 * Explicit props always win — a caller with its own error region can still say so.
 */
export function useFieldWiring(explicit: {
  id?: string | undefined;
  ariaInvalid?: AriaAttributes['aria-invalid'] | undefined;
  ariaDescribedBy?: string | undefined;
  ariaRequired?: AriaAttributes['aria-required'] | undefined;
}): FieldWiring {
  const field = useContext(FieldContext);

  if (field === null) {
    return {
      id: explicit.id,
      'aria-invalid': explicit.ariaInvalid,
      'aria-describedby': explicit.ariaDescribedBy,
      'aria-required': explicit.ariaRequired,
    };
  }

  const described = [field.errorId, field.hintId].filter((v): v is string => v !== null).join(' ');

  return {
    id: explicit.id ?? field.id,
    'aria-invalid': explicit.ariaInvalid ?? (field.errorId === null ? undefined : true),
    'aria-describedby': explicit.ariaDescribedBy ?? (described === '' ? undefined : described),
    'aria-required': explicit.ariaRequired ?? (field.required ? true : undefined),
  };
}
