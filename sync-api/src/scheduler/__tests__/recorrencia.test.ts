import { describe, it, expect } from 'vitest';
import {
  calcularProximaExecucao,
  listarProximasExecucoes,
  validarRegra,
  RegraRecorrencia,
} from '../recorrencia';

// São Paulo = UTC-3 (sem horário de verão desde 2019).
// Os horários das regras são de São Paulo; as datas nos testes são UTC.
const utc = (iso: string) => new Date(iso);

const base: RegraRecorrencia = {
  frequencia: 'diario',
  dias_semana: [],
  dias_mes: [],
  ultimo_dia_mes: false,
  modo_horario: 'horarios',
  horarios: ['07:00'],
  intervalo_horas: null,
  hora_inicio: null,
  hora_fim: null,
};

describe('calcularProximaExecucao', () => {
  describe('diário com horários fixos', () => {
    const regra = { ...base, horarios: ['18:00', '07:00', '12:00'] };

    it('retorna o próximo horário do mesmo dia', () => {
      // 08:00 SP
      expect(calcularProximaExecucao(regra, utc('2026-09-24T11:00:00Z'))).toEqual(
        utc('2026-09-24T15:00:00Z') // 12:00 SP
      );
    });

    it('vira para o dia seguinte depois do último horário', () => {
      // 19:00 SP
      expect(calcularProximaExecucao(regra, utc('2026-09-24T22:00:00Z'))).toEqual(
        utc('2026-09-25T10:00:00Z') // 07:00 SP do dia 25
      );
    });

    it('é estritamente depois do instante informado', () => {
      // exatamente 12:00 SP
      expect(calcularProximaExecucao(regra, utc('2026-09-24T15:00:00Z'))).toEqual(
        utc('2026-09-24T21:00:00Z') // 18:00 SP
      );
    });

    it('usa o dia de São Paulo, não o dia UTC', () => {
      // 23:30 SP do dia 24 = 02:30 UTC do dia 25
      const regra2 = { ...base, horarios: ['23:45'] };
      expect(calcularProximaExecucao(regra2, utc('2026-09-25T02:30:00Z'))).toEqual(
        utc('2026-09-25T02:45:00Z') // 23:45 SP do dia 24
      );
    });
  });

  describe('intervalo a cada X horas', () => {
    it('gera horários a partir de hora_inicio até o fim do dia', () => {
      const regra = {
        ...base,
        modo_horario: 'intervalo' as const,
        horarios: [],
        intervalo_horas: 4,
        hora_inicio: '06:30',
      };
      // 11:00 SP -> próximos: 06:30, 10:30, 14:30...
      expect(calcularProximaExecucao(regra, utc('2026-09-24T14:00:00Z'))).toEqual(
        utc('2026-09-24T17:30:00Z') // 14:30 SP
      );
      // 23:00 SP -> 22:30 já passou -> 06:30 do dia seguinte
      expect(calcularProximaExecucao(regra, utc('2026-09-25T02:00:00Z'))).toEqual(
        utc('2026-09-25T09:30:00Z')
      );
    });

    it('respeita hora_fim (inclusiva)', () => {
      const regra = {
        ...base,
        modo_horario: 'intervalo' as const,
        horarios: [],
        intervalo_horas: 2,
        hora_inicio: '07:00:00',
        hora_fim: '19:00:00',
      };
      expect(listarProximasExecucoes(regra, 8, utc('2026-09-24T09:00:00Z'))).toEqual([
        utc('2026-09-24T10:00:00Z'), // 07
        utc('2026-09-24T12:00:00Z'), // 09
        utc('2026-09-24T14:00:00Z'), // 11
        utc('2026-09-24T16:00:00Z'), // 13
        utc('2026-09-24T18:00:00Z'), // 15
        utc('2026-09-24T20:00:00Z'), // 17
        utc('2026-09-24T22:00:00Z'), // 19
        utc('2026-09-25T10:00:00Z'), // 07 do dia seguinte
      ]);
    });
  });

  describe('semanal', () => {
    it('só roda nos dias da semana escolhidos', () => {
      // 2026-09-24 é quinta-feira (4)
      const regra = { ...base, frequencia: 'semanal' as const, dias_semana: [1, 3] }; // seg, qua
      expect(calcularProximaExecucao(regra, utc('2026-09-24T12:00:00Z'))).toEqual(
        utc('2026-09-28T10:00:00Z') // segunda 28/09 07:00 SP
      );
    });
  });

  describe('mensal', () => {
    it('roda nos dias do mês escolhidos', () => {
      const regra = { ...base, frequencia: 'mensal' as const, dias_mes: [1, 15] };
      expect(calcularProximaExecucao(regra, utc('2026-09-24T12:00:00Z'))).toEqual(
        utc('2026-10-01T10:00:00Z')
      );
    });

    it('pula o dia 31 em mês que não tem 31', () => {
      const regra = { ...base, frequencia: 'mensal' as const, dias_mes: [31] };
      // setembro tem 30 dias -> próximo é 31/10
      expect(calcularProximaExecucao(regra, utc('2026-09-01T12:00:00Z'))).toEqual(
        utc('2026-10-31T10:00:00Z')
      );
    });

    it('ultimo_dia_mes roda no último dia de cada mês', () => {
      const regra = { ...base, frequencia: 'mensal' as const, dias_mes: [], ultimo_dia_mes: true };
      expect(listarProximasExecucoes(regra, 3, utc('2026-09-24T12:00:00Z'))).toEqual([
        utc('2026-09-30T10:00:00Z'),
        utc('2026-10-31T10:00:00Z'),
        utc('2026-11-30T10:00:00Z'),
      ]);
    });

    it('vira o ano', () => {
      const regra = { ...base, frequencia: 'mensal' as const, dias_mes: [2] };
      expect(calcularProximaExecucao(regra, utc('2026-12-20T12:00:00Z'))).toEqual(
        utc('2027-01-02T10:00:00Z')
      );
    });

    it('fevereiro com ultimo_dia_mes', () => {
      const regra = { ...base, frequencia: 'mensal' as const, ultimo_dia_mes: true };
      expect(calcularProximaExecucao(regra, utc('2027-02-10T12:00:00Z'))).toEqual(
        utc('2027-02-28T10:00:00Z')
      );
    });
  });

  it('retorna null para regra sem nenhum horário possível', () => {
    expect(calcularProximaExecucao({ ...base, horarios: [] }, utc('2026-09-24T12:00:00Z'))).toBeNull();
  });
});

describe('validarRegra', () => {
  it('aceita regra válida', () => {
    expect(validarRegra(base)).toEqual([]);
  });

  it('rejeita horário mal formatado', () => {
    expect(validarRegra({ ...base, horarios: ['25:00'] })).not.toEqual([]);
  });

  it('exige dias na frequência semanal', () => {
    expect(validarRegra({ ...base, frequencia: 'semanal', dias_semana: [] })).not.toEqual([]);
  });

  it('exige dia do mês ou último dia na frequência mensal', () => {
    expect(validarRegra({ ...base, frequencia: 'mensal' })).not.toEqual([]);
  });

  it('exige intervalo e hora de início no modo intervalo', () => {
    expect(
      validarRegra({ ...base, modo_horario: 'intervalo', horarios: [], intervalo_horas: null })
    ).not.toEqual([]);
  });

  it('rejeita hora_fim antes de hora_inicio', () => {
    expect(
      validarRegra({
        ...base,
        modo_horario: 'intervalo',
        horarios: [],
        intervalo_horas: 2,
        hora_inicio: '10:00',
        hora_fim: '08:00',
      })
    ).not.toEqual([]);
  });
});
