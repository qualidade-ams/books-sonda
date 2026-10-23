/**
 * Regras da tela Controle de Banco de Horas que não dependem de componente: o resultado de
 * cada banco no quadro calculado, a situação de cada mês e o mês de referência do período.
 */

import { chaveMes, type QuadroEmpresa } from '@/services/controleBancoHorasService';
import { situacaoDoMes, type SituacaoMes } from '@/services/bancosHoras/periodos';
import type { MesAno, TipoContrato, Unidade } from '@/services/bancosHoras/calculo';
import type { ResultadoBancoMes } from '@/services/bancosHoras/motorBancosHoras';

/** A unidade que a tela mostra primeiro: tickets só no banco de tickets */
export const unidadePrincipal = (tipo: TipoContrato): Unidade =>
  tipo === 'tickets' ? 'tickets' : 'horas';

export const resultadoDoBanco = (
  quadro: QuadroEmpresa,
  mes: MesAno,
  bancoId: string
): ResultadoBancoMes | undefined =>
  quadro[chaveMes(mes)]?.bancos.find((b) => b.bancoId === bancoId);

export interface MesDoQuadro {
  mes: MesAno;
  chave: string;
  situacao: SituacaoMes;
  resultado: ResultadoBancoMes | undefined;
}

/** Os meses do período com a situação: fechado pelo resultado congelado; depois de hoje, futuro */
export const mesesComSituacao = (
  meses: MesAno[],
  quadro: QuadroEmpresa,
  bancoId: string,
  hoje: MesAno
): MesDoQuadro[] =>
  meses.map((mes) => {
    const resultado = resultadoDoBanco(quadro, mes, bancoId);
    return {
      mes,
      chave: chaveMes(mes),
      situacao: situacaoDoMes(mes, hoje, !!resultado?.fechado),
      resultado,
    };
  });

/** O mês aberto; sem aberto, o último fechado; sem nenhum, o primeiro */
export function indiceReferencia(meses: Pick<MesDoQuadro, 'situacao'>[]): number {
  const aberto = meses.findIndex((m) => m.situacao === 'aberto');
  if (aberto >= 0) return aberto;
  for (let i = meses.length - 1; i >= 0; i--) if (meses[i].situacao === 'fechado') return i;
  return 0;
}

/** Mês abreviado no idioma, com a primeira maiúscula e sem ponto: "Ago", "Aug", "Ene" */
function mesCurto(mes: number, idioma: string): string {
  const texto = new Intl.DateTimeFormat(idioma, { month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(2026, mes - 1, 1)))
    .replace('.', '');
  return texto.charAt(0).toUpperCase() + texto.slice(1, 3);
}

/** "Ago/2026" no idioma da tela */
export const rotuloMesLocal = (m: MesAno, idioma: string) => `${mesCurto(m.mes, idioma)}/${m.ano}`;

/** "Jul – Set/2026"; atravessando o ano, "Nov/2026 – Jan/2027"; um mês só, "Out/2026" */
export function rotuloPeriodoLocal(meses: MesAno[], idioma: string): string {
  const primeiro = meses[0];
  const ultimo = meses[meses.length - 1];
  if (meses.length === 1) return rotuloMesLocal(primeiro, idioma);
  if (primeiro.ano === ultimo.ano)
    return `${mesCurto(primeiro.mes, idioma)} – ${rotuloMesLocal(ultimo, idioma)}`;
  return `${rotuloMesLocal(primeiro, idioma)} – ${rotuloMesLocal(ultimo, idioma)}`;
}
