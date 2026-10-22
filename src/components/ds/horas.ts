import { converterMinutosParaHoras } from '@/utils/horasUtils';

export type TomStatus = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface OpcoesFormatarHoras {
  /** auto: só o "-" nos negativos. sempre: "+" também nos positivos (ex.: consumo entre bancos). */
  sinal?: 'auto' | 'sempre';
}

/** Minutos → "HH:MM" (horas com pelo menos 2 dígitos). Valor ausente vira "—". */
export function formatarHoras(
  minutos: number | null | undefined,
  { sinal = 'auto' }: OpcoesFormatarHoras = {}
): string {
  if (minutos === null || minutos === undefined) return '—';

  const [horas, mins] = converterMinutosParaHoras(Math.abs(minutos)).split(':');
  const valor = `${horas.padStart(2, '0')}:${mins}`;

  // Sinal de menos tipográfico (U+2212): o hífen, com algarismos tabulares, fica largo e solto do número
  if (minutos < 0) return `−${valor}`;
  if (minutos > 0 && sinal === 'sempre') return `+${valor}`;
  return valor;
}

/** Cor semântica de um saldo: positivo é sucesso, negativo é perigo. */
export function tomDasHoras(minutos: number | null | undefined): TomStatus {
  if (!minutos) return 'neutral';
  return minutos > 0 ? 'success' : 'danger';
}
