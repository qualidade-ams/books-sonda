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
};

export default organizarMenu;
