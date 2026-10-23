/** Business Sectors screen */
const ramosAtividade = {
  titulo: 'Business Sectors',
  subtitulo: 'Client segments, used in the business sector and secondary sector of companies.',
  indicadores: {
    ativos: 'Active sectors',
    inativos: 'Inactive',
    comRamo: 'Companies with sector',
    semRamo: 'Companies without sector',
  },
  lista: {
    titulo: 'Business sectors',
    novo: 'New sector',
    novoPlaceholder: 'New sector (e.g.: Agribusiness)',
    incluir: 'Add',
    buscar: 'Search sector',
    digiteNome: 'Type the sector name.',
    repetido: 'A sector with this name already exists.',
    carregando: 'Loading the sectors',
    erro: 'Could not load the sectors',
    vazioTitulo: 'No sector registered',
    vazioDescricao:
      'Register the list before the business sector becomes required when editing companies.',
    nenhumEncontrado: 'No sector found',
  },
  linha: {
    renomear: 'Rename',
    novoNome: 'New name for {{nome}}',
    enterAplica: 'Enter to apply, Esc to undo.',
    aoSalvarNome: 'When saved, the new name shows in the {{empresas}} that use this sector.',
    uso: '{{principal}} as main · {{secundario}} as secondary',
    nenhumaEmpresa: 'No company uses it',
    excluir: 'Delete',
    emUso: 'In use: inactivate instead of deleting',
    limpeParaReordenar: 'Clear the search and filters to reorder',
  },
  selo: {
    novo: 'New',
    alterado: 'Changed',
    inativado: 'Will be inactivated',
    reativado: 'Will be reactivated',
  },
  empresas: { um: '{{n}} company', varios: '{{n}} companies' },
  mudancas: {
    incluidos: { um: '{{n}} sector added', varios: '{{n}} sectors added' },
    renomeados: { um: '{{n}} renamed', varios: '{{n}} renamed' },
    inativados: { um: '{{n}} inactivated', varios: '{{n}} inactivated' },
    reativados: { um: '{{n}} reactivated', varios: '{{n}} reactivated' },
    excluidos: { um: '{{n}} deleted', varios: '{{n}} deleted' },
    ordem: 'order changed',
    naoSalvo: 'not saved yet',
  },
  confirmar: {
    titulo: 'Save the business sectors?',
    inativados: {
      um: '{{nomes}} is no longer offered as an option',
      varios: '{{nomes}} are no longer offered as options',
    },
    inativadosEmUso: {
      um: '{{nomes}} is no longer offered as an option, but stays in the {{empresas}} that already use it',
      varios:
        '{{nomes}} are no longer offered as options, but stay in the {{empresas}} that already use them',
    },
    renomeados: 'The new name shows in the {{empresas}} affected',
    excluidos: 'Permanently deleted: {{nomes}}',
  },
  dicas: {
    ramos:
      'List used in the Business sector (required) and Secondary sector (optional) of companies, in the order of this screen. Drag to change the order. Changes only apply after saving.',
  },
};

export default ramosAtividade;
