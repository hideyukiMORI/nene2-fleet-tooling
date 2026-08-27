import type { ReactNode } from 'react';
import { cx } from '../lib/cx.js';

export interface PageHeaderProps {
  /** Composed after the kit's own classes (design principle 2). */
  className?: string;
  /** Localized page title. */
  title: string;
  /**
   * Localized one-line description of the page, under the title.
   *
   * 🔴 Not decoration. nene-clear carries one on **every one of its ten pages** — the prop
   * is `sub` there and the value is always a catalog key (`t('dunning.subtitle')`,
   * `t('audit.subtitle')`, …), so folding it into `title` is not available to it: the two
   * halves are separate keys, and joining them would put the separator — a string — in the
   * ship, against principle 4. `PageHeader` takes no `children` either, so without this prop
   * the line has nowhere to go and ten pages lose their description (#492).
   *
   * Omit it and the render is byte-for-byte what it was before this prop existed.
   *
   * ⚠️ Its size is not a slot, on purpose. The title has no size slot either — an `<h1>`
   * reset by Preflight inherits the body size — so adding one here alone would let a product
   * scale the description while its title stayed put. Products that need a type scale of
   * their own are blocked on the same missing thing, and it is one gap, not two.
   */
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  const heading = (
    <h1 className="font-sans font-x-slot-page-header text-x-slot-page-header-fg">{title}</h1>
  );

  return (
    <header
      className={cx('flex items-center justify-between py-x-slot-page-header-pad-y', className)}
    >
      {/* 🔴 The one-line case keeps its bare <h1>. Wrapping it in a <div> unconditionally
       * would change the DOM of every ship already shipping this component, for the benefit
       * of a prop they do not pass — the rule EmptyState set for its own `description`
       * (#456). */}
      {description === undefined ? (
        heading
      ) : (
        <div>
          {heading}
          <p className="mt-x-slot-page-header-gap font-sans text-x-slot-page-header-description-fg">
            {description}
          </p>
        </div>
      )}
      {actions}
    </header>
  );
}
