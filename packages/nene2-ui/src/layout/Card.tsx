import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx.js';
import { GAP, PAD, resolve, type Responsive, type Space } from '../lib/spacing.js';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  pad?: Responsive<Space>;
  gap?: Responsive<Space>;
  /** Lift the card off the page. Off by default — a page of shadows reads as no shadows. */
  raised?: boolean;
  children: ReactNode;
}

/**
 * A bounded surface: background, hairline border, corner radius, padding.
 *
 * Surface, border and radius come from the theme and are not props — a card that could be
 * given its own colour would be a `div` with extra steps.
 */
export function Card({ pad = 'sm', gap, raised = false, children, className, ...rest }: CardProps) {
  return (
    <div
      className={cx(
        'flex flex-col bg-surface-raised border border-border rounded-x-md',
        raised && 'shadow-sm',
        resolve(pad, PAD),
        resolve(gap, GAP),
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
