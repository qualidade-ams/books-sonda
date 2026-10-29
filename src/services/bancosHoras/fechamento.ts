/**
 * Fechamento do mês (D-05, D-11; Modelagem_Fase2.md, seções 2 e 6).
 *
 * Calcula o mês de todos os bancos da empresa pelo motor, monta os itens de
 * cada banco (apontamentos, tickets, requerimentos e reajustes), confere que os
 * itens batem com o consumo calculado e grava tudo numa chamada só
 * (bancos_horas_registrar_fechamento, migration 20261015000009).
 *
 *   geracao_book: 1ª geração do Book; mês já fechado não é reaberto
 *   retificacao: recalcula o mês fechado e grava uma nova versão
 *   transicao: o último mês do legado na liberação da empresa (liberacao.ts)
 */

import { baselineDoMes, percentualDoMes } from './vigencias';
import { criarClassificador } from './classificacao';
import type { MesAno } from './calculo';
import {
  bancoDoRequerimento,
  calcularEmpresaMes,
  type BancoCadastro,
  type LinhaConsumo,
  type RepositorioBancosHoras,
  type ResultadoBancoMes,
  type ResultadoUnidade,
} from './motorBancosHoras';

export type MotivoFechamento = 'geracao_book' | 'retificacao' | 'transicao';

export interface ItemConsumo extends LinhaConsumo {
  itemId: string;
}

export interface ItemFechamento {
  tipo: 'apontamento' | 'ticket' | 'requerimento' | 'reajuste';
  item_id: string;
  minutos: number;
  tickets: number;
}

export interface PayloadFechamento {
  empresa_id: string;
  ano: number;
  mes: number;
  motivo: MotivoFechamento;
  bancos: Record<string, unknown>[];
  transferencias: {
    cedente_id: string;
    consumidor_id: string;
    unidade: string;
    quantidade: number;
  }[];
}

export interface RetornoFechamento {
  acao: 'criado' | 'existente';
  fechamentos: { banco_id: string; fechamento_id: string; versao: number }[];
}

export interface RepositorioFechamento extends RepositorioBancosHoras {
  /** Apontamentos e tickets que contam, um por linha (bancos_horas_consumo_itens) */
  consumoItens(
    empresaId: string,
    mes: MesAno,
    diaInicio: number,
    diaFim: number
  ): Promise<ItemConsumo[]>;
  gravarFechamento(payload: PayloadFechamento): Promise<RetornoFechamento>;
}

const unidadeParaPayload = (u: ResultadoUnidade | null) =>
  u && {
    baseline: u.baseline,
    repasse_anterior: u.repasseAnterior,
    saldo_a_utilizar: u.saldoAUtilizar,
    consumo: u.consumo,
    requerimentos: u.requerimentos,
    reajustes: u.reajustes,
    consumo_total: u.consumoTotal,
    saldo: u.saldo,
    consumido_outros: u.consumidoDeOutros,
    cedido_outros: u.cedidoAOutros,
    saldo_final: u.saldoFinal,
    repasse: u.repasse,
    excedente: u.excedente,
  };

/** Parâmetros usados no mês, guardados com o fechamento (RN-11, RN-12) */
function parametrosDoBanco(b: BancoCadastro, mes: MesAno) {
  return {
    tipo_contrato: b.tipoContrato,
    periodo_apuracao: b.periodoApuracao,
    inicio_vigencia: `${b.inicioVigencia.ano}-${String(b.inicioVigencia.mes).padStart(2, '0')}-01`,
    dia_inicio_apuracao: b.diaInicioApuracao,
    dia_fim_apuracao: b.diaFimApuracao,
    taxa_produto: b.taxaProduto,
    taxa_tipo_hora: b.taxaTipoHora,
    repasse_especial: b.repasseEspecial,
    duracao_periodo_meses: b.duracaoPeriodoMeses,
    periodos_ate_zerar: b.periodosAteZerar,
    consome_outros_bancos: b.consomeOutrosBancos,
    visivel_cliente: b.visivelCliente,
    padrao: b.padrao,
    ordem: b.ordem,
    escopo: b.escopo,
    filtro_ic: b.filtroIc,
    baseline: baselineDoMes(b.baselines, mes),
    percentuais: percentualDoMes(b.repasses, mes),
  };
}

/**
 * Apontamentos e tickets que contam no mês, no banco de cada um. Uma consulta por janela de
 * apuração; o item só fica no banco cuja janela é a mesma da consulta. Também serve ao detalhe
 * por chamado do Saldo Parcial, para usar a mesma regra do fechamento.
 */
export async function itensDeConsumoPorBanco(
  repo: Pick<RepositorioFechamento, 'consumoItens'>,
  empresaId: string,
  mes: MesAno,
  cadastros: Map<string, BancoCadastro>,
  classificador: ReturnType<typeof criarClassificador>,
  bancosDoMes: string[]
): Promise<Map<string, ItemConsumo[]>> {
  const itens = new Map<string, ItemConsumo[]>(bancosDoMes.map((id) => [id, []]));
  const janelas = new Set(
    bancosDoMes.map(
      (id) => `${cadastros.get(id)!.diaInicioApuracao}-${cadastros.get(id)!.diaFimApuracao}`
    )
  );
  for (const janela of janelas) {
    const [di, df] = janela.split('-').map(Number);
    for (const item of await repo.consumoItens(empresaId, mes, di, df)) {
      const bancoId = classificador.porGrupo(item.grupo, item.itemConfiguracao);
      const b = bancoId && cadastros.get(bancoId);
      if (!b || `${b.diaInicioApuracao}-${b.diaFimApuracao}` !== janela || !itens.has(bancoId))
        continue;
      itens.get(bancoId)!.push(item);
    }
  }
  return itens;
}

