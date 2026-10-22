import * as React from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type TomCallout = 'info' | 'warning' | 'success' | 'danger';

const estilos: Record<TomCallout, string> = {
  info: 'border-ds-info-border bg-ds-info-bg text-ds-info-fg',
  warning: 'border-ds-warning-border bg-ds-warning-bg text-ds-warning-fg',
  success: 'border-ds-success-border bg-ds-success-bg text-ds-success-fg',
  danger: 'border-ds-danger-border bg-ds-danger-bg text-ds-danger-fg',
};

const icones: Record<TomCallout, React.ComponentType<{ className?: string }>> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
  danger: XCircle,
};

interface CalloutProps {
  tom?: TomCallout;
  titulo?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/** Aviso inline: observação automática, impacto de alteração, conflito, erro. */
export function Callout({ tom = 'info', titulo, children, className }: CalloutProps) {
  const Icone = icones[tom];
  return (
    <div
      role={tom === 'danger' ? 'alert' : 'note'}
      className={cn('flex gap-3 rounded-lg border px-4 py-3 text-sm', estilos[tom], className)}
    >
      <Icone className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden />
      <div className="min-w-0">
        {titulo && <p className="font-medium">{titulo}</p>}
        {children && <div className="mt-0.5 text-ds-fg">{children}</div>}
      </div>
    </div>
  );
}
