// Dados fictícios do protótipo enxuto do Controle de Banco de Horas. Nunca usar nomes reais de clientes ou usuários.
// Horas em minutos. Cada banco tem os próprios meses, para os números baterem entre si.

export interface MesBancoMock {
  id: string;
  rotulo: string;
  fechado: boolean;
  fechamento: boolean;
  baseline: number;
  repasseAnterior: number;
  disponivel: number;
  apontamentos: number;
  requerimentos: number;
  reajustes: number;
  consumo: number;
  saldo: number;
}

export interface EntreBancosMock {
  tipo: 'recebeu' | 'cedeu';
  outroBanco: string;
  minutos: number;
  saldoFinal: number;
}

export interface BancoEnxutoMock {
  id: string;
  nome: string;
  padrao: boolean;
  contrato: string;
  escopo: string;
  repassePercentual: number;
  /** Saldo final dos últimos 6 meses (para o minigráfico) */
  historicoSaldo: number[];
  meses: MesBancoMock[];
  entreBancos?: EntreBancosMock;
}

const h = (horas: number, minutos = 0) => horas * 60 + minutos;

function mes(
  id: string,
  rotulo: string,
  fechado: boolean,
  fechamento: boolean,
  baseline: number,
  repasseAnterior: number,
  apontamentos: number,
  requerimentos: number
): MesBancoMock {
  const disponivel = baseline + repasseAnterior;
  const consumo = apontamentos + requerimentos;
  return {
    id,
    rotulo,
    fechado,
    fechamento,
    baseline,
    repasseAnterior,
    disponivel,
    apontamentos,
    requerimentos,
    reajustes: 0,
    consumo,
    saldo: disponivel - consumo,
  };
}

export const BANCOS_ENXUTO_MOCK: BancoEnxutoMock[] = [
  {
    id: 'comex',
    nome: 'Banco COMEX',
    padrao: false,
    contrato: 'Horas · trimestral · 50% de repasse',
    escopo: 'COMEX (todos os módulos)',
    repassePercentual: 50,
    historicoSaldo: [h(12), h(9, 30), h(15), h(9, 50), h(14, 40), h(18, 40)],
    meses: [
      mes('2026-10', 'Out/2026', true, false, h(80), 0, h(64, 10), h(6)),
      mes('2026-11', 'Nov/2026', true, false, h(80), h(4, 55), h(66, 15), h(4)),
      mes('2026-12', 'Dez/2026', false, true, h(80), h(7, 20), h(56, 40), h(12)),
    ],
  },
  {
    id: 'edocs',
    nome: 'FISCAL – e-DOCS',
    padrao: false,
    contrato: 'Horas · semestral · 100% de repasse',
    escopo: 'FISCAL › COMPLY e-DOCS',
    repassePercentual: 100,
    historicoSaldo: [h(4), h(2, 45), -h(1), h(3, 40), -h(1, 30), 0],
    meses: [
      mes('2026-10', 'Out/2026', true, false, h(40), h(3, 40), h(39, 10), h(6)),
      mes('2026-11', 'Nov/2026', true, false, h(40), -h(1, 30), h(35), h(6)),
      mes('2026-12', 'Dez/2026', false, true, h(40), -h(2, 30), h(44), 0),
    ],
    entreBancos: { tipo: 'recebeu', outroBanco: 'Banco FISCAL', minutos: h(6, 30), saldoFinal: 0 },
  },
  {
    id: 'fiscal',
    nome: 'Banco FISCAL',
    padrao: true,
    contrato: 'Horas · semestral · 100% de repasse',
    escopo: 'Demais módulos FISCAL e grupos sem produto',
    repassePercentual: 100,
    historicoSaldo: [h(30), h(36), h(41, 20), h(22), h(39, 30), h(52, 15)],
    meses: [
      mes('2026-10', 'Out/2026', true, false, h(60), 0, h(34), h(4)),
      mes('2026-11', 'Nov/2026', true, false, h(60), h(22), h(38, 30), h(4)),
      mes('2026-12', 'Dez/2026', false, true, h(60), h(39, 30), h(40, 45), 0),
    ],
    entreBancos: {
      tipo: 'cedeu',
      outroBanco: 'FISCAL – e-DOCS',
      minutos: h(6, 30),
      saldoFinal: h(52, 15),
    },
  },
];
