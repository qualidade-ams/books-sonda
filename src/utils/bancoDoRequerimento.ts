/**
 * Regras do campo Banco no lançamento de requerimento (empresa liberada).
 */

import { converterParaHorasDecimal } from '@/utils/horasUtils';
import type { BancoDoRequerimento } from '@/services/requerimentoBancoService';

/**
 * O requerimento desconta de um banco: Banco de Horas, ou Reprovado com horas
 * de análise EF (que gera um requerimento de Banco de Horas para a EF).
 */
export function descontaDoBanco(tipoCobranca: string, horasAnaliseEF?: string | number): boolean {
  if (tipoCobranca === 'Banco de Horas') return true;
  if (tipoCobranca !== 'Reprovado' || !horasAnaliseEF) return false;
  const horas =
    typeof horasAnaliseEF === 'string' ? converterParaHorasDecimal(horasAnaliseEF) : horasAnaliseEF;
  return horas > 0;
}

/** AAAA-MM do mês de cobrança (MM/AAAA); sem ele, o mês atual */
function mesAlvo(mesCobranca: string | undefined, hoje: Date): string {
  const m = /^(0[1-9]|1[0-2])\/(\d{4})$/.exec((mesCobranca ?? '').trim());
  if (m) return `${m[2]}-${m[1]}`;
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
}

/** Bancos vigentes no mês de cobrança, na ordem recebida */
export function bancosVigentesNoMes(
  bancos: BancoDoRequerimento[],
  mesCobranca?: string,
  hoje: Date = new Date()
): BancoDoRequerimento[] {
  const alvo = mesAlvo(mesCobranca, hoje);
  return bancos.filter(
    (b) =>
      b.inicioVigencia.slice(0, 7) <= alvo &&
      (b.fimVigencia === null || b.fimVigencia.slice(0, 7) >= alvo)
  );
}

/** Empresa liberada, tipo que desconta do banco e nenhum banco escolhido */
export function faltaBanco(p: {
  liberada: boolean;
  tipoCobranca: string;
  horasAnaliseEF?: string | number;
  bancoId?: string;
}): boolean {
  return p.liberada && descontaDoBanco(p.tipoCobranca, p.horasAnaliseEF) && !p.bancoId;
}
