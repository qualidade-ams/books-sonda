// Dados fictícios do protótipo criativo do Controle de Banco de Horas. Nunca usar nomes reais de clientes ou usuários.
// Horas em minutos.

export interface ResumoBancoMock {
  id: string;
  nome: string;
  padrao: boolean;
  escopo: string;
  contrato: string;
  saldoUtilizar: number;
  consumo: number;
  saldo: number;
  /** Saldo no fim de cada um dos últimos 6 meses, para o minigráfico */
  historicoSaldo: number[];
}

export interface MesPeriodoMock {
  id: string;
  rotulo: string;
  fechamento: boolean;
  aberto: boolean;
  baseline: number;
  repasseAnterior: number;
  saldoUtilizar: number;
  apontamentos: number;
  requerimentos: number;
  reajustes: number;
  consumoTotal: number;
  saldo: number;
}

const h = (horas: number, minutos = 0) => horas * 60 + minutos;

export const RESUMO_BANCOS_MOCK: ResumoBancoMock[] = [
  {
    id: 'comex',
    nome: 'Banco COMEX',
    padrao: false,
    escopo: 'COMEX (todos os módulos)',
    contrato: 'Horas · trimestral',
    saldoUtilizar: h(80),
    consumo: h(61, 20),
    saldo: h(18, 40),
    historicoSaldo: [h(12), h(9, 30), h(15), h(21), h(16, 10), h(18, 40)],
  },
  {
    id: 'edocs',
    nome: 'FISCAL – e-DOCS',
    padrao: false,
    escopo: 'FISCAL › COMPLY e-DOCS',
    contrato: 'Horas · semestral',
    saldoUtilizar: h(37, 30),
    consumo: h(44),
    saldo: -h(6, 30),
    historicoSaldo: [h(4), h(2, 45), -h(1), h(3, 40), -h(1, 30), -h(6, 30)],
  },
  {
    id: 'fiscal',
    nome: 'Banco FISCAL',
    padrao: true,
    escopo: 'Demais módulos FISCAL e grupos sem produto',
    contrato: 'Horas · semestral',
    saldoUtilizar: h(96),
    consumo: h(43, 45),
    saldo: h(52, 15),
    historicoSaldo: [h(30), h(36), h(41, 20), h(44), h(48), h(52, 15)],
  },
];

export const MESES_PERIODO_MOCK: MesPeriodoMock[] = [
  {
    id: '2026-10',
    rotulo: 'Out/2026',
    fechamento: false,
    aberto: false,
    baseline: h(40),
    repasseAnterior: h(3, 40),
    saldoUtilizar: h(43, 40),
    apontamentos: h(39, 10),
    requerimentos: h(6),
    reajustes: 0,
    consumoTotal: h(45, 10),
    saldo: -h(1, 30),
  },
  {
    id: '2026-11',
    rotulo: 'Nov/2026',
    fechamento: false,
    aberto: false,
    baseline: h(40),
    repasseAnterior: -h(1, 30),
    saldoUtilizar: h(38, 30),
    apontamentos: h(35),
    requerimentos: h(6),
    reajustes: 0,
    consumoTotal: h(41),
    saldo: -h(2, 30),
  },
  {
    id: '2026-12',
    rotulo: 'Dez/2026',
    fechamento: true,
    aberto: true,
    baseline: h(40),
    repasseAnterior: -h(2, 30),
    saldoUtilizar: h(37, 30),
    apontamentos: h(44),
    requerimentos: 0,
    reajustes: 0,
    consumoTotal: h(44),
    saldo: -h(6, 30),
  },
];

/** Movimento de consumo entre bancos no fechamento */
export const CONSUMO_ENTRE_BANCOS_MOCK = {
  de: 'Banco FISCAL',
  para: 'FISCAL – e-DOCS',
  minutos: h(6, 30),
  mes: 'Dez/2026',
};
