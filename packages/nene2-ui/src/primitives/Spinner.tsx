export interface SpinnerProps {
  /** Localized loading text. The kit never ships strings — see README. */
  label: string;
}

export function Spinner({ label }: SpinnerProps) {
  return (
    <output className="font-sans text-text-muted" aria-live="polite">
      {label}
    </output>
  );
}
