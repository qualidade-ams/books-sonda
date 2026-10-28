/**
 * Modo sombra (Modelagem_Fase4.md, seções 2, 7 e 8). Roda no sync-api, pelo pacote
 * vendor/comparacao.cjs, para as empresas que ainda estão no modelo legado:
 *
 *   1. fecha no modelo novo os meses que o legado fechou depois da ativação (C2, P5),
 *      ou grava nova versão quando o legado reabriu e fechou de novo;
 *   2. compara os últimos 12 meses fechados do legado com o motor (comparacao.ts) e
 *      grava o resultado em bancos_horas_comparacao.
 *
 * Nada aqui envia e-mail ou mexe no legado.
 */

import { comCache } from './cache';
import { estaVigente, type MesAno, type Unidade } from './calculo';
import { criarClassificador } from './classificacao';
import { fecharMes, itensDeConsumoPorBanco, type RepositorioFechamento } from './fechamento';
import { calcularEmpresaMes } from './motorBancosHoras';
import {
  compararEmpresa,
  diferencasDosItens,
  medidasDoLegado,
  medidasDoNovo,
  type ConsumoDoBanco,
  type DadosItem,
  type DiferencaItem,
  type EntradaMesComparacao,
  type ItemLado,
  type MedidasMes,
  type SituacaoComparacao,
  type SituacaoMes,
} from './comparacao';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface EmpresaSombra {
  id: string;
  /** Nome que o legado usa para achar a organização no Aranda (ILIKE) */
  nomeLegado: string;
}

/** Linha de banco_horas_fechamentos (legado) */
export interface FechamentoLegado {
  mes: MesAno;
  fechadoEm: string;
  snapshot: Record<string, unknown>;
  /** apontamentos_aranda.id_externo */
  apontamentosIds: string[];
  /** apontamentos_tickets_aranda.nro_solicitacao */
  ticketsIds: string[];
}

/** Dados do Aranda de um item do legado, com o id que o legado guardou */
export interface ItemDoLegado extends DadosItem {
  idLegado: string;
}

export const MAX_ITENS_POR_MES = 500;

export interface MesPayload {
  ano: number;
  mes: number;
  situacao: SituacaoMes;
  legado: MedidasMes;
  novo: MedidasMes & { porBanco: ConsumoDoBanco[] };
  origem_saldo: MesAno | null;
  itens: DiferencaItem[];
  itens_total: number;
  fechamento_legado_em: string;
}

/** Entrada de bancos_horas_gravar_comparacao (migration 24); sem meses, a empresa sai */
export type PayloadComparacao =
  | { empresa_id: string; meses: [] }
  | {
      empresa_id: string;
      situacao: SituacaoComparacao;
      meses_comparados: number;
      consumo_legado_minutos: number;
      consumo_novo_minutos: number;
      consumo_legado_tickets: number;
      consumo_novo_tickets: number;
      meses: MesPayload[];
    };

/** Leituras e gravações do modo sombra que o motor não faz */
export interface RepositorioSombra {
  empresasEmLegado(): Promise<EmpresaSombra[]>;
  fechamentosLegado(empresaId: string, de: MesAno, ate: MesAno): Promise<FechamentoLegado[]>;
  /** fechado_em dos fechamentos vigentes do modelo novo, um por banco e mês */
  fechamentosNovos(
    empresaId: string,
    de: MesAno,
    ate: MesAno
  ): Promise<{ mes: MesAno; fechadoEm: string }[]>;
  /** Apontamentos e tickets do fechamento vigente do modelo novo */
  itensFechados(empresaId: string, mes: MesAno): Promise<ItemLado[]>;
  organizacoes(empresaId: string): Promise<string[]>;
  codigos(): Promise<{ codigo: string; contaHoras: boolean; contaTickets: boolean }[]>;
  itensDoLegado(apontamentos: string[], tickets: string[]): Promise<ItemDoLegado[]>;
  dadosDosItens(chaves: { apontamentos: string[]; tickets: string[] }): Promise<DadosItem[]>;
  gravar(payload: PayloadComparacao): Promise<void>;
  registrarErro(empresaId: string, mensagem: string): Promise<void>;
}

