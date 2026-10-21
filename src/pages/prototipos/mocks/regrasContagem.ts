// Dados do protótipo de Regras de contagem (DS v2). Os códigos são a carga canônica da Fase 2
// (codigos_resolucao_banco, RC-65), valores de configuração do Aranda que não identificam clientes;
// as contagens e os códigos "sem regra" são fictícios. Arquivo gerado a partir da migration 7.

/** Tabela `codigos_resolucao_banco` (Fase 2), com o uso que a tela mostra */
export interface CodigoResolucaoMock {
  /** Valor exato do Aranda: variações de espaço são códigos distintos */
  codigo: string;
  contaHoras: boolean;
  contaTickets: boolean;
  /** Apontamentos e tickets AMS dos últimos 6 meses com este código */
  apontamentos6m: number;
  tickets6m: number;
}

/** Código que aparece nos apontamentos ou tickets AMS e não está na lista: não conta no banco */
export interface CodigoSemRegraMock {
  codigo: string;
  apontamentos6m: number;
  tickets6m: number;
  primeiraOcorrencia: string; // DD/MM/AAAA
}

export const CODIGOS_RESOLUCAO_MOCK: CodigoResolucaoMock[] = [
  { codigo: 'Alocação', contaHoras: true, contaTickets: true, apontamentos6m: 807, tickets6m: 103 },
  {
    codigo: 'Alocação (Banco=S |SLA=N)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 225,
    tickets6m: 12,
  },
  {
    codigo: 'Alocação (Banco=S| SLA=N)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 683,
    tickets6m: 199,
  },
  {
    codigo: 'Alocação - T&M',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 67,
    tickets6m: 206,
  },
  {
    codigo: 'Alocação T&M',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 131,
    tickets6m: 155,
  },
  {
    codigo: 'Alocação - T&M Banco de Horas (Banco=S |SLA=N)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 290,
    tickets6m: 227,
  },
  {
    codigo: 'Alocação - T&M (Banco=S| SLA=N)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 42,
    tickets6m: 72,
  },
  { codigo: 'AMS SAP', contaHoras: true, contaTickets: true, apontamentos6m: 566, tickets6m: 132 },
  {
    codigo: 'AMS SAP (Banco=S |SLA=S)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 61,
    tickets6m: 85,
  },
  {
    codigo: 'AMS SAP (Banco=S| SLA=S)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 519,
    tickets6m: 272,
  },
  {
    codigo: 'Aplicação de Nota / Licença - Contratados',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 19,
    tickets6m: 218,
  },
  {
    codigo: 'Aplicação de Nota / Licença (Banco=S |SLA=N)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 607,
    tickets6m: 0,
  },
  {
    codigo: 'Consultoria',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 238,
    tickets6m: 75,
  },
  {
    codigo: 'Consultoria (Banco=S |SLA=S)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 136,
    tickets6m: 213,
  },
  {
    codigo: 'Consultoria (Banco=S| SLA=S)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 594,
    tickets6m: 100,
  },
  {
    codigo: 'Consultoria - Banco de Dados',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 774,
    tickets6m: 61,
  },
  {
    codigo: 'Consultoria - Banco de Dados (Banco=S |SLA=S)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 78,
    tickets6m: 12,
  },
  {
    codigo: 'Consultoria - Banco de Dados (Banco=S| SLA=S)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 536,
    tickets6m: 199,
  },
  {
    codigo: 'Consultoria - Nota Publicada',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 152,
    tickets6m: 287,
  },
  {
    codigo: 'Consultoria - Nota Publicada (Banco=S |SLA=S)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 258,
    tickets6m: 38,
  },
  {
    codigo: 'Consultoria - Nota Publicada (Banco=S| SLA=S)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 716,
    tickets6m: 225,
  },
  {
    codigo: 'Consultoria - Solução Paliativa',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 829,
    tickets6m: 47,
  },
  {
    codigo: 'Consultoria - Solução Paliativa (Banco=S |SLA=S)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 858,
    tickets6m: 289,
  },
  {
    codigo: 'Consultoria - Solução Paliativa (Banco=S| SLA=S)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 343,
    tickets6m: 176,
  },
  { codigo: 'Dúvida', contaHoras: true, contaTickets: true, apontamentos6m: 556, tickets6m: 41 },
  {
    codigo: 'Dúvida (Banco=S |SLA=N)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 414,
    tickets6m: 74,
  },
  {
    codigo: 'Erro de classificação na abertura',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 734,
    tickets6m: 37,
  },
  {
    codigo: 'Erro de classificação na abertura (Banco=S |SLA=N)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 36,
    tickets6m: 145,
  },
  {
    codigo: 'Erro de classificação na abertura (Banco=S| SLA=N)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 494,
    tickets6m: 32,
  },
  {
    codigo: 'Erro de programa especifico (SEM SLA)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 189,
    tickets6m: 72,
  },
  {
    codigo: 'Erro de programa especifico (Banco=S |SLA=N)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 839,
    tickets6m: 260,
  },
  {
    codigo: 'Erro de programa especifico (Banco=S| SLA=N)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 397,
    tickets6m: 147,
  },
  {
    codigo: 'Levantamento de Versão / Orçamento',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 132,
    tickets6m: 105,
  },
  {
    codigo: 'Levantamento de Versão / Orçamento (Banco=S |SLA=N)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 219,
    tickets6m: 248,
  },
  {
    codigo: 'Levantamento de Versão /Orçamento (Banco=S |SLA=N)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 539,
    tickets6m: 292,
  },
  {
    codigo: 'Monitoramento DBA',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 785,
    tickets6m: 199,
  },
  {
    codigo: 'Monitoramento DBA (Banco=S |SLA=N)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 455,
    tickets6m: 48,
  },
  {
    codigo: 'Nota Publicada',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 170,
    tickets6m: 83,
  },
  {
    codigo: 'Nota Publicada (Banco=S |SLA=N)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 778,
    tickets6m: 128,
  },
  {
    codigo: 'Nota Publicada (Banco=S| SLA=N)',
    contaHoras: true,
    contaTickets: false,
    apontamentos6m: 336,
    tickets6m: 15,
  },
  {
    codigo: 'Parametrização / Cadastro',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 236,
    tickets6m: 29,
  },
  {
    codigo: 'Parametrização / Cadastro (Banco=S |SLA=N)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 653,
    tickets6m: 226,
  },
  {
    codigo: 'Parametrização / Funcionalidade',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 668,
    tickets6m: 91,
  },
  {
    codigo: 'Parametrização / Funcionalidade (Banco=S |SLA=N)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 161,
    tickets6m: 47,
  },
  {
    codigo: 'Parametrização / Funcionalidade (Banco=S| SLA=N)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 619,
    tickets6m: 234,
  },
  {
    codigo: 'Validação de Arquivo',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 873,
    tickets6m: 154,
  },
  {
    codigo: 'Validação de Arquivo (Banco=S |SLA=N)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 637,
    tickets6m: 30,
  },
  {
    codigo: 'Validação de Arquivo (Banco=S| SLA=N)',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 195,
    tickets6m: 217,
  },
];

