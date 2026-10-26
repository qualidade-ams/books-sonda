/** Textos da tela Organizar Menu (Modelagem_Fase3.md, seção 12.1) */
const organizarMenu = {
  titulo: 'Organizar Menú',
  subtitulo: 'Orden, agrupación y colores del menú lateral, iguales para todos los usuarios.',
  ordem: {
    titulo: 'Orden del menú',
    dica: 'Arrastre para cambiar el orden. Para llevar una pantalla a otro menú, arrástrela dentro de él. Para dejarla suelta en el primer nivel, como el Dashboard, arrástrela a la izquierda; para ponerla en el elemento de arriba, a la derecha. Una pantalla suelta que recibe otra se convierte en menú. El orden vale para todos los usuarios, y cada uno ve solo las pantallas que su permiso permite. Un menú sin pantallas no aparece. Los cambios solo valen después de guardar.',
    padrao: 'Orden predeterminado',
    lista: 'Elementos del menú',
    reordenar: 'Reordenar {{rotulo}}',
    arraste: 'Arrastre para cambiar el orden o el menú',
    telas: {
      um: '{{n}} pantalla',
      varios: '{{n}} pantallas',
    },
    semTelas: 'Sin pantallas: no aparece en el menú',
    movido: 'Movido',
    destinoNovoMenu: 'Nuevo menú {{nome}}',
    destinoEm: 'En {{nome}}',
    primeiroNivel: 'Primer nivel',
  },
  mudancas: {
    ordemDosMenus: 'Orden de los menús cambiado',
    menusCriados: {
      um: '{{n}} menú creado',
      varios: '{{n}} menús creados',
    },
    telasMovidas: {
      um: '{{n}} pantalla cambió de lugar en el menú',
      varios: '{{n}} pantallas cambiaron de lugar en el menú',
    },
    menusReordenados: 'Orden de las pantallas cambiado en {{menus}}',
    naoSalvo: 'aún no guardado',
  },
  confirmar: {
    titulo: '¿Guardar el menú?',
    todos:
      'Vale para todos los usuarios; quien tenga el sistema abierto lo verá al recargar la página',
    vazios: {
      um: '{{menus}} queda sin pantallas y sale del menú',
      varios: '{{menus}} quedan sin pantallas y salen del menú',
    },
  },
  salvar: 'Guardar',
  descartar: 'Descartar',
  erro: 'No fue posible cargar el menú',
  carregando: 'Cargando el menú',
};

export default organizarMenu;
