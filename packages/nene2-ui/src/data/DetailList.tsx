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
  /**
   * `stack` (default) is one row per line — what the component always drew. `columns` lays
   * the rows out in two columns on a wide viewport and **falls back to one column below
   * `md` on its own**, so a caller never has to say so (nene-vault's own `<dl>` carries
   * `max-md:grid-cols-1`, and so do the other four ships' — measured 2026-08-25, #391).
   *
   * 🔴 A choice between two arrangements, not a column count. Five ships write a two-column
   * detail block and none writes three; a `columns: number` would be a value the kit
   * invented (design principle 3). `rows[].span` was considered and rejected for the same
   * reason: it brings a column count into every row (#424).
   *
   * Only structure lives here. The term's weight and colour are slots
   * (`--font-weight-x-slot-detail-term`, `--color-x-slot-detail-term-fg`) and reach a
   * product through the theme, not through a prop.
   */
  layout?: 'stack' | 'columns';
}

/**
 * Read-only key/value display for detail screens. Uses a description list so the
 * label/value relationship is conveyed to assistive technology.
 */
const LAYOUT_CLASS: Record<NonNullable<DetailListProps['layout']>, string> = {
  stack: 'flex flex-col',
  // One gap slot for both axes — the fleet's two-column blocks use one value, and a second
  // slot would be a step nobody asked for.
  columns: 'grid grid-cols-2 max-md:grid-cols-1',
};

export function DetailList({ rows, className, layout = 'stack' }: DetailListProps) {
  return (
    <dl className={cx(LAYOUT_CLASS[layout], 'gap-x-slot-detail-gap', className)}>
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex flex-col gap-x-slot-detail-row-gap border-b border-x-slot-detail-border py-x-slot-detail-row-pad-y"
        >
          <dt className="font-sans font-x-slot-detail-term text-x-slot-detail-term-fg">
            {row.label}
          </dt>
          <dd className="font-sans text-x-slot-detail-description-fg">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
