/**
 * Repositório do motor de bancos de horas sobre o Supabase. Recebe o cliente
 * (o do app, com a sessão do usuário, ou o do sync-api, com service role).
 * Uma consulta por tabela; o consumo e os requerimentos vêm da regra única em
 * SQL (migration 20261015000008).
 */

import type { MesAno } from './calculo';
import type { GrupoDePara } from './classificacao';
import type {
  BancoCadastro,
  LinhaConsumo,
  LinhaRequerimento,
  ReajusteBanco,
  RepositorioBancosHoras,
  ResultadoBancoMes,
  ResultadoUnidade,
} from './motorBancosHoras';
import type { TaxaCliente } from './taxas';

/** O que o repositório usa do cliente Supabase */
export interface ClienteSupabase {
  from(tabela: string): any;
  rpc(
    funcao: string,
    args?: Record<string, unknown>
  ): PromiseLike<{ data: any; error: { message: string } | null }>;
}

type Linha = Record<string, any>;

const numero = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const mesAno = (data: string): MesAno => ({
  ano: Number(data.slice(0, 4)),
  mes: Number(data.slice(5, 7)),
});
const indice = (m: MesAno | Linha) => m.ano * 12 + (m.mes - 1);
const OBSERVACOES_AUTOMATICAS = ['consumo_entre_bancos', 'faturamento'];

async function consultar(
  promessa: PromiseLike<{ data: any; error: { message: string } | null }>,
  origem: string
) {
  const { data, error } = await promessa;
  if (error) throw new Error(`Falha ao ler ${origem}: ${error.message}`);
  return (data ?? []) as Linha[];
}

function unidadeDoFechamento(f: Linha, sufixo: 'minutos' | 'tickets'): ResultadoUnidade | null {
  if (f[`baseline_${sufixo}`] === null || f[`baseline_${sufixo}`] === undefined) return null;
  const v = (campo: string) => numero(f[`${campo}_${sufixo}`]) ?? 0;
  const horas = sufixo === 'minutos';
  return {
    baseline: v('baseline'),
    repasseAnterior: v('repasse_anterior'),
    saldoAUtilizar: v('saldo_a_utilizar'),
    consumo: v('consumo'),
    requerimentos: v('requerimentos'),
    reajustes: v('reajustes'),
    consumoTotal: v('consumo_total'),
    saldo: v('saldo'),
    consumidoDeOutros: v('consumido_outros'),
    cedidoAOutros: v('cedido_outros'),
    saldoFinal: v('saldo_final'),
    repasse: v('repasse'),
    excedente: v('excedente'),
    valorExcedente: numero(horas ? f.valor_excedente_horas : f.valor_excedente_tickets) ?? 0,
    taxa: numero(horas ? f.taxa_hora : f.taxa_ticket),
  };
}

