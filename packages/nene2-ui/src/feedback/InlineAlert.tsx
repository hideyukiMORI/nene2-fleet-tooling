import type { ReactNode } from 'react';
import { cx } from '../lib/cx.js';

export interface InlineAlertProps {
  /** What the message means. `danger` is announced assertively; the rest politely. */
  tone?: 'info' | 'warn' | 'danger' | 'success';
  /**
   * 🔴 Needed to point an `aria-describedby` at this message. Without it a product that
   * wants the alert read out with a control has nowhere to put an id, and nene-vault
   * wrapped the alert in a `<div>` to get one (2026-08-23). `FormField`'s `hint` is static
   * help text, so it does not cover "a warning about the value that is in there now".
   */
  id?: string;
  /** Composed after the kit's own classes (design principle 2). */
  className?: string;
  children: ReactNode;
}

const TONE_CLASS: Record<NonNullable<InlineAlertProps['tone']>, string> = {
  info: 'bg-x-slot-alert-info-bg text-x-slot-alert-info-fg border-x-slot-alert-info-border',
  warn: 'bg-x-slot-alert-warn-bg text-x-slot-alert-warn-fg border-x-slot-alert-warn-border',
  danger: 'bg-x-slot-alert-danger-bg text-x-slot-alert-danger-fg border-x-slot-alert-danger-border',
  success:
    'bg-x-slot-alert-success-bg text-x-slot-alert-success-fg border-x-slot-alert-success-border',
};

/**
 * A message attached to the thing it is about, rather than to the page.
 *
 * 🔴 Each tone reads its colours from the theme, so a product can tell "warning" from
 * "failure" by sight. Until 0.12.0 they could not: `warn` pointed at `--color-danger`, so
 * only the announced urgency differed — and as nene-vault put it, that difference reaches
 * someone listening and no one looking. The palette now carries `warn` of its own.
 *
 * 🔴 The tone decides the ARIA role, not just the colour. `danger` becomes `role="alert"`,
 * which interrupts a screen reader; every other tone becomes `role="status"`, which waits
 * its turn. Six ships wrote this component (three as `InlineAlert`, three as `Alert`) and
 * the choice of role is precisely the part that is easy to get wrong and invisible when you
 * do.
 *
 * 🔴 `success` (#486) is deliberately **polite**, not assertive. Good news does not earn an
 * interruption, and `ToastProvider` already settled the same question the same way
 * (`POLITE_TONES = ['info', 'success']`). Announcing a success assertively would cut off
 * whatever the person was reading to tell them nothing went wrong.
 */
export function InlineAlert({ tone = 'info', id, className, children }: InlineAlertProps) {
  return (
    <div
      id={id}
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cx(
        'rounded-x-slot-alert border p-x-slot-alert-pad font-sans',
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
