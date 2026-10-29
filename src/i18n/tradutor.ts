/**
 * Tradução fora do React, com os mesmos textos do app: Excel do Book e conteúdo do Saldo Parcial
 * gerados por serviços, inclusive no sync-api (pacotes do vendor). Não usa o detector de idioma
 * do navegador nem o react-i18next do src/i18n/index.ts.
 */
import i18next from 'i18next';
import ptBR from './locales/pt-BR';
import en from './locales/en';
import es from './locales/es';
import fase3PtBR from './locales/fase3/pt-BR';
import fase3En from './locales/fase3/en';
import fase3Es from './locales/fase3/es';

export type Traducao = (chave: string, valores?: Record<string, unknown>) => string;

const recursos = {
  'pt-BR': { translation: { ...ptBR, ...fase3PtBR } },
  en: { translation: { ...en, ...fase3En } },
  es: { translation: { ...es, ...fase3Es } },
};

const instancias = new Map<string, Traducao>();

export function criarTradutor(idioma: string): Traducao {
  const pronta = instancias.get(idioma);
  if (pronta) return pronta;
  const instancia = i18next.createInstance();
  instancia.init({
    resources: recursos,
    lng: idioma,
    fallbackLng: 'pt-BR',
    initAsync: false,
    // O texto vai para Excel e e-mail montado com escape próprio, não para o DOM
    interpolation: { escapeValue: false },
  });
  const t: Traducao = (chave, valores) => instancia.t(chave, valores) as string;
  instancias.set(idioma, t);
  return t;
}
