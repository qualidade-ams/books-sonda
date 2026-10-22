// Textos do "i" ao lado de cada rótulo, por tela. Cada protótipo fornece o seu dicionário com
// <DicasContext.Provider value={DICAS}>; Rotulo, Interruptor e Secao procuram o texto pelo rótulo.
import { createContext, useContext } from 'react';

export const DicasContext = createContext<Record<string, string>>({});

export const useDicas = () => useContext(DicasContext);
