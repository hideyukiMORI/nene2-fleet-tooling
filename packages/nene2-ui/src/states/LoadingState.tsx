import { Spinner } from '../primitives/Spinner.js';
import { cx } from '../lib/cx.js';

export interface LoadingStateProps {
  /** Composed after the kit's own classes (design principle 2). */
  className?: string;
  /** Localized message announced while the work is in flight. */
  label: string;
}

/**
 * The third of the three states.
 *
 * 🔴 The kit's own README says these ship as a set — "so a screen that handles only the
 * happy path is visibly incomplete" — and then v0.1 shipped `EmptyState` and `ErrorState`
 * without this one. Five ships wrote their own. A set documented as a set and delivered
 * short is worse than no set: every screen author reads the principle, looks for the part,
 * and writes their own.
 *
 * 🔴 The wrapper carries no `role="status"`. `Spinner` renders an `<output aria-live>`,
 * and a live region wrapped in another live region is announced twice. `aria-busy` marks
 * the region as in-flight without adding a second announcer.
 */
export function LoadingState({ label, className }: LoadingStateProps) {
  return (
    <div className={cx('py-x-slot-state-pad-y', className)} aria-busy="true">
      <Spinner label={label} />
    </div>
  );
}
