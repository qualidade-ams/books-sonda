import { describe, it, expect } from 'vitest';
import ptBR from '../locales/pt-BR';
import en from '../locales/en';
import es from '../locales/es';
import fase3PtBR from '../locales/fase3/pt-BR';
import fase3En from '../locales/fase3/en';
import fase3Es from '../locales/fase3/es';

/** Caminhos de todas as folhas: "ds.paginacao.proxima" */
function chaves(objeto: Record<string, unknown>, prefixo = ''): string[] {
  return Object.entries(objeto).flatMap(([chave, valor]) =>
    valor && typeof valor === 'object'
      ? chaves(valor as Record<string, unknown>, `${prefixo}${chave}.`)
      : [`${prefixo}${chave}`]
  );
}

const IDIOMAS = { en, es };
const IDIOMAS_FASE3 = { en: fase3En, es: fase3Es };

describe('paridade das traduções', () => {
  it('o bloco ds tem as mesmas chaves nos três idiomas', () => {
    const base = chaves(ptBR.ds).sort();
    for (const [idioma, locale] of Object.entries(IDIOMAS)) {
      expect(chaves((locale as typeof ptBR).ds).sort(), idioma).toEqual(base);
    }
  });

  it('as telas da Fase 3 têm as mesmas chaves nos três idiomas', () => {
    const base = chaves(fase3PtBR).sort();
    for (const [idioma, locale] of Object.entries(IDIOMAS_FASE3)) {
      expect(chaves(locale).sort(), idioma).toEqual(base);
    }
  });

  it('as telas da Fase 3 não reaproveitam chave de primeiro nível das traduções atuais', () => {
    const existentes = new Set(Object.keys(ptBR));
    expect(Object.keys(fase3PtBR).filter((k) => existentes.has(k))).toEqual([]);
  });

  it('nenhum texto vazio', () => {
    for (const locale of [ptBR.ds, fase3PtBR, fase3En, fase3Es]) {
      const vazios = Object.entries(planificar(locale)).filter(([, v]) => !String(v).trim());
      expect(vazios).toEqual([]);
    }
  });
});

function planificar(objeto: Record<string, unknown>, prefixo = ''): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(objeto).flatMap(([chave, valor]) =>
      valor && typeof valor === 'object'
        ? Object.entries(planificar(valor as Record<string, unknown>, `${prefixo}${chave}.`))
        : [[`${prefixo}${chave}`, valor]]
    )
  );
}
