// Dados FICTÍCIOS do protótipo revisto do Controle de Banco de Horas (21/10/2026). Os bancos são os
// da Empresa Alfa no protótipo de Empresas; horas em minutos. Hoje é 21/10/2026: outubro é o mês
// aberto, novembro e dezembro ainda não começaram, e o período anterior de cada banco já fechou.
// Os números são calculados aqui para baterem entre si (baseline + repasse − consumo = saldo).

export type SituacaoMes = 'fechado' | 'aberto' | 'futuro';

export interface MesControleMock {
  id: string; // AAAA-MM
  rotulo: string; // Out/2026
  situacao: SituacaoMes;
  /** Último mês do período de apuração */
  fimPeriodo: boolean;
  baseline: number;
  repasseAnterior: number;
  disponivel: number;
  /** Consumo dos chamados (apontamentos do Aranda classificados neste banco) */
  apontamentos: number;
  requerimentos: number;
  /** Líquido dos reajustes do mês (+ aumenta o consumo, − abate) */
  reajustes: number;
  consumo: number;
  saldo: number;
  /** Repasse para o mês seguinte (dentro do período) */
  repasse: number;
  /** Só tickets (contrato "Horas e tickets") */
  tickets?: { contratados: number; consumidos: number; saldo: number };
}

export interface EntreBancosMock {
  tipo: 'recebeu' | 'cedeu';
  outroBanco: string;
  minutos: number;
  saldoFinal: number;
}

export interface PeriodoMock {
  id: string;
  rotulo: string; // Out – Dez/2026
  meses: MesControleMock[];
  entreBancos?: EntreBancosMock;
  /** Excedente no fechamento (minutos) e valor a faturar (R$) */
  excedente?: { minutos: number; valor: number };
}

export interface BancoControleMock {
  id: string;
  nome: string;
  padrao: boolean;
  tipoContrato: 'horas' | 'tickets' | 'ambos';
  periodicidade: string; // Trimestral
  repassePercentual: number;
  escopo: string;
  taxa: { rotulo: string; valorHora: number };
  /** Saldo final dos últimos meses, para o minigráfico */
  historicoSaldo: number[];
  periodos: PeriodoMock[]; // [anterior, atual]
}

const h = (horas: number, minutos = 0) => Math.sign(horas || 1) * (Math.abs(horas) * 60 + minutos);
const NOMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** Monta os meses de um período, encadeando o repasse; consumo null = mês futuro */
function periodo(
  ano: number,
  mesInicio: number,
  baseline: number,
  repassePct: number,
  consumos: ({ apont: number; req: number; reaj?: number } | null)[],
  aberto: number | null,
  tickets?: { contratados: number; consumidos: (number | null)[] }
): MesControleMock[] {
  let repasseAnterior = 0;
  return consumos.map((c, i) => {
    const m = mesInicio + i;
    const situacao: SituacaoMes = c === null ? 'futuro' : i === aberto ? 'aberto' : 'fechado';
    const apontamentos = c?.apont ?? 0;
    const requerimentos = c?.req ?? 0;
    const reajustes = c?.reaj ?? 0;
    const disponivel = baseline + repasseAnterior;
    const consumo = apontamentos + requerimentos + reajustes;
    const saldo = disponivel - consumo;
    const fimPeriodo = i === consumos.length - 1;
    const repasse = fimPeriodo ? 0 : saldo > 0 ? Math.round((saldo * repassePct) / 100) : saldo;
    const tc = tickets?.consumidos[i];
    const mes: MesControleMock = {
      id: `${ano}-${String(m).padStart(2, '0')}`,
      rotulo: `${NOMES[m - 1]}/${ano}`,
      situacao,
      fimPeriodo,
      baseline,
      repasseAnterior,
      disponivel,
      apontamentos,
      requerimentos,
      reajustes,
      consumo,
      saldo,
      repasse,
      tickets:
        tickets && tc !== undefined && tc !== null
          ? { contratados: tickets.contratados, consumidos: tc, saldo: tickets.contratados - tc }
          : undefined,
    };
    if (situacao !== 'futuro') repasseAnterior = repasse;
    return mes;
  });
}

