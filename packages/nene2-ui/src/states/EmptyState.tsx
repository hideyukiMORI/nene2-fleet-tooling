import { cx } from '../lib/cx.js';
export interface EmptyStateProps {
  /** Composed after the kit's own classes (design principle 2). */
  className?: string;
  /**
   * Horizontal alignment. Centre by default — measured across the fleet on 2026-08-23,
   * five of the six products that ship an EmptyState centre it.
   *
   * A choice between two arrangements, not a value: `align="start"` is structure, and
   * design principle 3 bars design *values* from props, not structural options.
   */
  align?: 'center' | 'start';
  /** Localized message. The kit never ships strings — see README. */
  message: string;
  /**
   * Localized second line: what the empty area would hold, or how to fill it.
   *
   * 🔴 Not decoration. nene-deal's empty states carry two lines at three of their four call
   * sites ("No deals yet" / "Create one from the board"), and folding them into `message`
   * is not available to it: the two halves are separate catalog keys (`*.empty.title` and
   * `*.empty.description`), so joining them would put the separator — a string — in the
   * ship, against principle 4. Without this prop the second line has nowhere to go and the
   * text is simply dropped (#456).
   *
   * Omit it and the render is byte-for-byte what it was before this prop existed.
   */
  description?: string;
}

export function EmptyState({ message, description, align = 'center', className }: EmptyStateProps) {
  return (
    <div
      className={cx(
        'py-x-slot-state-pad-y font-sans text-x-slot-empty-state-fg',
        align === 'center' && 'text-center',
        className,
      )}
      role="status"
    >
      {/* 🔴 The one-line case keeps its bare text node. Wrapping `message` in a <p>
       * unconditionally would change the DOM of every ship already shipping this component
       * — six of them — for the benefit of a prop they do not pass. */}
      {description === undefined ? (
        message
      ) : (
        <>
          <p>{message}</p>
          <p className="mt-x-slot-empty-state-gap text-x-slot-empty-state-description-fg">
            {description}
          </p>
        </>
      )}
    </div>
  );
}
