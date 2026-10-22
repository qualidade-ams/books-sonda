import * as React from 'react';
import { cn } from '@/lib/utils';
import type { TomStatus } from './horas';

const coresValor: Record<TomStatus, string> = {
  success: 'text-ds-success-fg',
  warning: 'text-ds-warning-fg',
  danger: 'text-ds-danger-fg',
  info: 'text-ds-info-fg',
  neutral: 'text-ds-fg',
};

interface StatCardProps {
  rotulo: string;
  valor: React.ReactNode;
  icone?: React.ReactNode;
  tom?: TomStatus;
  carregando?: boolean;
}

/** Indicador numérico (KPI). */
export function StatCard({ rotulo, valor, icone, tom = 'neutral', carregando }: StatCardProps) {
  return (
    <div className="flex items-start gap-3.5 rounded-xl border border-ds-border bg-ds-bg-surface p-4 md:px-5">
      {icone && (
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ds-accent-subtle text-ds-fg-accent [&_svg]:size-5"
          aria-hidden
        >
          {icone}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase leading-4 tracking-[0.06em] text-ds-fg-muted">
          {rotulo}
        </p>
        {carregando ? (
          <div className="mt-1 h-7 w-20 animate-pulse rounded bg-ds-bg-subtle" />
        ) : (
          <p
            className={cn(
              'text-[22px] font-bold leading-7 tabular-nums md:text-[28px] md:leading-8',
              coresValor[tom]
            )}
          >
            {valor}
          </p>
        )}
      </div>
    </div>
  );
}