export const CODIGOS_SEM_REGRA_MOCK: CodigoSemRegraMock[] = [
  {
    codigo: 'Treinamento (Banco=N |SLA=N)',
    apontamentos6m: 34,
    tickets6m: 6,
    primeiraOcorrencia: '03/05/2026',
  },
  {
    codigo: 'Cancelado pelo solicitante',
    apontamentos6m: 0,
    tickets6m: 12,
    primeiraOcorrencia: '11/06/2026',
  },
  {
    codigo: 'Melhoria (Banco=N |SLA=S)',
    apontamentos6m: 21,
    tickets6m: 3,
    primeiraOcorrencia: '28/08/2026',
  },
];

/**
 * Filtros que hoje estão fixos em bancos_horas_consumo_itens (RC-61 a RC-64) e passam a ser
 * configuração (decisão de separação dos setores, 16/10/2026).
 */
export interface FiltrosContagemMock {
  /** caso_grupo / nome_grupo contém um destes textos (sem diferenciar maiúsculas) */
  gruposQueContam: string[];
  /** apontamentos_aranda.tipo_chamado */
  tiposChamado: { valor: string; rotulo: string; conta: boolean }[];
  /** apontamentos_aranda.ativi_interna = 'Sim' não conta */
  ignorarAtividadeInterna: boolean;
  /** item_configuracao igual a um destes não conta (apontamentos e tickets) */
  itensExcluidos: string[];
  /** apontamentos_tickets_aranda.status = 'Closed', pela data de fechamento */
  soTicketsFechados: boolean;
}

export const FILTROS_CONTAGEM_MOCK: FiltrosContagemMock = {
  gruposQueContam: ['AMS APL', 'AMS - APL', 'AMS - ATENDIMENTO', 'AMS T&M'],
  tiposChamado: [
    { valor: 'IM', rotulo: 'IM · Incidente', conta: true },
    { valor: 'RF', rotulo: 'RF · Solicitação', conta: true },
    { valor: 'PM', rotulo: 'PM · Problema', conta: true },
  ],
  ignorarAtividadeInterna: true,
  itensExcluidos: ['000000 - PROJETOS APL'],
  soTicketsFechados: true,
};
