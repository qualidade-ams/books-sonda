/** Products and Modules screen */
const produtosModulos = {
  titulo: 'Products and Modules',
  subtitulo: 'Solutions contracted by the companies, with their products and modules.',
  novaSolucao: 'New solution',
  novoProduto: 'New product',
  novoModulo: 'New module',
  indicadores: {
    produtosAtivos: 'Active products',
    modulosAtivos: 'Active modules',
    gruposLigados: 'Linked Aranda groups',
    modulosSemGrupo: 'Modules without a group',
  },
  abas: {
    rotulo: 'Sections',
    catalogo: 'Solutions, products and modules',
    requerimentos: 'Requirement modules',
  },
  vazio: {
    titulo: 'No solutions registered',
    descricao:
      'Solutions are what companies contract; products and modules define what each hour bank consumes.',
  },
  erroCatalogo: 'Could not load the catalog',
  arvore: {
    carregando: 'Loading the catalog',
    navegacao: 'Solutions and products',
    produtosDe: 'Products of {{solucao}}',
    produtos: { um: '{{n}} product', varios: '{{n}} products' },
    modulos: { um: '{{n}} module', varios: '{{n}} modules' },
    semModulos: 'no modules',
    semGrupo: '{{n}} without a group',
    modulosSemGrupo: {
      um: '{{n}} module without a group',
      varios: '{{n}} modules without a group',
    },
    aClassificar: '{{n}} to classify',
  },
  solucao: {
    rotulo: 'Solution',
    editar: 'Edit solution',
    colunaProduto: 'Product',
    colunaModulos: 'Modules',
    colunaGrupos: 'Product groups',
    colunaUso: 'Used in banks',
    semModulos: 'No modules',
    nenhumProduto: 'No products in this solution',
    gruposServico: 'Service groups',
    nenhumGrupoServico: 'No service groups in this solution.',
    horasServico: "Hours from service groups always go to the company's default bank.",
    gruposLigadosA: 'Groups linked to the whole {{produto}}',
  },
  produto: {
    editar: 'Edit product',
    semDescricao: 'No description',
    gruposDoProduto: { um: '{{n}} product group', varios: '{{n}} product groups' },
    nenhumGrupoProduto: 'no group linked to the whole product',
    semModulosTitulo: 'Product without modules',
    semModulosDescricao:
      'Aranda groups link directly to the product, and the bank scope marks the whole product. Register modules only if a bank needs to cover part of the product.',
    verGrupos: 'See product groups',
    buscar: 'Search module or Aranda group',
    filtroSemGrupo: 'Without Aranda group',
    colunaModulo: 'Module',
    colunaGrupos: 'Aranda groups',
    colunaUso: 'Used in banks',
    gruposEm: 'Aranda groups in {{modulo}}',
    erroModulos: 'Could not load the modules',
    nenhumModulo: 'No modules found',
    nenhumNoFiltro: 'No module matches the filters.',
    modulosDe: 'Modules of {{produto}}',
    moverPara: 'Move to product…',
    aClassificar:
      'Temporary product from the data load: move each module to the right product of the same solution. The empty product is deactivated automatically.',
  },
  usos: {
    titulo: 'Active banks that use it',
    produtoInteiro: 'whole product',
    nenhumProduto: 'No active bank uses this product.',
    nenhumModulo: 'No active bank uses this module.',
  },
  grupos: {
    vincular: 'Link group',
    buscar: 'Search Aranda group',
    lista: 'Aranda groups',
    nenhumEncontrado: 'No groups found.',
    desvincular: 'Unlink',
    desvincularGrupo: 'Unlink {{grupo}}',
    emModulo: 'In {{produto}} › {{modulo}}',
    emProduto: 'In {{produto}}, no module',
    servicoDe: 'Service of {{solucao}}',
    semSolucao: 'No solution (not applicable)',
    saiParaServicos: 'leaves there and comes to the services',
    saiParaCa: 'leaves there and comes here',
    podeMoverTitulo: 'May move hours between banks',
    podeMoverTexto:
      'In companies with multiple banks, hours from these groups move to another bank from the next recalculation. Closed months do not change.',
    soLeitura: 'To link Aranda groups, you need Edit permission on Group Mapping.',
  },
  requerimentos: {
    aviso:
      'Each Hour Bank requirement is linked to a bank through the Module field. Here you define which catalog product and module each value corresponds to. Without a bank covering the target, the requirement goes to the default bank, and the per-requirement adjustment is made on the Control screen.',
    titulo: 'Requirement modules',
    colunaModulo: 'Requirement module',
    colunaDestino: 'Product and module',
    produtoDe: 'Product of {{modulo}}',
    moduloDe: 'Module of {{modulo}}',
    todosModulos: 'All modules',
    erro: 'Could not load the mapping',
    vazio: 'No mapping registered',
  },
  edicao: {
    identificacao: 'Identification',
    editar: 'Edit {{nome}}',
    usadoNosBancos: 'Used in banks',
    noEscopo: 'It is in the scope of {{bancos}}; you confirm when saving.',
    noEscopoDescricao: 'It is in the scope of {{bancos}}.',
    inativarTitulo: 'Deactivate {{nome}}?',
    reativarTitulo: 'Reactivate {{nome}}?',
    semEscopoNovo: 'It no longer appears for new scopes',
    bancosNaoMudam: 'Banks that already use it do not change',
    gruposContinuam: 'Aranda groups remain linked to it',
    voltaEscopo: 'It appears again for new scopes',
    gruposDepoisDeCriar: 'Aranda groups are linked after creating.',
    solucao: {
      nova: 'New solution',
      criar: 'Create solution',
      codigo: 'Code',
      nome: 'Solution name',
      ativa: 'Active solution',
      codigoNaoMuda: 'The code does not change after it is created.',
      codigoRepetido: 'A solution with this code already exists.',
      nomeRepetido: 'A solution with this name already exists.',
      ajudaServico: 'Hours from service groups always go to the default bank.',
    },
    produto: {
      novo: 'New product',
      criar: 'Create product',
      solucao: 'Solution',
      nome: 'Product name',
      descricao: 'Product description',
      ativo: 'Active product',
      solucaoNaoMuda: "The product's solution does not change after it is created.",
      nomeRepetido: 'Product {{nome}} already exists in {{solucao}}.',
      grupos: 'Product groups',
      semGrupo:
        'No group linked to the whole product. If the product has no modules, without a group no hour reaches it.',
      ajudaGrupos: 'Use it for groups that serve the whole product, not a module.',
    },
    modulo: {
      novo: 'New module',
      criar: 'Create module',
      produto: 'Product',
      nome: 'Module name',
      descricao: 'Module description',
      ativo: 'Active module',
      produtoNaoMuda:
        'To change the product, create the module in the other one and move the groups.',
      nomeRepetido: 'Module {{nome}} already exists in {{produto}}.',
      grupos: 'Aranda groups',
      semGrupo: 'Without an Aranda group, no logged hour reaches this module.',
      ajudaGrupos:
        'A group stays in one place only. When unlinked, it stays in the product, without a module.',
    },
  },
  mover: {
    titulo: 'Move {{modulo}} to another product',
    descricao:
      'The module leaves "To classify" and goes to a product of the same solution. Aranda groups and bank scopes follow it. The change happens only once.',
    destino: 'Target product',
    confirmar: 'Move',
    nenhumDestino: 'No active product in this solution to receive the module.',
  },
  dicas: {
    codigo:
      'Solution identifier used by the system. It does not change after it is created: FISCAIS enables the FISCAL Contract for the company.',
    nomeSolucao: "Name shown on screens and in the company's contract. Unique.",
    solucaoAtiva:
      'An inactive solution does not appear for new companies. Companies that already contract it do not change.',
    gruposServico:
      'Aranda groups that serve the whole solution (DBA, Technical…), not a product. Their hours always go to the default bank.',
    solucao:
      'The company contracts solutions. The product belongs to a solution and does not change solution after it is created.',
    nomeProduto: 'Name shown in the bank scope and in the Book. Unique within the solution.',
    descricao: 'Free text, for reference only.',
    produtoAtivo:
      'An inactive product does not appear for new scopes. Banks that already use it do not change.',
    gruposProduto:
      'Aranda groups linked to the whole product, without a module. Hours go to the bank that covers the whole product; without a bank, to the default bank.',
    produto: 'Product the module belongs to. It does not change after it is created.',
    nomeModulo:
      'Module name, as it appears in the bank scope and in the Book. Unique within the product.',
    moduloAtivo:
      'An inactive module does not appear for new scopes. Banks that already use it do not change.',
    gruposAranda:
      'Aranda service groups that belong to this module. Through them each logged hour reaches the module and, from there, the bank. A group stays in one place only.',
    usadoNosBancos:
      'Active banks that have this in scope, directly or because they marked the whole product. The scope marks products and modules; the solution only groups them.',
    moduloRequerimento:
      'Value of the Module field on the Requirements screen. The list is fixed and is not edited here.',
    produtoEModulo:
      'Where Hour Bank requirements with this module go. "All modules" leads to the bank that covers the whole product; without a covering bank, they go to the default bank.',
  },
  exportar: {
    arquivo: 'products-and-modules',
    descricao: 'Exports the catalog: solutions, products and modules, active and inactive',
    colunas: {
      solucao: 'Solution',
      produto: 'Product',
      modulo: 'Module',
      descricao: 'Description',
    },
  },
  importar: {
    titulo: 'Import products and modules',
    modelo: 'products-and-modules-template',
    regras: {
      solucao: 'The solution must exist. Products and modules that do not exist are created.',
      semModulo:
        'A row without a module creates or updates only the product. An empty description does not change the existing one.',
      ordem: 'The order of the rows becomes the order of the new products and modules.',
    },
    erros: {
      solucaoVazia: 'Empty solution.',
      solucaoNaoExiste: 'Solution "{{nome}}" does not exist.',
      produtoVazio: 'Empty product.',
      repetido: 'Repeated in the spreadsheet (row {{linha}}).',
    },
  },
};

export default produtosModulos;
