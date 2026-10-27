/** Tela Ramos de Atividade */
const ramosAtividade = {
  titulo: 'Ramos de Atividade',
  subtitulo:
    'Segmentos dos clientes, usados no ramo de atividade e no ramo secundário das empresas.',
  indicadores: {
    ativos: 'Ramos ativos',
    inativos: 'Inativos',
    comRamo: 'Empresas com ramo',
    semRamo: 'Empresas sem ramo',
  },
  lista: {
    titulo: 'Ramos de atividade',
    novo: 'Novo ramo',
    novoPlaceholder: 'Novo ramo (ex.: Agronegócio)',
    incluir: 'Incluir',
    buscar: 'Buscar ramo',
    digiteNome: 'Digite o nome do ramo.',
    repetido: 'Já existe um ramo com este nome.',
    carregando: 'Carregando os ramos',
    erro: 'Não foi possível carregar os ramos',
    vazioTitulo: 'Nenhum ramo cadastrado',
    vazioDescricao:
      'Cadastre a lista antes de o ramo de atividade virar obrigatório na edição das empresas.',
    nenhumEncontrado: 'Nenhum ramo encontrado',
  },
  linha: {
    renomear: 'Renomear',
    novoNome: 'Novo nome de {{nome}}',
    enterAplica: 'Enter para aplicar, Esc para desfazer.',
    aoSalvarNome: 'Ao salvar, o novo nome aparece nas {{empresas}} que usam este ramo.',
    uso: '{{principal}} como principal · {{secundario}} como secundário',
    nenhumaEmpresa: 'Nenhuma empresa usa',
    excluir: 'Excluir',
    emUso: 'Em uso: inative em vez de excluir',
    limpeParaReordenar: 'Limpe a busca e os filtros para reordenar',
  },
  selo: {
    novo: 'Novo',
    alterado: 'Alterado',
    inativado: 'Será inativado',
    reativado: 'Será reativado',
  },
  empresas: { um: '{{n}} empresa', varios: '{{n}} empresas' },
  mudancas: {
    incluidos: { um: '{{n}} ramo incluído', varios: '{{n}} ramos incluídos' },
    renomeados: { um: '{{n}} renomeado', varios: '{{n}} renomeados' },
    inativados: { um: '{{n}} inativado', varios: '{{n}} inativados' },
    reativados: { um: '{{n}} reativado', varios: '{{n}} reativados' },
    excluidos: { um: '{{n}} excluído', varios: '{{n}} excluídos' },
    ordem: 'ordem alterada',
    naoSalvo: 'ainda não salvo',
  },
  confirmar: {
    titulo: 'Salvar os ramos de atividade?',
    inativados: {
      um: '{{nomes}} deixa de aparecer para escolher',
      varios: '{{nomes}} deixam de aparecer para escolher',
    },
    inativadosEmUso: {
      um: '{{nomes}} deixa de aparecer para escolher, mas continua nas {{empresas}} que já usam',
      varios:
        '{{nomes}} deixam de aparecer para escolher, mas continuam nas {{empresas}} que já usam',
    },
    renomeados: 'O novo nome aparece nas {{empresas}} afetadas',
    excluidos: 'Excluídos de vez: {{nomes}}',
  },
  dicas: {
    ramos:
      'Lista usada no Ramo de atividade (obrigatório) e no Ramo secundário (opcional) das empresas, na ordem desta tela. Arraste para mudar a ordem. As alterações só valem depois de salvar.',
  },
  exportar: {
    arquivo: 'ramos-de-atividade',
    descricao: {
      um: 'Exporta {{n}} ramo, com os filtros aplicados',
      varios: 'Exporta {{n}} ramos, com os filtros aplicados',
    },
    colunas: {
      ramo: 'Ramo de atividade',
      principal: 'Empresas (ramo principal)',
      secundario: 'Empresas (ramo secundário)',
    },
  },
  importar: {
    titulo: 'Importar ramos',
    modelo: 'modelo-ramos-de-atividade',
    exemplo: 'Agronegócio',
    salveAntes: 'Salve ou descarte as alterações antes de importar',
    regras: {
      umPorLinha: 'Um ramo por linha, na ordem em que devem aparecer, depois dos que já existem.',
      existentes: 'Ramos que já existem (sem diferenciar maiúsculas) são ignorados.',
    },
    erros: {
      vazio: 'Nome vazio.',
      repetido: 'Repetido na planilha (linha {{linha}}).',
    },
  },
};

export default ramosAtividade;
