/** Tela Apontamentos Retroativos (nova) */
const apontamentosRetroativos = {
  titulo: 'Retroactive Time Entries',
  subtitulo: 'Time entries posted in Aranda after the month closing, by bank.',
  situacoes: {
    pendente: 'Pending',
    aprovado: 'Awaiting correction',
    aplicado: 'Applied',
    descartado: 'Discarded',
  },
  abas: {
    rotulo: 'Status',
    pendente: 'Pending',
    aprovado: 'Awaiting correction',
    aplicado: 'Applied',
    descartado: 'Discarded',
  },
  deteccao:
    'Detection runs on every synchronization with Aranda, in the closed months of the open period of each bank.',
  buscar: 'Search company, bank, ticket or task',
  filtroEmpresa: 'Company',
  filtroConsultor: 'Consultant',
  lista: 'Retroactive time entries',
  carregando: 'Loading the retroactive time entries',
  erro: 'Could not load the retroactive time entries',
  vazio: {
    pendente: 'No pending retroactive time entry',
    pendenteDescricao: 'All closed months are up to date with Aranda.',
    outros: 'No retroactive time entry in "{{aba}}"',
    filtro: 'No retroactive time entry matches the filters',
  },
  cartao: {
    ver: 'Show the time entries of {{empresa}} · {{banco}}',
    fechar: 'Hide the time entries of {{empresa}} · {{banco}}',
    apontamentos: {
      um: '{{n}} time entry',
      varios: '{{n}} time entries',
    },
    detectadoEm: 'detected on {{data}}',
    noFechamento: 'At closing',
    comRetroativos: 'With the retroactive entries',
    diferenca: 'Difference',
    ticketsN: '{{n}} tickets',
    consultoresAvisados: 'Consultants notified',
    aprovar: 'Approve',
    descartar: 'Discard',
    aprovadoPor: 'Approved by {{nome}} on {{data}}:',
    descartadoPor: 'Discarded by {{nome}} on {{data}}:',
    aplicado: 'applied in the Book correction on {{data}}',
    aguardando: 'counts when the Book of {{mes}} is corrected',
    verNoControle: 'Show {{banco}} in the Control',
    semNome: 'user without registration',
  },
  colunas: {
    chamado: 'Ticket · task',
    dataAtividade: 'Activity date',
    dataSistema: 'Posted in Aranda',
    consultor: 'Consultant',
    status: 'Ticket status',
    quantidade: 'Hours / tickets',
  },
  avisadoEm: 'notified on {{data}}',
  decidir: {
    aprovarTitulo: 'Approve the adjustment of {{empresa}} · {{banco}}?',
    descartarTitulo: 'Discard the adjustment of {{empresa}} · {{banco}}?',
    descricao: '{{mes}}: usage from {{de}} to {{para}}.',
    aprovarAguarda:
      'It awaits the correction of the Book of {{mes}}; until then, the month does not change',
    aprovarRecalcula:
      'On correction, the month and the following ones of the period are recalculated (new version, nothing is deleted)',
    descartarNaoMuda: 'The month usage does not change',
    descartarNaoVolta: 'These time entries are not detected again',
    justificativa: 'Justification',
    aprovarPlaceholder: 'E.g.: service confirmed with the client',
    descartarPlaceholder: 'E.g.: consultant will repost in the current month',
  },
};

export default apontamentosRetroativos;
