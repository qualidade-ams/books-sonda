/** Pantalla Correspondencia de Grupos */
const deParaGrupos = {
  titulo: 'Correspondencia de Grupos',
  subtitulo:
    'Vincula cada grupo de atención de Aranda al Grupo del Book y al módulo, que define el banco de cada hora.',
  novoMapeamento: 'Nueva correspondencia',
  indicadores: {
    mapeados: 'Grupos mapeados',
    comModulo: 'Con módulo',
    semModulo: 'Sin módulo',
    naoMapeados: 'No mapeados con registros',
  },
  abas: {
    rotulo: 'Secciones',
    mapeamentos: 'Correspondencias',
    naoMapeados: 'Grupos no mapeados',
  },
  classificacao: {
    modulo: 'Con módulo',
    produto: 'Todos los módulos',
    solucao: 'Grupo de servicio',
    nao_se_aplica: 'No aplica',
  },
  destino: {
    solucao: 'Solución',
    produto: 'Producto',
    modulo: 'Módulo',
    nenhumaSolucao: 'Ninguna (no aplica)',
    nenhumProduto: 'Ninguno (grupo de servicio)',
    todosModulos: 'Todos los módulos',
    produtoSemModulos: 'Producto sin módulos',
    servico: 'servicio',
    textoModulo:
      'Banco que cubre {{produto}} › {{modulo}} o el producto completo; sin banco, el Banco predeterminado.',
    textoProduto: 'Banco que cubre {{produto}} completo; sin banco, el Banco predeterminado.',
    textoSolucao: 'Grupo de servicio de {{solucao}}: siempre el Banco predeterminado.',
    textoNenhum: 'Siempre el Banco predeterminado.',
  },
  lista: {
    rotulo: 'Correspondencias',
    buscar: 'Buscar por grupo de Aranda o del Book',
    colunaGrupo: 'Grupo de Aranda',
    colunaBook: 'Grupo del Book',
    colunaDestino: 'Solución › Producto › Módulo',
    colunaApontamentos: 'Registros (6 meses)',
    colunaAlteracao: 'Último cambio',
    selecionar: 'Seleccionar {{grupo}}',
    selecionarPagina: 'Seleccionar los grupos de esta página',
    selecionados: { um: '{{n}} seleccionado', varios: '{{n}} seleccionados' },
    selecionarLote: 'Seleccionar para asignar en lote',
    atribuir: 'Asignar',
    limparSelecao: 'Limpiar selección',
    excluir: 'Eliminar',
    nenhum: 'No se encontró ninguna correspondencia',
    nenhumNoFiltro: 'Ningún grupo cumple los filtros.',
    erro: 'No fue posible cargar la correspondencia',
  },
  lote: {
    titulo: { um: '¿Asignar a {{n}} grupo?', varios: '¿Asignar a {{n}} grupos?' },
    podeMover:
      'Puede mover horas entre bancos a partir del próximo recálculo; los meses cerrados no cambian',
    afetadas: 'Empresas con múltiples bancos afectadas: {{empresas}}',
    nenhumaAfetada: 'Ninguna empresa con múltiples bancos se ve afectada',
    bookNaoMuda: 'El Grupo del Book no cambia',
  },
  excluir: {
    titulo: '¿Eliminar {{grupo}}?',
    voltaNaoMapeados: 'El grupo vuelve a Grupos no mapeados',
    horasPadrao:
      'Sus horas van al Banco predeterminado a partir del próximo recálculo; los meses cerrados no cambian',
    bookDeixa: 'Book, Elogios, Encuestas y Dashboard dejan de mostrar el Grupo del Book para él',
  },
  naoMapeados: {
    aviso:
      'Grupos AMS que aparecen en los registros o tickets y aún no están en la correspondencia. Hasta que se mapeen, sus horas van al Banco predeterminado.',
    rotulo: 'Grupos no mapeados',
    colunaApontamentos: 'Registros',
    colunaEmpresas: 'Empresas afectadas',
    colunaPrimeira: 'Primer registro',
    empresasCom: 'Empresas con registros',
    mapear: 'Mapear',
    mapearGrupo: 'Mapear {{grupo}}',
    vazio: 'Todos los grupos con registros están mapeados',
    erro: 'No fue posible cargar los grupos no mapeados',
  },
  edicao: {
    novo: 'Nueva correspondencia',
    mapear: 'Mapear grupo',
    grupos: 'Grupos',
    grupoAranda: 'Grupo de Aranda',
    grupoBook: 'Grupo del Book',
    exatamente: 'Exactamente como viene de Aranda',
    repetido: 'Este grupo ya está mapeado.',
    outroGrupo: 'Para otro grupo, cree una correspondencia nueva.',
    tabelaAtual: 'También se guarda en la tabla actual, leída por Elogios, Encuestas y Dashboard.',
    paraOnde: 'A dónde van las horas',
    uso: 'Uso',
    usoTexto: {
      um: '{{n}} registro o ticket en los últimos 6 meses',
      varios: '{{n}} registros y tickets en los últimos 6 meses',
    },
    usoEmpresas: 'Empresas con múltiples bancos: {{empresas}}.',
    impacto: 'Impacto del cambio',
    impactoBook:
      'El nuevo Grupo del Book cambia lo que muestran Book, Elogios, Encuestas y Dashboard.',
    impactoDestino:
      'Las horas pueden cambiar de banco en las empresas con múltiples bancos, a partir del próximo recálculo. Los meses cerrados no cambian.',
    confirmarTitulo: '¿Guardar la correspondencia?',
    confirmarBook: 'Cambia lo que muestran Book, Elogios, Encuestas y Dashboard',
    confirmarMover: 'Puede mover horas entre bancos de {{empresas}} a partir del próximo recálculo',
    confirmarNenhuma: 'Ninguna empresa con múltiples bancos se ve afectada ahora',
    mesesFechados: 'Los meses cerrados no cambian',
  },
  dicas: {
    grupoAranda:
      'Nombre del grupo de atención exactamente como viene de Aranda. Por él cada registro y ticket se vincula al módulo. Único.',
    grupoBook:
      'Nombre que se muestra en el Book, Elogios, Encuestas y Dashboard. Varios grupos de Aranda pueden tener el mismo Grupo del Book.',
    solucao:
      'Solución del grupo. Sin solución, el grupo "no aplica" (DEDICADOS, T&M…) y sus horas van siempre al Banco predeterminado.',
    produto:
      'Producto del grupo. Solo con la solución, sin producto, es un grupo de servicio (DBA, Técnico…): sus horas van siempre al Banco predeterminado.',
    modulo:
      'Módulo del grupo. Sin módulo, las horas van al banco que cubre el producto completo o, si no hay, al Banco predeterminado.',
    paraOnde:
      'Resultado de la solución, el producto y el módulo elegidos: en qué banco se consumen las horas de este grupo en las empresas con múltiples bancos.',
    uso: 'Registros y tickets de los últimos 6 meses con este grupo y las empresas con múltiples bancos que alcanzan.',
  },
  exportar: {
    arquivo: 'mapeo-de-grupos',
    descricao: {
      um: 'Exporta {{n}} mapeo, con los filtros aplicados',
      varios: 'Exporta {{n}} mapeos, con los filtros aplicados',
    },
    tickets: 'Tickets (6 meses)',
  },
  importar: {
    titulo: 'Importar mapeos',
    modelo: 'modelo-mapeo-de-grupos',
    regras: {
      grupo:
        'El grupo se encuentra por el nombre de Aranda (sin distinguir mayúsculas); si ya está mapeado, la fila actualiza el mapeo.',
      destino:
        'Sin producto, el grupo es de servicio de la solución; sin solución, "no aplica". Ambos van al Banco predeterminado.',
      catalogo: 'Solución, producto y módulo deben existir y estar activos en Productos y Módulos.',
    },
    aviso: {
      titulo: 'Puede mover horas entre bancos',
      texto:
        'Las filas que cambian el producto o el módulo de un grupo cambian el banco de las horas en las empresas con bancos múltiples, a partir del próximo recálculo. Los meses cerrados no cambian.',
    },
    erros: {
      grupoVazio: 'Grupo de Aranda vacío.',
      bookVazio: 'Grupo del Book vacío.',
      solucaoNaoExiste: 'La solución "{{nome}}" no existe o está inactiva.',
      produtoSemSolucao: 'Informe la solución del producto.',
      produtoNaoExiste: 'El producto "{{nome}}" no existe en {{solucao}} o está inactivo.',
      moduloSemProduto: 'Informe el producto del módulo.',
      moduloNaoExiste: 'El módulo "{{nome}}" no existe en {{produto}} o está inactivo.',
      repetido: 'Grupo repetido en la planilla (fila {{linha}}).',
    },
  },
};

export default deParaGrupos;
