import type { ReactNode } from 'react';

export interface DetailRow {
  /** Localized row label. */
  label: string;
  value: ReactNode;
}

export interface DetailListProps {
  rows: DetailRow[];
}

/**
 * Read-only key/value display for detail screens. Uses a description list so the
 * label/value relationship is conveyed to assistive technology.
 */
export function DetailList({ rows }: DetailListProps) {
  return (
    <dl className="flex flex-col gap-x-stack-sm">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex flex-col gap-x-inline-sm border-b border-border py-x-stack-sm"
        >
          <dt className="font-sans font-medium text-text-muted">{row.label}</dt>
          <dd className="font-sans text-text-primary">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
