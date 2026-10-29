/** Pantalla Comparación Legado x Nuevo (Fase 4) */
const comparacaoBancosHoras = {
  titulo: 'Comparación Legado x Nuevo',
  subtitulo:
    'El cálculo nuevo, en sombra, comparado con lo que el cliente recibió en el Book en los últimos 12 meses cerrados.',
  atualizadoEm: 'Actualizado el {{data}}',
  semRodada: 'La rutina del modo sombra aún no se ejecutó.',
  grupos: {
    conferem: 'Coinciden',
    explicada: 'Explicadas',
    divergente: 'Divergentes',
    validada: 'Validadas',
    liberada: 'Liberadas',
  },
  situacoes: {
    identico: 'Idéntico',
    soma_confere: 'La suma coincide',
    explicada: 'Explicada',
    divergente: 'Divergente',
  },
  situacoesMes: {
    igual: 'Igual',
    explicada: 'Explicada',
    divergente: 'Divergente',
  },
  semResultado: 'Sin resultado',
  validada: 'Validada',
  validadaPor: 'Validada por {{nome}} el {{data}}',
  validadaEm: 'Validada el {{data}}',
  liberada: 'Liberada',
  liberadaPor: 'Liberada por {{nome}} el {{data}}',
  liberadaEm: 'Liberada el {{data}}',
  liberadaTexto:
    'Book, imagen del e-mail y Saldo Parcial salen por el modelo nuevo, un bloque por banco, desde {{mes}}.',
  liberadaTextoSemCorte:
    'Book, imagen del e-mail y Saldo Parcial salen por el modelo nuevo, un bloque por banco.',
  erroRotina: 'Falla en la última ejecución: {{erro}}',
  buscar: 'Buscar empresa',
  ver: 'Ver la comparación de {{empresa}}',
  lista: 'Empresas en validación',
  carregando: 'Cargando la comparación',
  erro: 'No fue posible cargar la comparación',
  vazio: {
    semDados: 'Ninguna comparación para mostrar',
    semDadosDescricao:
      'La comparación aparece después de que la rutina del modo sombra se ejecuta en el sync-api, para las empresas en Legado con mes cerrado en los últimos 12 meses.',
    filtro: 'Ninguna empresa encontrada',
  },
  colunas: {
    empresa: 'Empresa',
    bancos: 'Bancos',
    meses: 'Meses',
    consumoLegado: 'Consumo legado',
    consumoNovo: 'Consumo nuevo',
    diferenca: 'Diferencia',
  },
  criterio: {
    umBanco: '1 banco:',
    umBancoTexto: 'consumo, saldo y traspaso iguales al legado.',
    varios: 'Varios bancos:',
    variosTexto: 'la suma del consumo de los bancos igual al consumo del legado.',
  },
  detalhe: {
    meses: {
      um: '{{n}} mes comparado',
      varios: '{{n}} meses comparados',
    },
    atualizado: 'actualizado el {{data}}',
    mesAMes: 'Mes a mes',
    verDiferencas: 'Ver las diferencias de {{mes}}',
    diferencasEm: 'Diferencias en {{mes}}',
    mostrando: 'Mostrando {{n}} de {{total}} ítems con diferencia',
    semItens:
      'La diferencia de este mes no viene de registros de horas ni de tickets: está en requerimientos, reajustes o en el saldo.',
    origemSaldo: 'saldo heredado de {{mes}}',
    carregando: 'Cargando los meses',
    erro: 'No fue posible cargar los meses',
  },
  resumo: {
    identico: 'Consumo, saldo y traspaso iguales al legado en todos los meses comparados.',
    soma_confere:
      'La suma de los bancos es igual al consumo del legado en todos los meses comparados.',
    explicada:
      'Las diferencias vienen de correcciones del modelo nuevo. La empresa puede ser validada.',
    divergente: {
      um: '{{n}} mes tiene una diferencia sin explicación. Corrija la causa (De-para, Reglas de conteo, registro del banco) y recalcule.',
      varios:
        '{{n}} meses tienen diferencias sin explicación. Corrija la causa (De-para, Reglas de conteo, registro del banco) y recalcule.',
    },
  },
  acoes: {
    recalcular: 'Recalcular',
    recalculando: 'Recalculando',
    validar: 'Marcar como validada',
    desfazer: 'Deshacer validación',
    liberar: 'Liberar',
    voltar: 'Volver al legado',
  },
  colunasMes: {
    mes: 'Mes',
    consumoLegado: 'Consumo legado',
    consumoNovo: 'Consumo nuevo',
    somaBancos: 'Suma de los bancos',
    diferenca: 'Diferencia',
    saldo: 'Saldo legado / nuevo',
    repasse: 'Traspaso legado / nuevo',
    tickets: 'Tickets legado / nuevo',
    porBanco: 'Por banco',
  },
  colunasItem: {
    chamado: 'Ticket',
    data: 'Fecha',
    grupo: 'Grupo de Aranda',
    legado: 'Legado',
    novo: 'Nuevo',
    motivo: 'Motivo',
  },
  explicado: 'Explicado',
  semExplicacao: 'Sin explicación',
  motivos: {
    acima_24h: 'Registro de más de 24 h: el legado pierde los días enteros',
    fuso: 'Huso de Brasilia: el legado cuenta el mes en UTC',
    depois_do_fechamento: 'Registrado o modificado en Aranda después del cierre del legado',
    removido_do_aranda: 'Salió de Aranda después del cierre del legado',
    organizacao_so_no_novo: 'Organización vinculada solo en el registro nuevo',
    organizacao_curinga: 'El legado encontró la organización por comodín (_ o %)',
    codigo_trocado: 'Código de resolución cambiado en Aranda después del cierre del legado',
    regra_do_legado: 'El legado cambió los códigos que cuentan después de cerrar el mes',
    lancado_depois_do_mes:
      'Registrado en Aranda en el mes siguiente al de la actividad: el legado lo trata como retroactivo',
    organizacao_fora_do_cadastro: 'Organización que falta en el registro nuevo de la empresa',
    codigo_sem_regra: 'Código de resolución que no cuenta en las Reglas de conteo',
    fora_do_escopo: 'Ningún banco de la empresa recibe este grupo',
    sem_motivo: 'Sin motivo identificado',
  },
  validar: {
    titulo: '¿Validar {{empresa}}?',
    descricao: 'Queda registrado que el área revisó la comparación de los meses de arriba.',
    caiValidacao: 'Si un mes nuevo diverge, la validación cae y la empresa vuelve a Divergente',
    clienteContinua:
      'El cliente sigue recibiendo el Book y el Saldo Parcial del legado hasta la liberación',
  },
  desfazer: {
    titulo: '¿Deshacer la validación de {{empresa}}?',
    motivo: 'Motivo',
    placeholder: 'Ej.: el Book de septiembre fue rectificado',
  },
  liberar: {
    titulo: '¿Liberar {{empresa}}?',
    descricao:
      'A partir de {{mes}}, el cliente recibe el Book y el Saldo Parcial por el modelo nuevo.',
    descricaoSemCorte: 'El cliente pasa a recibir el Book y el Saldo Parcial por el modelo nuevo.',
    saldoUmBanco: 'El saldo continúa del último Book del legado ({{mes}})',
    saldoVarios:
      'Cada banco parte del saldo del modelo nuevo. La diferencia con el saldo del legado ({{mes}}) va al Banco predeterminado',
    blocoPorBanco:
      'Book, imagen del e-mail y Saldo Parcial pasan a tener un bloque por banco que el cliente ve',
    booksEnviados: 'Los Books ya enviados no cambian',
    controleConsulta: 'El Control actual queda solo para consulta de esta empresa',
  },
  voltar: {
    titulo: '¿Volver {{empresa}} al legado?',
    descricao:
      'El cliente vuelve a recibir el Book y el Saldo Parcial del legado a partir del próximo envío.',
    lancamentos:
      '{{reajustes}} y {{observacoes}} registrados en el nuevo Control van al Control actual',
    reajustes: { um: '{{n}} reajuste', varios: '{{n}} reajustes' },
    observacoes: { um: '{{n}} observación', varios: '{{n}} observaciones' },
    booksEnviados: 'Los Books ya enviados por el modelo nuevo siguen como fueron enviados',
    validacaoDesfeita: 'La validación se deshace y la empresa vuelve a la comparación',
    motivo: 'Motivo',
    placeholder: 'Ej.: el Book de octubre salió con el banco equivocado',
  },
  exportar: {
    arquivo: 'comparacion-legado-nuevo',
    descricao: {
      um: 'Exporta {{n}} empresa, de los filtros aplicados',
      varios: 'Exporta {{n}} empresas, de los filtros aplicados',
    },
    descricaoEmpresa: 'Exporta el mes a mes y las diferencias de {{empresa}}',
    abaDiferencas: 'Diferencias',
    colunas: {
      ticketsLegado: 'Tickets legado',
      ticketsNovo: 'Tickets nuevo',
      validadaPor: 'Validada por',
      validadaEm: 'Validada el',
      calculadoEm: 'Calculado el',
      erro: 'Error de la rutina',
      legado: 'legado',
      novo: 'nuevo',
      requerimentos: 'Requerimientos',
      reajustes: 'Reajustes',
      saldo: 'Saldo',
      repasse: 'Traspaso',
      excedente: 'Excedente',
      tickets: 'Tickets',
      horas: 'Horas',
      origemSaldo: 'Saldo heredado de',
      explicado: 'Explicación',
    },
  },
};

export default comparacaoBancosHoras;