const rotuloPeriodo = (meses: MesControleMock[]) =>
  `${meses[0].rotulo.slice(0, 3)} – ${meses[meses.length - 1].rotulo}`;

function montar(meses: MesControleMock[], extra: Partial<PeriodoMock> = {}): PeriodoMock {
  return { id: meses[0].id, rotulo: rotuloPeriodo(meses), meses, ...extra };
}

/* Banco COMEX: horas e tickets, trimestral, 50% de repasse */
const comexAnterior = periodo(
  2026,
  7,
  h(40),
  50,
  [
    { apont: h(36, 10), req: h(3) },
    { apont: h(41, 20), req: h(2) },
    { apont: h(44, 50), req: h(4), reaj: -h(1, 30) },
  ],
  null,
  { contratados: 10, consumidos: [8, 11, 9] }
);
const comexAtual = periodo(2026, 10, h(40), 50, [{ apont: h(22, 40), req: h(3) }, null, null], 0, {
  contratados: 10,
  consumidos: [6, null, null],
});

/* FISCAL – e-DOCS: horas, semestral, 100% de repasse; no fechamento consome do Banco FISCAL */
const edocsAnterior = periodo(
  2026,
  1,
  h(20),
  100,
  [
    { apont: h(18, 30), req: 0 },
    { apont: h(22), req: h(1) },
    { apont: h(19, 40), req: 0 },
    { apont: h(23, 10), req: h(2) },
    { apont: h(21), req: 0 },
    { apont: h(24, 50), req: h(1), reaj: -h(1, 30) },
  ],
  null
);
const edocsAtual = periodo(
  2026,
  7,
  h(20),
  100,
  [
    { apont: h(17, 20), req: 0 },
    { apont: h(21, 50), req: h(2) },
    { apont: h(19), req: 0 },
    { apont: h(14, 40), req: h(1) },
    null,
    null,
  ],
  3
);

/* Banco FISCAL (padrão): horas, semestral, 50% de repasse; cede saldo ao e-DOCS no fechamento */
const fiscalAnterior = periodo(
  2026,
  1,
  h(60),
  50,
  [
    { apont: h(52), req: h(2) },
    { apont: h(48, 30), req: h(4) },
    { apont: h(61), req: 0 },
    { apont: h(55, 15), req: h(3) },
    { apont: h(50), req: h(2) },
    { apont: h(54, 40), req: 0 },
  ],
  null
);
const fiscalAtual = periodo(
  2026,
  7,
  h(60),
  50,
  [
    { apont: h(49, 10), req: h(3) },
    { apont: h(57), req: h(2) },
    { apont: h(52, 30), req: 0 },
    { apont: h(31, 15), req: h(4), reaj: h(2) },
    null,
    null,
  ],
  3
);

const saldoFim = (meses: MesControleMock[]) => meses[meses.length - 1].saldo;
// No fechamento de junho, o e-DOCS ficou negativo e consumiu do Banco FISCAL (mesmo tipo e período),
// até o saldo positivo do FISCAL; o que faltou virou excedente do e-DOCS
const cobertura = Math.min(
  -Math.min(0, saldoFim(edocsAnterior)),
  Math.max(0, saldoFim(fiscalAnterior))
);
const edocsFinal = saldoFim(edocsAnterior) + cobertura;
const valorExcedente = (minutos: number, taxa: number) =>
  Math.round((minutos / 60) * taxa * 100) / 100;

