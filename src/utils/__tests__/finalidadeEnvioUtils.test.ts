import { describe, it, expect } from 'vitest';
import { getFinalidadeEnvioLabel, normalizarFinalidadeEnvio } from '../finalidadeEnvioUtils';

describe('finalidadeEnvioUtils', () => {
  describe('getFinalidadeEnvioLabel', () => {
    it('retorna o rótulo de cada finalidade', () => {
      expect(getFinalidadeEnvioLabel('book')).toBe('Book');
      expect(getFinalidadeEnvioLabel('saldo_parcial')).toBe('Saldo Parcial');
      expect(getFinalidadeEnvioLabel('ambos')).toBe('Ambos');
    });

    it('trata valor ausente como Book (padrão dos contatos existentes)', () => {
      expect(getFinalidadeEnvioLabel(undefined)).toBe('Book');
      expect(getFinalidadeEnvioLabel(null)).toBe('Book');
    });
  });

  describe('normalizarFinalidadeEnvio (importação Excel)', () => {
    it('aceita o valor interno e o rótulo, sem diferenciar maiúsculas e acentos', () => {
      expect(normalizarFinalidadeEnvio('book')).toBe('book');
      expect(normalizarFinalidadeEnvio('BOOK')).toBe('book');
      expect(normalizarFinalidadeEnvio('Saldo Parcial')).toBe('saldo_parcial');
      expect(normalizarFinalidadeEnvio('saldo_parcial')).toBe('saldo_parcial');
      expect(normalizarFinalidadeEnvio('  ambos ')).toBe('ambos');
      expect(normalizarFinalidadeEnvio('Ambos')).toBe('ambos');
    });

    it('usa "book" para célula vazia ou valor desconhecido', () => {
      expect(normalizarFinalidadeEnvio(undefined)).toBe('book');
      expect(normalizarFinalidadeEnvio('')).toBe('book');
      expect(normalizarFinalidadeEnvio('qualquer coisa')).toBe('book');
    });
  });
});
