import type { ReactNode } from 'react';

export interface PageHeaderProps {
  /** Localized page title. */
  title: string;
  actions?: ReactNode;
}

export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <header className="flex items-center justify-between py-x-slot-page-header-pad-y">
      <h1 className="font-sans font-medium text-text-primary">{title}</h1>
      {actions}
    </header>
  );
}
