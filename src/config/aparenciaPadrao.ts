// Cores padrão do menu de cada tema: as mesmas da carga de menu_aparencia (migration fase3_menu).
// "Cores padrão" em Organizar Menu volta a elas; sem logo próprio, fica o da Sonda.
import type { AparenciaMenu, TemaMenu } from '@/types/menuOrganizado';

export const APARENCIA_PADRAO: Record<TemaMenu, AparenciaMenu> = {
  claro: {
    menuFundo: '#FAFBFC',
    menuTexto: '#5F6670',
    itemFundo: '#FAFBFC',
    itemTexto: '#5F6670',
    subitemFundo: '#FAFBFC',
    subitemTexto: '#5F6670',
    hoverFundo: '#EEF1F4',
    hoverTexto: '#1B1F24',
    selecionadoFundo: '#2563EB',
    selecionadoTexto: '#FFFFFF',
    logoPath: null,
    logoRecolhidoPath: null,
  },
  escuro: {
    menuFundo: '#1C1C1C',
    menuTexto: '#B1B1B1',
    itemFundo: '#1C1C1C',
    itemTexto: '#B1B1B1',
    subitemFundo: '#1C1C1C',
    subitemTexto: '#B1B1B1',
    hoverFundo: '#262626',
    hoverTexto: '#FFFFFF',
    selecionadoFundo: '#00D4E8',
    selecionadoTexto: '#000000',
    logoPath: null,
    logoRecolhidoPath: null,
  },
};
