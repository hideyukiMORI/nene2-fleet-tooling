import type { ReactNode } from 'react';
import { cx } from '../lib/cx.js';

export interface BadgeProps {
  /** What the badge means, not what colour it is. */
  tone?: 'neutral' | 'accent' | 'danger';
  children: ReactNode;
}

const TONE_CLASS: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'bg-surface text-text-muted border-border',
  accent: 'bg-accent text-on-accent border-accent',
  danger: 'bg-danger text-on-accent border-danger',
};

/**
 * A small status marker.
 *
 * 🔴 `tone` names a meaning, never a colour. `<Badge tone="danger">` survives a rebrand;
 * `<Badge color="red">` becomes a lie the moment the theme changes, and there is no way to
 * find every such lie afterwards except by reading every screen.
 */
export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-x-md border px-x-2xs py-x-3xs font-sans',
        TONE_CLASS[tone],
      )}
    >
      {children}
    </span>
  );
}
