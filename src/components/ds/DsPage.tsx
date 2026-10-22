import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Raiz de toda tela do Design System v2: ativa os tokens (data-ds="v2"),
 * a fonte Roboto e o espaçamento entre seções.
 */
export function DsPage({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-ds="v2"
      className={cn('space-y-6 font-ds-sans text-sm text-ds-fg', className)}
      {...props}
    />
  );
}
