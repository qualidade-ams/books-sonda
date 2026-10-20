import { describe, it, expect } from 'vitest';
import { extrairEmailsDeTexto } from '../emailValidation';

describe('extrairEmailsDeTexto', () => {
  it('extrai só o e-mail do formato "Nome <email>"', () => {
    expect(extrairEmailsDeTexto('Rafael Viegas <rafael.viegas@sonda.com>')).toEqual(['rafael.viegas@sonda.com']);
  });

  it('aceita lista misturada separada por ; , ou quebra de linha, sem repetidos', () => {
    const texto = 'Rafael Viegas <rafael.viegas@sonda.com>; giselle.lobo@sonda.com,\n"Lobo, Giselle" <giselle.lobo@sonda.com>';
    expect(extrairEmailsDeTexto(texto)).toEqual(['rafael.viegas@sonda.com', 'giselle.lobo@sonda.com']);
  });

  it('retorna vazio quando não há e-mail', () => {
    expect(extrairEmailsDeTexto('Fulano de Tal')).toEqual([]);
  });
});
