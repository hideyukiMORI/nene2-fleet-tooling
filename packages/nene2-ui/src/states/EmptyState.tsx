export interface EmptyStateProps {
  /** Localized message. The kit never ships strings — see README. */
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="py-x-slot-state-pad-y font-sans text-text-muted" role="status">
      {message}
    </div>
  );
}
