import { cn } from '@/lib/utils';
import { formatarHoras, tomDasHoras } from './horas';

const cores = {
  success: 'text-ds-success-fg',
  danger: 'text-ds-danger-fg',
  neutral: '',
  warning: 'text-ds-warning-fg',
  info: 'text-ds-info-fg',
};

interface HoursValueProps {
  minutos: number | null | undefined;
  /** "sempre" mostra o + nos positivos */
  sinal?: 'auto' | 'sempre';
  /** saldo: verde se positivo, vermelho se negativo. Ou um tom fixo. */
  cor?: 'saldo' | keyof typeof cores;
  className?: string;
}

/** Valor de horas em HH:MM, com algarismos tabulares. */
export function HoursValue({
  minutos,
  sinal = 'auto',
  cor = 'neutral',
  className,
}: HoursValueProps) {
  const tom = cor === 'saldo' ? tomDasHoras(minutos) : cor;
  return (
    <span className={cn('tabular-nums', cores[tom], className)}>
      {formatarHoras(minutos, { sinal })}
    </span>
  );
}
