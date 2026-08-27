import { Button } from '../primitives/Button.js';
import { Stack } from '../layout/Stack.js';
import { cx } from '../lib/cx.js';

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
  /**
   * Passed to both buttons. `sm` for a dense list footer. Omitted, the buttons keep the
   * size they had — which is what every caller got before 0.17.0.
   */
  size?: 'md' | 'sm';
  /**
   * On a narrow viewport, stack the three parts vertically. Off by default: the same rule as
   * `Modal`'s `sheetOnMobile` — a component that changes shape at a breakpoint is a decision.
   */
  stackOnMobile?: boolean;
  /**
   * Where the status sentence sits. `center` (default) is between the two buttons — what the
   * component always drew. `start` puts it before both, `end` after both.
   *
   * 🔴 Not a free layout. Three positions is the whole space a row of two buttons and one
   * sentence has, which makes it structure (design principle 3), not a value.
   *
   * There is deliberately no "hide when empty" prop: the kit cannot know a list is empty (the
   * offset model carries no total), and `{total > 0 && <Pagination … />}` says it in the one
   * place that does know. A prop would only move that line and pretend the kit decided.
   */
  statusPlacement?: 'start' | 'center' | 'end';
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
  const {
    label,
    previousLabel,
    nextLabel,
    status,
    className,
    size = 'md',
    stackOnMobile,
    statusPlacement = 'center',
  } = props;

  const atStart = props.page === undefined ? !props.canPrev : props.page <= 1;
  const atEnd = props.page === undefined ? !props.canNext : props.page >= props.pageCount;

  const goPrev = () =>
    props.page === undefined ? props.onPrev() : props.onPageChange(props.page - 1);
  const goNext = () =>
    props.page === undefined ? props.onNext() : props.onPageChange(props.page + 1);

  const prev = (
    <Button
      key="prev"
      variant="outline"
      size={size}
      disabled={atStart}
      onClick={goPrev}
      aria-label={previousLabel}
    >
      {previousLabel}
    </Button>
  );
  const current = (
    <span key="status" aria-current="page" className="font-sans text-x-slot-pagination-fg">
      {status}
    </span>
  );
  const next = (
    <Button
      key="next"
      variant="outline"
      size={size}
      disabled={atEnd}
      onClick={goNext}
      aria-label={nextLabel}
    >
      {nextLabel}
    </Button>
  );
  const order =
    statusPlacement === 'start'
      ? [current, prev, next]
      : statusPlacement === 'end'
        ? [prev, next, current]
        : [prev, current, next];

  return (
    <nav aria-label={label} className={className}>
      <Stack
        direction="horizontal"
        gap="2xs"
        align="center"
        // Every class carries the `max-sm:` prefix, so a wide viewport is untouched.
        className={cx(stackOnMobile === true && 'max-sm:flex-col max-sm:items-stretch')}
      >
        {order}
      </Stack>
    </nav>
  );
}
