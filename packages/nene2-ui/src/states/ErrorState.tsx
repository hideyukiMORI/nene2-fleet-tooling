import { Button } from '../primitives/Button.js';

export interface ErrorStateProps {
  /** Localized message. */
  message: string;
  /** Localized label for the retry control. */
  retryLabel: string;
  onRetry: () => void;
}

export function ErrorState({ message, retryLabel, onRetry }: ErrorStateProps) {
  return (
    <div className="py-x-slot-state-pad-y" role="alert">
      <p className="font-sans text-danger">{message}</p>
      <div className="py-x-slot-state-action-pad-y">
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      </div>
    </div>
  );
}
