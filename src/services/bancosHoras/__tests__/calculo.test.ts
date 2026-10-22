import { describe, it, expect } from 'vitest';
import {
  mesesDesdeVigencia,
  estaVigente,
  ehFimDePeriodo,
  inicioDoCiclo,
  calcularRepasse,
  calcularSaldo,
  aplicarRegraDeSaida,
  valorExcedente,
  type ParametrosCalculo,
} from '../calculo';

const trimestral: ParametrosCalculo = {
  tipoContrato: 'horas',
  periodoApuracao: 3,
  inicioVigencia: { mes: 1, ano: 2025 },
  repasseEspecial: 'nenhum',
};

// TK ELEVADORES: semestral, dois trimestres, 100% dentro e 70% entre trimestres
const porPeriodo: ParametrosCalculo = {
  tipoContrato: 'horas',
  periodoApuracao: 6,
  inicioVigencia: { mes: 1, ano: 2025 },
  repasseEspecial: 'por_periodo',
  duracaoPeriodoMeses: 3,
  periodosAteZerar: 2,
};
const pctPorPeriodo = { mensal: 50, dentroPeriodo: 100, entrePeriodos: 70 };

describe('mesesDesdeVigencia', () => {
  it('conta a partir de 0 no mês de início, atravessando o ano', () => {
    expect(mesesDesdeVigencia(trimestral, { mes: 1, ano: 2025 })).toBe(0);
    expect(mesesDesdeVigencia(trimestral, { mes: 12, ano: 2025 })).toBe(11);
    expect(mesesDesdeVigencia(trimestral, { mes: 1, ano: 2026 })).toBe(12);
  });

  it('é negativo antes da vigência', () => {
    expect(mesesDesdeVigencia(trimestral, { mes: 12, ano: 2024 })).toBe(-1);
  });
});

describe('ehFimDePeriodo (RC-28)', () => {
  it('é o último mês de cada período, contado desde a vigência', () => {
    expect(ehFimDePeriodo(trimestral, { mes: 3, ano: 2025 })).toBe(true);
    expect(ehFimDePeriodo(trimestral, { mes: 4, ano: 2025 })).toBe(false);
    expect(ehFimDePeriodo(trimestral, { mes: 12, ano: 2025 })).toBe(true);
  });

  it('respeita vigência que não começa em janeiro', () => {
    const fev = { ...trimestral, inicioVigencia: { mes: 2, ano: 2025 } };
    expect(ehFimDePeriodo(fev, { mes: 4, ano: 2025 })).toBe(true);
    expect(ehFimDePeriodo(fev, { mes: 1, ano: 2026 })).toBe(true);
    expect(ehFimDePeriodo(fev, { mes: 3, ano: 2025 })).toBe(false);
  });

  it('nunca é fim de período antes da vigência', () => {
    expect(ehFimDePeriodo(trimestral, { mes: 12, ano: 2024 })).toBe(false);
  });
});

// Trimestral desde janeiro de 2025, encerrado em maio: no meio do segundo período
const encerrado: ParametrosCalculo = { ...trimestral, fimVigencia: { mes: 5, ano: 2025 } };

describe('estaVigente', () => {
  it('vale do início ao fim da vigência, inclusive', () => {
    expect(estaVigente(encerrado, { mes: 12, ano: 2024 })).toBe(false);
    expect(estaVigente(encerrado, { mes: 1, ano: 2025 })).toBe(true);
    expect(estaVigente(encerrado, { mes: 5, ano: 2025 })).toBe(true);
    expect(estaVigente(encerrado, { mes: 6, ano: 2025 })).toBe(false);
  });

  it('sem fim, vale por tempo indeterminado', () => {
    expect(estaVigente(trimestral, { mes: 1, ano: 2040 })).toBe(true);
    expect(estaVigente({ ...trimestral, fimVigencia: null }, { mes: 1, ano: 2040 })).toBe(true);
  });
});

describe('fim da vigência (P1)', () => {
  it('o último mês é fim de período, mesmo no meio do período', () => {
    expect(ehFimDePeriodo(encerrado, { mes: 4, ano: 2025 })).toBe(false);
    expect(ehFimDePeriodo(encerrado, { mes: 5, ano: 2025 })).toBe(true);
  });

  it('depois do fim não há fim de período', () => {
    expect(ehFimDePeriodo(encerrado, { mes: 6, ano: 2025 })).toBe(false);
  });

  it('no último mês, saldo positivo zera e negativo vira excedente', () => {
    const maio = { mes: 5, ano: 2025 };
    expect(aplicarRegraDeSaida(encerrado, maio, 500, { mensal: 50 }, 'horas')).toEqual({
      repasse: 0,
      excedente: 0,
      fimPeriodo: true,
      transicaoPeriodo: false,
    });
    expect(aplicarRegraDeSaida(encerrado, maio, -300, { mensal: 50 }, 'horas')).toMatchObject({
      repasse: 0,
      excedente: 300,
    });
  });

  it('recusa mês depois do fim da vigência', () => {
    const junho = { mes: 6, ano: 2025 };
    expect(() => inicioDoCiclo(encerrado, junho)).toThrow(/depois do fim da vigência/);
    expect(() => aplicarRegraDeSaida(encerrado, junho, 0, { mensal: 50 }, 'horas')).toThrow(
      /depois do fim da vigência/
    );
  });
});

