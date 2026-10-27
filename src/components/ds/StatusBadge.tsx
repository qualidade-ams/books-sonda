import * as React from 'react';
import { cn } from '@/lib/utils';
import type { TomStatus } from './horas';

const tons: Record<TomStatus | 'novo', string> = {
  success: 'border-ds-success-border bg-ds-success-bg text-ds-success-fg',
  warning: 'border-ds-warning-border bg-ds-warning-bg text-ds-warning-fg',
  danger: 'border-ds-danger-border bg-ds-danger-bg text-ds-danger-fg',
  info: 'border-ds-info-border bg-ds-info-bg text-ds-info-fg',
  neutral: 'border-ds-border bg-ds-bg-subtle text-ds-fg-secondary',
  novo: 'border-transparent bg-ds-accent-subtle text-ds-fg-accent text-[11px] h-5 px-2',
};

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tom?: TomStatus | 'novo';
}

/** Selo de estado. Sempre com texto: a cor nunca é a única informação. */
export function StatusBadge({ tom = 'neutral', className, ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-full border px-2.5 font-ds-sans text-xs font-medium',
        tons[tom],
        className
      )}
      {...props}
    />
  );
}
