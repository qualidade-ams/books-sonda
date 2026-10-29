/**
 * Comparação Legado x Novo (Modelagem_Fase4.md, seções 2 a 4). Funções puras:
 * a rotina do sync-api lê os dois lados e grava o resultado.
 *
 *   Legado: snapshot_calculo de banco_horas_fechamentos (o que o cliente recebeu)
 *   Novo:   resultado do motor por banco (calcularEmpresaMes)
 *
 * Empresa de 1 banco compara consumo, requerimentos, reajustes, saldo, repasse e
 * excedente; com vários bancos, só consumo, requerimentos e reajustes somados. O
 * valor a faturar é só informativo (diferenças de taxa conhecidas, RC-71/72/74).
 */

import type { MesAno, Unidade } from './calculo';
import type { ResultadoBancoMes } from './motorBancosHoras';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface MedidasUnidade {
  consumo: number;
  requerimentos: number;
  /** Entradas − saídas */
  reajustes: number;
  saldo: number;
  repasse: number;
  excedente: number;
}

/** Horas em minutos; tickets em quantidade */
export interface MedidasMes {
  horas: MedidasUnidade;
  tickets: MedidasUnidade;
  valorAFaturar: number;
}

export interface ConsumoDoBanco {
  bancoId: string;
  nome: string;
  minutos: number;
  tickets: number;
}

export type SituacaoMes = 'igual' | 'explicada' | 'divergente';
export type SituacaoComparacao = 'identico' | 'soma_confere' | 'explicada' | 'divergente';

export const MOTIVOS_DIFERENCA = [
  'acima_24h',
  'fuso',
  'depois_do_fechamento',
  'removido_do_aranda',
  'organizacao_so_no_novo',
  'organizacao_curinga',
  'codigo_trocado',
  'regra_do_legado',
  'lancado_depois_do_mes',
  'organizacao_fora_do_cadastro',
  'codigo_sem_regra',
  'fora_do_escopo',
  'sem_motivo',
] as const;

export type MotivoDiferenca = (typeof MOTIVOS_DIFERENCA)[number];

const MOTIVOS_EXPLICADOS = new Set<MotivoDiferenca>([
  'acima_24h',
  'fuso',
  'depois_do_fechamento',
  'removido_do_aranda',
  'organizacao_so_no_novo',
  'organizacao_curinga',
  'codigo_trocado',
  'regra_do_legado',
  'lancado_depois_do_mes',
]);

/**
 * Mudanças na lista de códigos de resolução do legado (bancoHorasIntegracaoService e
 * bancoHorasQuarentenaService) depois dos primeiros fechamentos: o mês fechado antes
 * da data seguiu a lista antiga. Datas dos commits que mudaram a lista.
 */
export const MUDANCAS_CODIGOS_LEGADO: {
  em: string;
  passouAContar: string[];
  deixouDeContar: string[];
}[] = [
  {
    em: '2026-06-21',
    passouAContar: [
      'Nota Publicada (Banco=S| SLA=N)',
      'Parametrização / Funcionalidade (Banco=S |SLA=S)',
    ],
    deixouDeContar: [],
  },
  { em: '2026-06-29', passouAContar: ['Alocação T&M'], deixouDeContar: [] },
  {
    em: '2026-07-02',
    passouAContar: ['Monitoramento DBA (Banco=S |SLA=N)'],
    deixouDeContar: ['Monitoramento DBA (Banco=S |SLA=S)'],
  },
  {
    em: '2026-07-10',
    passouAContar: ['Parametrização / Funcionalidade (Banco=S| SLA=N)'],
    deixouDeContar: ['Parametrização / Funcionalidade (Banco=S |SLA=S)'],
  },
  {
    em: '2026-08-01',
    passouAContar: ['Alocação', 'Alocação (Banco=S |SLA=N)', 'Alocação (Banco=S| SLA=N)'],
    deixouDeContar: [],
  },
  {
    em: '2026-09-22',
    passouAContar: ['Alocação - T&M Banco de Horas (Banco=S |SLA=N)'],
    deixouDeContar: ['Alocação - T&M (Banco=S |SLA=N)'],
  },
];

/** Um apontamento ou ticket que contou num dos lados */
export interface ItemLado {
  /** UUID do Aranda; "legado:<id>" quando o item do legado não existe mais no Aranda */
  chave: string;
  fonte: 'apontamento' | 'ticket';
  minutos: number;
  tickets: number;
}

