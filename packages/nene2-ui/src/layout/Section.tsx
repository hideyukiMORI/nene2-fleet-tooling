import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx.js';
import { GAP, PAD, resolve, type Responsive, type Space } from '../lib/spacing.js';

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  pad?: Responsive<Space>;
  /** Rhythm between the section's own blocks. */
  gap?: Responsive<Space>;
  children: ReactNode;
}

/**
 * A titled region of a page: a real `<section>` that stacks its children vertically.
 *
 * The defaults are the fleet's two most-written padding and gap values (`p-4` and `gap-3`
 * measured across 749 hand-written uses), so the common case needs no props at all —
 * which is the only way a shared component actually gets used.
 */
export function Section({ pad = 'sm', gap = 'xs', children, className, ...rest }: SectionProps) {
  return (
    <section
      className={cx('flex flex-col', resolve(pad, PAD), resolve(gap, GAP), className)}
      {...rest}
    >
      {children}
    </section>
  );
}
