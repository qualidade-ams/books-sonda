/**
 * Regras de período do banco de horas usadas pela tela Controle de Banco de Horas
 * e pelo envio automático de Saldo Parcial. Funções puras.
 */

import type { Requerimento } from '@/types/requerimentos';
import { ontemSaoPaulo, type MesAno, type ObservacaoSaldoParcial } from './emailSaldoParcial';

/** Campos da empresa que definem o período de apuração */
export interface EmpresaPeriodo {
  inicio_vigencia?: string | null;
  periodo_apuracao?: number | null;
}

/** Observação unificada (manual ou de reajuste) como vem de useBancoHorasObservacoes */
export interface ObservacaoUnificada {
  observacao: string;
  tipo: string;
  tipo_ajuste?: string;
  valor_horas?: string;
  valor_tickets?: number;
  mes: number;
  ano: number;
  usuario_nome?: string;
  created_at?: string;
}

const normalizarMes = (mes: number, ano: number): MesAno => {
  while (mes > 12) {
    mes -= 12;
    ano += 1;
  }
  return { mes, ano };
};

/**
 * Meses do período de apuração que contém o mês informado, alinhado ao início da vigência.
 * Sem vigência/período configurados, usa 3 meses sequenciais a partir do mês informado.
 */
export function calcularMesesDoPeriodo(empresa: EmpresaPeriodo | null | undefined, mesAno: MesAno): MesAno[] {
  if (!empresa?.inicio_vigencia || !empresa?.periodo_apuracao) {
    return [0, 1, 2].map(i => normalizarMes(mesAno.mes + i, mesAno.ano));
  }

  const inicioVigencia = new Date(empresa.inicio_vigencia);
  const mesInicio = inicioVigencia.getUTCMonth() + 1;
  const anoInicio = inicioVigencia.getUTCFullYear();
  const periodoApuracao = empresa.periodo_apuracao;

  // Meses desde o início da vigência até o mês informado
  const mesesPassados = ((mesAno.ano - anoInicio) * 12) + (mesAno.mes - mesInicio);

  // Início do período atual (múltiplo do período de apuração)
  const periodosCompletos = Math.floor(mesesPassados / periodoApuracao);
  const inicioPeriodo = normalizarMes(mesInicio + periodosCompletos * periodoApuracao, anoInicio);

  return Array.from({ length: periodoApuracao }, (_, i) => normalizarMes(inicioPeriodo.mes + i, inicioPeriodo.ano));
}

/**
 * Requerimentos do período (tabela "Requerimentos do Período"):
 * enviado_faturamento = true, status enviado_faturamento/faturado, tipo Banco de Horas e mês de cobrança no período.
 */
export function filtrarRequerimentosDoPeriodo(requerimentos: Requerimento[], meses: MesAno[]): Requerimento[] {
  const mesesPeriodoStr = meses.map(m => `${String(m.mes).padStart(2, '0')}/${m.ano}`);

  return requerimentos.filter(req =>
    req.mes_cobranca &&
    mesesPeriodoStr.includes(req.mes_cobranca) &&
    req.enviado_faturamento === true &&
    (req.status === 'enviado_faturamento' || req.status === 'faturado') &&
    req.tipo_cobranca === 'Banco de Horas'
  );
}

/**
 * Requerimentos em desenvolvimento: status lançado, não enviados para faturamento,
 * com data de envio até o fim do período (sem data de envio aparecem em todos os períodos).
 */
export function filtrarRequerimentosEmDesenvolvimento(requerimentos: Requerimento[], meses: MesAno[]): Requerimento[] {
  if (meses.length === 0) return [];

  // Último dia do último mês do período (ex: 31/12/2025 para o 4º Trimestre 2025)
  const ultimoMesDoPeriodo = meses[meses.length - 1];
  const fimPeriodo = new Date(ultimoMesDoPeriodo.ano, ultimoMesDoPeriodo.mes, 0);
  fimPeriodo.setHours(23, 59, 59, 999);

  return requerimentos.filter(req => {
    if (req.status !== 'lancado' || req.enviado_faturamento === true) {
      return false;
    }
    if (req.data_envio && new Date(req.data_envio) > fimPeriodo) {
      return false;
    }
    return true;
  });
}

/** Observações dos meses do período, no formato da seção de observações do e-mail */
export function filtrarObservacoesDoPeriodo(
  observacoes: ObservacaoUnificada[],
  meses: MesAno[]
): ObservacaoSaldoParcial[] {
  return observacoes
    .filter(obs => meses.length === 0 || meses.some(m => m.mes === obs.mes && m.ano === obs.ano))
    .map(obs => ({
      texto: obs.observacao,
      tipo: obs.tipo,
      tipo_ajuste: obs.tipo_ajuste,
      valor_horas: obs.valor_horas,
      valor_tickets: obs.valor_tickets,
      mes: obs.mes,
      ano: obs.ano,
      usuario_nome: obs.usuario_nome,
      created_at: obs.created_at
    }));
}

/**
 * Mês de referência do envio automático: o mês de "ontem" em São Paulo,
 * o mesmo da data que aparece no assunto. No dia 1 envia o parcial do mês que acabou.
 */
export function mesReferenciaSaldoParcial(agora: Date): MesAno {
  const ontem = ontemSaoPaulo(agora);
  return { mes: ontem.mes, ano: ontem.ano };
}
