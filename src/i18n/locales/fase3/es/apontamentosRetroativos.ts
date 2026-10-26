/** Tela Apontamentos Retroativos (nova) */
const apontamentosRetroativos = {
  titulo: 'Registros Retroactivos',
  subtitulo: 'Registros de horas hechos en Aranda después del cierre del mes, por banco.',
  situacoes: {
    pendente: 'Pendiente',
    aprovado: 'Esperando la rectificación',
    aplicado: 'Aplicado',
    descartado: 'Descartado',
  },
  abas: {
    rotulo: 'Estado',
    pendente: 'Pendientes',
    aprovado: 'Esperando la rectificación',
    aplicado: 'Aplicados',
    descartado: 'Descartados',
  },
  deteccao:
    'La detección corre en cada sincronización con Aranda, en los meses cerrados del período abierto de cada banco.',
  buscar: 'Buscar empresa, banco, llamado o tarea',
  filtroEmpresa: 'Empresa',
  filtroConsultor: 'Consultor',
  lista: 'Registros retroactivos',
  carregando: 'Cargando los registros retroactivos',
  erro: 'No fue posible cargar los registros retroactivos',
  vazio: {
    pendente: 'Ningún registro retroactivo pendiente',
    pendenteDescricao: 'Todos los meses cerrados están al día con Aranda.',
    outros: 'Ningún registro retroactivo en "{{aba}}"',
    filtro: 'Ningún registro retroactivo cumple los filtros',
  },
  cartao: {
    ver: 'Ver los registros de {{empresa}} · {{banco}}',
    fechar: 'Cerrar los registros de {{empresa}} · {{banco}}',
    apontamentos: {
      um: '{{n}} registro',
      varios: '{{n}} registros',
    },
    detectadoEm: 'detectado el {{data}}',
    noFechamento: 'En el cierre',
    comRetroativos: 'Con los retroactivos',
    diferenca: 'Diferencia',
    ticketsN: '{{n}} tickets',
    consultoresAvisados: 'Consultores avisados',
    aprovar: 'Aprobar',
    descartar: 'Descartar',
    aprovadoPor: 'Aprobado por {{nome}} el {{data}}:',
    descartadoPor: 'Descartado por {{nome}} el {{data}}:',
    aplicado: 'aplicado en la rectificación del Book el {{data}}',
    aguardando: 'cuenta cuando el Book de {{mes}} sea rectificado',
    verNoControle: 'Ver {{banco}} en el Control',
    semNome: 'usuario sin registro',
  },
  colunas: {
    chamado: 'Llamado · tarea',
    dataAtividade: 'Fecha de la actividad',
    dataSistema: 'Registrado en Aranda',
    consultor: 'Consultor',
    status: 'Estado del llamado',
    quantidade: 'Horas / tickets',
  },
  avisadoEm: 'avisado el {{data}}',
  decidir: {
    aprovarTitulo: '¿Aprobar el ajuste de {{empresa}} · {{banco}}?',
    descartarTitulo: '¿Descartar el ajuste de {{empresa}} · {{banco}}?',
    descricao: '{{mes}}: consumo de {{de}} a {{para}}.',
    aprovarAguarda:
      'Queda esperando la rectificación del Book de {{mes}}; hasta entonces, el mes no cambia',
    aprovarRecalcula:
      'En la rectificación, el mes y los siguientes del período se recalculan (nueva versión, nada se borra)',
    descartarNaoMuda: 'El consumo del mes no cambia',
    descartarNaoVolta: 'Estos registros no vuelven a ser detectados',
    justificativa: 'Justificación',
    aprovarPlaceholder: 'Ej.: atención confirmada con el cliente',
    descartarPlaceholder: 'Ej.: el consultor va a registrar de nuevo en el mes vigente',
  },
};

export default apontamentosRetroativos;
