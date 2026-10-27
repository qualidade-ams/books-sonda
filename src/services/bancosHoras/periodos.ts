/**
 * Períodos de apuração e situação dos meses, para o Controle (Modelagem_Fase3.md,
 * seção 7). Funções puras sobre MesAno.
 */

import type { MesAno, ParametrosCalculo } from './calculo';

export type SituacaoMes = 'fechado' | 'aberto' | 'futuro';

export interface PeriodoApuracao {
  /** 0 = primeiro período desde o início da vigência */
  indice: number;
  meses: MesAno[];
  rotulo: string;
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const indice = (m: MesAno) => m.ano * 12 + (m.mes - 1);
const doIndice = (i: number): MesAno => ({ mes: (i % 12) + 1, ano: Math.floor(i / 12) });

export const rotuloMes = (m: MesAno) => `${MESES[m.mes - 1]}/${m.ano}`;

/** "Jul – Set/2026"; atravessando o ano, "Nov/2026 – Jan/2027"; um mês só, "Out/2026" */
export function rotuloPeriodo(meses: MesAno[]): string {
  const primeiro = meses[0];
  const ultimo = meses[meses.length - 1];
  if (meses.length === 1) return rotuloMes(primeiro);
  if (primeiro.ano === ultimo.ano) return `${MESES[primeiro.mes - 1]} – ${rotuloMes(ultimo)}`;
  return `${rotuloMes(primeiro)} – ${rotuloMes(ultimo)}`;
}

/**
 * Períodos do banco desde o início da vigência até o que contém `ate` (o mês
 * atual). O fim da vigência encerra o último período, mesmo no meio (P1).
 */
export function periodosDoBanco(
  banco: Pick<ParametrosCalculo, 'inicioVigencia' | 'fimVigencia' | 'periodoApuracao'>,
  ate: MesAno
): PeriodoApuracao[] {
  const inicio = indice(banco.inicioVigencia);
  const fim = banco.fimVigencia ? indice(banco.fimVigencia) : Infinity;
  const limite = Math.min(Math.max(indice(ate), inicio), fim);
  const periodos: PeriodoApuracao[] = [];
  for (let p = 0; inicio + p * banco.periodoApuracao <= limite; p++) {
    const primeiro = inicio + p * banco.periodoApuracao;
    const ultimo = Math.min(primeiro + banco.periodoApuracao - 1, fim);
    const meses = Array.from({ length: ultimo - primeiro + 1 }, (_, i) => doIndice(primeiro + i));
    periodos.push({ indice: p, meses, rotulo: rotuloPeriodo(meses) });
  }
  return periodos;
}

/** Fechado vale sobre a data; depois do mês atual, ainda vai começar */
export function situacaoDoMes(m: MesAno, hoje: MesAno, fechado: boolean): SituacaoMes {
  if (fechado) return 'fechado';
  return indice(m) > indice(hoje) ? 'futuro' : 'aberto';
}

/** Mês corrente em Brasília */
export function mesAtual(agora: Date = new Date()): MesAno {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(agora);
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)!.value);
  return { mes: valor('month'), ano: valor('year') };
}
