import { useEffect, useState } from 'react';
import type { TemaMenu } from '@/types/menuOrganizado';

const temaAtual = (): TemaMenu =>
  document.documentElement.classList.contains('dark') ? 'escuro' : 'claro';

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