/**
 * O que gravar no fechamento do mês. Nulo quando o mês já está fechado em todos os
 * bancos e o motivo não reabre (D-11). Retificação e transição recalculam o mês fechado.
 */
export async function montarFechamento(
  repo: RepositorioFechamento,
  empresaId: string,
  mes: MesAno,
  motivo: MotivoFechamento
): Promise<PayloadFechamento | null> {
  const resultado = await calcularEmpresaMes(repo, empresaId, mes, {
    recalcularMesFechado: motivo !== 'geracao_book',
  });
  if (resultado.bancos.length > 0 && resultado.bancos.every((b) => b.fechado)) {
    return null;
  }

  const cadastros = new Map((await repo.bancos(empresaId)).map((b) => [b.bancoId, b]));
  const bancosDoMes = resultado.bancos.map((b) => b.bancoId);
  const classificador = criarClassificador([...cadastros.values()], await repo.dePara(), mes);
  const consumo = await itensDeConsumoPorBanco(
    repo,
    empresaId,
    mes,
    cadastros,
    classificador,
    bancosDoMes
  );
  const itens = new Map<string, ItemFechamento[]>(
    bancosDoMes.map((id) => [
      id,
      consumo.get(id)!.map((item) => ({
        tipo: item.fonte,
        item_id: item.itemId,
        minutos: item.minutos,
        tickets: item.tickets,
      })),
    ])
  );
  for (const r of await repo.requerimentos(empresaId, mes)) {
    const bancoId = bancoDoRequerimento(r, classificador, bancosDoMes);
    if (bancoId && itens.has(bancoId)) {
      itens.get(bancoId)!.push({
        tipo: 'requerimento',
        item_id: r.requerimentoId,
        minutos: Math.round(r.horas * 60),
        tickets: r.tickets,
      });
    }
  }
  for (const r of await repo.reajustes(bancosDoMes, mes, mes)) {
    if (r.id && itens.has(r.bancoId)) {
      itens
        .get(r.bancoId)!
        .push({ tipo: 'reajuste', item_id: r.id, minutos: r.minutos, tickets: r.tickets });
    }
  }

  // Os itens precisam bater com o consumo calculado (dados mudaram no meio?)
  for (const b of resultado.bancos) {
    const doBanco = itens.get(b.bancoId)!;
    const soma = (tipo: ItemFechamento['tipo'], campo: 'minutos' | 'tickets') =>
      doBanco.filter((i) => i.tipo === tipo).reduce((s, i) => s + i[campo], 0);
    const horasNaoBatem =
      b.horas &&
      cadastros.get(b.bancoId)!.tipoContrato !== 'ambos' &&
      soma('apontamento', 'minutos') !== b.horas.consumo;
    const ticketsNaoBatem = b.tickets && soma('ticket', 'tickets') !== b.tickets.consumo;
    if (horasNaoBatem || ticketsNaoBatem) {
      throw new Error(
        `Os itens do fechamento não batem com o consumo calculado do banco "${b.nome}". Tente de novo.`
      );
    }
  }

  return {
    empresa_id: empresaId,
    ano: mes.ano,
    mes: mes.mes,
    motivo,
    bancos: resultado.bancos.map((b: ResultadoBancoMes) => ({
      banco_id: b.bancoId,
      nome_banco: b.nome,
      fim_periodo: b.fimPeriodo,
      transicao_periodo: b.transicaoPeriodo,
      percentual_repasse: b.percentualRepasse,
      taxa_hora: b.horas?.taxa ?? null,
      taxa_ticket: b.tickets?.taxa ?? null,
      valor_excedente_horas: b.horas?.valorExcedente ?? 0,
      valor_excedente_tickets: b.tickets?.valorExcedente ?? 0,
      valor_a_faturar: b.valorAFaturar,
      alertas: b.alertas,
      parametros: parametrosDoBanco(cadastros.get(b.bancoId)!, mes),
      horas: unidadeParaPayload(b.horas),
      tickets: unidadeParaPayload(b.tickets),
      observacoes: b.observacoes,
      itens: itens.get(b.bancoId),
    })),
    transferencias: resultado.transferencias.map((t) => ({
      cedente_id: t.cedenteId,
      consumidor_id: t.consumidorId,
      unidade: t.unidade,
      quantidade: t.quantidade,
    })),
  };
}

export async function fecharMes(
  repo: RepositorioFechamento,
  empresaId: string,
  mes: MesAno,
  motivo: Exclude<MotivoFechamento, 'transicao'>
): Promise<RetornoFechamento> {
  const payload = await montarFechamento(repo, empresaId, mes, motivo);
  if (!payload) return { acao: 'existente', fechamentos: [] };
  return repo.gravarFechamento(payload);
}
