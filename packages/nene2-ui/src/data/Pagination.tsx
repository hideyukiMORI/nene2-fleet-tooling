import { Button } from '../primitives/Button.js';
import { Stack } from '../layout/Stack.js';

export interface PaginationProps {
  /** 1-based. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Localized name for the navigation region, e.g. "Invoice pages". */
  label: string;
  previousLabel: string;
  nextLabel: string;
  /** Localized current position, e.g. "Page 2 of 9". The kit ships no strings. */
  status: string;
}

/**
 * Page-by-page navigation for a list.
 *
 * 🔴 The current position is text, and the region is a named `<nav>`. Four ships wrote this
 * component and the recurring shape marks the current page by colour alone — which is
 * invisible to a screen reader and to anyone who cannot distinguish the two shades. The
 * `status` string is required for the same reason: "you are here" has to be readable, not
 * merely visible.
 *
 * The ends are disabled rather than hidden. A control that disappears at the boundary makes
 * the row of controls jump, and moves the next-page button under the cursor that just
 * clicked it.
 */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  label,
  previousLabel,
  nextLabel,
  status,
}: PaginationProps) {
  return (
    <nav aria-label={label}>
      <Stack direction="horizontal" gap="2xs" align="center">
        <Button
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label={previousLabel}
        >
          {previousLabel}
        </Button>
        <span aria-current="page" className="font-sans text-text-muted">
          {status}
        </span>
        <Button
          variant="secondary"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          aria-label={nextLabel}
        >
          {nextLabel}
        </Button>
      </Stack>
    </nav>
  );
}
