/** Tela De-para de Grupos */
const deParaGrupos = {
  titulo: 'De-para de Grupos',
  subtitulo:
    'Liga cada grupo de atendimento do Aranda ao Grupo do Book e ao módulo, que decide o banco de cada hora.',
  novoMapeamento: 'Novo mapeamento',
  indicadores: {
    mapeados: 'Grupos mapeados',
    comModulo: 'Com módulo',
    semModulo: 'Sem módulo',
    naoMapeados: 'Não mapeados com apontamentos',
  },
  abas: {
    rotulo: 'Seções',
    mapeamentos: 'Mapeamentos',
    naoMapeados: 'Grupos não mapeados',
  },
  classificacao: {
    modulo: 'Com módulo',
    produto: 'Todos os módulos',
    solucao: 'Grupo de serviço',
    nao_se_aplica: 'Não se aplica',
  },
  destino: {
    solucao: 'Solução',
    produto: 'Produto',
    modulo: 'Módulo',
    nenhumaSolucao: 'Nenhuma (não se aplica)',
    nenhumProduto: 'Nenhum (grupo de serviço)',
    todosModulos: 'Todos os módulos',
    produtoSemModulos: 'Produto sem módulos',
    servico: 'serviço',
    textoModulo:
      'Banco que cobre {{produto}} › {{modulo}} ou o produto inteiro; sem banco, o Banco padrão.',
    textoProduto: 'Banco que cobre {{produto}} inteiro; sem banco, o Banco padrão.',
    textoSolucao: 'Grupo de serviço de {{solucao}}: sempre o Banco padrão.',
    textoNenhum: 'Sempre o Banco padrão.',
  },
  lista: {
    rotulo: 'Mapeamentos',
    buscar: 'Buscar por grupo do Aranda ou do Book',
    colunaGrupo: 'Grupo do Aranda',
    colunaBook: 'Grupo do Book',
    colunaDestino: 'Solução › Produto › Módulo',
    colunaApontamentos: 'Apontamentos (6 meses)',
    colunaAlteracao: 'Última alteração',
    selecionar: 'Selecionar {{grupo}}',
    selecionarPagina: 'Selecionar os grupos desta página',
    selecionados: { um: '{{n}} selecionado', varios: '{{n}} selecionados' },
    selecionarLote: 'Selecionar para atribuir em lote',
    atribuir: 'Atribuir',
    limparSelecao: 'Limpar seleção',
    excluir: 'Excluir',
    nenhum: 'Nenhum mapeamento encontrado',
    nenhumNoFiltro: 'Nenhum grupo atende aos filtros.',
    erro: 'Não foi possível carregar o de-para',
  },
  lote: {
    titulo: { um: 'Atribuir a {{n}} grupo?', varios: 'Atribuir a {{n}} grupos?' },
    podeMover:
      'Pode mover horas entre bancos a partir do próximo recálculo; meses fechados não mudam',
    afetadas: 'Empresas com bancos múltiplos afetadas: {{empresas}}',
    nenhumaAfetada: 'Nenhuma empresa com bancos múltiplos é afetada',
    bookNaoMuda: 'O Grupo do Book não muda',
  },
  excluir: {
    titulo: 'Excluir {{grupo}}?',
    voltaNaoMapeados: 'O grupo volta para Grupos não mapeados',
    horasPadrao:
      'As horas dele vão para o Banco padrão a partir do próximo recálculo; meses fechados não mudam',
    bookDeixa: 'Book, Elogios, Pesquisas e Dashboard deixam de mostrar o Grupo do Book para ele',
  },
  naoMapeados: {
    aviso:
      'Grupos AMS que aparecem nos apontamentos ou tickets e ainda não estão no de-para. Até serem mapeados, as horas deles vão para o Banco padrão.',
    rotulo: 'Grupos não mapeados',
    colunaApontamentos: 'Apontamentos',
    colunaEmpresas: 'Empresas afetadas',
    colunaPrimeira: 'Primeiro apontamento',
    empresasCom: 'Empresas com apontamentos',
    mapear: 'Mapear',
    mapearGrupo: 'Mapear {{grupo}}',
    vazio: 'Todos os grupos com apontamentos estão mapeados',
    erro: 'Não foi possível carregar os grupos não mapeados',
  },
  edicao: {
    novo: 'Novo mapeamento',
    mapear: 'Mapear grupo',
    grupos: 'Grupos',
    grupoAranda: 'Grupo do Aranda',
    grupoBook: 'Grupo do Book',
    exatamente: 'Exatamente como vem do Aranda',
    repetido: 'Este grupo já está mapeado.',
    outroGrupo: 'Para outro grupo, crie um mapeamento novo.',
    tabelaAtual: 'Também é gravado na tabela atual, lida por Elogios, Pesquisas e Dashboard.',
    paraOnde: 'Para onde vão as horas',
    uso: 'Uso',
    usoTexto: {
      um: '{{n}} apontamento ou ticket nos últimos 6 meses',
      varios: '{{n}} apontamentos e tickets nos últimos 6 meses',
    },
    usoEmpresas: 'Empresas com bancos múltiplos: {{empresas}}.',
    impacto: 'Impacto da alteração',
    impactoBook: 'O novo Grupo do Book muda a exibição em Book, Elogios, Pesquisas e Dashboard.',
    impactoDestino:
      'As horas podem mudar de banco nas empresas com bancos múltiplos, a partir do próximo recálculo. Meses fechados não mudam.',
    confirmarTitulo: 'Salvar o mapeamento?',
    confirmarBook: 'Muda a exibição em Book, Elogios, Pesquisas e Dashboard',
    confirmarMover: 'Pode mover horas entre bancos de {{empresas}} a partir do próximo recálculo',
    confirmarNenhuma: 'Nenhuma empresa com bancos múltiplos é afetada agora',
    mesesFechados: 'Meses fechados não mudam',
  },
  dicas: {
    grupoAranda:
      'Nome do grupo de atendimento exatamente como vem do Aranda. É por ele que cada apontamento e ticket é ligado ao módulo. Único.',
    grupoBook:
      'Nome exibido no Book, em Elogios, em Pesquisas e no Dashboard. Vários grupos do Aranda podem ter o mesmo Grupo do Book.',
    solucao:
      'Solução do grupo. Sem solução, o grupo "não se aplica" (DEDICADOS, T&M…) e as horas vão sempre para o Banco padrão.',
    produto:
      'Produto do grupo. Só com a solução, sem produto, é um grupo de serviço (DBA, Técnico…): as horas vão sempre para o Banco padrão.',
    modulo:
      'Módulo do grupo. Sem módulo, as horas vão para o banco que cobre o produto inteiro ou, se não houver, para o Banco padrão.',
    paraOnde:
      'Resultado da solução, do produto e do módulo escolhidos: em que banco as horas deste grupo são consumidas nas empresas com bancos múltiplos.',
    uso: 'Apontamentos e tickets dos últimos 6 meses com este grupo e as empresas com bancos múltiplos que eles alcançam.',
  },
};

export default deParaGrupos;
