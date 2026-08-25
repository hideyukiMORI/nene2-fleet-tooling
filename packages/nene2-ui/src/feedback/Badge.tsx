import type { ReactNode } from 'react';
import { cx } from '../lib/cx.js';

export interface BadgeProps {
  /** What the badge means, not what colour it is. */
  tone?: 'neutral' | 'accent' | 'danger';
  /** Composed after the kit's own classes (design principle 2). */
  className?: string;
  children: ReactNode;
}

const TONE_CLASS: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral:
    'bg-x-slot-badge-neutral-bg text-x-slot-badge-neutral-fg border-x-slot-badge-neutral-border',
  accent: 'bg-x-slot-badge-accent-bg text-x-slot-badge-accent-fg border-x-slot-badge-accent-border',
  danger: 'bg-x-slot-badge-danger-bg text-x-slot-badge-danger-fg border-x-slot-badge-danger-border',
};

/**
 * A small status marker.
 *
 * 🔴 `tone` names a meaning, never a colour. `<Badge tone="danger">` survives a rebrand;
 * `<Badge color="red">` becomes a lie the moment the theme changes, and there is no way to
 * find every such lie afterwards except by reading every screen.
 */
export function Badge({ tone = 'neutral', className, children }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-x-slot-badge border px-x-slot-badge-pad-x py-x-slot-badge-pad-y font-sans',
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