export interface DependenciasSombra {
  motor: RepositorioFechamento;
  sombra: RepositorioSombra;
}

export interface OpcoesSombra {
  /** Mês corrente (aberto): fica fora da comparação */
  hoje: MesAno;
  /** Só fecha em sombra o que o legado fechar a partir daqui (P5); null = não fecha */
  fecharDesde: string | null;
  /** Só o fechamento em sombra, sem comparar (sincronizações seguintes do dia, 8.2) */
  somenteFechamento?: boolean;
}

export interface ResultadoEmpresaSombra {
  fechamentos: number;
  /** null: a empresa saiu da comparação (sem mês fechado no legado) ou não foi comparada */
  situacao: SituacaoComparacao | null;
}

// ---------------------------------------------------------------------------
// Apoio
// ---------------------------------------------------------------------------

const indice = (m: MesAno) => m.ano * 12 + (m.mes - 1);
const doIndice = (i: number): MesAno => ({ mes: (i % 12) + 1, ano: Math.floor(i / 12) });
const chaveMes = (m: MesAno) => `${m.ano}-${m.mes}`;
const UNIDADE_DA_FONTE: Record<'apontamento' | 'ticket', Unidade> = {
  apontamento: 'horas',
  ticket: 'tickets',
};

/** Fecha no modelo novo os meses que o legado fechou (ou refechou) desde a ativação */
async function fecharEmSombra(
  { motor, sombra }: DependenciasSombra,
  empresaId: string,
  legado: FechamentoLegado[],
  fecharDesde: string,
  de: MesAno,
  ate: MesAno
): Promise<number> {
  const aFechar = legado.filter((f) => f.fechadoEm >= fecharDesde);
  if (aFechar.length === 0) return 0;
  if (!(await motor.bancos(empresaId)).some((b) => b.ativo)) return 0;

  // O fechamento mais antigo entre os bancos decide se o novo ficou para trás
  const novoEm = new Map<string, string>();
  for (const f of await sombra.fechamentosNovos(empresaId, de, ate)) {
    const atual = novoEm.get(chaveMes(f.mes));
    if (!atual || f.fechadoEm < atual) novoEm.set(chaveMes(f.mes), f.fechadoEm);
  }

  let fechados = 0;
  for (const f of [...aFechar].sort((a, b) => indice(a.mes) - indice(b.mes))) {
    const novo = novoEm.get(chaveMes(f.mes));
    if (novo && novo >= f.fechadoEm) continue;
    await fecharMes(motor, empresaId, f.mes, novo ? 'retificacao' : 'geracao_book');
    fechados++;
  }
  return fechados;
}

