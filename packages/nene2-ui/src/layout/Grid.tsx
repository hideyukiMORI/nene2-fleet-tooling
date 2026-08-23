import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx.js';
import { COLS, GAP, resolve, type Responsive, type Space } from '../lib/spacing.js';

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Column count, optionally per breakpoint: `cols={{ base: 1, sm: 2 }}`.
   *
   * Responsive is not a nicety here. `sm:grid-cols-2` is the single most common
   * breakpoint-qualified class in the fleet (14 uses); a `Grid` that could not express it
   * would simply not be adopted.
   */
  cols?: Responsive<number>;
  gap?: Responsive<Space>;
  children: ReactNode;
}

export function Grid({ cols = 1, gap, children, className, ...rest }: GridProps) {
  return (
    <div className={cx('grid', resolve(cols, COLS), resolve(gap, GAP), className)} {...rest}>
      {children}
    </div>
  );
}
