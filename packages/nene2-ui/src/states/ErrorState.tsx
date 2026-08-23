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
    <div className="py-x-stack-lg" role="alert">
      <p className="font-sans text-danger">{message}</p>
      <div className="py-x-stack-sm">
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      </div>
    </div>
  );
}
