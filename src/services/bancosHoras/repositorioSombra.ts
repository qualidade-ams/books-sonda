/**
 * Repositório do modo sombra sobre o Supabase (Modelagem_Fase4.md, seção 8). Usado
 * pelo sync-api com a service role: lê o fechamento do legado, os fechamentos do
 * modelo novo e os dados do Aranda, e grava pelas funções da migration 24.
 */

import { converterHorasParaMinutos } from '@/utils/horasUtils';
import type { MesAno } from './calculo';
import type { DadosItem, ItemLado } from './comparacao';
import type { ClienteSupabase } from './repositorioSupabase';
import type { ItemDoLegado, RepositorioSombra } from './sombra';

type Linha = Record<string, any>;

/** Ids por consulta: o filtro .in() vai na URL do PostgREST */
const LOTE = 150;

const indice = (m: MesAno | Linha) => m.ano * 12 + (m.mes - 1);

async function consultar(
  promessa: PromiseLike<{ data: any; error: { message: string } | null }>,
  origem: string
) {
  const { data, error } = await promessa;
  if (error) throw new Error(`Falha ao ler ${origem}: ${error.message}`);
  return (data ?? []) as Linha[];
}

async function emLotes(
  ids: string[],
  consulta: (lote: string[]) => PromiseLike<{ data: any; error: { message: string } | null }>,
  origem: string
): Promise<Linha[]> {
  const linhas: Linha[] = [];
  for (let i = 0; i < ids.length; i += LOTE) {
    linhas.push(...(await consultar(consulta(ids.slice(i, i + LOTE)), origem)));
  }
  return linhas;
}

const COLUNAS_APONTAMENTO =
  'id, id_externo, nro_chamado, data_atividade, data_sistema, caso_grupo, org_us_final, cod_resolucao, synced_at, created_at, data_ult_modificacao_geral, tempo_gasto_horas';
const COLUNAS_TICKET =
  'id, nro_solicitacao, data_fechamento, nome_grupo, organizacao, cod_resolucao, synced_at, created_at';

/** A data mais recente; synced_at vem nulo nos apontamentos, então entram as outras */
function maisRecente(...datas: (string | null | undefined)[]): string | null {
  let escolhida: string | null = null;
  for (const d of datas) {
    if (d && (!escolhida || Date.parse(d) > Date.parse(escolhida))) escolhida = d;
  }
  return escolhida;
}

/** O Aranda grava a troca de código no horário de Brasília, sem fuso (UTC−3 fixo) */
const TRES_HORAS = 3 * 60 * 60 * 1000;
const trocaEmUtc = (created: string) => new Date(Date.parse(created) + TRES_HORAS).toISOString();

const doApontamento = (a: Linha): ItemDoLegado => ({
  chave: a.id,
  idLegado: a.id_externo,
  fonte: 'apontamento',
  chamado: a.nro_chamado ?? null,
  data: a.data_atividade ?? null,
  grupo: a.caso_grupo ?? null,
  organizacao: a.org_us_final ?? null,
  codigoResolucao: a.cod_resolucao ?? null,
  sincronizadoEm: maisRecente(a.synced_at, a.created_at, a.data_ult_modificacao_geral),
  lancadoEm: a.data_sistema ?? null,
  codigoTrocadoEm: null,
  // O legado lê o texto, que perde os dias inteiros acima de 24 h (A3)
  minutosTexto: converterHorasParaMinutos(a.tempo_gasto_horas ?? ''),
});

const doTicket = (t: Linha): ItemDoLegado => ({
  chave: t.id,
  idLegado: t.nro_solicitacao,
  fonte: 'ticket',
  chamado: t.nro_solicitacao ?? null,
  data: t.data_fechamento ?? null,
  grupo: t.nome_grupo ?? null,
  organizacao: t.organizacao ?? null,
  codigoResolucao: t.cod_resolucao ?? null,
  sincronizadoEm: maisRecente(t.synced_at, t.created_at),
  lancadoEm: null,
  codigoTrocadoEm: null,
  minutosTexto: 0,
});

