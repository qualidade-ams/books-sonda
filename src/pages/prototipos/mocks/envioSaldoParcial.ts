// Dados FICTÍCIOS do protótipo de Envio de Saldo Parcial (DS v2). Empresas, contatos, usuários e
// datas são fictícios. Hoje é 21/10/2026 (quarta-feira).

export type Frequencia = 'diario' | 'semanal' | 'mensal';

export interface RecorrenciaMock {
  frequencia: Frequencia;
  /** Semanal: 0 (domingo) a 6 · mensal: 1 a 31, e "ultimo" para o último dia */
  dias: (number | 'ultimo')[];
  /** Horários fixos (HH:MM) ou intervalo */
  horarios:
    | { tipo: 'fixos'; lista: string[] }
    | { tipo: 'intervalo'; de: string; ate: string; aCada: number };
}

export interface EmpresaAgendavelMock {
  id: string;
  nome: string;
  /** Contatos ativos com finalidade Saldo Parcial ou Book e Saldo Parcial */
  contatos: number;
  bancos: number;
  /** Agendamento em que a empresa já está (uma empresa em no máximo um) */
  agendamentoId: string | null;
}

export interface AgendamentoMock {
  id: string;
  nome: string;
  ativo: boolean;
  recorrencia: RecorrenciaMock;
  cc: string[];
  proximoEnvio: string | null; // DD/MM/AAAA HH:MM
  ultimoEnvio: { em: string; situacao: 'enviado' | 'com_falhas' } | null;
}

export type SituacaoEnvio = 'enviado' | 'falhou' | 'executando' | 'interrompido' | 'pulado';

export interface EnvioHistoricoMock {
  id: string;
  em: string;
  empresa: string;
  origem:
    | { tipo: 'agendamento'; nome: string }
    | { tipo: 'executar_agora'; nome: string; por: string }
    | { tipo: 'manual'; por: string };
  situacao: SituacaoEnvio;
  destinatarios: number;
  bancos: number;
  erro?: string;
}

export const AGENDAMENTOS_MOCK: AgendamentoMock[] = [
  {
    id: 'ag1',
    nome: 'Semanal · segunda de manhã',
    ativo: true,
    recorrencia: {
      frequencia: 'semanal',
      dias: [1],
      horarios: { tipo: 'fixos', lista: ['09:00'] },
    },
    cc: ['qualidade@exemplo.com'],
    proximoEnvio: '26/10/2026 09:00',
    ultimoEnvio: { em: '19/10/2026 09:00', situacao: 'com_falhas' },
  },
  {
    id: 'ag2',
    nome: 'Quinzenal',
    ativo: true,
    recorrencia: {
      frequencia: 'mensal',
      dias: [1, 15],
      horarios: { tipo: 'fixos', lista: ['08:00'] },
    },
    cc: [],
    proximoEnvio: '01/11/2026 08:00',
    ultimoEnvio: { em: '15/10/2026 08:00', situacao: 'enviado' },
  },
  {
    id: 'ag3',
    nome: 'Fim do mês',
    ativo: false,
    recorrencia: {
      frequencia: 'mensal',
      dias: ['ultimo'],
      horarios: { tipo: 'fixos', lista: ['17:00'] },
    },
    cc: ['gestao.ams@exemplo.com'],
    proximoEnvio: null,
    ultimoEnvio: { em: '30/09/2026 17:00', situacao: 'enviado' },
  },
];

