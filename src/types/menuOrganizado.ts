/**
 * Organizar Menu (Modelagem_Fase3.md, seção 12.1): ordem, agrupamento e cores do
 * menu lateral, iguais para todos. O menu do código é a ordem padrão; as
 * tabelas guardam só o que foi mudado na tela.
 */

export type TemaMenu = 'claro' | 'escuro';

/** Nó do menu: um menu (agrupa telas) ou uma tela (a chave é a rota) */
export interface NoMenu {
  chave: string;
  tipo: 'menu' | 'tela';
  /** Chave do i18n (nav.dashboard...) */
  rotuloI18n: string;
  /** Nome do ícone do lucide */
  icone: string | null;
  /** Só em menu */
  filhos?: NoMenu[];
}

/** Linha de menu_itens */
export interface ItemMenuSalvo {
  chave: string;
  tipo: 'menu' | 'tela';
  /** Nulo = primeiro nível */
  pai: string | null;
  posicao: number;
  rotuloI18n: string;
  icone: string | null;
}

export interface AparenciaMenu {
  menuFundo: string;
  menuTexto: string;
  itemFundo: string;
  itemTexto: string;
  subitemFundo: string;
  subitemTexto: string;
  hoverFundo: string;
  hoverTexto: string;
  /** Também o destaque do sistema no tema */
  selecionadoFundo: string;
  selecionadoTexto: string;
  /** Caminho no bucket menu-logos; nulo = logo da Sonda */
  logoPath: string | null;
  logoRecolhidoPath: string | null;
}

export interface MenuSalvo {
  itens: ItemMenuSalvo[];
  aparencia: Record<TemaMenu, AparenciaMenu>;
}
