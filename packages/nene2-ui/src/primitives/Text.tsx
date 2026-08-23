import type { ReactNode } from 'react';

export interface TextProps {
  as?: 'p' | 'span';
  tone?: 'primary' | 'muted';
  children: ReactNode;
}

export function Text({ as = 'p', tone = 'primary', children }: TextProps) {
  const className = `font-sans ${tone === 'muted' ? 'text-text-muted' : 'text-text-primary'}`;

  return as === 'span' ? (
    <span className={className}>{children}</span>
  ) : (
    <p className={className}>{children}</p>
  );
}
