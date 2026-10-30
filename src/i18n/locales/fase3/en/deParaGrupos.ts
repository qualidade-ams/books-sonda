/** Group Mapping screen */
const deParaGrupos = {
  titulo: 'Group Mapping',
  subtitulo:
    'Links each Aranda service group to the Book Group and to the module, which decides the bank of each hour.',
  novoMapeamento: 'New mapping',
  indicadores: {
    mapeados: 'Mapped groups',
    comModulo: 'With module',
    semModulo: 'Without module',
    naoMapeados: 'Unmapped with time entries',
  },
  abas: {
    rotulo: 'Sections',
    mapeamentos: 'Mappings',
    naoMapeados: 'Unmapped groups',
  },
  classificacao: {
    modulo: 'With module',
    produto: 'All modules',
    solucao: 'Service group',
    nao_se_aplica: 'Not applicable',
  },
  destino: {
    solucao: 'Solution',
    produto: 'Product',
    modulo: 'Module',
    nenhumaSolucao: 'None (not applicable)',
    nenhumProduto: 'None (service group)',
    todosModulos: 'All modules',
    produtoSemModulos: 'Product without modules',
    servico: 'service',
    textoModulo:
      'Bank that covers {{produto}} › {{modulo}} or the whole product; without a bank, the default bank.',
    textoProduto: 'Bank that covers the whole {{produto}}; without a bank, the default bank.',
    textoSolucao: 'Service group of {{solucao}}: always the default bank.',
    textoNenhum: 'Always the default bank.',
  },
  lista: {
    rotulo: 'Mappings',
    buscar: 'Search by Aranda or Book group',
    colunaGrupo: 'Aranda group',
    colunaBook: 'Book group',
    colunaDestino: 'Solution › Product › Module',
    colunaApontamentos: 'Time entries (6 months)',
    colunaAlteracao: 'Last change',
    selecionar: 'Select {{grupo}}',
    selecionarPagina: 'Select the groups on this page',
    selecionados: { um: '{{n}} selected', varios: '{{n}} selected' },
    selecionarLote: 'Select to assign in bulk',
    atribuir: 'Assign',
    limparSelecao: 'Clear selection',
    excluir: 'Delete',
    nenhum: 'No mapping found',
    nenhumNoFiltro: 'No group matches the filters.',
    erro: 'Could not load the mapping',
  },
  lote: {
    titulo: { um: 'Assign to {{n}} group?', varios: 'Assign to {{n}} groups?' },
    podeMover:
      'May move hours between banks from the next recalculation; closed months do not change',
    afetadas: 'Companies with multiple banks affected: {{empresas}}',
    nenhumaAfetada: 'No company with multiple banks is affected',
    bookNaoMuda: 'The Book Group does not change',
  },
  excluir: {
    titulo: 'Delete {{grupo}}?',
    voltaNaoMapeados: 'The group goes back to Unmapped groups',
    horasPadrao:
      'Its hours go to the default bank from the next recalculation; closed months do not change',
    bookDeixa: 'Book, Compliments, Surveys and Dashboard stop showing the Book Group for it',
  },
  naoMapeados: {
    aviso:
      'AMS groups that appear in time entries or tickets and are not in the mapping yet. Until they are mapped, their hours go to the default bank.',
    rotulo: 'Unmapped groups',
    colunaApontamentos: 'Time entries',
    colunaEmpresas: 'Companies affected',
    colunaPrimeira: 'First time entry',
    empresasCom: 'Companies with time entries',
    mapear: 'Map',
    mapearGrupo: 'Map {{grupo}}',
    vazio: 'All groups with time entries are mapped',
    erro: 'Could not load the unmapped groups',
  },
  edicao: {
    novo: 'New mapping',
    mapear: 'Map group',
    grupos: 'Groups',
    grupoAranda: 'Aranda group',
    grupoBook: 'Book group',
    exatamente: 'Exactly as it comes from Aranda',
    repetido: 'This group is already mapped.',
    outroGrupo: 'For another group, create a new mapping.',
    variosLugares:
      'This group is in more than one place. Places are changed in Products and Modules; here you change the Book Group.',
    tabelaAtual: 'Also saved in the current table, read by Compliments, Surveys and Dashboard.',
    paraOnde: 'Where the hours go',
    uso: 'Usage',
    usoTexto: {
      um: '{{n}} time entry or ticket in the last 6 months',
      varios: '{{n}} time entries and tickets in the last 6 months',
    },
    usoEmpresas: 'Companies with multiple banks: {{empresas}}.',
    impacto: 'Impact of the change',
    impactoBook: 'The new Book Group changes what Book, Compliments, Surveys and Dashboard show.',
    impactoDestino:
      'Hours may change bank in companies with multiple banks, from the next recalculation. Closed months do not change.',
    confirmarTitulo: 'Save the mapping?',
    confirmarBook: 'Changes what Book, Compliments, Surveys and Dashboard show',
    confirmarMover: 'May move hours between banks of {{empresas}} from the next recalculation',
    confirmarNenhuma: 'No company with multiple banks is affected now',
    mesesFechados: 'Closed months do not change',
  },
  dicas: {
    grupoAranda:
      'Name of the service group exactly as it comes from Aranda. It is how each time entry and ticket is linked to the module. Unique.',
    grupoBook:
      'Name shown in the Book, Compliments, Surveys and Dashboard. Several Aranda groups can share the same Book Group.',
    solucao:
      'Solution of the group. Without a solution, the group is "not applicable" (DEDICATED, T&M…) and its hours always go to the default bank.',
    produto:
      'Product of the group. With only the solution and no product, it is a service group (DBA, Technical…): its hours always go to the default bank.',
    modulo:
      'Module of the group. Without a module, the hours go to the bank that covers the whole product or, if there is none, to the default bank.',
    paraOnde:
      'Result of the chosen solution, product and module: which bank consumes the hours of this group in companies with multiple banks.',
    uso: 'Time entries and tickets of the last 6 months with this group and the companies with multiple banks they reach.',
  },
  exportar: {
    arquivo: 'group-mapping',
    descricao: {
      um: 'Exports {{n}} mapping, with the filters applied',
      varios: 'Exports {{n}} mappings, with the filters applied',
    },
    tickets: 'Tickets (6 months)',
    outrosLugares: 'Other places',
  },
  importar: {
    titulo: 'Import mappings',
    modelo: 'group-mapping-template',
    regras: {
      grupo:
        'The group is found by its Aranda name (case-insensitive); if already mapped, the row updates the mapping.',
      destino:
        'Without a product, the group is a service group of the solution; without a solution, "not applicable". Both go to the default bank.',
      catalogo: 'Solution, product and module must exist and be active in Products and Modules.',
    },
    aviso: {
      titulo: 'May move hours between banks',
      texto:
        "Rows that change a group's product or module change the bank of the hours in companies with multiple banks, from the next recalculation. Closed months do not change.",
    },
    erros: {
      grupoVazio: 'Empty Aranda group.',
      bookVazio: 'Empty Book group.',
      solucaoNaoExiste: 'Solution "{{nome}}" does not exist or is inactive.',
      produtoSemSolucao: "Enter the product's solution.",
      produtoNaoExiste: 'Product "{{nome}}" does not exist in {{solucao}} or is inactive.',
      moduloSemProduto: "Enter the module's product.",
      moduloNaoExiste: 'Module "{{nome}}" does not exist in {{produto}} or is inactive.',
      repetido: 'Group repeated in the spreadsheet (row {{linha}}).',
    },
  },
};

export default deParaGrupos;
