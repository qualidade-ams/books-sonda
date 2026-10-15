import { describe, it, expect } from 'vitest';
import {
  baselineDoMes,
  percentualDoMes,
  type VigenciaBaseline,
  type VigenciaRepasse,
} from '../vigencias';

const baseline = (v: Partial<VigenciaBaseline>): VigenciaBaseline => ({
  dataInicio: '2025-01-01',
  dataFim: null,
  baselineMinutos: 2400,
  baselineTickets: null,
  credito: 'mensal',
  ...v,
});

describe('baselineDoMes (RC-06, RC-08, RC-09)', () => {
  it('usa a vigência ativa no dia 1 do mês', () => {
    const vigencias = [
      baseline({ dataFim: '2025-06-30' }),
      baseline({ dataInicio: '2025-07-01', baselineMinutos: 3000 }),
    ];
    expect(baselineDoMes(vigencias, { mes: 6, ano: 2025 })).toEqual({ horas: 2400, tickets: 0 });
    expect(baselineDoMes(vigencias, { mes: 7, ano: 2025 })).toEqual({ horas: 3000, tickets: 0 });
  });

  it('vigência que começa no meio do mês só vale no mês seguinte', () => {
    const vigencias = [
      baseline({ dataFim: '2025-03-14' }),
      baseline({ dataInicio: '2025-03-15', baselineMinutos: 3000 }),
    ];
    expect(baselineDoMes(vigencias, { mes: 3, ano: 2025 }).horas).toBe(2400);
    expect(baselineDoMes(vigencias, { mes: 4, ano: 2025 }).horas).toBe(3000);
  });

  it('valor vazio na vigência vale 0, sem buscar outra fonte (corrige RC-08)', () => {
    expect(
      baselineDoMes([baseline({ baselineMinutos: null, baselineTickets: 10 })], {
        mes: 2,
        ano: 2025,
      })
    ).toEqual({
      horas: 0,
      tickets: 10,
    });
  });

  it('crédito anual só entra no mês de início da vigência, todo ano', () => {
    const anual = [baseline({ dataInicio: '2024-07-01', credito: 'anual' })];
    expect(baselineDoMes(anual, { mes: 7, ano: 2025 }).horas).toBe(2400);
    expect(baselineDoMes(anual, { mes: 8, ano: 2025 }).horas).toBe(0);
  });

  it('sem vigência no mês, baseline 0', () => {
    expect(baselineDoMes([baseline({ dataInicio: '2025-05-01' })], { mes: 4, ano: 2025 })).toEqual({
      horas: 0,
      tickets: 0,
    });
  });
});

const repasse = (v: Partial<VigenciaRepasse>): VigenciaRepasse => ({
  dataInicio: '2025-01-01',
  dataFim: null,
  percentualMensal: 50,
  percentualDentroPeriodo: null,
  percentualEntrePeriodos: null,
  ...v,
});

describe('percentualDoMes (RC-10, D-04)', () => {
  it('usa a vigência ativa no dia 1 do mês', () => {
    const vigencias = [
      repasse({ dataFim: '2025-03-31' }),
      repasse({ dataInicio: '2025-04-01', percentualMensal: 0 }),
    ];
    expect(percentualDoMes(vigencias, { mes: 3, ano: 2025 })).toEqual({ mensal: 50 });
    expect(percentualDoMes(vigencias, { mes: 4, ano: 2025 })).toEqual({ mensal: 0 });
  });

  it('traz os percentuais por período quando existem', () => {
    const v = [repasse({ percentualDentroPeriodo: 100, percentualEntrePeriodos: 70 })];
    expect(percentualDoMes(v, { mes: 1, ano: 2025 })).toEqual({
      mensal: 50,
      dentroPeriodo: 100,
      entrePeriodos: 70,
    });
  });

  it('sem vigência no mês é erro: o percentual é obrigatório (D-04)', () => {
    expect(() =>
      percentualDoMes([repasse({ dataInicio: '2025-05-01' })], { mes: 4, ano: 2025 })
    ).toThrow(/percentual de repasse/);
  });
});
