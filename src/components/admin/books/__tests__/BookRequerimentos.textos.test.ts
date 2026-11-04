/**
 * Nomes das abas de requerimentos do book nas traduções.
 */

import { describe, it, expect } from 'vitest';
import ptBR from '@/i18n/locales/pt-BR';
import en from '@/i18n/locales/en';
import es from '@/i18n/locales/es';

describe('textos das abas de requerimentos do book', () => {
  it.each([
    ['pt-BR', ptBR, 'Requerimentos em Andamento', 'Requerimentos Compensados'],
    ['en', en, 'Requirements in Progress', 'Offset Requirements'],
    ['es', es, 'Requerimientos en Curso', 'Requerimientos Compensados'],
  ])(
    '%s: aba e título de "em andamento" e de "compensados"',
    (_idioma, locale: any, andamento, compensados) => {
      expect(locale.books.tabs.requerimentos).toBe(andamento);
      expect(locale.books.bookContent.requirementsInDevelopmentTitle).toBe(andamento);
      expect(locale.books.tabs.requerimentosCompensados).toBe(compensados);
      expect(locale.books.bookContent.requirementsCompensatedTitle).toBe(compensados);
    }
  );

  it.each([
    ['pt-BR', ptBR, 'Total de Tickets'],
    ['en', en, 'Total Tickets'],
    ['es', es, 'Total de Tickets'],
  ])('%s: rótulos de tickets das abas de requerimentos', (_idioma, locale: any, total) => {
    expect(locale.books.bookContent.requirementsTicketsTotal).toBe(total);
    expect(locale.books.bookContent.requirementsTicketsColumn).toBe('Tickets');
  });
});
