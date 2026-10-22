import { useEffect, useState } from 'react';

/**
 * Indica se a media query casa com a janela atual e acompanha as mudanças.
 * O valor inicial já é o real, para não piscar o layout errado na primeira renderização.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (event: { matches: boolean }) => setMatches(event.matches);

    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