describe('inicioDoCiclo', () => {
  it('devolve o primeiro mês do período que contém o mês', () => {
    const fev = { ...trimestral, inicioVigencia: { mes: 2, ano: 2025 } };
    expect(inicioDoCiclo(fev, { mes: 5, ano: 2026 })).toEqual({ mes: 5, ano: 2026 });
    expect(inicioDoCiclo(fev, { mes: 7, ano: 2026 })).toEqual({ mes: 5, ano: 2026 });
    expect(inicioDoCiclo(fev, { mes: 1, ano: 2026 })).toEqual({ mes: 11, ano: 2025 });
  });

  it('recusa mês anterior à vigência (RC-38)', () => {
    expect(() => inicioDoCiclo(trimestral, { mes: 12, ano: 2024 })).toThrow(/antes do início/);
  });
});

describe('calcularRepasse (RC-29, RC-56)', () => {
  it('horas positivas: aplica o percentual e arredonda ao minuto mais próximo', () => {
    expect(calcularRepasse(125, 50, 'horas')).toBe(63);
    expect(calcularRepasse(600, 100, 'horas')).toBe(600);
  });

  it('tickets positivos: arredonda para baixo', () => {
    expect(calcularRepasse(5, 50, 'tickets')).toBe(2);
  });

  it('respeita 0% (D-04)', () => {
    expect(calcularRepasse(600, 0, 'horas')).toBe(0);
  });

  it('saldo negativo repassa 100%, qualquer que seja o percentual', () => {
    expect(calcularRepasse(-90, 0, 'horas')).toBe(-90);
    expect(calcularRepasse(-3, 50, 'tickets')).toBe(-3);
  });

  it('recusa percentual fora de 0 a 100', () => {
    expect(() => calcularRepasse(100, 101, 'horas')).toThrow(/percentual/i);
    expect(() => calcularRepasse(100, -1, 'horas')).toThrow(/percentual/i);
  });
});

describe('calcularSaldo (RC-21 a RC-27)', () => {
  it('saldo = baseline + repasse anterior − (consumo + requerimentos + saídas − entradas)', () => {
    const r = calcularSaldo(
      {
        baseline: 2400,
        consumo: 1500,
        requerimentos: 200,
        reajusteEntrada: 60,
        reajusteSaida: 120,
      },
      300
    );
    expect(r).toEqual({
      baseline: 2400,
      repasseAnterior: 300,
      saldoAUtilizar: 2700,
      consumo: 1500,
      requerimentos: 200,
      reajustes: -60,
      consumoTotal: 1760,
      saldo: 940,
    });
  });

  it('repasse anterior negativo reduz o saldo a utilizar', () => {
    const r = calcularSaldo(
      { baseline: 600, consumo: 0, requerimentos: 0, reajusteEntrada: 0, reajusteSaida: 0 },
      -90
    );
    expect(r.saldoAUtilizar).toBe(510);
    expect(r.saldo).toBe(510);
  });
});

