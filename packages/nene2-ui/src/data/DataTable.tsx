import type { ReactNode } from 'react';

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
export function DataTable<Row>({ columns, rows, rowKey, caption }: DataTableProps<Row>) {
  return (
    <table className="w-full border-collapse font-sans text-x-slot-table-fg">
      <caption className="sr-only">{caption}</caption>
      <thead>
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
      <tbody>
        {rows.map((row) => (
          <tr key={rowKey(row)}>
            {columns.map((col) => (
              <td
                key={col.key}
                className={`border-b border-x-slot-table-border px-x-slot-table-cell-pad-x py-x-slot-table-cell-pad-y ${
                  col.align === 'end' ? 'text-right' : 'text-left'
                }`}
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
