/**
 * Mês de cobrança do ponto clicado no gráfico de consumo do book: os pontos são os meses
 * que terminam no mês do book, então o mês e o ano saem da posição do ponto.
 */

import { describe, it, expect } from 'vitest';
import { mesCobrancaDoPontoDoGrafico } from '../mesCobrancaUtils';

describe('mesCobrancaDoPontoDoGrafico', () => {
  it('o último ponto é o mês do book, com o ano do book', () => {
    expect(mesCobrancaDoPontoDoGrafico(5, 6, 10, 2026)).toBe('10/2026');
  });

  it('o primeiro de 6 pontos é 5 meses antes', () => {
    expect(mesCobrancaDoPontoDoGrafico(0, 6, 10, 2026)).toBe('05/2026');
  });

  it('volta para o ano anterior quando o período atravessa a virada do ano', () => {
    expect(mesCobrancaDoPontoDoGrafico(0, 6, 2, 2027)).toBe('09/2026');
    expect(mesCobrancaDoPontoDoGrafico(3, 6, 2, 2027)).toBe('12/2026');
    expect(mesCobrancaDoPontoDoGrafico(4, 6, 2, 2027)).toBe('01/2027');
  });

  it('funciona com outra quantidade de pontos', () => {
    expect(mesCobrancaDoPontoDoGrafico(0, 3, 1, 2026)).toBe('11/2025');
  });
});