/** Campos do Aranda usados para reconhecer o motivo da diferença */
export interface DadosItem {
  chave: string;
  fonte: 'apontamento' | 'ticket';
  chamado: string | null;
  /** Data do apontamento ou do ticket (ISO, UTC) */
  data: string | null;
  grupo: string | null;
  organizacao: string | null;
  codigoResolucao: string | null;
  /** Quando chegou ao Supabase ou mudou no Aranda, o mais recente */
  sincronizadoEm: string | null;
  /** Quando o apontamento foi lançado no Aranda (data_sistema); null em ticket */
  lancadoEm: string | null;
  /** Última troca do código de resolução do chamado no Aranda */
  codigoTrocadoEm: string | null;
  /** Duração que o legado lê (tempo_gasto_horas, sem os dias inteiros): monta o lado legado */
  minutosTexto: number;
}

export interface ContextoItens {
  mes: MesAno;
  /** fechado_em do fechamento do legado */
  fechadoEm: string | null;
  /** Nome que o legado usa para achar a organização (ILIKE) */
  nomeLegado: string;
  /** Organizações do Aranda vinculadas à empresa nova */
  organizacoesNovas: string[];
  /** O código de resolução conta nas Regras de contagem? */
  codigoConta: (codigo: string | null, fonte: 'apontamento' | 'ticket') => boolean;
  /** Itens que o modelo novo não pôs em nenhum banco */
  semBanco: Set<string>;
}

export interface DiferencaItem {
  chave: string;
  fonte: 'apontamento' | 'ticket';
  chamado: string | null;
  data: string | null;
  grupo: string | null;
  /** null: o item não entrou nesse lado (ou é ticket) */
  minutosLegado: number | null;
  minutosNovo: number | null;
  /** null: o item não entrou nesse lado (ou é apontamento) */
  ticketsLegado: number | null;
  ticketsNovo: number | null;
  motivo: MotivoDiferenca;
  explicado: boolean;
}

export type Medida = keyof MedidasUnidade;

export interface DiferencaMedida {
  unidade: Unidade;
  medida: Medida;
  legado: number;
  novo: number;
}

// ---------------------------------------------------------------------------
// Legado
// ---------------------------------------------------------------------------

const INTERVALO = /^(?:([+-]?\d+)\s+days?)?\s*(?:([+-])?(\d+):(\d{2})(?::\d{2}(?:\.\d+)?)?)?$/;

/**
 * Minutos de um interval do Postgres em texto ("96:40:00", "-16:40:00",
 * "1 day 02:00:00", "-1 days +02:00:00"). Os segundos são ignorados, como no legado.
 */
export function minutosDoIntervalo(texto: string | null | undefined): number {
  const t = (texto ?? '').trim();
  if (!t) return 0;
  const m = INTERVALO.exec(t);
  if (!m) throw new Error(`Intervalo inválido: "${t}"`);
  const [, dias, sinal, horas, minutos] = m;
  const tempo = horas ? (Number(horas) * 60 + Number(minutos)) * (sinal === '-' ? -1 : 1) : 0;
  return (dias ? Number(dias) * 1440 : 0) + tempo;
}

const numero = (v: unknown) => (v === null || v === undefined || v === '' ? 0 : Number(v));

/** Medidas do mês a partir do snapshot_calculo (cópia da linha de banco_horas_calculos) */
export function medidasDoLegado(snapshot: Record<string, unknown>): MedidasMes {
  const h = (campo: string) => minutosDoIntervalo(snapshot[campo] as string | null);
  const t = (campo: string) => numero(snapshot[campo]);
  return {
    horas: {
      consumo: h('consumo_horas'),
      requerimentos: h('requerimentos_horas'),
      reajustes: h('reajustes_horas'),
      saldo: h('saldo_horas'),
      repasse: h('repasse_horas'),
      excedente: h('excedentes_horas'),
    },
    tickets: {
      consumo: t('consumo_tickets'),
      requerimentos: t('requerimentos_tickets'),
      reajustes: t('reajustes_tickets'),
      saldo: t('saldo_tickets'),
      repasse: t('repasse_tickets'),
      excedente: t('excedentes_tickets'),
    },
    valorAFaturar: numero(snapshot.valor_a_faturar),
  };
}

// ---------------------------------------------------------------------------
// Novo
// ---------------------------------------------------------------------------

const UNIDADES: Unidade[] = ['horas', 'tickets'];
const MEDIDAS: Medida[] = [
  'consumo',
  'requerimentos',
  'reajustes',
  'saldo',
  'repasse',
  'excedente',
];
const MEDIDAS_BASE: Medida[] = ['consumo', 'requerimentos', 'reajustes'];