/** Itens dos dois lados de um mês com consumo diferente, com o motivo de cada diferença */
async function itensDoMes(
  { sombra }: DependenciasSombra,
  motor: RepositorioFechamento,
  empresa: EmpresaSombra,
  f: FechamentoLegado,
  bancosDoMes: string[],
  fechado: boolean,
  contexto: {
    organizacoes: string[];
    codigoConta: (c: string | null, fonte: 'apontamento' | 'ticket') => boolean;
  }
): Promise<DiferencaItem[]> {
  // Lado legado: os ids guardados no fechamento, com a duração que o legado lê
  const doLegado = await sombra.itensDoLegado(f.apontamentosIds, f.ticketsIds);
  const encontrados = new Set(doLegado.map((d) => `${d.fonte}:${d.idLegado}`));
  const legado: ItemLado[] = doLegado.map((d) => ({
    chave: d.chave,
    fonte: d.fonte,
    minutos: d.fonte === 'apontamento' ? d.minutosTexto : 0,
    tickets: d.fonte === 'ticket' ? 1 : 0,
  }));
  for (const [fonte, ids] of [
    ['apontamento', f.apontamentosIds],
    ['ticket', f.ticketsIds],
  ] as const) {
    for (const id of ids) {
      if (!encontrados.has(`${fonte}:${id}`)) {
        legado.push({
          chave: `legado:${id}`,
          fonte,
          minutos: 0,
          tickets: fonte === 'ticket' ? 1 : 0,
        });
      }
    }
  }

  // Lado novo: o fechamento congelado ou, no mês aberto no novo, os itens de cada banco
  let novo: ItemLado[];
  const semBanco = new Set<string>();
  if (fechado) {
    novo = await sombra.itensFechados(empresa.id, f.mes);
  } else {
    const cadastros = await motor.bancos(empresa.id);
    const classificador = criarClassificador(cadastros, await motor.dePara(), f.mes);
    const porBanco = await itensDeConsumoPorBanco(
      motor,
      empresa.id,
      f.mes,
      new Map(cadastros.map((b) => [b.bancoId, b])),
      classificador,
      bancosDoMes
    );
    novo = [...porBanco.values()].flat().map((i) => ({
      chave: i.itemId,
      fonte: i.fonte as 'apontamento' | 'ticket',
      minutos: i.minutos,
      tickets: i.tickets,
    }));
    // O que conta mas não coube em nenhum banco do mês
    const nosBancos = new Set(novo.map((i) => i.chave));
    const janelas = new Set(
      cadastros
        .filter((b) => b.ativo && estaVigente(b, f.mes))
        .map((b) => `${b.diaInicioApuracao}-${b.diaFimApuracao}`)
    );
    if (janelas.size === 0) janelas.add('1-0');
    for (const janela of janelas) {
      const [di, df] = janela.split('-').map(Number);
      for (const i of await motor.consumoItens(empresa.id, f.mes, di, df)) {
        if (!nosBancos.has(i.itemId)) semBanco.add(i.itemId);
      }
    }
  }

  // Dados do Aranda dos itens que só o novo tem
  const dados = new Map<string, DadosItem>(doLegado.map((d) => [d.chave, d]));
  const faltam = novo.filter((i) => !dados.has(i.chave));
  if (faltam.length > 0) {
    const buscados = await sombra.dadosDosItens({
      apontamentos: faltam.filter((i) => i.fonte === 'apontamento').map((i) => i.chave),
      tickets: faltam.filter((i) => i.fonte === 'ticket').map((i) => i.chave),
    });
    for (const d of buscados) dados.set(d.chave, d);
  }

  return diferencasDosItens(legado, novo, dados, {
    mes: f.mes,
    fechadoEm: f.fechadoEm,
    nomeLegado: empresa.nomeLegado,
    organizacoesNovas: contexto.organizacoes,
    codigoConta: contexto.codigoConta,
    semBanco,
  });
}

// ---------------------------------------------------------------------------
// Empresa
// ---------------------------------------------------------------------------

