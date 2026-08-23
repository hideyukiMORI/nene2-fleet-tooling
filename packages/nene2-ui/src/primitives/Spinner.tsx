import { cx } from '../lib/cx.js';
export interface SpinnerProps {
  /** Composed after the kit's own classes (design principle 2). */
  className?: string;
  /** Localized loading text. The kit never ships strings — see README. */
  label: string;
}

export function Spinner({ label, className }: SpinnerProps) {
  return (
    <output className={cx('font-sans text-text-muted', className)} aria-live="polite">
      {label}
    </output>
  );
}
