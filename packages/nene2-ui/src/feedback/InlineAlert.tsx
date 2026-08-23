import type { ReactNode } from 'react';
import { cx } from '../lib/cx.js';

export interface InlineAlertProps {
  /** What the message means. `danger` is announced assertively; `info` politely. */
  tone?: 'info' | 'warn' | 'danger';
  children: ReactNode;
}

const TONE_CLASS: Record<NonNullable<InlineAlertProps['tone']>, string> = {
  info: 'bg-x-slot-alert-info-bg text-x-slot-alert-info-fg border-x-slot-alert-info-border',
  warn: 'bg-x-slot-alert-warn-bg text-x-slot-alert-warn-fg border-x-slot-alert-warn-border',
  danger: 'bg-x-slot-alert-danger-bg text-x-slot-alert-danger-fg border-x-slot-alert-danger-border',
};

/**
 * A message attached to the thing it is about, rather than to the page.
 *
 * 🔴 Each tone reads its colours from the theme, so a product can tell "warning" from
 * "failure" by sight. Until it sets them, `warn` and `danger` share this palette's single
 * alert hue and only the announced urgency differs — and as nene-vault put it, that
 * difference reaches someone listening and no one looking.
 *
 * 🔴 The tone decides the ARIA role, not just the colour. `danger` becomes `role="alert"`,
 * which interrupts a screen reader; `info` becomes `role="status"`, which waits its turn.
 * Six ships wrote this component (three as `InlineAlert`, three as `Alert`) and the choice
 * of role is precisely the part that is easy to get wrong and invisible when you do.
 */
export function InlineAlert({ tone = 'info', children }: InlineAlertProps) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cx('rounded-x-slot-alert border p-x-slot-alert-pad font-sans', TONE_CLASS[tone])}
    >
      {children}
    </div>
  );
}
