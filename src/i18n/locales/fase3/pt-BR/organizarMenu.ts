/** Textos da tela Organizar Menu (Modelagem_Fase3.md, seção 12.1) */
const organizarMenu = {
  titulo: 'Organizar Menu',
  subtitulo: 'Ordem, agrupamento e cores do menu lateral, iguais para todos os usuários.',
  ordem: {
    titulo: 'Ordem do menu',
    dica: 'Arraste para mudar a ordem. Para levar uma tela a outro menu, arraste-a para dentro dele. Para deixá-la solta no primeiro nível, como o Dashboard, arraste-a para a esquerda; para colocá-la no item acima, para a direita. Uma tela solta que recebe outra vira menu. A ordem vale para todos os usuários, e cada um vê só as telas que a permissão libera. Menu sem telas não aparece. As alterações só valem depois de salvar.',
    padrao: 'Ordem padrão',
    lista: 'Itens do menu',
    reordenar: 'Reordenar {{rotulo}}',
    arraste: 'Arraste para mudar a ordem ou o menu',
    telas: {
      um: '{{n}} tela',
      varios: '{{n}} telas',
    },
    semTelas: 'Sem telas: não aparece no menu',
    movido: 'Movido',
    destinoNovoMenu: 'Novo menu {{nome}}',
    destinoEm: 'Em {{nome}}',
    primeiroNivel: 'Primeiro nível',
  },
  mudancas: {
    ordemDosMenus: 'Ordem dos menus alterada',
    menusCriados: {
      um: '{{n}} menu criado',
      varios: '{{n}} menus criados',
    },
    telasMovidas: {
      um: '{{n}} tela mudou de lugar no menu',
      varios: '{{n}} telas mudaram de lugar no menu',
    },
    menusReordenados: 'Ordem das telas alterada em {{menus}}',
    naoSalvo: 'ainda não salvo',
  },
  confirmar: {
    titulo: 'Salvar o menu?',
    todos: 'Vale para todos os usuários; quem está com o sistema aberto vê ao recarregar a página',
    vazios: {
      um: '{{menus}} fica sem telas e sai do menu',
      varios: '{{menus}} ficam sem telas e saem do menu',
    },
  },
  salvar: 'Salvar',
  descartar: 'Descartar',
  erro: 'Não foi possível carregar o menu',
  carregando: 'Carregando o menu',
  abas: {
    rotulo: 'Seções',
    ordem: 'Ordem',
    cores: 'Cores',
  },
  cores: {
    tema: 'Tema',
    temas: {
      claro: 'Tema claro',
      escuro: 'Tema escuro',
    },
    padrao: 'Cores padrão',
    partes: {
      menu: 'Menu',
      item: 'Itens',
      subitem: 'Subitens',
      hover: 'Ao passar o mouse',
      selecionado: 'Item selecionado',
    },
    dicas: {
      menu: 'Fundo da barra do menu lateral e texto do botão Recolher.',
      item: 'Itens do primeiro nível: os menus e as telas soltas, como o Dashboard.',
      subitem: 'Telas dentro de um menu, quando ele está aberto.',
      hover: 'Item ou subitem quando o mouse passa sobre ele.',
      selecionado:
        'Tela aberta no momento. Depois de salva, esta cor vira o destaque do sistema neste tema: título da faixa, avatar, botões principais, abas e foco. Onde o destaque vira texto sobre a página ou a faixa, o tom é clareado ou escurecido até ter contraste.',
      logo: 'Aparece no topo do menu. Aberto: até 48 px de altura. Recolhido: espaço quadrado de 24 px, para o símbolo da marca. PNG, SVG, WebP ou JPG, com fundo transparente, até 500 KB. Sem imagem própria, fica o logo da Sonda, em preto ou branco conforme o fundo.',
    },
    fundo: 'Fundo',
    texto: 'Texto',
    escolher: 'Escolher {{parte}}: {{rotulo}}',
    codigo: '{{parte}}: {{rotulo}}',
    contraste: 'Contraste {{razao}}:1, abaixo de 4,5:1',
    contrasteDica: 'O texto fica difícil de ler: aumente a diferença entre o fundo e o texto',
    sugestoes: 'Sugestões de fundo: {{rotulo}}',
    alterada: 'Alterada',
    logo: 'Logo',
    logoAberto: 'Menu aberto',
    logoRecolhido: 'Menu recolhido',
    enviarImagem: 'Enviar imagem',
    enviarLogo: 'Enviar logo: {{rotulo}}',
    enviando: 'Enviando',
    usarPadrao: 'Usar o padrão',
    erroTipo: 'Use PNG, SVG, WebP ou JPG.',
    erroTamanho: 'A imagem passa de 500 KB.',
    previa: 'Prévia do menu',
    previaTema: 'Prévia · {{tema}}',
  },
  mudancasCores: {
    cores: {
      claro: 'Cores do tema claro alteradas',
      escuro: 'Cores do tema escuro alteradas',
      ambos: 'Cores dos dois temas alteradas',
    },
    logo: {
      claro: 'Logo do tema claro alterado',
      escuro: 'Logo do tema escuro alterado',
      ambos: 'Logo dos dois temas alterado',
    },
  },
};

export default organizarMenu;
