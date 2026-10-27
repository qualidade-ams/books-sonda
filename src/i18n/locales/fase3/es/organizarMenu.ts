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
  abas: {
    rotulo: 'Secciones',
    ordem: 'Orden',
    cores: 'Colores',
  },
  cores: {
    tema: 'Tema',
    temas: {
      claro: 'Tema claro',
      escuro: 'Tema oscuro',
    },
    padrao: 'Colores predeterminados',
    partes: {
      menu: 'Menú',
      item: 'Elementos',
      subitem: 'Subelementos',
      hover: 'Al pasar el mouse',
      selecionado: 'Elemento seleccionado',
    },
    dicas: {
      menu: 'Fondo de la barra del menú lateral y texto del botón Contraer.',
      item: 'Elementos del primer nivel: los menús y las pantallas sueltas, como el Dashboard.',
      subitem: 'Pantallas dentro de un menú, cuando está abierto.',
      hover: 'Elemento o subelemento cuando el mouse pasa sobre él.',
      selecionado:
        'Pantalla abierta en el momento. Una vez guardado, este color pasa a ser el destaque del sistema en este tema: título de la franja, avatar, botones principales, pestañas y foco. Donde el destaque se vuelve texto sobre la página o la franja, el tono se aclara u oscurece hasta tener contraste.',
      logo: 'Aparece en la parte superior del menú. Abierto: hasta 48 px de alto. Contraído: espacio cuadrado de 24 px, para el símbolo de la marca. PNG, SVG, WebP o JPG, con fondo transparente, hasta 500 KB. Sin imagen propia, queda el logo de Sonda, en negro o blanco según el fondo.',
    },
    fundo: 'Fondo',
    texto: 'Texto',
    escolher: 'Elegir {{parte}}: {{rotulo}}',
    codigo: '{{parte}}: {{rotulo}}',
    contraste: 'Contraste {{razao}}:1, por debajo de 4,5:1',
    contrasteDica: 'El texto es difícil de leer: aumente la diferencia entre el fondo y el texto',
    sugestoes: 'Sugerencias de fondo: {{rotulo}}',
    alterada: 'Modificada',
    logo: 'Logo',
    logoAberto: 'Menú abierto',
    logoRecolhido: 'Menú contraído',
    enviarImagem: 'Enviar imagen',
    enviarLogo: 'Enviar logo: {{rotulo}}',
    enviando: 'Enviando',
    usarPadrao: 'Usar el predeterminado',
    erroTipo: 'Use PNG, SVG, WebP o JPG.',
    erroTamanho: 'La imagen supera los 500 KB.',
    previa: 'Vista previa del menú',
    previaTema: 'Vista previa · {{tema}}',
  },
  mudancasCores: {
    cores: {
      claro: 'Colores del tema claro modificados',
      escuro: 'Colores del tema oscuro modificados',
      ambos: 'Colores de los dos temas modificados',
    },
    logo: {
      claro: 'Logo del tema claro modificado',
      escuro: 'Logo del tema oscuro modificado',
      ambos: 'Logo de los dos temas modificado',
    },
  },
};

export default organizarMenu;
