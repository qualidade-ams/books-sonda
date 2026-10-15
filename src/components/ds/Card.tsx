import * as React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  titulo?: React.ReactNode;
  descricao?: React.ReactNode;
  acoes?: React.ReactNode;
  /** Remove o padding do corpo (tabelas encostadas na borda) */
  semPadding?: boolean;
}

/** Bloco de conteúdo com título de seção em caixa alta. */
export function Card({
  titulo,
  descricao,
  acoes,
  semPadding,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <section
      className={cn('rounded-xl border border-ds-border bg-ds-bg-surface text-ds-fg', className)}
      {...props}
    >
      {(titulo || acoes) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ds-border px-4 py-4 md:px-5">
          <div className="min-w-0">
            {titulo && (
              <h2 className="text-xs font-bold uppercase leading-4 tracking-[0.06em]">{titulo}</h2>
            )}
            {descricao && <p className="mt-0.5 text-xs leading-4 text-ds-fg-muted">{descricao}</p>}
          </div>
          {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
        </header>
      )}
      <div className={cn(!semPadding && 'p-4 md:p-5')}>{children}</div>
    </section>
  );
}
