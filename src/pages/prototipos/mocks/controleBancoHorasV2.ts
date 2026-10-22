// Dados fictícios do protótipo Controle de Banco de Horas (DS v2). Nunca usar nomes reais de clientes ou usuários.
// Horas em minutos, como o motor novo vai devolver.

export interface BancoMock {
  id: string;
  nome: string;
  padrao: boolean;
  escopo: string;
  contrato: string;
  consomeOutros: boolean;
}

export interface IndicadorMensal {
  id: string;
  rotulo: string;
  valores: Record<string, number | null>;
  enfase?: 'total' | 'info' | 'warning';
  selo?: string;
  sinal?: 'sempre';
  cor?: 'saldo';
}

export interface RequerimentoMock {
  id: string;
  codigo: string;
  titulo: string;
  modulo: string;
  minutos: number;
  status: 'faturamento' | 'desenvolvimento';
  bancoId: string;
  origem: { tipo: 'automatica'; regra: string } | { tipo: 'ajustada'; por: string; em: string };
}

export const EMPRESAS_MOCK = ['EMPRESA ALFA', 'EMPRESA BETA', 'EMPRESA GAMA'];

export const BANCOS_MOCK: BancoMock[] = [
  {
    id: 'comex',
    nome: 'Banco COMEX',
    padrao: false,
    escopo: 'COMEX (todos os módulos)',
    contrato: 'horas · trimestral',
    consomeOutros: false,
  },
  {
    id: 'edocs',
    nome: 'FISCAL – e-DOCS',
    padrao: false,
    escopo: 'FISCAL › COMPLY e-DOCS',
    contrato: 'horas · semestral (Jul–Dez/2026)',
    consomeOutros: true,
  },
  {
    id: 'fiscal',
    nome: 'Banco FISCAL',
    padrao: true,
    escopo: 'Demais módulos FISCAL e grupos sem produto',
    contrato: 'horas · semestral (Jul–Dez/2026)',
    consomeOutros: false,
  },
];

export const MESES_MOCK = [
  { id: '2026-10', rotulo: 'Out/2026' },
  { id: '2026-11', rotulo: 'Nov/2026' },
  { id: '2026-12', rotulo: 'Dez/2026 (fechamento)' },
];

const h = (horas: number, minutos = 0) => horas * 60 + minutos;

export const QUADRO_MOCK: IndicadorMensal[] = [
  {
    id: 'baseline',
    rotulo: 'Baseline',
    valores: { '2026-10': h(40), '2026-11': h(40), '2026-12': h(40) },
  },
  {
    id: 'repasse-anterior',
    rotulo: 'Repasse do mês anterior',
    valores: { '2026-10': h(3, 40), '2026-11': -h(1, 30), '2026-12': -h(2, 30) },
  },
  {
    id: 'saldo-utilizar',
    rotulo: 'Saldo a utilizar',
    valores: { '2026-10': h(43, 40), '2026-11': h(38, 30), '2026-12': h(37, 30) },
  },
  {
    id: 'consumo',
    rotulo: 'Consumo (apontamentos)',
    valores: { '2026-10': h(39, 10), '2026-11': h(35), '2026-12': h(44) },
  },
  {
    id: 'requerimentos',
    rotulo: 'Requerimentos',
    valores: { '2026-10': h(6), '2026-11': h(6), '2026-12': 0 },
  },
  { id: 'reajustes', rotulo: 'Reajustes', valores: { '2026-10': 0, '2026-11': 0, '2026-12': 0 } },
  {
    id: 'consumo-total',
    rotulo: 'Consumo total',
    valores: { '2026-10': h(45, 10), '2026-11': h(41), '2026-12': h(44) },
    enfase: 'total',
  },
  {
    id: 'saldo',
    rotulo: 'Saldo do banco',
    valores: { '2026-10': -h(1, 30), '2026-11': -h(2, 30), '2026-12': -h(6, 30) },
    enfase: 'total',
    cor: 'saldo',
  },
  {
    id: 'consumido-outros',
    rotulo: 'Consumido de outros bancos',
    valores: { '2026-10': null, '2026-11': null, '2026-12': h(6, 30) },
    enfase: 'info',
    selo: 'novo',
    sinal: 'sempre',
  },
  {
    id: 'saldo-apos',
    rotulo: 'Saldo após consumo entre bancos',
    valores: { '2026-10': null, '2026-11': null, '2026-12': 0 },
    enfase: 'total',
    cor: 'saldo',
  },
  {
    id: 'excedentes',
    rotulo: 'Excedentes',
    valores: { '2026-10': null, '2026-11': null, '2026-12': 0 },
  },
];

export const REQUERIMENTOS_MOCK: RequerimentoMock[] = [
  {
    id: '1',
    codigo: 'RF-1051220',
    titulo: 'Ajuste de layout NF-e',
    modulo: 'Comply e-DOCS',
    minutos: h(8),
    status: 'faturamento',
    bancoId: 'edocs',
    origem: { tipo: 'automatica', regra: 'módulo → FISCAL › COMPLY e-DOCS' },
  },
  {
    id: '2',
    codigo: 'RF-1051301',
    titulo: 'Relatório de câmbio',
    modulo: 'Comex',
    minutos: h(12),
    status: 'faturamento',
    bancoId: 'comex',
    origem: { tipo: 'automatica', regra: 'módulo → COMEX' },
  },
  {
    id: '3',
    codigo: 'RF-1051388',
    titulo: 'Parametrização SPED',
    modulo: 'Comply',
    minutos: h(6, 30),
    status: 'faturamento',
    bancoId: 'fiscal',
    origem: { tipo: 'ajustada', por: 'Usuário Teste', em: '05/10/2026' },
  },
  {
    id: '4',
    codigo: 'RF-1051402',
    titulo: 'Rotina de integração',
    modulo: 'Comply',
    minutos: h(4),
    status: 'desenvolvimento',
    bancoId: 'fiscal',
    origem: { tipo: 'automatica', regra: 'módulo → FISCAL (padrão)' },
  },
];