export const BANCOS_CONTROLE_MOCK: BancoControleMock[] = [
  {
    id: 'comex',
    nome: 'Banco COMEX',
    padrao: false,
    tipoContrato: 'ambos',
    periodicidade: 'Trimestral',
    repassePercentual: 50,
    escopo: 'COMEX › CE PLUS, CE PLUS RECOF, CATÁLOGO DE PRODUTOS e FCI',
    taxa: { rotulo: 'Taxa excedente (Outros)', valorHora: 210 },
    historicoSaldo: comexAnterior.map((m) => m.saldo).concat(comexAtual[0].saldo),
    periodos: [
      montar(comexAnterior, {
        excedente:
          saldoFim(comexAnterior) < 0
            ? {
                minutos: -saldoFim(comexAnterior),
                valor: valorExcedente(-saldoFim(comexAnterior), 210),
              }
            : undefined,
      }),
      montar(comexAtual),
    ],
  },
  {
    id: 'edocs',
    nome: 'FISCAL – e-DOCS',
    padrao: false,
    tipoContrato: 'horas',
    periodicidade: 'Semestral',
    repassePercentual: 100,
    escopo: 'FISCAIS › COMPLY e-DOCS e COMPLY › Monitor NF-e',
    taxa: { rotulo: 'Taxa excedente (Outros)', valorHora: 210 },
    historicoSaldo: edocsAnterior
      .slice(3)
      .map((m) => m.saldo)
      .concat(edocsAtual.slice(0, 4).map((m) => m.saldo)),
    periodos: [
      montar(edocsAnterior, {
        entreBancos: {
          tipo: 'recebeu',
          outroBanco: 'Banco FISCAL',
          minutos: cobertura,
          saldoFinal: edocsFinal,
        },
        excedente:
          edocsFinal < 0
            ? { minutos: -edocsFinal, valor: valorExcedente(-edocsFinal, 210) }
            : undefined,
      }),
      montar(edocsAtual),
    ],
  },
  {
    id: 'fiscal',
    nome: 'Banco FISCAL',
    padrao: true,
    tipoContrato: 'horas',
    periodicidade: 'Semestral',
    repassePercentual: 50,
    escopo: 'Demais produtos FISCAIS e grupos de serviço',
    taxa: { rotulo: 'Taxa excedente (Outros)', valorHora: 210 },
    historicoSaldo: fiscalAnterior
      .slice(3)
      .map((m) => m.saldo)
      .concat(fiscalAtual.slice(0, 4).map((m) => m.saldo)),
    periodos: [
      montar(fiscalAnterior, {
        entreBancos: {
          tipo: 'cedeu',
          outroBanco: 'FISCAL – e-DOCS',
          minutos: cobertura,
          saldoFinal: saldoFim(fiscalAnterior) - cobertura,
        },
      }),
      montar(fiscalAtual),
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Requerimentos, reajustes, observações e versões                      */
/* ------------------------------------------------------------------ */

export interface RequerimentoControleMock {
  id: string;
  chamado: string;
  titulo: string;
  /** requerimentos.modulo (lista fixa) */
  modulo: string;
  minutos: number;
  mesCobranca: string; // Out/2026
  situacao: 'enviado' | 'desenvolvimento';
  bancoId: string;
  /** Automática pelo módulo (Produtos e Módulos › Módulos de requerimento) ou ajustada à mão */
  classificacao: { tipo: 'automatica' } | { tipo: 'ajustada'; por: string; em: string };
}

export const REQUERIMENTOS_CONTROLE_MOCK: RequerimentoControleMock[] = [
  {
    id: 'rq1',
    chamado: 'RF-1051220',
    titulo: 'Ajuste no layout da NF-e de exportação',
    modulo: 'Comply e-DOCS',
    minutos: h(1),
    mesCobranca: 'Out/2026',
    situacao: 'enviado',
    bancoId: 'edocs',
    classificacao: { tipo: 'automatica' },
  },
  {
    id: 'rq2',
    chamado: 'RF-1051301',
    titulo: 'Relatório de drawback por período',
    modulo: 'Comex',
    minutos: h(3),
    mesCobranca: 'Out/2026',
    situacao: 'enviado',
    bancoId: 'comex',
    classificacao: { tipo: 'automatica' },
  },
  {
    id: 'rq3',
    chamado: 'RF-1051388',
    titulo: 'Parametrização de novo CFOP',
    modulo: 'Comply',
    minutos: h(2),
    mesCobranca: 'Out/2026',
    situacao: 'enviado',
    bancoId: 'fiscal',
    classificacao: { tipo: 'automatica' },
  },
  {
    id: 'rq4',
    chamado: 'RF-1051402',
    titulo: 'Integração do Monitor NF-e com o ERP',
    modulo: 'Comply',
    minutos: h(2),
    mesCobranca: 'Out/2026',
    situacao: 'enviado',
    bancoId: 'fiscal',
    classificacao: { tipo: 'ajustada', por: 'Usuário Teste', em: '18/10/2026' },
  },
  {
    id: 'rq5',
    chamado: 'RF-1051467',
    titulo: 'Nova regra de retenção de ISS',
    modulo: 'Comply',
    minutos: h(5),
    mesCobranca: 'Nov/2026',
    situacao: 'desenvolvimento',
    bancoId: 'fiscal',
    classificacao: { tipo: 'automatica' },
  },
];

export interface ReajusteMock {
  id: string;
  bancoId: string;
  mes: string; // AAAA-MM
  /** Positivo soma ao consumo; negativo abate */
  minutos: number;
  tickets?: number;
  motivo: string;
  por: string;
  em: string;
  ativo: boolean;
  /** Lançado em mês fechado: entra na retificação do Book */
  aguardandoRetificacao?: boolean;
}

export const REAJUSTES_MOCK: ReajusteMock[] = [
  {
    id: 'rj1',
    bancoId: 'comex',
    mes: '2026-09',
    minutos: -h(1, 30),
    motivo: 'Chamado aberto por engano pelo cliente; horas devolvidas.',
    por: 'Usuário Teste',
    em: '02/10/2026',
    ativo: true,
  },
  {
    id: 'rj2',
    bancoId: 'fiscal',
    mes: '2026-10',
    minutos: h(2),
    motivo: 'Atendimento presencial não apontado no Aranda.',
    por: 'Usuário Teste',
    em: '15/10/2026',
    ativo: true,
  },
  {
    id: 'rj3',
    bancoId: 'fiscal',
    mes: '2026-09',
    minutos: -h(1),
    motivo: 'Duplicidade de apontamento.',
    por: 'Usuário Teste',
    em: '19/10/2026',
    ativo: true,
    aguardandoRetificacao: true,
  },
  {
    id: 'rj4',
    bancoId: 'edocs',
    mes: '2026-06',
    minutos: -h(1, 30),
    motivo: 'Correção de classificação do chamado.',
    por: 'Usuário Teste',
    em: '29/06/2026',
    ativo: true,
  },
  {
    id: 'rj5',
    bancoId: 'edocs',
    mes: '2026-08',
    minutos: h(1),
    motivo: 'Lançado em duplicidade.',
    por: 'Usuário Teste',
    em: '10/09/2026',
    ativo: false,
  },
];

export interface ObservacaoMock {
  id: string;
  bancoId: string;
  mes: string;
  tipo: 'manual' | 'reajuste' | 'automatica';
  texto: string;
  por: string;
  em: string;
  editada?: boolean;
}

export const OBSERVACOES_MOCK: ObservacaoMock[] = [
  {
    id: 'ob1',
    bancoId: 'edocs',
    mes: '2026-06',
    tipo: 'automatica',
    texto:
      'O saldo negativo deste banco foi coberto em parte pelo Banco FISCAL no fechamento do período (Jan – Jun/2026); o restante entrou como excedente.',
    por: 'Sistema',
    em: '01/07/2026',
  },
  {
    id: 'ob2',
    bancoId: 'fiscal',
    mes: '2026-06',
    tipo: 'automatica',
    texto:
      'Todo o saldo deste banco foi usado para cobrir o banco FISCAL – e-DOCS no fechamento do período (Jan – Jun/2026).',
    por: 'Sistema',
    em: '01/07/2026',
  },
  {
    id: 'ob3',
    bancoId: 'fiscal',
    mes: '2026-10',
    tipo: 'reajuste',
    texto: 'Atendimento presencial não apontado no Aranda.',
    por: 'Usuário Teste',
    em: '15/10/2026',
  },
  {
    id: 'ob4',
    bancoId: 'fiscal',
    mes: '2026-10',
    tipo: 'manual',
    texto: 'Cliente pediu o detalhamento do consumo de outubro por módulo.',
    por: 'Usuário Teste',
    em: '16/10/2026',
    editada: true,
  },
  {
    id: 'ob5',
    bancoId: 'comex',
    mes: '2026-09',
    tipo: 'reajuste',
    texto: 'Chamado aberto por engano pelo cliente; horas devolvidas.',
    por: 'Usuário Teste',
    em: '02/10/2026',
  },
];

export interface VersaoMock {
  id: string;
  bancoId: string;
  mes: string;
  versao: number;
  tipo: 'calculo' | 'recalculo' | 'reajuste' | 'retificacao';
  saldoAntes: number | null;
  saldoDepois: number;
  por: string;
  em: string;
  motivo?: string;
}

export const VERSOES_MOCK: VersaoMock[] = [
  {
    id: 'v1',
    bancoId: 'fiscal',
    mes: '2026-10',
    versao: 3,
    tipo: 'reajuste',
    saldoAntes: fiscalAtual[3].saldo + h(2),
    saldoDepois: fiscalAtual[3].saldo,
    por: 'Usuário Teste',
    em: '15/10/2026 10:42',
    motivo: 'Atendimento presencial não apontado no Aranda.',
  },
  {
    id: 'v2',
    bancoId: 'fiscal',
    mes: '2026-10',
    versao: 2,
    tipo: 'recalculo',
    saldoAntes: fiscalAtual[3].saldo + h(5, 45),
    saldoDepois: fiscalAtual[3].saldo + h(2),
    por: 'Sistema',
    em: '15/10/2026 06:00',
  },
  {
    id: 'v3',
    bancoId: 'fiscal',
    mes: '2026-10',
    versao: 1,
    tipo: 'calculo',
    saldoAntes: null,
    saldoDepois: fiscalAtual[3].saldo + h(5, 45),
    por: 'Sistema',
    em: '01/10/2026 06:00',
  },
  {
    id: 'v4',
    bancoId: 'fiscal',
    mes: '2026-09',
    versao: 2,
    tipo: 'retificacao',
    saldoAntes: fiscalAtual[2].saldo,
    saldoDepois: fiscalAtual[2].saldo,
    por: 'Usuário Teste',
    em: '08/10/2026 14:10',
    motivo: 'Retificação do Book de setembro.',
  },
  {
    id: 'v5',
    bancoId: 'comex',
    mes: '2026-10',
    versao: 1,
    tipo: 'calculo',
    saldoAntes: null,
    saldoDepois: comexAtual[0].saldo,
    por: 'Sistema',
    em: '21/10/2026 06:00',
  },
  {
    id: 'v6',
    bancoId: 'edocs',
    mes: '2026-10',
    versao: 1,
    tipo: 'calculo',
    saldoAntes: null,
    saldoDepois: edocsAtual[3].saldo,
    por: 'Sistema',
    em: '21/10/2026 06:00',
  },
];

export const EMPRESAS_CONTROLE_MOCK = [
  { id: 'alfa', nome: 'EMPRESA ALFA', modelo: 'multiplo' as const },
  { id: 'gama', nome: 'EMPRESA GAMA', modelo: 'multiplo' as const },
  { id: 'beta', nome: 'EMPRESA BETA', modelo: 'legado' as const },
];

export const ULTIMA_SINCRONIZACAO_MOCK = '21/10/2026 08:15';
export const ULTIMO_ENVIO_SALDO_MOCK = { em: '15/10/2026 09:00', por: 'Agendamento semanal' };