const medidasVazias = (): MedidasUnidade => ({
  consumo: 0,
  requerimentos: 0,
  reajustes: 0,
  saldo: 0,
  repasse: 0,
  excedente: 0,
});

export interface MedidasNovo {
  total: MedidasMes;
  porBanco: ConsumoDoBanco[];
  /** Unidades dos contratos dos bancos do mês; sem banco, as duas */
  unidades: Unidade[];
  bancos: number;
}

/** Soma os bancos do mês. O saldo é o de antes do consumo entre bancos, como no legado */
export function medidasDoNovo(bancos: ResultadoBancoMes[]): MedidasNovo {
  const total: MedidasMes = { horas: medidasVazias(), tickets: medidasVazias(), valorAFaturar: 0 };
  for (const b of bancos) {
    for (const u of UNIDADES) {
      const r = b[u];
      if (!r) continue;
      for (const medida of MEDIDAS) total[u][medida] += r[medida];
    }
    total.valorAFaturar += b.valorAFaturar;
  }
  const usadas = UNIDADES.filter((u) => bancos.some((b) => b[u]));
  return {
    total,
    porBanco: bancos.map((b) => ({
      bancoId: b.bancoId,
      nome: b.nome,
      minutos: b.horas?.consumo ?? 0,
      tickets: b.tickets?.consumo ?? 0,
    })),
    unidades: usadas.length > 0 ? usadas : UNIDADES,
    bancos: bancos.length,
  };
}

// ---------------------------------------------------------------------------
// Itens
// ---------------------------------------------------------------------------

const FUSO = 'America/Sao_Paulo';

function mesDaData(iso: string, timeZone: string): MesAno {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(new Date(iso));
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);
  return { mes: valor('month'), ano: valor('year') };
}

const mesmoMes = (a: MesAno, b: MesAno) => a.mes === b.mes && a.ano === b.ano;
const normalizar = (texto: string | null) => (texto ?? '').trim().toUpperCase();

/** ILIKE do Postgres: % = qualquer sequência, _ = um caractere, sem diferença de maiúsculas */
function casaComoIlike(texto: string, padrao: string): boolean {
  const regex = padrao
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/%/g, '.*')
    .replace(/_/g, '.');
  return new RegExp(`^${regex}$`, 'i').test(texto.trim());
}

const depoisDoFechamento = (data: string | null, ctx: ContextoItens) =>
  !!ctx.fechadoEm && !!data && data > ctx.fechadoEm;

/** O legado mudou a contagem do código depois de fechar o mês */
const regraDoLegadoMudou = (
  codigo: string | null,
  lista: 'passouAContar' | 'deixouDeContar',
  ctx: ContextoItens
) =>
  !!codigo &&
  MUDANCAS_CODIGOS_LEGADO.some((m) => m[lista].includes(codigo) && depoisDoFechamento(m.em, ctx));

const indiceMes = (m: MesAno) => m.ano * 12 + m.mes;

function lancadoDepoisDoMes(d: DadosItem): boolean {
  if (!d.data || !d.lancadoEm) return false;
  return indiceMes(mesDaData(d.lancadoEm, FUSO)) > indiceMes(mesDaData(d.data, FUSO));
}

function motivoSoNoNovo(d: DadosItem, ctx: ContextoItens): MotivoDiferenca {
  if (d.data) {
    if (mesmoMes(mesDaData(d.data, FUSO), ctx.mes) && !mesmoMes(mesDaData(d.data, 'UTC'), ctx.mes))
      return 'fuso';
  }
  if (depoisDoFechamento(d.sincronizadoEm, ctx)) return 'depois_do_fechamento';
  if (depoisDoFechamento(d.codigoTrocadoEm, ctx)) return 'codigo_trocado';
  if (regraDoLegadoMudou(d.codigoResolucao, 'passouAContar', ctx)) return 'regra_do_legado';
  if (lancadoDepoisDoMes(d)) return 'lancado_depois_do_mes';
  const organizacao = normalizar(d.organizacao);
  if (
    organizacao &&
    !casaComoIlike(organizacao, ctx.nomeLegado) &&
    ctx.organizacoesNovas.some((o) => normalizar(o) === organizacao)
  )
    return 'organizacao_so_no_novo';
  return 'sem_motivo';
}