describe('aplicarRegraDeSaida', () => {
  const pct = { mensal: 50 };

  it('mês comum com saldo positivo repassa o percentual mensal', () => {
    expect(aplicarRegraDeSaida(trimestral, { mes: 1, ano: 2025 }, 940, pct, 'horas')).toEqual({
      repasse: 470,
      excedente: 0,
      fimPeriodo: false,
      transicaoPeriodo: false,
    });
  });

  it('mês comum com saldo negativo repassa o déficit inteiro', () => {
    const r = aplicarRegraDeSaida(trimestral, { mes: 2, ano: 2025 }, -390, pct, 'horas');
    expect(r.repasse).toBe(-390);
    expect(r.excedente).toBe(0);
  });

  it('fim de período com saldo positivo zera (RC-30)', () => {
    const r = aplicarRegraDeSaida(trimestral, { mes: 3, ano: 2025 }, 940, pct, 'horas');
    expect(r).toEqual({ repasse: 0, excedente: 0, fimPeriodo: true, transicaoPeriodo: false });
  });

  it('fim de período com saldo negativo vira excedente (RC-30, RC-34)', () => {
    const r = aplicarRegraDeSaida(trimestral, { mes: 3, ano: 2025 }, -390, pct, 'horas');
    expect(r).toEqual({ repasse: 0, excedente: 390, fimPeriodo: true, transicaoPeriodo: false });
  });

  it('recusa mês anterior à vigência', () => {
    expect(() => aplicarRegraDeSaida(trimestral, { mes: 12, ano: 2024 }, 0, pct, 'horas')).toThrow(
      /antes do início/
    );
  });

  describe('repasse por período (RC-32 corrigido)', () => {
    it('dentro do subperíodo usa o percentual dentro', () => {
      const r = aplicarRegraDeSaida(porPeriodo, { mes: 1, ano: 2025 }, 300, pctPorPeriodo, 'horas');
      expect(r).toEqual({ repasse: 300, excedente: 0, fimPeriodo: false, transicaoPeriodo: false });
    });

    it('último mês do subperíodo usa o percentual entre períodos', () => {
      const r = aplicarRegraDeSaida(porPeriodo, { mes: 3, ano: 2025 }, 300, pctPorPeriodo, 'horas');
      expect(r).toEqual({ repasse: 210, excedente: 0, fimPeriodo: false, transicaoPeriodo: true });
    });

    it('fim do ciclo zera; no ano seguinte o ciclo recomeça', () => {
      expect(
        aplicarRegraDeSaida(porPeriodo, { mes: 6, ano: 2025 }, 300, pctPorPeriodo, 'horas').repasse
      ).toBe(0);
      expect(
        aplicarRegraDeSaida(porPeriodo, { mes: 9, ano: 2025 }, 300, pctPorPeriodo, 'horas')
          .transicaoPeriodo
      ).toBe(true);
      expect(
        aplicarRegraDeSaida(porPeriodo, { mes: 12, ano: 2025 }, 300, pctPorPeriodo, 'horas')
          .fimPeriodo
      ).toBe(true);
      expect(
        aplicarRegraDeSaida(porPeriodo, { mes: 3, ano: 2026 }, 300, pctPorPeriodo, 'horas')
          .transicaoPeriodo
      ).toBe(true);
    });

    it('saldo negativo no fim do ciclo vira excedente (corrige RC-164)', () => {
      const r = aplicarRegraDeSaida(
        porPeriodo,
        { mes: 6, ano: 2025 },
        -120,
        pctPorPeriodo,
        'horas'
      );
      expect(r).toEqual({ repasse: 0, excedente: 120, fimPeriodo: true, transicaoPeriodo: false });
    });

    it('saldo negativo na transição repassa 100%', () => {
      expect(
        aplicarRegraDeSaida(porPeriodo, { mes: 3, ano: 2025 }, -120, pctPorPeriodo, 'horas').repasse
      ).toBe(-120);
    });

    it('vigência em julho: posições corretas no ano seguinte (corrige RC-165)', () => {
      const jul = { ...porPeriodo, inicioVigencia: { mes: 7, ano: 2025 } };
      expect(aplicarRegraDeSaida(jul, { mes: 1, ano: 2026 }, 300, pctPorPeriodo, 'horas')).toEqual({
        repasse: 300,
        excedente: 0,
        fimPeriodo: false,
        transicaoPeriodo: false,
      });
      expect(
        aplicarRegraDeSaida(jul, { mes: 3, ano: 2026 }, 300, pctPorPeriodo, 'horas')
          .transicaoPeriodo
      ).toBe(true);
      expect(
        aplicarRegraDeSaida(jul, { mes: 6, ano: 2026 }, 300, pctPorPeriodo, 'horas').fimPeriodo
      ).toBe(true);
    });

    it('recusa período de apuração diferente de duração × períodos (Q3)', () => {
      const incoerente = { ...porPeriodo, periodoApuracao: 3 };
      expect(() =>
        aplicarRegraDeSaida(incoerente, { mes: 1, ano: 2025 }, 0, pctPorPeriodo, 'horas')
      ).toThrow(/duração × períodos/);
    });

    it('recusa percentuais por período ausentes', () => {
      expect(() =>
        aplicarRegraDeSaida(porPeriodo, { mes: 1, ano: 2025 }, 0, { mensal: 50 }, 'horas')
      ).toThrow(/percentual/i);
    });
  });
});

describe('valorExcedente (RC-76)', () => {
  it('horas: minutos / 60 × taxa, arredondado a 2 casas', () => {
    expect(valorExcedente(390, 'horas', 150)).toBe(975);
    expect(valorExcedente(125, 'horas', 133.33)).toBe(277.77);
  });

  it('tickets: quantidade × taxa', () => {
    expect(valorExcedente(3, 'tickets', 210.5)).toBe(631.5);
  });

  it('sem taxa, o valor é 0 (RC-75)', () => {
    expect(valorExcedente(390, 'horas', null)).toBe(0);
  });
});
