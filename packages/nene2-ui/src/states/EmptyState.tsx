import { cx } from '../lib/cx.js';
export interface EmptyStateProps {
  /** Composed after the kit's own classes (design principle 2). */
  className?: string;
  /**
   * Horizontal alignment. Centre by default — measured across the fleet on 2026-08-23,
   * five of the six products that ship an EmptyState centre it.
   *
   * A choice between two arrangements, not a value: `align="start"` is structure, and
   * design principle 3 bars design *values* from props, not structural options.
   */
  align?: 'center' | 'start';
  /** Localized message. The kit never ships strings — see README. */
  message: string;
}

export function EmptyState({ message, align = 'center', className }: EmptyStateProps) {
  return (
    <div
      className={cx(
        'py-x-slot-state-pad-y font-sans text-x-slot-empty-state-fg',
        align === 'center' && 'text-center',
        className,
      )}
      role="status"
    >
      {message}
    </div>
  );
}
