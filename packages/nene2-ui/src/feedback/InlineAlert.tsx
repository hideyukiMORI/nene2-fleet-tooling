import type { ReactNode } from 'react';
import { cx } from '../lib/cx.js';

export interface InlineAlertProps {
  /** What the message means. `danger` is announced assertively; `info` politely. */
  tone?: 'info' | 'danger';
  children: ReactNode;
}

const TONE_CLASS: Record<NonNullable<InlineAlertProps['tone']>, string> = {
  info: 'bg-surface text-text-primary border-border',
  danger: 'bg-surface text-danger border-danger',
};

/**
 * A message attached to the thing it is about, rather than to the page.
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
