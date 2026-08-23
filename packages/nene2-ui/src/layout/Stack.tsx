import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx.js';
import { GAP, resolve, type Responsive, type Space } from '../lib/spacing.js';

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  /** Main axis. Vertical by default — the common case, and the one `space-y-*` was used for. */
  direction?: 'vertical' | 'horizontal';
  gap?: Responsive<Space>;
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between';
  wrap?: boolean;
  /**
   * Hairline between children.
   *
   * 🔴 This exists to absorb `last:border-b-0` / `last:pb-0` / `first:pt-0`, which the fleet
   * writes 10 times. Those are not screen decisions — they are a list component leaking its
   * seams into the caller. The kit owns the seams instead of taking them as props.
   */
  divider?: boolean;
  children: ReactNode;
}

const ALIGN: Record<NonNullable<StackProps['align']>, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
};

const JUSTIFY: Record<NonNullable<StackProps['justify']>, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
};

const DIVIDER: Record<NonNullable<StackProps['direction']>, string> = {
  vertical: 'divide-y divide-border',
  horizontal: 'divide-x divide-border',
};

export function Stack({
  direction = 'vertical',
  gap,
  align,
  justify,
  wrap = false,
  divider = false,
  children,
  className,
  ...rest
}: StackProps) {
  return (
    <div
      className={cx(
        'flex',
        direction === 'vertical' ? 'flex-col' : 'flex-row',
        resolve(gap, GAP),
        align && ALIGN[align],
        justify && JUSTIFY[justify],
        wrap && 'flex-wrap',
        divider && DIVIDER[direction],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
