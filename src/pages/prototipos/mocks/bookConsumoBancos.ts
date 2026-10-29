// Dados fictícios do protótipo da página de consumo do Book por banco (Fase 5, Modelagem_Fase5.md
// seção 6). Nunca usar nomes reais de clientes ou usuários. Horas em minutos.

export interface MesBancoMock {
  mes: string;
  baseline: number;
  repasseAnterior: number;
  consumo: number;
  requerimentos: number;
  reajustes: number;
  /** Consumo entre bancos no fim do período: + recebido, − cedido (RN-24) */
  entreBancos: number;
  saldo: number;
  repasse: number;
  /** Mês ainda não começou: projetado pelo motor */
  aComecar?: boolean;
}

export interface RequerimentoMock {
  chamado: string;
  modulo: string;
  minutos: number;
}

export interface BancoBookMock {
  id: string;
  nome: string;
  /** Empresa dona do banco: difere da do Book quando é de uma consolidada (D-15) */
  empresa?: string;
  periodo: string;
  percentualRepasse: number;
  taxaExcedente: number;
  valorExcedentes: number;
  consumoMes: { incidente: number; solicitacao: number };
  historico: { mes: string; consumo: number; requerimentos: number }[];
  requerimentos: RequerimentoMock[];
  meses: MesBancoMock[];
  observacoes: string[];
}

const h = (horas: number, minutos = 0) => horas * 60 + minutos;

export const EMPRESA_BOOK = 'EMPRESA ALFA';
export const MES_BOOK = 'Setembro/2026';

export const BANCOS_BOOK_MOCK: BancoBookMock[] = [
  {
    id: 'b1',
    nome: 'Banco COMEX',
    periodo: 'Jul a Set/2026',
    percentualRepasse: 50,
    taxaExcedente: 245.9,
    valorExcedentes: 0,
    consumoMes: { incidente: h(18, 30), solicitacao: h(42, 15) },
    historico: [
      { mes: 'Abr', consumo: h(55), requerimentos: h(8) },
      { mes: 'Mai', consumo: h(61, 30), requerimentos: 0 },
      { mes: 'Jun', consumo: h(48), requerimentos: h(12) },
      { mes: 'Jul', consumo: h(52, 15), requerimentos: h(4) },
      { mes: 'Ago', consumo: h(66), requerimentos: 0 },
      { mes: 'Set', consumo: h(60, 45), requerimentos: h(10) },
    ],
    requerimentos: [
      { chamado: 'RF-100231', modulo: 'Câmbio', minutos: h(6) },
      { chamado: 'RF-100388', modulo: 'Importação', minutos: h(4) },
    ],
    meses: [
      {
        mes: 'Jul/26',
        baseline: h(80),
        repasseAnterior: h(12),
        consumo: h(52, 15),
        requerimentos: h(4),
        reajustes: 0,
        entreBancos: 0,
        saldo: h(35, 45),
        repasse: h(17, 53),
      },
      {
        mes: 'Ago/26',
        baseline: h(80),
        repasseAnterior: h(17, 53),
        consumo: h(66),
        requerimentos: 0,
        reajustes: h(2),
        entreBancos: 0,
        saldo: h(33, 53),
        repasse: h(16, 57),
      },
      {
        mes: 'Set/26',
        baseline: h(80),
        repasseAnterior: h(16, 57),
        consumo: h(60, 45),
        requerimentos: h(10),
        reajustes: 0,
        entreBancos: -h(6, 30),
        saldo: h(19, 42),
        repasse: h(9, 51),
      },
    ],
    observacoes: ['06:30 horas cedidas ao Banco FISCAL – e-DOCS no fechamento do período'],
  },
  {
    id: 'b2',
    nome: 'Banco FISCAL – e-DOCS',
    periodo: 'Jul a Set/2026',
    percentualRepasse: 0,
    taxaExcedente: 245.9,
    valorExcedentes: 0,
    consumoMes: { incidente: h(9), solicitacao: h(14, 30) },
    historico: [
      { mes: 'Abr', consumo: h(20), requerimentos: 0 },
      { mes: 'Mai', consumo: h(18, 30), requerimentos: 0 },
      { mes: 'Jun', consumo: h(25), requerimentos: 0 },
      { mes: 'Jul', consumo: h(21), requerimentos: 0 },
      { mes: 'Ago', consumo: h(24, 15), requerimentos: 0 },
      { mes: 'Set', consumo: h(21, 15), requerimentos: 0 },
    ],
    requerimentos: [],
    meses: [
      {
        mes: 'Jul/26',
        baseline: h(20),
        repasseAnterior: 0,
        consumo: h(21),
        requerimentos: 0,
        reajustes: 0,
        entreBancos: 0,
        saldo: -h(1),
        repasse: -h(1),
      },
      {
        mes: 'Ago/26',
        baseline: h(20),
        repasseAnterior: -h(1),
        consumo: h(24, 15),
        requerimentos: 0,
        reajustes: 0,
        entreBancos: 0,
        saldo: -h(5, 15),
        repasse: -h(5, 15),
      },
      {
        mes: 'Set/26',
        baseline: h(20),
        repasseAnterior: -h(5, 15),
        consumo: h(21, 15),
        requerimentos: 0,
        reajustes: 0,
        entreBancos: h(6, 30),
        saldo: 0,
        repasse: 0,
      },
    ],
    observacoes: ['06:30 horas consumidas do Banco COMEX no fechamento do período'],
  },
  {
    id: 'b3',
    nome: 'Banco de Horas',
    empresa: 'EMPRESA ALFA FILIAL',
    periodo: 'Set/2026',
    percentualRepasse: 100,
    taxaExcedente: 198.5,
    valorExcedentes: 0,
    consumoMes: { incidente: h(3), solicitacao: h(5) },
    historico: [
      { mes: 'Abr', consumo: h(9), requerimentos: 0 },
      { mes: 'Mai', consumo: h(7), requerimentos: 0 },
      { mes: 'Jun', consumo: h(10), requerimentos: 0 },
      { mes: 'Jul', consumo: h(6), requerimentos: 0 },
      { mes: 'Ago', consumo: h(8, 30), requerimentos: 0 },
      { mes: 'Set', consumo: h(8), requerimentos: 0 },
    ],
    requerimentos: [],
    meses: [
      {
        mes: 'Set/26',
        baseline: h(10),
        repasseAnterior: h(4),
        consumo: h(8),
        requerimentos: 0,
        reajustes: 0,
        entreBancos: 0,
        saldo: h(6),
        repasse: h(6),
      },
    ],
    observacoes: [],
  },
];
