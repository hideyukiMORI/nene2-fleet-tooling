import { Button } from '../primitives/Button.js';
import { Stack } from '../layout/Stack.js';

interface PaginationBase {
  /** Localized name for the navigation region, e.g. "Invoice pages". */
  label: string;
  previousLabel: string;
  nextLabel: string;
  /**
   * Localized statement of where the reader is: "Page 2 of 9", or "Showing 21–40 of 384".
   *
   * 🔴 Composed by the caller, and it has to be. Across nene-vault's three paginated screens
   * the sentence is a *range of items*, not a page number — and a range cannot be recovered
   * from `page` and `pageCount` once the last page is short (measured 2026-08-23). A
   * component that only knew about pages could not produce the sentence the product needs.
   */
  status: string;
  /** Composed after the kit's own classes (design principle 2). Lands on the `<nav>`. */
  className?: string;
}

interface PagePagination extends PaginationBase {
  /** 1-based. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  canPrev?: never;
  canNext?: never;
  onPrev?: never;
  onNext?: never;
}

interface OffsetPagination extends PaginationBase {
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  page?: never;
  pageCount?: never;
  onPageChange?: never;
}

export type PaginationProps = PagePagination | OffsetPagination;

/**
 * Page-by-page navigation for a list.
 *
 * 🔴 Two models, because products keep the position in two different ways. All three of
 * nene-vault's paginated screens hold an **offset**, and none of them holds a page number
 * (measured 2026-08-23). Converting offset to a page is arithmetic; converting the sentence
 * "21–40 of 384" back out of a page number is not. So the component takes whichever the
 * caller already has, rather than making two thirds of the fleet keep a second copy of its
 * own position.
 *
 * A finite choice between two arrangements, which is structure — not a design value that a
 * caller could invent (design principle 3).
 *
 * 🔴 The current position is text, and the region is a named `<nav>`. Four ships wrote this
 * component and the recurring shape marks the current page by colour alone — invisible to a
 * screen reader and to anyone who cannot distinguish the two shades.
 *
 * The ends are disabled rather than hidden. A control that disappears at the boundary makes
 * the row jump, and moves the next-page button under the cursor that just clicked it.
 */
export function Pagination(props: PaginationProps) {
  const { label, previousLabel, nextLabel, status, className } = props;

  const atStart = props.page === undefined ? !props.canPrev : props.page <= 1;
  const atEnd = props.page === undefined ? !props.canNext : props.page >= props.pageCount;

  const goPrev = () =>
    props.page === undefined ? props.onPrev() : props.onPageChange(props.page - 1);
  const goNext = () =>
    props.page === undefined ? props.onNext() : props.onPageChange(props.page + 1);

  return (
    <nav aria-label={label} className={className}>
      <Stack direction="horizontal" gap="2xs" align="center">
        <Button variant="secondary" disabled={atStart} onClick={goPrev} aria-label={previousLabel}>
          {previousLabel}
        </Button>
        <span aria-current="page" className="font-sans text-x-slot-pagination-fg">
          {status}
        </span>
        <Button variant="secondary" disabled={atEnd} onClick={goNext} aria-label={nextLabel}>
          {nextLabel}
        </Button>
      </Stack>
    </nav>
  );
}
