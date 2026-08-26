import type { ReactNode } from 'react';
import { cx } from '../lib/cx.js';

export interface BadgeProps {
  /**
   * What the badge means, not what colour it is.
   *
   * 🔴 `success` / `warn` / `info` — not `ok` / `warning`. Five ships carry a success and a
   * warning tone in their own badge and they do not agree on the words (clear and invoice
   * say `ok`, origin says `warning`); the contract bans both synonyms, and `InlineAlert`
   * already says `warn`. One vocabulary across the kit, so a tone means the same thing in a
   * badge as it does in an alert (0.17.0, #422).
   */
  tone?: 'neutral' | 'accent' | 'danger' | 'success' | 'warn' | 'info';
  /** Composed after the kit's own classes (design principle 2). */
  className?: string;
  children: ReactNode;
}

const TONE_CLASS: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral:
    'bg-x-slot-badge-neutral-bg text-x-slot-badge-neutral-fg border-x-slot-badge-neutral-border',
  accent: 'bg-x-slot-badge-accent-bg text-x-slot-badge-accent-fg border-x-slot-badge-accent-border',
  danger: 'bg-x-slot-badge-danger-bg text-x-slot-badge-danger-fg border-x-slot-badge-danger-border',
  success:
    'bg-x-slot-badge-success-bg text-x-slot-badge-success-fg border-x-slot-badge-success-border',
  warn: 'bg-x-slot-badge-warn-bg text-x-slot-badge-warn-fg border-x-slot-badge-warn-border',
  info: 'bg-x-slot-badge-info-bg text-x-slot-badge-info-fg border-x-slot-badge-info-border',
};

/**
 * A small status marker.
 *
 * 🔴 `tone` names a meaning, never a colour. `<Badge tone="danger">` survives a rebrand;
 * `<Badge color="red">` becomes a lie the moment the theme changes, and there is no way to
 * find every such lie afterwards except by reading every screen.
 */
/**
 * 🔴 `whitespace-nowrap` is load-bearing (#477). A badge is a label, not body copy — but the
 * kit had no opinion on wrapping, so in a narrow flex row the label wrapped. In CJK that is
 * not a word-boundary break: 「あなた」 came apart into three stacked characters and the badge
 * grew from 26.5px tall to 43px (measured, nene-deal /users at 375px).
 *
 * Two holes were open at once — the label could *wrap* (`white-space: normal`) and the badge
 * could *shrink* (`flex-shrink: 1`) — and either one alone produces the failure. `shrink-0`
 * would close it too, but only while the badge is a flex item: measured in a 50px block
 * container, `shrink-0` still wrapped (50 × 43) while `nowrap` did not (51 × 26.5). `nowrap`
 * also stops the shrink, because a flex item's automatic minimum size is its min-content
 * width and nowrap makes that the whole label. One class, both holes, any context.
 *
 * A badge that already fits is unchanged (35.88 × 26.5 before and after, measured).
 */
export function Badge({ tone = 'neutral', className, children }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center whitespace-nowrap gap-x-slot-badge-gap rounded-x-slot-badge border px-x-slot-badge-pad-x py-x-slot-badge-pad-y font-sans text-x-slot-badge font-x-slot-badge',
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