export const EMPRESAS_AGENDAVEIS_MOCK: EmpresaAgendavelMock[] = [
  { id: 'alfa', nome: 'EMPRESA ALFA', contatos: 2, bancos: 3, agendamentoId: 'ag1' },
  { id: 'beta', nome: 'EMPRESA BETA', contatos: 1, bancos: 1, agendamentoId: 'ag1' },
  { id: 'gama', nome: 'EMPRESA GAMA', contatos: 3, bancos: 2, agendamentoId: 'ag1' },
  { id: 'delta', nome: 'EMPRESA DELTA', contatos: 0, bancos: 1, agendamentoId: 'ag1' },
  { id: 'epsilon', nome: 'EMPRESA ÉPSILON', contatos: 1, bancos: 2, agendamentoId: 'ag2' },
  { id: 'teta', nome: 'EMPRESA TETA', contatos: 2, bancos: 1, agendamentoId: 'ag2' },
  { id: 'iota', nome: 'EMPRESA IOTA', contatos: 1, bancos: 1, agendamentoId: 'ag3' },
  // Elegíveis (ativas, com AMS) ainda sem agendamento
  { id: 'omega', nome: 'EMPRESA ÔMEGA', contatos: 2, bancos: 1, agendamentoId: null },
  { id: 'sigma', nome: 'EMPRESA SIGMA', contatos: 0, bancos: 1, agendamentoId: null },
];

export const HISTORICO_ENVIOS_MOCK: EnvioHistoricoMock[] = [
  {
    id: 'h1',
    em: '20/10/2026 16:42',
    empresa: 'EMPRESA ALFA',
    origem: { tipo: 'manual', por: 'Usuário Teste' },
    situacao: 'enviado',
    destinatarios: 2,
    bancos: 3,
  },
  {
    id: 'h2',
    em: '19/10/2026 09:01',
    empresa: 'EMPRESA ALFA',
    origem: { tipo: 'agendamento', nome: 'Semanal · segunda de manhã' },
    situacao: 'enviado',
    destinatarios: 2,
    bancos: 3,
  },
  {
    id: 'h3',
    em: '19/10/2026 09:01',
    empresa: 'EMPRESA BETA',
    origem: { tipo: 'agendamento', nome: 'Semanal · segunda de manhã' },
    situacao: 'enviado',
    destinatarios: 1,
    bancos: 1,
  },
  {
    id: 'h4',
    em: '19/10/2026 09:02',
    empresa: 'EMPRESA GAMA',
    origem: { tipo: 'agendamento', nome: 'Semanal · segunda de manhã' },
    situacao: 'falhou',
    destinatarios: 3,
    bancos: 2,
    erro: 'O serviço de e-mail não respondeu em 60 s (3 tentativas).',
  },
  {
    id: 'h5',
    em: '19/10/2026 09:02',
    empresa: 'EMPRESA DELTA',
    origem: { tipo: 'agendamento', nome: 'Semanal · segunda de manhã' },
    situacao: 'pulado',
    destinatarios: 0,
    bancos: 1,
    erro: 'Sem contato com a finalidade Saldo Parcial.',
  },
  {
    id: 'h6',
    em: '15/10/2026 08:00',
    empresa: 'EMPRESA ÉPSILON',
    origem: { tipo: 'agendamento', nome: 'Quinzenal' },
    situacao: 'enviado',
    destinatarios: 1,
    bancos: 2,
  },
  {
    id: 'h7',
    em: '15/10/2026 08:01',
    empresa: 'EMPRESA TETA',
    origem: { tipo: 'agendamento', nome: 'Quinzenal' },
    situacao: 'enviado',
    destinatarios: 2,
    bancos: 1,
  },
  {
    id: 'h8',
    em: '14/10/2026 11:20',
    empresa: 'EMPRESA GAMA',
    origem: { tipo: 'executar_agora', nome: 'Semanal · segunda de manhã', por: 'Usuário Teste' },
    situacao: 'pulado',
    destinatarios: 3,
    bancos: 2,
    erro: 'Já tinha recebido o Saldo Parcial hoje às 09:00.',
  },
  {
    id: 'h9',
    em: '30/09/2026 17:00',
    empresa: 'EMPRESA IOTA',
    origem: { tipo: 'agendamento', nome: 'Fim do mês' },
    situacao: 'interrompido',
    destinatarios: 1,
    bancos: 1,
    erro: 'O serviço reiniciou durante o envio; não foi reenviado.',
  },
];

/** Status do serviço de envio (sync-api) */
export const SERVICO_ENVIO_MOCK = {
  agendadorLigado: true,
  imagemConfigurada: true,
  ultimoCiclo: '21/10/2026 10:41',
};
