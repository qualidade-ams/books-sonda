import { useLayoutEffect } from 'react';
import { useMenuOrganizado } from '@/hooks/useMenuOrganizado';
import { cssDaAparencia } from '@/utils/aparenciaMenu';

/** A última folha aplicada, para o menu não piscar na cor padrão (registrada em clearAllAppCache) */
export const CHAVE_CACHE_APARENCIA = 'menu-aparencia-css';
const ID_FOLHA = 'aparencia-menu';

function escreverFolha(css: string) {
  let folha = document.getElementById(ID_FOLHA);
  if (!folha) {
    folha = document.createElement('style');
    folha.id = ID_FOLHA;
    document.head.appendChild(folha);
  }
  folha.textContent = css;
}

const lerCache = () => {
  try {
    return localStorage.getItem(CHAVE_CACHE_APARENCIA);
  } catch {
    return null;
  }
};

/**
 * Cores do menu e destaque do sistema salvos em Organizar Menu, aplicados no <head> (seção 12.1).
 * Antes da leitura chegar vale a última guardada no navegador; sem nenhuma, o visual do código.
 */
export function useAplicarAparenciaMenu() {
  const { menu } = useMenuOrganizado();
  const aparencia = menu?.aparencia;

  useLayoutEffect(() => {
    const css = aparencia?.claro && aparencia?.escuro ? cssDaAparencia(aparencia) : lerCache();
    if (!css) return;
    escreverFolha(css);
    try {
      localStorage.setItem(CHAVE_CACHE_APARENCIA, css);
    } catch {
      // Sem armazenamento (janela anônima): vale só nesta página
    }
  }, [aparencia]);
}