function motivoSoNoLegado(
  chave: string,
  d: DadosItem | undefined,
  ctx: ContextoItens
): MotivoDiferenca {
  if (!d) return 'removido_do_aranda';
  if (d.data) {
    if (mesmoMes(mesDaData(d.data, 'UTC'), ctx.mes) && !mesmoMes(mesDaData(d.data, FUSO), ctx.mes))
      return 'fuso';
  }
  const organizacao = normalizar(d.organizacao);
  if (!ctx.organizacoesNovas.some((o) => normalizar(o) === organizacao)) {
    const curinga = /[_%]/.test(ctx.nomeLegado) && casaComoIlike(organizacao, ctx.nomeLegado);
    return curinga ? 'organizacao_curinga' : 'organizacao_fora_do_cadastro';
  }
  if (depoisDoFechamento(d.codigoTrocadoEm, ctx)) return 'codigo_trocado';
  if (!ctx.codigoConta(d.codigoResolucao, d.fonte)) {
    return regraDoLegadoMudou(d.codigoResolucao, 'deixouDeContar', ctx)
      ? 'regra_do_legado'
      : 'codigo_sem_regra';
  }
  if (ctx.semBanco.has(chave)) return 'fora_do_escopo';
  return 'sem_motivo';
}

/**
 * Itens que estão só de um lado ou com quantidade diferente, cada um com o primeiro
 * motivo reconhecido (Modelagem_Fase4.md, seção 4). Ordem: data, os sem dados no fim.
 */
export function diferencasDosItens(
  legado: ItemLado[],
  novo: ItemLado[],
  dados: Map<string, DadosItem>,
  ctx: ContextoItens
): DiferencaItem[] {
  const doLegado = new Map(legado.map((i) => [i.chave, i]));
  const doNovo = new Map(novo.map((i) => [i.chave, i]));
  const chaves = [...new Set([...doLegado.keys(), ...doNovo.keys()])];

  const diferencas: DiferencaItem[] = [];
  for (const chave of chaves) {
    const l = doLegado.get(chave);
    const n = doNovo.get(chave);
    if (l && n && l.minutos === n.minutos && l.tickets === n.tickets) continue;

    const d = dados.get(chave);
    let motivo: MotivoDiferenca;
    if (l && n) {
      motivo = n.minutos >= 1440 && l.minutos === n.minutos % 1440 ? 'acima_24h' : 'sem_motivo';
    } else if (n) {
      motivo = d ? motivoSoNoNovo(d, ctx) : 'sem_motivo';
    } else {
      motivo = motivoSoNoLegado(chave, d, ctx);
    }

    const fonte = (l ?? n)!.fonte;
    const ticket = fonte === 'ticket';
    diferencas.push({
      chave,
      fonte,
      chamado: d?.chamado ?? null,
      data: d?.data ?? null,
      grupo: d?.grupo ?? null,
      minutosLegado: !ticket && l ? l.minutos : null,
      minutosNovo: !ticket && n ? n.minutos : null,
      ticketsLegado: ticket && l ? l.tickets : null,
      ticketsNovo: ticket && n ? n.tickets : null,
      motivo,
      explicado: MOTIVOS_EXPLICADOS.has(motivo),
    });
  }

  return diferencas.sort((a, b) => {
    if (a.data !== b.data) {
      if (a.data === null) return 1;
      if (b.data === null) return -1;
      return a.data < b.data ? -1 : 1;
    }
    return a.chave < b.chave ? -1 : a.chave > b.chave ? 1 : 0;
  });
}

// ---------------------------------------------------------------------------
// Mês
// ---------------------------------------------------------------------------

const PESO: Record<SituacaoMes, number> = { igual: 0, explicada: 1, divergente: 2 };
const pior = (...s: SituacaoMes[]): SituacaoMes =>
  s.reduce((a, b) => (PESO[b] > PESO[a] ? b : a), 'igual');

export interface EntradaCompararMes {
  legado: MedidasMes;
  novo: MedidasMes;
  unidades: Unidade[];
  /** Saldo, repasse e excedente só se comparam com 1 banco */
  umBanco: boolean;
  itens: DiferencaItem[];
  /** Reajustes do novo lançados depois do fechamento do legado (entradas − saídas) */
  reajustesDepois?: Record<Unidade, number>;
  /** Situação da diferença de saldo que vem de um mês anterior (null: nenhuma) */
  herdada: SituacaoMes | null;
}

export interface ResultadoCompararMes {
  situacao: SituacaoMes;
  diferencas: DiferencaMedida[];
  /** Situação da diferença de saldo que passa ao mês seguinte (null: saldo em dia) */
  origem: SituacaoMes | null;
}