export async function processarEmpresa(
  deps: DependenciasSombra,
  empresa: EmpresaSombra,
  opcoes: OpcoesSombra
): Promise<ResultadoEmpresaSombra> {
  const { sombra } = deps;
  const de = doIndice(indice(opcoes.hoje) - 12);
  const ate = doIndice(indice(opcoes.hoje) - 1);

  const legado = (await sombra.fechamentosLegado(empresa.id, de, ate)).sort(
    (a, b) => indice(a.mes) - indice(b.mes)
  );

  const fechamentos = opcoes.fecharDesde
    ? await fecharEmSombra(deps, empresa.id, legado, opcoes.fecharDesde, de, ate)
    : 0;
  if (opcoes.somenteFechamento) return { fechamentos, situacao: null };

  if (legado.length === 0) {
    await sombra.gravar({ empresa_id: empresa.id, meses: [] });
    return { fechamentos, situacao: null };
  }

  // Leituras com cache só depois de fechar: o cálculo precisa ver os fechamentos novos
  const motor = comCache(deps.motor);
  const [organizacoes, codigos] = await Promise.all([
    sombra.organizacoes(empresa.id),
    sombra.codigos(),
  ]);
  const regra = new Map(codigos.map((c) => [c.codigo, c]));
  const codigoConta = (codigo: string | null, fonte: 'apontamento' | 'ticket') => {
    const c = codigo === null ? undefined : regra.get(codigo);
    return !!c && (fonte === 'apontamento' ? c.contaHoras : c.contaTickets);
  };

  const entradas: EntradaMesComparacao[] = [];
  const porBancoDoMes = new Map<string, ConsumoDoBanco[]>();
  for (const f of legado) {
    const resultado = await calcularEmpresaMes(motor, empresa.id, f.mes);
    const novo = medidasDoNovo(resultado.bancos);
    const medidasLegado = medidasDoLegado(f.snapshot);
    porBancoDoMes.set(chaveMes(f.mes), novo.porBanco);

    const consumoDifere = novo.unidades.some(
      (u) => medidasLegado[u].consumo !== novo.total[u].consumo
    );
    const fechado = resultado.bancos.length > 0 && resultado.bancos.every((b) => b.fechado);
    const itens = consumoDifere
      ? (
          await itensDoMes(
            deps,
            motor,
            empresa,
            f,
            resultado.bancos.map((b) => b.bancoId),
            fechado,
            { organizacoes, codigoConta }
          )
        ).filter((i) => novo.unidades.includes(UNIDADE_DA_FONTE[i.fonte]))
      : [];

    entradas.push({
      mes: f.mes,
      legado: medidasLegado,
      novo: novo.total,
      unidades: novo.unidades,
      bancos: novo.bancos,
      itens,
    });
  }

  const r = compararEmpresa(entradas);
  const fechadoEm = new Map(legado.map((f) => [chaveMes(f.mes), f.fechadoEm]));
  await sombra.gravar({
    empresa_id: empresa.id,
    situacao: r.situacao,
    meses_comparados: r.mesesComparados,
    consumo_legado_minutos: r.consumo.legadoMinutos,
    consumo_novo_minutos: r.consumo.novoMinutos,
    consumo_legado_tickets: r.consumo.legadoTickets,
    consumo_novo_tickets: r.consumo.novoTickets,
    meses: r.meses.map((m) => ({
      ano: m.mes.ano,
      mes: m.mes.mes,
      situacao: m.situacao,
      legado: m.legado,
      novo: { ...m.novo, porBanco: porBancoDoMes.get(chaveMes(m.mes)) ?? [] },
      origem_saldo: m.origemSaldo,
      itens: m.itens.slice(0, MAX_ITENS_POR_MES),
      itens_total: m.itens.length,
      fechamento_legado_em: fechadoEm.get(chaveMes(m.mes))!,
    })),
  });
  return { fechamentos, situacao: r.situacao };
}

// ---------------------------------------------------------------------------
// Rodada
// ---------------------------------------------------------------------------

export interface ResumoSombra {
  empresas: number;
  comparadas: number;
  /** Saíram da comparação: sem mês fechado no legado */
  removidas: number;
  fechamentos: number;
  erros: number;
}

/**
 * Todas as empresas em Legado, uma por vez. A falha de uma empresa vai para a
 * comparação dela (bancos_horas_erro_comparacao) e a rodada segue.
 */
export async function executarModoSombra(
  deps: { motor: () => RepositorioFechamento; sombra: RepositorioSombra },
  opcoes: OpcoesSombra & { empresaId?: string }
): Promise<ResumoSombra> {
  const todas = await deps.sombra.empresasEmLegado();
  const empresas = opcoes.empresaId ? todas.filter((e) => e.id === opcoes.empresaId) : todas;
  const resumo: ResumoSombra = {
    empresas: empresas.length,
    comparadas: 0,
    removidas: 0,
    fechamentos: 0,
    erros: 0,
  };

  for (const empresa of empresas) {
    try {
      const r = await processarEmpresa(
        { motor: deps.motor(), sombra: deps.sombra },
        empresa,
        opcoes
      );
      resumo.fechamentos += r.fechamentos;
      if (opcoes.somenteFechamento) continue;
      if (r.situacao) resumo.comparadas++;
      else resumo.removidas++;
    } catch (e) {
      resumo.erros++;
      await deps.sombra.registrarErro(empresa.id, e instanceof Error ? e.message : String(e));
    }
  }
  return resumo;
}
