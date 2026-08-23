import { Button } from '../primitives/Button.js';
import { cx } from '../lib/cx.js';

export interface ErrorStateProps {
  /** Composed after the kit's own classes (design principle 2). */
  className?: string;
  /** Localized message. */
  message: string;
  /** Localized label for the retry control. */
  retryLabel: string;
  onRetry: () => void;
}

export function ErrorState({ message, retryLabel, onRetry, className }: ErrorStateProps) {
  return (
    <div className={cx('py-x-slot-state-pad-y', className)} role="alert">
      <p className="font-sans text-x-slot-error-state-fg">{message}</p>
      <div className="py-x-slot-state-action-pad-y">
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      </div>
    </div>
  );
}
