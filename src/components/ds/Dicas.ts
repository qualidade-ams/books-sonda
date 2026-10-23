// Textos do "i" ao lado de cada rótulo, por tela. Cada tela fornece o seu dicionário (com os
// rótulos já traduzidos como chave) em <DicasContext.Provider value={dicas}>; Rotulo,
// Interruptor e Secao procuram o texto pelo rótulo.
import { createContext, useContext } from 'react';

export const DicasContext = createContext<Record<string, string>>({});

export const useDicas = () => useContext(DicasContext);
