import type { ReactNode } from 'react';
import { cx } from '../lib/cx.js';

export interface PageHeaderProps {
  /** Composed after the kit's own classes (design principle 2). */
  className?: string;
  /** Localized page title. */
  title: string;
  actions?: ReactNode;
}

export function PageHeader({ title, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cx('flex items-center justify-between py-x-slot-page-header-pad-y', className)}
    >
      <h1 className="font-sans font-x-slot-page-header text-x-slot-page-header-fg">{title}</h1>
      {actions}
    </header>
  );
}
