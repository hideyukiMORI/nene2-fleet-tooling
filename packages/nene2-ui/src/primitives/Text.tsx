import type { ReactNode } from 'react';
import { cx } from '../lib/cx.js';

export interface TextProps {
  /** Composed after the kit's own classes (design principle 2). */
  className?: string;
  as?: 'p' | 'span';
  tone?: 'primary' | 'muted';
  children: ReactNode;
}

export function Text({ as = 'p', tone = 'primary', children, className }: TextProps) {
  const merged = cx(
    'font-sans',
    tone === 'muted' ? 'text-x-slot-text-muted-fg' : 'text-x-slot-text-fg',
    className,
  );

  return as === 'span' ? (
    <span className={merged}>{children}</span>
  ) : (
    <p className={merged}>{children}</p>
  );
}
