/** Textos da tela Organizar Menu (Modelagem_Fase3.md, seção 12.1) */
const organizarMenu = {
  titulo: 'Organize Menu',
  subtitulo: 'Order, grouping and colors of the side menu, the same for all users.',
  ordem: {
    titulo: 'Menu order',
    dica: 'Drag to change the order. To move a screen to another menu, drag it into that menu. To leave it on its own at the first level, like the Dashboard, drag it to the left; to put it under the item above, drag it to the right. A standalone screen that receives another one becomes a menu. The order applies to all users, and each one sees only the screens their permissions allow. A menu with no screens is not shown. Changes only apply after saving.',
    padrao: 'Default order',
    lista: 'Menu items',
    reordenar: 'Reorder {{rotulo}}',
    arraste: 'Drag to change the order or the menu',
    telas: {
      um: '{{n}} screen',
      varios: '{{n}} screens',
    },
    semTelas: 'No screens: not shown in the menu',
    movido: 'Moved',
    destinoNovoMenu: 'New menu {{nome}}',
    destinoEm: 'In {{nome}}',
    primeiroNivel: 'First level',
  },
  mudancas: {
    ordemDosMenus: 'Menu order changed',
    menusCriados: {
      um: '{{n}} menu created',
      varios: '{{n}} menus created',
    },
    telasMovidas: {
      um: '{{n}} screen moved in the menu',
      varios: '{{n}} screens moved in the menu',
    },
    menusReordenados: 'Screen order changed in {{menus}}',
    naoSalvo: 'not saved yet',
  },
  confirmar: {
    titulo: 'Save the menu?',
    todos: 'Applies to all users; anyone with the system open sees it after reloading the page',
    vazios: {
      um: '{{menus}} has no screens left and leaves the menu',
      varios: '{{menus}} have no screens left and leave the menu',
    },
  },
  salvar: 'Save',
  descartar: 'Discard',
  erro: 'Could not load the menu',
  carregando: 'Loading the menu',
  abas: {
    rotulo: 'Sections',
    ordem: 'Order',
    cores: 'Colors',
  },
  cores: {
    tema: 'Theme',
    temas: {
      claro: 'Light theme',
      escuro: 'Dark theme',
    },
    padrao: 'Default colors',
    partes: {
      menu: 'Menu',
      item: 'Items',
      subitem: 'Subitems',
      hover: 'On hover',
      selecionado: 'Selected item',
    },
    dicas: {
      menu: 'Background of the side menu bar and text of the Collapse button.',
      item: 'First-level items: the menus and the standalone screens, like the Dashboard.',
      subitem: 'Screens inside a menu, when it is open.',
      hover: 'Item or subitem when the mouse is over it.',
      selecionado:
        'Screen currently open. Once saved, this color becomes the system highlight in this theme: band title, avatar, main buttons, tabs and focus. Where the highlight becomes text over the page or the band, the tone is lightened or darkened until it has contrast.',
      logo: 'Shown at the top of the menu. Open: up to 48 px high. Collapsed: a 24 px square space, for the brand symbol. PNG, SVG, WebP or JPG, with a transparent background, up to 500 KB. Without its own image, the Sonda logo is used, in black or white depending on the background.',
    },
    fundo: 'Background',
    texto: 'Text',
    escolher: 'Choose {{parte}}: {{rotulo}}',
    codigo: '{{parte}}: {{rotulo}}',
    contraste: 'Contrast {{razao}}:1, below 4.5:1',
    contrasteDica: 'The text is hard to read: increase the difference between background and text',
    sugestoes: 'Background suggestions: {{rotulo}}',
    alterada: 'Changed',
    logo: 'Logo',
    logoAberto: 'Open menu',
    logoRecolhido: 'Collapsed menu',
    enviarImagem: 'Upload image',
    enviarLogo: 'Upload logo: {{rotulo}}',
    enviando: 'Uploading',
    usarPadrao: 'Use the default',
    erroTipo: 'Use PNG, SVG, WebP or JPG.',
    erroTamanho: 'The image is larger than 500 KB.',
    previa: 'Menu preview',
    previaTema: 'Preview · {{tema}}',
  },
  mudancasCores: {
    cores: {
      claro: 'Light theme colors changed',
      escuro: 'Dark theme colors changed',
      ambos: 'Colors of both themes changed',
    },
    logo: {
      claro: 'Light theme logo changed',
      escuro: 'Dark theme logo changed',
      ambos: 'Logo of both themes changed',
    },
  },
};

export default organizarMenu;
