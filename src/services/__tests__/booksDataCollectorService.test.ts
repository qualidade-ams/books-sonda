import { describe, it, expect } from 'vitest';
import { calcularPeriodoApuracao } from '@/services/booksDataCollectorService';

describe('calcularPeriodoApuracao', () => {
  it('usa o mês calendário completo quando a periodicidade é padrão (dia 1)', () => {
    const { dataInicio, dataFim, proximoPeriodoInicio } = calcularPeriodoApuracao(8, 2026, 1, 0);

    expect(dataInicio).toEqual(new Date(2026, 7, 1));
    expect(dataFim).toEqual(new Date(2026, 7, 31, 23, 59, 59));
    expect(proximoPeriodoInicio).toEqual(new Date(2026, 8, 1));
  });

  it('respeita a periodicidade customizada da empresa (ex.: dia 16 ao dia 15 do mês seguinte)', () => {
    const { dataInicio, dataFim, proximoPeriodoInicio } = calcularPeriodoApuracao(8, 2026, 16, 0);

    expect(dataInicio).toEqual(new Date(2026, 7, 16));
    expect(dataFim).toEqual(new Date(2026, 8, 15, 23, 59, 59));
    expect(proximoPeriodoInicio).toEqual(new Date(2026, 8, 16));
  });

  it('vira o ano quando o mês de referência é dezembro com periodicidade customizada', () => {
    const { dataInicio, dataFim } = calcularPeriodoApuracao(12, 2026, 16, 0);

    expect(dataInicio).toEqual(new Date(2026, 11, 16));
    expect(dataFim).toEqual(new Date(2027, 0, 15, 23, 59, 59));
  });

  it('usa dia_fim_apuracao explícito quando informado, em vez de diaInicio - 1', () => {
    const { dataFim, proximoPeriodoInicio } = calcularPeriodoApuracao(8, 2026, 16, 20);

    expect(dataFim).toEqual(new Date(2026, 8, 20, 23, 59, 59));
    expect(proximoPeriodoInicio).toEqual(new Date(2026, 8, 21));
  });
});
