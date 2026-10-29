/**
 * Liberação da empresa (Modelagem_Fase5.md, seções 3 e 4). Monta o fechamento de
 * transição: o último mês fechado no legado, que liberar_empresa (migration 27) grava
 * junto com o modelo novo. O motor parte do repasse dele, e o cliente continua do saldo
 * que viu no último Book.
 *
 *   1 banco: os números e os itens do último Book do legado (P1)
 *   vários bancos: o cálculo novo de cada banco; a diferença para o legado vai para o
 *   Banco padrão e fica registrada nos parâmetros do fechamento (P2)
 */

import type { Unidade } from './calculo';
import { medidasDoLegado } from './comparacao';
import {
  montarFechamento,
  type ItemFechamento,
  type PayloadFechamento,
  type RepositorioFechamento,
} from './fechamento';
import type { FechamentoLegado, ItemDoLegado } from './sombra';

export interface RepositorioLiberacao {
  /** O mês mais recente de banco_horas_fechamentos da empresa; nulo se não há */
  ultimoFechamentoLegado(empresaId: string): Promise<FechamentoLegado | null>;
  itensDoLegado(apontamentos: string[], tickets: string[]): Promise<ItemDoLegado[]>;
}

type BancoPayload = Record<string, any>;

const UNIDADES: Unidade[] = ['horas', 'tickets'];

const itemDoLegado = (i: ItemDoLegado): ItemFechamento =>
  i.fonte === 'apontamento'
    ? { tipo: 'apontamento', item_id: i.chave, minutos: i.minutosTexto, tickets: 0 }
    : { tipo: 'ticket', item_id: i.chave, minutos: 0, tickets: 1 };

/** 1 banco: os números do Book do legado e os chamados que contaram nele */
async function comoNoLegado(
  banco: BancoPayload,
  ultimo: FechamentoLegado,
  legado: RepositorioLiberacao
) {
  const medidas = medidasDoLegado(ultimo.snapshot);
  for (const u of UNIDADES) {
    if (!banco[u]) continue;
    const l = medidas[u];
    banco[u] = {
      ...banco[u],
      consumo: l.consumo,
      requerimentos: l.requerimentos,
      reajustes: l.reajustes,
      consumo_total: l.consumo + l.requerimentos,
      saldo: l.saldo,
      saldo_final: l.saldo,
      repasse: l.repasse,
      excedente: l.excedente,
    };
  }
  // O item que sumiu do Aranda não tem id para guardar; requerimentos e reajustes são do novo
  const itens = await legado.itensDoLegado(ultimo.apontamentosIds, ultimo.ticketsIds);
  banco.itens = [
    ...itens.map(itemDoLegado),
    ...(banco.itens as ItemFechamento[]).filter(
      (i) => i.tipo === 'requerimento' || i.tipo === 'reajuste'
    ),
  ];
}

/** Vários bancos: o Banco padrão recebe a diferença entre o legado e a soma dos bancos */
function diferencaNoPadrao(bancos: BancoPayload[], ultimo: FechamentoLegado) {
  const padrao = bancos.find((b) => b.parametros?.padrao);
  if (!padrao) return;
  const medidas = medidasDoLegado(ultimo.snapshot);
  const transicao: Record<string, unknown> = {};
  for (const u of UNIDADES) {
    if (!padrao[u]) continue;
    const soma = (campo: string) => bancos.reduce((s, b) => s + (b[u]?.[campo] ?? 0), 0);
    const diferencaSaldo = medidas[u].saldo - soma('saldo_final');
    const diferencaRepasse = medidas[u].repasse - soma('repasse');
    if (diferencaSaldo === 0 && diferencaRepasse === 0) continue;
    padrao[u] = {
      ...padrao[u],
      saldo: padrao[u].saldo + diferencaSaldo,
      saldo_final: padrao[u].saldo_final + diferencaSaldo,
      repasse: padrao[u].repasse + diferencaRepasse,
    };
    transicao[u] = {
      saldo_legado: medidas[u].saldo,
      repasse_legado: medidas[u].repasse,
      diferenca_saldo: diferencaSaldo,
      diferenca_repasse: diferencaRepasse,
    };
  }
  if (Object.keys(transicao).length > 0) {
    padrao.parametros = { ...padrao.parametros, transicao };
  }
}

export async function montarTransicao(
  motor: RepositorioFechamento,
  legado: RepositorioLiberacao,
  empresaId: string
): Promise<PayloadFechamento | null> {
  const ultimo = await legado.ultimoFechamentoLegado(empresaId);
  if (!ultimo) return null;

  const payload = await montarFechamento(motor, empresaId, ultimo.mes, 'transicao');
  if (!payload) return null;

  const bancos = payload.bancos as BancoPayload[];
  if (bancos.length === 1) await comoNoLegado(bancos[0], ultimo, legado);
  else diferencaNoPadrao(bancos, ultimo);
  return payload;
}
