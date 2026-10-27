import { describe, it, expect } from 'vitest';
import { mesAtual, periodosDoBanco, rotuloMes, rotuloPeriodo, situacaoDoMes } from '../periodos';

const trimestral = { inicioVigencia: { mes: 7, ano: 2026 }, periodoApuracao: 3 };

describe('rotuloMes e rotuloPeriodo', () => {
  it('mês abreviado com o ano', () => {
    expect(rotuloMes({ mes: 10, ano: 2026 })).toBe('Out/2026');
  });

  it('período no mesmo ano, atravessando o ano e de um mês só', () => {
    expect(
      rotuloPeriodo([
        { mes: 7, ano: 2026 },
        { mes: 8, ano: 2026 },
        { mes: 9, ano: 2026 },
      ])
    ).toBe('Jul – Set/2026');
    expect(
      rotuloPeriodo([
        { mes: 11, ano: 2026 },
        { mes: 12, ano: 2026 },
        { mes: 1, ano: 2027 },
      ])
    ).toBe('Nov/2026 – Jan/2027');
    expect(rotuloPeriodo([{ mes: 10, ano: 2026 }])).toBe('Out/2026');
  });
});

describe('periodosDoBanco', () => {
  it('lista os períodos desde o início da vigência até o que contém o mês atual', () => {
    const p = periodosDoBanco(trimestral, { mes: 11, ano: 2026 });
    expect(p.map((x) => x.rotulo)).toEqual(['Jul – Set/2026', 'Out – Dez/2026']);
    expect(p[1].meses).toEqual([
      { mes: 10, ano: 2026 },
      { mes: 11, ano: 2026 },
      { mes: 12, ano: 2026 },
    ]);
    expect(p[1].indice).toBe(1);
  });

  it('banco que ainda não começou tem só o primeiro período', () => {
    expect(periodosDoBanco(trimestral, { mes: 5, ano: 2026 }).map((x) => x.rotulo)).toEqual([
      'Jul – Set/2026',
    ]);
  });

  it('o fim da vigência encerra o último período, mesmo no meio (P1)', () => {
    const p = periodosDoBanco(
      { ...trimestral, fimVigencia: { mes: 11, ano: 2026 } },
      { mes: 3, ano: 2027 }
    );
    expect(p.map((x) => x.rotulo)).toEqual(['Jul – Set/2026', 'Out – Nov/2026']);
  });
});

describe('situacaoDoMes', () => {
  const hoje = { mes: 10, ano: 2026 };
  it('fechado vale sobre a data; depois de hoje é futuro', () => {
    expect(situacaoDoMes({ mes: 9, ano: 2026 }, hoje, true)).toBe('fechado');
    expect(situacaoDoMes({ mes: 9, ano: 2026 }, hoje, false)).toBe('aberto');
    expect(situacaoDoMes({ mes: 10, ano: 2026 }, hoje, false)).toBe('aberto');
    expect(situacaoDoMes({ mes: 11, ano: 2026 }, hoje, false)).toBe('futuro');
  });
});

describe('mesAtual', () => {
  it('usa a data de Brasília', () => {
    // 01/11/2026 01:00 em UTC ainda é 31/10 em Brasília
    expect(mesAtual(new Date('2026-11-01T01:00:00Z'))).toEqual({ mes: 10, ano: 2026 });
    expect(mesAtual(new Date('2026-11-01T04:00:00Z'))).toEqual({ mes: 11, ano: 2026 });
  });
});
