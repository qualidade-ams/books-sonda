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
};

export default organizarMenu;
