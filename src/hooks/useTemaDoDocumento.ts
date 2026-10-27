import { useEffect, useState } from 'react';
import type { TemaMenu } from '@/types/menuOrganizado';

const temaAtual = (): TemaMenu =>
  document.documentElement.classList.contains('dark') ? 'escuro' : 'claro';

/** Troca o tema da página com a mesma gravação do useTheme ('theme' e a classe dark do html) */
export function mudarTemaDaPagina(tema: TemaMenu) {
  try {
    localStorage.setItem('theme', tema === 'escuro' ? 'dark' : 'light');
  } catch {
    // Sem armazenamento: o tema vale só nesta página
  }
  document.documentElement.classList.toggle('dark', tema === 'escuro');
}

/**
 * O tema em uso, lido da classe do html. O useTheme guarda o tema no estado de cada componente, e a
 * troca feita num lugar não chega aos outros; observar o html deixa todos em sincronia.
 */
export function useTemaDoDocumento(): TemaMenu {
  const [tema, setTema] = useState(temaAtual);
  useEffect(() => {
    const observador = new MutationObserver(() => setTema(temaAtual()));
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observador.disconnect();
  }, []);
  return tema;
}
