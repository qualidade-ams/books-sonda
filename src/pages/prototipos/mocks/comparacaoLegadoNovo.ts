// Dados fictícios do protótipo Comparação Legado x Novo (DS v2). Nunca usar nomes reais de clientes ou usuários.
// Horas em minutos.

export type SituacaoComparacao = 'identico' | 'soma_confere' | 'divergente' | 'liberada';

export interface ComparacaoMock {
  id: string;
  empresa: string;
  bancos: number;
  consumoLegado: number;
  somaBancos: number;
  saldoLegado: number | null;
  saldoNovo: number | null;
  situacao: SituacaoComparacao;
  liberadaEm?: string;
}

export interface ApontamentoDivergenteMock {
  id: string;
  chamado: string;
  data: string;
  grupo: string;
  minutos: number;
  motivo: string;
}

const h = (horas: number, minutos = 0) => horas * 60 + minutos;

export const COMPARACOES_MOCK: ComparacaoMock[] = [
  {
    id: '1',
    empresa: 'EMPRESA ALFA',
    bancos: 3,
    consumoLegado: h(142, 35),
    somaBancos: h(142, 35),
    saldoLegado: null,
    saldoNovo: null,
    situacao: 'soma_confere',
  },
  {
    id: '2',
    empresa: 'EMPRESA BETA',
    bancos: 1,
    consumoLegado: h(58, 10),
    somaBancos: h(58, 10),
    saldoLegado: h(21, 50),
    saldoNovo: h(21, 50),
    situacao: 'identico',
  },
  {
    id: '3',
    empresa: 'EMPRESA GAMA',
    bancos: 1,
    consumoLegado: h(96, 40),
    somaBancos: h(95, 10),
    saldoLegado: -h(16, 40),
    saldoNovo: -h(15, 10),
    situacao: 'divergente',
  },
  {
    id: '4',
    empresa: 'EMPRESA DELTA',
    bancos: 2,
    consumoLegado: h(40),
    somaBancos: h(40),
    saldoLegado: null,
    saldoNovo: null,
    situacao: 'soma_confere',
  },
  {
    id: '5',
    empresa: 'EMPRESA ÉPSILON',
    bancos: 1,
    consumoLegado: h(12, 20),
    somaBancos: h(12, 20),
    saldoLegado: h(27, 40),
    saldoNovo: h(27, 40),
    situacao: 'liberada',
    liberadaEm: '01/10',
  },
];

export const DIVERGENCIA_MOCK: ApontamentoDivergenteMock[] = [
  {
    id: 'a',
    chamado: 'CH-204511',
    data: '30/09/2026 22:40',
    grupo: 'AMS APL - COMEX - DUIMP - N1',
    minutos: h(1),
    motivo: 'Fuso: no legado caiu em outubro (UTC); no novo, em setembro',
  },
  {
    id: 'b',
    chamado: 'CH-204630',
    data: '12/09/2026 10:15',
    grupo: 'AMS APL - COMEX - CAMBIO - N2',
    minutos: h(0, 30),
    motivo: 'Apontamento duplicado no legado',
  },
];

export const MESES_COMPARACAO = ['Set/2026', 'Ago/2026', 'Jul/2026'];