export function criarRepositorioSupabase(cliente: ClienteSupabase): RepositorioBancosHoras {
  return {
    async bancos(empresaId) {
      const bancos = await consultar(
        cliente.from('bancos_horas').select('*').eq('empresa_id', empresaId).order('ordem'),
        'bancos de horas'
      );
      if (bancos.length === 0) return [];
      const ids = bancos.map((b) => b.id);
      const [escopos, baselines, repasses] = await Promise.all([
        consultar(
          cliente.from('bancos_horas_escopo').select('*').in('banco_id', ids),
          'escopo dos bancos'
        ),
        consultar(
          cliente.from('bancos_horas_baseline').select('*').in('banco_id', ids),
          'baselines'
        ),
        consultar(
          cliente.from('bancos_horas_repasse').select('*').in('banco_id', ids),
          'percentuais de repasse'
        ),
      ]);

      return bancos.map((b): BancoCadastro => ({
        bancoId: b.id,
        nome: b.nome,
        ordem: b.ordem,
        padrao: b.padrao,
        ativo: b.ativo,
        visivelCliente: b.visivel_cliente,
        tipoContrato: b.tipo_contrato,
        periodoApuracao: b.periodo_apuracao,
        inicioVigencia: mesAno(b.inicio_vigencia),
        diaInicioApuracao: b.dia_inicio_apuracao,
        diaFimApuracao: b.dia_fim_apuracao,
        taxaProduto: b.taxa_produto,
        taxaTipoHora: b.taxa_tipo_hora,
        repasseEspecial: b.repasse_especial,
        duracaoPeriodoMeses: b.duracao_periodo_meses,
        periodosAteZerar: b.periodos_ate_zerar,
        consomeOutrosBancos: b.consome_outros_bancos,
        escopo: escopos
          .filter((e) => e.banco_id === b.id)
          .map((e) => ({ produtoId: e.produto_id, moduloId: e.modulo_id })),
        filtroIc: b.filtro_ic_operador
          ? { operador: b.filtro_ic_operador, valor: b.filtro_ic_valor }
          : null,
        baselines: baselines
          .filter((v) => v.banco_id === b.id)
          .map((v) => ({
            dataInicio: v.data_inicio,
            dataFim: v.data_fim,
            baselineMinutos: numero(v.baseline_minutos),
            baselineTickets: numero(v.baseline_tickets),
            credito: v.credito,
          })),
        repasses: repasses
          .filter((v) => v.banco_id === b.id)
          .map((v) => ({
            dataInicio: v.data_inicio,
            dataFim: v.data_fim,
            percentualMensal: numero(v.percentual_mensal),
            percentualDentroPeriodo: numero(v.percentual_dentro_periodo),
            percentualEntrePeriodos: numero(v.percentual_entre_periodos),
          })),
      }));
    },

    async dePara() {
      const grupos = await consultar(
        cliente.from('grupos_aranda').select('*'),
        'de-para dos grupos'
      );
      return grupos.map((g): GrupoDePara => ({
        grupoAranda: g.grupo_aranda,
        produtoId: g.produto_id,
        moduloId: g.modulo_id,
        ativo: g.ativo,
      }));
    },

    async consumo(empresaId, m, diaInicio, diaFim) {
      const linhas = await consultar(
        cliente.rpc('bancos_horas_consumo', {
          p_empresa_id: empresaId,
          p_ano: m.ano,
          p_mes: m.mes,
          p_dia_inicio: diaInicio,
          p_dia_fim: diaFim,
        }),
        'bancos_horas_consumo'
      );
      return linhas.map((l): LinhaConsumo => ({
        fonte: l.fonte,
        grupo: l.grupo,
        itemConfiguracao: l.item_configuracao,
        minutos: numero(l.minutos) ?? 0,
        tickets: numero(l.tickets) ?? 0,
      }));
    },

    async requerimentos(empresaId, m) {
      const linhas = await consultar(
        cliente.rpc('bancos_horas_requerimentos', {
          p_empresa_id: empresaId,
          p_ano: m.ano,
          p_mes: m.mes,
        }),
        'bancos_horas_requerimentos'
      );
      return linhas.map((r): LinhaRequerimento => ({
        requerimentoId: r.requerimento_id,
        produtoId: r.produto_id,
        moduloId: r.modulo_id,
        bancoAjustadoId: r.banco_ajustado_id,
        horas: numero(r.horas) ?? 0,
        tickets: numero(r.tickets) ?? 0,
      }));
    },

    async reajustes(bancoIds, de, ate) {
      if (bancoIds.length === 0) return [];
      const linhas = await consultar(
        cliente
          .from('bancos_horas_reajustes')
          .select('*')
          .in('banco_id', bancoIds)
          .eq('ativo', true)
          .gte('ano', de.ano)
          .lte('ano', ate.ano),
        'reajustes'
      );
      return linhas
        .filter((r) => indice(r) >= indice(de) && indice(r) <= indice(ate))
        .map((r): ReajusteBanco => ({
          bancoId: r.banco_id,
          mes: r.mes,
          ano: r.ano,
          tipo: r.tipo,
          minutos: r.minutos,
          tickets: r.tickets,
        }));
    },

    async fechamentos(bancoIds, de, ate) {
      if (bancoIds.length === 0) return [];
      const linhas = (
        await consultar(
          cliente
            .from('bancos_horas_fechamentos')
            .select('*')
            .in('banco_id', bancoIds)
            .eq('vigente', true)
            .gte('ano', de.ano)
            .lte('ano', ate.ano),
          'fechamentos'
        )
      ).filter((f) => indice(f) >= indice(de) && indice(f) <= indice(ate));
      if (linhas.length === 0) return [];

      const observacoes = await consultar(
        cliente
          .from('bancos_horas_observacoes')
          .select('*')
          .in(
            'fechamento_id',
            linhas.map((f) => f.id)
          )
          .eq('ativo', true),
        'observações dos fechamentos'
      );

      return linhas.map((f): ResultadoBancoMes => ({
        bancoId: f.banco_id,
        nome: f.nome_banco,
        mes: { mes: f.mes, ano: f.ano },
        fechado: true,
        fimPeriodo: f.fim_periodo,
        transicaoPeriodo: f.transicao_periodo,
        percentualRepasse: numero(f.percentual_repasse) ?? 0,
        horas: unidadeDoFechamento(f, 'minutos'),
        tickets: unidadeDoFechamento(f, 'tickets'),
        valorAFaturar: numero(f.valor_a_faturar) ?? 0,
        observacoes: observacoes
          .filter((o) => o.fechamento_id === f.id && OBSERVACOES_AUTOMATICAS.includes(o.origem))
          .map((o) => ({ origem: o.origem, texto: o.texto })),
        alertas: f.alertas ?? [],
      }));
    },

    async taxas(empresaId) {
      const taxas = await consultar(
        cliente.from('taxas_clientes').select('*').eq('cliente_id', empresaId),
        'taxas'
      );
      if (taxas.length === 0) return [];
      const funcoes = await consultar(
        cliente
          .from('valores_taxas_funcoes')
          .select('*')
          .in(
            'taxa_id',
            taxas.map((t) => t.id)
          )
          .eq('tipo_hora', 'remota'),
        'valores das taxas'
      );
      return taxas.map((t): TaxaCliente => ({
        id: t.id,
        vigenciaInicio: t.vigencia_inicio,
        tipoProduto: t.tipo_produto,
        tipoCalculoAdicional: t.tipo_calculo_adicional ?? null,
        valorTicketExcedente: numero(t.valor_ticket_excedente),
        ticketExcedente2: numero(t.ticket_excedente_2),
        ticketExcedente: numero(t.ticket_excedente),
        funcoesRemotas: funcoes
          .filter((f) => f.taxa_id === t.id)
          .map((f) => ({
            funcao: f.funcao,
            valorBase: numero(f.valor_base) ?? 0,
            valorAdicional: numero(f.valor_adicional),
          })),
      }));
    },
  };
}
