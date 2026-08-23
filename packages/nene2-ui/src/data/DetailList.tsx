import type { ReactNode } from 'react';
import { cx } from '../lib/cx.js';

export interface DetailRow {
  /** Localized row label. */
  label: string;
  value: ReactNode;
}

export interface DetailListProps {
  /** Composed after the kit's own classes (design principle 2). */
  className?: string;
  rows: DetailRow[];
}

/**
 * Read-only key/value display for detail screens. Uses a description list so the
 * label/value relationship is conveyed to assistive technology.
 */
export function DetailList({ rows, className }: DetailListProps) {
  return (
    <dl className={cx('flex flex-col gap-x-slot-detail-gap', className)}>
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex flex-col gap-x-slot-detail-row-gap border-b border-border py-x-slot-detail-row-pad-y"
        >
          <dt className="font-sans font-medium text-text-muted">{row.label}</dt>
          <dd className="font-sans text-text-primary">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
