/** Pantalla Productos y Módulos */
const produtosModulos = {
  titulo: 'Productos y Módulos',
  subtitulo: 'Soluciones contratadas por las empresas, con sus productos y módulos.',
  novaSolucao: 'Nueva solución',
  novoProduto: 'Nuevo producto',
  novoModulo: 'Nuevo módulo',
  indicadores: {
    produtosAtivos: 'Productos activos',
    modulosAtivos: 'Módulos activos',
    gruposLigados: 'Grupos de Aranda vinculados',
    modulosSemGrupo: 'Módulos sin grupo',
  },
  abas: {
    rotulo: 'Secciones',
    catalogo: 'Soluciones, productos y módulos',
    requerimentos: 'Módulos de requerimiento',
  },
  vazio: {
    titulo: 'Ninguna solución registrada',
    descricao:
      'Las soluciones son lo que contratan las empresas; los productos y módulos definen lo que consume cada banco de horas.',
  },
  erroCatalogo: 'No fue posible cargar el catálogo',
  arvore: {
    carregando: 'Cargando el catálogo',
    navegacao: 'Soluciones y productos',
    produtosDe: 'Productos de {{solucao}}',
    produtos: { um: '{{n}} producto', varios: '{{n}} productos' },
    modulos: { um: '{{n}} módulo', varios: '{{n}} módulos' },
    semModulos: 'sin módulos',
    semGrupo: '{{n}} sin grupo',
    modulosSemGrupo: { um: '{{n}} módulo sin grupo', varios: '{{n}} módulos sin grupo' },
    aClassificar: '{{n}} por clasificar',
  },
  solucao: {
    rotulo: 'Solución',
    editar: 'Editar solución',
    colunaProduto: 'Producto',
    colunaModulos: 'Módulos',
    colunaGrupos: 'Grupos del producto',
    colunaUso: 'Usado en los bancos',
    semModulos: 'Sin módulos',
    nenhumProduto: 'Ningún producto en esta solución',
    gruposServico: 'Grupos de servicio',
    nenhumGrupoServico: 'Ningún grupo de servicio en esta solución.',
    horasServico:
      'Las horas de los grupos de servicio van siempre al Banco predeterminado de la empresa.',
    gruposLigadosA: 'Grupos vinculados a {{produto}} entero',
  },
  produto: {
    editar: 'Editar producto',
    semDescricao: 'Sin descripción',
    gruposDoProduto: { um: '{{n}} grupo del producto', varios: '{{n}} grupos del producto' },
    nenhumGrupoProduto: 'ningún grupo vinculado al producto entero',
    semModulosTitulo: 'Producto sin módulos',
    semModulosDescricao:
      'Los grupos de Aranda se vinculan directo al producto, y el alcance de los bancos marca el producto entero. Registre módulos solo si un banco necesita cubrir parte del producto.',
    verGrupos: 'Ver grupos del producto',
    buscar: 'Buscar módulo o grupo de Aranda',
    filtroSemGrupo: 'Sin grupo de Aranda',
    colunaModulo: 'Módulo',
    colunaGrupos: 'Grupos de Aranda',
    colunaUso: 'Usado en los bancos',
    gruposEm: 'Grupos de Aranda en {{modulo}}',
    erroModulos: 'No fue posible cargar los módulos',
    nenhumModulo: 'Ningún módulo encontrado',
    nenhumNoFiltro: 'Ningún módulo cumple los filtros.',
    modulosDe: 'Módulos de {{produto}}',
    moverPara: 'Mover a producto…',
    aClassificar:
      'Producto provisional de la carga: mueva cada módulo al producto correcto de la misma solución. El producto vacío se desactiva solo.',
  },
  usos: {
    titulo: 'Bancos activos que lo usan',
    produtoInteiro: 'producto entero',
    nenhumProduto: 'Ningún banco activo usa este producto.',
    nenhumModulo: 'Ningún banco activo usa este módulo.',
  },
  grupos: {
    vincular: 'Vincular grupo',
    buscar: 'Buscar grupo de Aranda',
    lista: 'Grupos de Aranda',
    nenhumEncontrado: 'Ningún grupo encontrado.',
    desvincular: 'Desvincular',
    desvincularGrupo: 'Desvincular {{grupo}}',
    emModulo: 'En {{produto}} › {{modulo}}',
    emProduto: 'En {{produto}}, sin módulo',
    servicoDe: 'Servicio de {{solucao}}',
    semSolucao: 'Sin solución (no se aplica)',
    saiParaServicos: 'sale de allí y viene a los servicios',
    saiParaCa: 'sale de allí y viene aquí',
    podeMoverTitulo: 'Puede mover horas entre bancos',
    podeMoverTexto:
      'En las empresas con varios bancos, las horas de estos grupos pasan a otro banco a partir del próximo recálculo. Los meses cerrados no cambian.',
    soLeitura: 'Para vincular grupos de Aranda, se necesita Edición en De-para de Grupos.',
  },
  requerimentos: {
    aviso:
      'Cada requerimiento de Banco de Horas se vincula a un banco por el campo Módulo. Aquí se define a qué producto y módulo del catálogo corresponde cada valor. Sin un banco que cubra el destino, el requerimiento va al Banco predeterminado, y el ajuste por requerimiento se hace en la pantalla de Control.',
    titulo: 'Módulos de requerimiento',
    colunaModulo: 'Módulo del requerimiento',
    colunaDestino: 'Producto y módulo',
    produtoDe: 'Producto de {{modulo}}',
    moduloDe: 'Módulo de {{modulo}}',
    todosModulos: 'Todos los módulos',
    erro: 'No fue posible cargar la correspondencia',
    vazio: 'Ninguna correspondencia registrada',
  },
  edicao: {
    identificacao: 'Identificación',
    editar: 'Editar {{nome}}',
    usadoNosBancos: 'Usado en los bancos',
    noEscopo: 'Está en el alcance de {{bancos}}; usted confirma al guardar.',
    noEscopoDescricao: 'Está en el alcance de {{bancos}}.',
    inativarTitulo: '¿Desactivar {{nome}}?',
    reativarTitulo: '¿Reactivar {{nome}}?',
    semEscopoNovo: 'Deja de aparecer para alcances nuevos',
    bancosNaoMudam: 'Los bancos que ya lo usan no cambian',
    gruposContinuam: 'Los grupos de Aranda siguen vinculados a él',
    voltaEscopo: 'Vuelve a aparecer para alcances nuevos',
    gruposDepoisDeCriar: 'Los grupos de Aranda se vinculan después de crear.',
    solucao: {
      nova: 'Nueva solución',
      criar: 'Crear solución',
      codigo: 'Código',
      nome: 'Nombre de la solución',
      ativa: 'Solución activa',
      codigoNaoMuda: 'El código no cambia después de creado.',
      codigoRepetido: 'Ya existe una solución con este código.',
      nomeRepetido: 'Ya existe una solución con este nombre.',
      ajudaServico: 'Las horas de los grupos de servicio van siempre al Banco predeterminado.',
    },
    produto: {
      novo: 'Nuevo producto',
      criar: 'Crear producto',
      solucao: 'Solución',
      nome: 'Nombre del producto',
      descricao: 'Descripción del producto',
      ativo: 'Producto activo',
      solucaoNaoMuda: 'La solución del producto no cambia después de creado.',
      nomeRepetido: 'Ya existe el producto {{nome}} en {{solucao}}.',
      grupos: 'Grupos del producto',
      semGrupo:
        'Ningún grupo vinculado al producto entero. Si el producto no tiene módulos, sin grupo ninguna hora llega a él.',
      ajudaGrupos: 'Úselo para grupos que atienden todo el producto, sin ser de un módulo.',
    },
    modulo: {
      novo: 'Nuevo módulo',
      criar: 'Crear módulo',
      produto: 'Producto',
      nome: 'Nombre del módulo',
      descricao: 'Descripción del módulo',
      ativo: 'Módulo activo',
      produtoNaoMuda: 'Para cambiar de producto, cree el módulo en el otro y mueva los grupos.',
      nomeRepetido: 'Ya existe un módulo {{nome}} en {{produto}}.',
      grupos: 'Grupos de Aranda',
      semGrupo: 'Sin grupo de Aranda, ninguna hora registrada llega a este módulo.',
      ajudaGrupos:
        'Un grupo queda en un solo lugar. Desvinculado, queda en el producto, sin módulo.',
    },
  },
  mover: {
    titulo: 'Mover {{modulo}} a otro producto',
    descricao:
      'El módulo sale de "Por clasificar" y va a un producto de la misma solución. Los grupos de Aranda y los alcances de los bancos lo acompañan. El cambio ocurre una sola vez.',
    destino: 'Producto de destino',
    confirmar: 'Mover',
    nenhumDestino: 'Ningún producto activo en esta solución para recibir el módulo.',
  },
  dicas: {
    codigo:
      'Identificador de la solución usado por el sistema. No cambia después de creado: FISCAIS habilita el Contrato FISCAL en la empresa.',
    nomeSolucao: 'Nombre mostrado en las pantallas y en el contrato de la empresa. Único.',
    solucaoAtiva:
      'Una solución inactiva no aparece para empresas nuevas. Las empresas que ya la contratan no cambian.',
    gruposServico:
      'Grupos de Aranda que atienden toda la solución (DBA, Técnico…), sin ser de un producto. Sus horas van siempre al Banco predeterminado.',
    solucao:
      'La empresa contrata soluciones. El producto pertenece a una solución y no cambia de solución después de creado.',
    nomeProduto: 'Nombre mostrado en el alcance de los bancos y en el Book. Único en la solución.',
    descricao: 'Texto libre, solo para consulta.',
    produtoAtivo:
      'Un producto inactivo no aparece para alcances nuevos. Los bancos que ya lo usan no cambian.',
    gruposProduto:
      'Grupos de Aranda vinculados al producto entero, sin módulo. Las horas van al banco que cubre el producto entero; sin banco, al Banco predeterminado.',
    produto: 'Producto al que pertenece el módulo. No cambia después de creado.',
    nomeModulo:
      'Nombre del módulo, como aparece en el alcance de los bancos y en el Book. Único en el producto.',
    moduloAtivo:
      'Un módulo inactivo no aparece para alcances nuevos. Los bancos que ya lo usan no cambian.',
    gruposAranda:
      'Grupos de atención de Aranda que pertenecen a este módulo. Por ellos cada hora registrada llega al módulo y, de ahí, al banco. Un grupo queda en un solo lugar.',
    usadoNosBancos:
      'Bancos activos que tienen esto en el alcance, directamente o por haber marcado el producto entero. El alcance marca productos y módulos; la solución solo agrupa.',
    moduloRequerimento:
      'Valor del campo Módulo en la pantalla de Requerimientos. La lista es fija y no se edita aquí.',
    produtoEModulo:
      'A dónde van los requerimientos de Banco de Horas con este módulo. "Todos los módulos" lleva al banco que cubre el producto entero; sin banco que lo cubra, van al Banco predeterminado.',
  },
};

export default produtosModulos;
