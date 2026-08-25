import type { ReactNode } from 'react';
import { cx } from '../lib/cx.js';

export interface DataColumn<Row> {
  /** Stable key, also used as the React key. */
  key: string;
  /** Localized column heading. */
  header: string;
  /** Cell renderer. Kept explicit so a column can render a Badge, a link, anything. */
  cell: (row: Row) => ReactNode;
  /** Numeric columns read better right-aligned. Alignment, not styling. */
  align?: 'start' | 'end';
}

export interface DataTableProps<Row> {
  columns: DataColumn<Row>[];
  rows: Row[];
  /** Stable identity per row. Index-as-key breaks as soon as the list is sorted. */
  rowKey: (row: Row) => string;
  /** Localized description of what the table contains. Becomes the table's caption. */
  caption: string;
  /** Composed after the kit's own classes (design principle 2). Lands on the `<table>`. */
  className?: string;
  /**
   * Below `sm`, draw each row as a card: every cell becomes a block headed by its column's
   * name. Off by default — a table that changes shape at a breakpoint is a decision, the
   * same rule as `Modal`'s `sheetOnMobile`.
   *
   * 🔴 Four ships already do this by hand (`<td data-label>` + `content: attr(data-label)`;
   * invoice / profile / records / vault, measured 2026-08-25), which is why it is here and
   * not left to them (#423). The kit does it with utilities, every one carrying the
   * `max-sm:` prefix, so a wide viewport is untouched.
   *
   * ⚠️ The visual header row is hidden (`sr-only`), not removed: the `<th scope="col">` stay
   * in the document, so assistive tech still pairs a cell with its column.
   *
   * 🔴 The `::before` label is drawn with the alternative-text form of `content`
   * (`attr(data-label) / ""`) so that it stays out of the cell's accessible name. Without
   * the `/ ""` the generated text *is* part of the name: every cell is read as "Name x"
   * while the hidden `<th>` still supplies "Name" — the header twice (#439, vault's
   * Playwright on production 0.9.2 at 375px). Measured in Chromium 149 for 0.17.1: plain
   * `attr()` → cell "Name x"; with `/ ""` → cell "x", also through Tailwind's
   * `--tw-content` indirection. Firefox does not implement the alternative-text form
   * (2026-08), so there the label is still read twice — the same as 0.17.0, not a
   * regression. jsdom does not compute pseudo-elements, so the test pins the class literal.
   */
  collapse?: 'sm';
}

/**
 * A tabular list.
 *
 * 🔴 Every heading carries `scope="col"`. Without it a screen reader cannot pair a cell with
 * its column, so each cell is read as a bare value — and nothing about the rendered table
 * looks any different, which is why three ships each shipped a table and the `scope` is the
 * detail most likely to differ between them.
 *
 * 🔴 The caption is required, not optional. A visually obvious table ("it's clearly the
 * invoice list") is not obvious to someone arriving at it by keyboard from elsewhere on the
 * page. It is visually hidden, not absent.
 */
// Every class here carries `max-sm:`. Only structure — the label's weight and colour are
// the header's own slots, read through `before:`.
const CARD_TABLE = 'max-sm:block';
const CARD_THEAD = 'max-sm:sr-only';
const CARD_TBODY = 'max-sm:block';
const CARD_ROW = 'max-sm:block max-sm:border-b max-sm:border-x-slot-table-border';
// `content-[attr(data-label)_/_'']` — Tailwind's `_` is a space, so this is
// `content: attr(data-label) / ''`: the label is drawn but has empty alternative text (#439).
const CARD_CELL =
  "max-sm:block max-sm:border-b-0 max-sm:text-left max-sm:before:block max-sm:before:content-[attr(data-label)_/_''] max-sm:before:font-x-slot-table-header max-sm:before:text-x-slot-table-header-fg";

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  caption,
  className,
  collapse,
}: DataTableProps<Row>) {
  const cards = collapse === 'sm';
  return (
    <table
      className={cx(
        'w-full border-collapse font-sans text-x-slot-table-fg',
        cards && CARD_TABLE,
        className,
      )}
    >
      <caption className="sr-only">{caption}</caption>
      <thead className={cards ? CARD_THEAD : undefined}>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              scope="col"
              className={`border-b border-x-slot-table-border px-x-slot-table-cell-pad-x py-x-slot-table-cell-pad-y font-x-slot-table-header text-x-slot-table-header-fg ${
                col.align === 'end' ? 'text-right' : 'text-left'
              }`}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className={cards ? CARD_TBODY : undefined}>
        {rows.map((row) => (
          <tr key={rowKey(row)} className={cards ? CARD_ROW : undefined}>
            {columns.map((col) => (
              <td
                key={col.key}
                {...(cards ? { 'data-label': col.header } : {})}
                className={cx(
                  'border-b border-x-slot-table-border px-x-slot-table-cell-pad-x py-x-slot-table-cell-pad-y',
                  col.align === 'end' ? 'text-right' : 'text-left',
                  cards && CARD_CELL,
                )}
              >
                {col.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
