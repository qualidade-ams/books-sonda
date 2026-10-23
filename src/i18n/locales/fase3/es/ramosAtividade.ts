/** Pantalla Ramos de Actividad */
const ramosAtividade = {
  titulo: 'Ramos de Actividad',
  subtitulo:
    'Segmentos de los clientes, usados en el ramo de actividad y el ramo secundario de las empresas.',
  indicadores: {
    ativos: 'Ramos activos',
    inativos: 'Inactivos',
    comRamo: 'Empresas con ramo',
    semRamo: 'Empresas sin ramo',
  },
  lista: {
    titulo: 'Ramos de actividad',
    novo: 'Nuevo ramo',
    novoPlaceholder: 'Nuevo ramo (ej.: Agronegocios)',
    incluir: 'Agregar',
    buscar: 'Buscar ramo',
    digiteNome: 'Escriba el nombre del ramo.',
    repetido: 'Ya existe un ramo con este nombre.',
    carregando: 'Cargando los ramos',
    erro: 'No fue posible cargar los ramos',
    vazioTitulo: 'Ningún ramo registrado',
    vazioDescricao:
      'Registre la lista antes de que el ramo de actividad sea obligatorio en la edición de las empresas.',
    nenhumEncontrado: 'No se encontró ningún ramo',
  },
  linha: {
    renomear: 'Renombrar',
    novoNome: 'Nuevo nombre de {{nome}}',
    enterAplica: 'Enter para aplicar, Esc para deshacer.',
    aoSalvarNome: 'Al guardar, el nuevo nombre aparece en las {{empresas}} que usan este ramo.',
    uso: '{{principal}} como principal · {{secundario}} como secundario',
    nenhumaEmpresa: 'Ninguna empresa lo usa',
    excluir: 'Eliminar',
    emUso: 'En uso: inactívelo en lugar de eliminarlo',
    limpeParaReordenar: 'Limpie la búsqueda y los filtros para reordenar',
  },
  selo: {
    novo: 'Nuevo',
    alterado: 'Modificado',
    inativado: 'Se inactivará',
    reativado: 'Se reactivará',
  },
  empresas: { um: '{{n}} empresa', varios: '{{n}} empresas' },
  mudancas: {
    incluidos: { um: '{{n}} ramo agregado', varios: '{{n}} ramos agregados' },
    renomeados: { um: '{{n}} renombrado', varios: '{{n}} renombrados' },
    inativados: { um: '{{n}} inactivado', varios: '{{n}} inactivados' },
    reativados: { um: '{{n}} reactivado', varios: '{{n}} reactivados' },
    excluidos: { um: '{{n}} eliminado', varios: '{{n}} eliminados' },
    ordem: 'orden modificado',
    naoSalvo: 'aún no guardado',
  },
  confirmar: {
    titulo: '¿Guardar los ramos de actividad?',
    inativados: {
      um: '{{nomes}} deja de aparecer para elegir',
      varios: '{{nomes}} dejan de aparecer para elegir',
    },
    inativadosEmUso: {
      um: '{{nomes}} deja de aparecer para elegir, pero sigue en las {{empresas}} que ya lo usan',
      varios:
        '{{nomes}} dejan de aparecer para elegir, pero siguen en las {{empresas}} que ya los usan',
    },
    renomeados: 'El nuevo nombre aparece en las {{empresas}} afectadas',
    excluidos: 'Eliminados definitivamente: {{nomes}}',
  },
  dicas: {
    ramos:
      'Lista usada en el Ramo de actividad (obligatorio) y el Ramo secundario (opcional) de las empresas, en el orden de esta pantalla. Arrastre para cambiar el orden. Los cambios solo valen después de guardar.',
  },
};

export default ramosAtividade;
