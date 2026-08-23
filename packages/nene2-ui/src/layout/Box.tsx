import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx.js';
import { PAD, PAD_X, PAD_Y, resolve, type Responsive, type Space } from '../lib/spacing.js';

export interface BoxProps extends HTMLAttributes<HTMLDivElement> {
  /** Padding on all four sides. `padX` / `padY` win over it, the way `px-*` wins over `p-*`. */
  pad?: Responsive<Space>;
  padX?: Responsive<Space>;
  padY?: Responsive<Space>;
  children?: ReactNode;
}

/**
 * A plain block that carries padding from the scale and nothing else.
 *
 * 🔴 There are deliberately no `w` / `h` props, though the fleet writes 241 sizing
 * utilities by hand. Width is usually a fact about one screen's layout rather than a shared
 * design decision, and the measured values say so: 241 uses spread across 76 distinct
 * classes (`w-24`, `w-56`, `min-w-160`, `w-3.75`…). Turning that into a prop would reopen
 * the value channel this kit exists to close, and would absorb almost nothing. Sizing stays
 * in the caller's `className`, where it is at least visible to a linter.
 */
export function Box({ pad, padX, padY, children, className, ...rest }: BoxProps) {
  return (
    <div
      className={cx(resolve(pad, PAD), resolve(padX, PAD_X), resolve(padY, PAD_Y), className)}
      {...rest}
    >
      {children}
    </div>
  );
}
