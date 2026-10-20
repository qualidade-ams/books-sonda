/**
 * Baseline e percentual de repasse vigentes num mês (motor novo, Modelagem_Fase2.md seção 5).
 * Vale a vigência ativa no dia 1 do mês (RC-06, RC-10). Funções puras.
 */

import type { MesAno, PercentuaisRepasse } from './calculo';

export interface VigenciaBaseline {
  /** YYYY-MM-DD */
  dataInicio: string;
  dataFim: string | null;
  baselineMinutos: number | null;
  baselineTickets: number | null;
  credito: 'mensal' | 'anual';
}

export interface VigenciaRepasse {
  dataInicio: string;
  dataFim: string | null;
  percentualMensal: number;
  percentualDentroPeriodo: number | null;
  percentualEntrePeriodos: number | null;
}

const primeiroDia = (m: MesAno) => `${m.ano}-${String(m.mes).padStart(2, '0')}-01`;

function vigenteNoMes<T extends { dataInicio: string; dataFim: string | null }>(
  vigencias: T[],
  m: MesAno
): T | undefined {
  const dia = primeiroDia(m);
  return vigencias.find((v) => v.dataInicio <= dia && (v.dataFim === null || v.dataFim >= dia));
}

/**
 * Baseline do mês. Valor vazio na vigência vale 0 (corrige RC-08). Crédito anual
 * só entra no mês de início da vigência, todo ano (RC-09).
 */
export function baselineDoMes(
  vigencias: VigenciaBaseline[],
  m: MesAno
): { horas: number; tickets: number } {
  const v = vigenteNoMes(vigencias, m);
  if (!v) return { horas: 0, tickets: 0 };
  if (v.credito === 'anual' && Number(v.dataInicio.slice(5, 7)) !== m.mes)
    return { horas: 0, tickets: 0 };
  return { horas: v.baselineMinutos ?? 0, tickets: v.baselineTickets ?? 0 };
}

/** Percentuais de repasse do mês. Obrigatório, sem valor padrão (D-04). */
export function percentualDoMes(vigencias: VigenciaRepasse[], m: MesAno): PercentuaisRepasse {
  const v = vigenteNoMes(vigencias, m);
  if (!v) {
    throw new Error(`Banco sem percentual de repasse vigente em ${m.mes}/${m.ano}`);
  }
  const percentuais: PercentuaisRepasse = { mensal: Number(v.percentualMensal) };
  if (v.percentualDentroPeriodo !== null)
    percentuais.dentroPeriodo = Number(v.percentualDentroPeriodo);
  if (v.percentualEntrePeriodos !== null)
    percentuais.entrePeriodos = Number(v.percentualEntrePeriodos);
  return percentuais;
}