const semIdLegado = (d: ItemDoLegado): DadosItem => ({
  chave: d.chave,
  fonte: d.fonte,
  chamado: d.chamado,
  data: d.data,
  grupo: d.grupo,
  organizacao: d.organizacao,
  codigoResolucao: d.codigoResolucao,
  sincronizadoEm: d.sincronizadoEm,
  lancadoEm: d.lancadoEm,
  codigoTrocadoEm: d.codigoTrocadoEm,
  minutosTexto: d.minutosTexto,
});

export function criarRepositorioSombra(cliente: ClienteSupabase): RepositorioSombra {
  /** Fechamentos vigentes do modelo novo dos bancos da empresa, nos meses pedidos */
  async function fechamentosVigentes(empresaId: string, de: MesAno, ate: MesAno) {
    const bancos = await consultar(
      cliente.from('bancos_horas').select('id').eq('empresa_id', empresaId),
      'bancos de horas'
    );
    if (bancos.length === 0) return [];
    return (
      await consultar(
        cliente
          .from('bancos_horas_fechamentos')
          .select('id, banco_id, mes, ano, fechado_em')
          .in(
            'banco_id',
            bancos.map((b) => b.id)
          )
          .eq('vigente', true)
          .gte('ano', de.ano)
          .lte('ano', ate.ano),
        'fechamentos do modelo novo'
      )
    ).filter((f) => indice(f) >= indice(de) && indice(f) <= indice(ate));
  }

  return {
    async empresasEmLegado() {
      const empresas = await consultar(
        cliente
          .from('empresas')
          .select('id, nome_completo')
          .eq('modelo_calculo', 'legado')
          .eq('status', 'ativo')
          .order('nome_completo'),
        'empresas em Legado'
      );
      return empresas.map((e) => ({ id: e.id, nomeLegado: e.nome_completo }));
    },

    async fechamentosLegado(empresaId, de, ate) {
      const linhas = await consultar(
        cliente
          .from('banco_horas_fechamentos')
          .select('mes, ano, fechado_em, snapshot_calculo, apontamentos_ids, tickets_ids')
          .eq('empresa_id', empresaId)
          .gte('ano', de.ano)
          .lte('ano', ate.ano),
        'fechamentos do legado'
      );
      return linhas
        .filter((f) => indice(f) >= indice(de) && indice(f) <= indice(ate))
        .map((f) => ({
          mes: { mes: f.mes, ano: f.ano },
          fechadoEm: f.fechado_em,
          snapshot: f.snapshot_calculo ?? {},
          apontamentosIds: f.apontamentos_ids ?? [],
          ticketsIds: f.tickets_ids ?? [],
        }));
    },

    async fechamentosNovos(empresaId, de, ate) {
      return (await fechamentosVigentes(empresaId, de, ate)).map((f) => ({
        mes: { mes: f.mes, ano: f.ano },
        fechadoEm: f.fechado_em,
      }));
    },

    async itensFechados(empresaId, mes) {
      const fechamentos = await fechamentosVigentes(empresaId, mes, mes);
      if (fechamentos.length === 0) return [];
      const itens = await consultar(
        cliente
          .from('bancos_horas_fechamento_itens')
          .select('tipo, item_id, minutos, tickets')
          .in(
            'fechamento_id',
            fechamentos.map((f) => f.id)
          )
          .in('tipo', ['apontamento', 'ticket']),
        'itens dos fechamentos'
      );
      return itens.map((i): ItemLado => ({
        chave: i.item_id,
        fonte: i.tipo,
        minutos: i.minutos,
        tickets: i.tickets,
      }));
    },

    async organizacoes(empresaId) {
      const linhas = await consultar(
        cliente
          .from('empresas_organizacoes_aranda')
          .select('nome_organizacao')
          .eq('empresa_id', empresaId)
          .eq('ativo', true),
        'organizações do Aranda'
      );
      return linhas.map((o) => o.nome_organizacao);
    },

    async codigos() {
      const linhas = await consultar(
        cliente.from('codigos_resolucao_banco').select('codigo, conta_horas, conta_tickets'),
        'códigos de resolução'
      );
      return linhas.map((c) => ({
        codigo: c.codigo,
        contaHoras: c.conta_horas,
        contaTickets: c.conta_tickets,
      }));
    },

    async itensDoLegado(apontamentos, tickets) {
      const [aps, tks] = await Promise.all([
        emLotes(
          apontamentos,
          (lote) =>
            cliente.from('apontamentos_aranda').select(COLUNAS_APONTAMENTO).in('id_externo', lote),
          'apontamentos do legado'
        ),
        emLotes(
          tickets,
          (lote) =>
            cliente
              .from('apontamentos_tickets_aranda')
              .select(COLUNAS_TICKET)
              .in('nro_solicitacao', lote),
          'tickets do legado'
        ),
      ]);
      return [...aps.map(doApontamento), ...tks.map(doTicket)];
    },

    async dadosDosItens({ apontamentos, tickets }) {
      const [aps, tks] = await Promise.all([
        emLotes(
          apontamentos,
          (lote) => cliente.from('apontamentos_aranda').select(COLUNAS_APONTAMENTO).in('id', lote),
          'apontamentos'
        ),
        emLotes(
          tickets,
          (lote) =>
            cliente.from('apontamentos_tickets_aranda').select(COLUNAS_TICKET).in('id', lote),
          'tickets'
        ),
      ]);
      return [...aps.map(doApontamento), ...tks.map(doTicket)].map(semIdLegado);
    },

    async trocasDeCodigo(chamados) {
      // A troca guarda só o número do chamado (sem "RF-", "IM-"...)
      const numero = new Map(chamados.map((c) => [c, c.replace(/\D/g, '')]));
      const numeros = [...new Set([...numero.values()].filter(Boolean))];
      const linhas = await emLotes(
        numeros,
        (lote) =>
          cliente
            .from('codigo_resolucao_modificacoes_aranda')
            .select('item_id, created')
            .in('item_id', lote),
        'trocas de código de resolução'
      );
      const ultima = new Map<string, string>();
      for (const l of linhas) {
        const atual = ultima.get(l.item_id);
        if (!atual || Date.parse(l.created) > Date.parse(atual)) ultima.set(l.item_id, l.created);
      }
      const trocas = new Map<string, string>();
      for (const [chamado, n] of numero) {
        const created = ultima.get(n);
        if (created) trocas.set(chamado, trocaEmUtc(created));
      }
      return trocas;
    },

    async reajustesDepoisDoFechamento(empresaId, mes, fechadoEm) {
      const total = { horas: 0, tickets: 0 };
      const bancos = await consultar(
        cliente.from('bancos_horas').select('id').eq('empresa_id', empresaId),
        'bancos de horas'
      );
      if (bancos.length === 0) return total;
      const reajustes = await consultar(
        cliente
          .from('bancos_horas_reajustes')
          .select('tipo, minutos, tickets')
          .in(
            'banco_id',
            bancos.map((b) => b.id)
          )
          .eq('mes', mes.mes)
          .eq('ano', mes.ano)
          .eq('ativo', true)
          .gt('created_at', fechadoEm),
        'reajustes lançados depois do fechamento'
      );
      for (const r of reajustes) {
        const sinal = r.tipo === 'saida' ? -1 : 1;
        total.horas += sinal * (r.minutos ?? 0);
        total.tickets += sinal * (r.tickets ?? 0);
      }
      return total;
    },

    async gravar(payload) {
      const { error } = await cliente.rpc('bancos_horas_gravar_comparacao', {
        p_comparacao: payload,
      });
      if (error) throw new Error(`Falha ao gravar a comparação: ${error.message}`);
    },

    async registrarErro(empresaId, mensagem) {
      const { error } = await cliente.rpc('bancos_horas_erro_comparacao', {
        p_empresa_id: empresaId,
        p_erro: mensagem,
      });
      if (error) throw new Error(`Falha ao registrar o erro da comparação: ${error.message}`);
    },
  };
}
