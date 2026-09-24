import { describe, it, expect, beforeAll } from 'vitest';
import i18next, { type TFunction } from 'i18next';
import ptBR from '@/i18n/locales/pt-BR';
import { descreverRecorrencia } from '../descreverRecorrencia';
import type { RegraRecorrencia } from '@/types/syncAgendamentos';

let t: TFunction;

beforeAll(async () => {
  const instancia = i18next.createInstance();
  await instancia.init({
    lng: 'pt-BR',
    resources: { 'pt-BR': { translation: ptBR } },
    interpolation: { escapeValue: false },
  });
  t = instancia.t;
});

const base: RegraRecorrencia = {
  frequencia: 'diario',
  dias_semana: [],
  dias_mes: [],
  ultimo_dia_mes: false,
  modo_horario: 'horarios',
  horarios: ['12:00', '07:00'],
  intervalo_horas: null,
  hora_inicio: null,
  hora_fim: null,
};

describe('descreverRecorrencia', () => {
  it('diário com horários fixos (ordenados)', () => {
    expect(descreverRecorrencia(base, t)).toBe('Todos os dias, às 07:00 e 12:00');
  });

  it('três horários usam vírgula e "e"', () => {
    expect(descreverRecorrencia({ ...base, horarios: ['18:00', '07:00', '12:00'] }, t)).toBe(
      'Todos os dias, às 07:00, 12:00 e 18:00'
    );
  });

  it('intervalo com início e fim', () => {
    expect(
      descreverRecorrencia(
        { ...base, modo_horario: 'intervalo', horarios: [], intervalo_horas: 2, hora_inicio: '07:00:00', hora_fim: '19:00:00' },
        t
      )
    ).toBe('Todos os dias, a cada 2h das 07:00 às 19:00');
  });

  it('intervalo sem fim', () => {
    expect(
      descreverRecorrencia({ ...base, modo_horario: 'intervalo', horarios: [], intervalo_horas: 4, hora_inicio: '06:30' }, t)
    ).toBe('Todos os dias, a cada 4h a partir das 06:30');
  });

  it('semanal lista os dias começando na segunda', () => {
    expect(descreverRecorrencia({ ...base, frequencia: 'semanal', dias_semana: [0, 3, 1], horarios: ['07:00'] }, t)).toBe(
      'Seg, qua e dom, às 07:00'
    );
  });

  it('semanal de segunda a sexta vira "dias úteis"', () => {
    expect(
      descreverRecorrencia({ ...base, frequencia: 'semanal', dias_semana: [1, 2, 3, 4, 5], horarios: ['07:00'] }, t)
    ).toBe('Dias úteis (seg a sex), às 07:00');
  });

  it('semanal com todos os dias vira "todos os dias"', () => {
    expect(
      descreverRecorrencia({ ...base, frequencia: 'semanal', dias_semana: [0, 1, 2, 3, 4, 5, 6], horarios: ['07:00'] }, t)
    ).toBe('Todos os dias, às 07:00');
  });

  it('mensal com um dia', () => {
    expect(descreverRecorrencia({ ...base, frequencia: 'mensal', dias_mes: [5], horarios: ['07:00'] }, t)).toBe(
      'Dia 5 do mês, às 07:00'
    );
  });

  it('mensal com vários dias e último dia', () => {
    expect(
      descreverRecorrencia(
        { ...base, frequencia: 'mensal', dias_mes: [15, 1], ultimo_dia_mes: true, horarios: ['07:00'] },
        t
      )
    ).toBe('Dias 1, 15 e último dia do mês, às 07:00');
  });

  it('mensal só no último dia', () => {
    expect(
      descreverRecorrencia({ ...base, frequencia: 'mensal', ultimo_dia_mes: true, horarios: ['07:00'] }, t)
    ).toBe('Último dia do mês, às 07:00');
  });
});