/** A diferença de consumo da unidade é inteiramente explicada pelos itens? */
function consumoExplicado(unidade: Unidade, diferenca: number, itens: DiferencaItem[]) {
  const fonte = unidade === 'horas' ? 'apontamento' : 'ticket';
  const daUnidade = itens.filter((i) => i.fonte === fonte);
  const soma = daUnidade.reduce(
    (s, i) =>
      unidade === 'horas'
        ? s + (i.minutosNovo ?? 0) - (i.minutosLegado ?? 0)
        : s + (i.ticketsNovo ?? 0) - (i.ticketsLegado ?? 0),
    0
  );
  return daUnidade.length > 0 && daUnidade.every((i) => i.explicado) && soma === diferenca;
}

export function compararMes(e: EntradaCompararMes): ResultadoCompararMes {
  const diferencas: DiferencaMedida[] = [];
  let base: SituacaoMes = 'igual';
  let saldoDifere = false;

  for (const unidade of e.unidades) {
    for (const medida of MEDIDAS) {
      const legado = e.legado[unidade][medida];
      const novo = e.novo[unidade][medida];
      if (legado === novo) continue;
      const deSaldo = !MEDIDAS_BASE.includes(medida);
      if (deSaldo && !e.umBanco) continue;
      diferencas.push({ unidade, medida, legado, novo });
      if (deSaldo) saldoDifere = true;
      else if (medida === 'consumo' && consumoExplicado(unidade, novo - legado, e.itens))
        base = pior(base, 'explicada');
      else if (medida === 'reajustes' && novo - legado === (e.reajustesDepois?.[unidade] ?? 0))
        base = pior(base, 'explicada');
      else base = 'divergente';
    }
  }

  if (!saldoDifere) return { situacao: base, diferencas, origem: null };
  const causa = base !== 'igual' ? pior(base, e.herdada ?? 'igual') : (e.herdada ?? 'divergente');
  return { situacao: pior(base, causa), diferencas, origem: causa };
}

// ---------------------------------------------------------------------------
// Empresa
// ---------------------------------------------------------------------------

export interface EntradaMesComparacao {
  mes: MesAno;
  legado: MedidasMes;
  novo: MedidasMes;
  unidades: Unidade[];
  bancos: number;
  itens: DiferencaItem[];
  reajustesDepois?: Record<Unidade, number>;
}

export interface MesComparado extends EntradaMesComparacao, ResultadoCompararMes {
  /** Mês onde começou a diferença de saldo que este mês carrega (null: saldo em dia) */
  origemSaldo: MesAno | null;
}

export interface ResultadoComparacao {
  situacao: SituacaoComparacao;
  mesesComparados: number;
  meses: MesComparado[];
  consumo: {
    legadoMinutos: number;
    novoMinutos: number;
    legadoTickets: number;
    novoTickets: number;
  };
}

const indice = (m: MesAno) => m.ano * 12 + m.mes;

/**
 * Compara os meses em ordem. A diferença de saldo passa de um mês para o outro
 * até o saldo voltar a bater (Modelagem_Fase4.md, 3.3).
 */
export function compararEmpresa(entradas: EntradaMesComparacao[]): ResultadoComparacao {
  const ordenadas = [...entradas].sort((a, b) => indice(a.mes) - indice(b.mes));
  const meses: MesComparado[] = [];
  let herdada: SituacaoMes | null = null;
  let origemMes: MesAno | null = null;

  for (const e of ordenadas) {
    const r = compararMes({ ...e, umBanco: e.bancos <= 1, herdada });
    if (r.origem === null) origemMes = null;
    else if (herdada === null) origemMes = e.mes;
    herdada = r.origem;
    meses.push({ ...e, ...r, origemSaldo: origemMes });
  }

  const geral = pior(...meses.map((m) => m.situacao));
  const umBanco = ordenadas.every((e) => e.bancos <= 1);
  const soma = (f: (e: EntradaMesComparacao) => number) => ordenadas.reduce((s, e) => s + f(e), 0);

  return {
    situacao: geral === 'igual' ? (umBanco ? 'identico' : 'soma_confere') : geral,
    mesesComparados: ordenadas.length,
    meses,
    consumo: {
      legadoMinutos: soma((e) => e.legado.horas.consumo),
      novoMinutos: soma((e) => e.novo.horas.consumo),
      legadoTickets: soma((e) => e.legado.tickets.consumo),
      novoTickets: soma((e) => e.novo.tickets.consumo),
    },
  };
}
