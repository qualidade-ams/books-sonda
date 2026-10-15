import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Lista de seleção nativa com o visual do DS v2. No celular abre o seletor do
 * próprio sistema, que já é tela cheia e acessível.
 */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <span className={cn('relative inline-block', className)}>
    <select
      ref={ref}
      className="h-11 w-full appearance-none rounded-lg border border-ds-border-strong bg-ds-bg-surface pl-3 pr-9 text-base text-ds-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus disabled:border-ds-border disabled:bg-ds-bg-subtle disabled:text-ds-fg-disabled md:h-9 md:text-sm"
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-fg-muted"
      aria-hidden
    />
  </span>
));
Select.displayName = 'Select';
