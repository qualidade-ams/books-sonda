import { describe, it, expect } from 'vitest';
import { preverProximaExecucao } from '../proximaExecucao';

// segunda, 05/10/2026 09:30 em São Paulo
const AGORA = new Date('2026-10-05T12:30:00Z');

const regra = {
  ativo: true,
  frequencia: 'semanal' as const,
  dias_semana: [1],
  dias_mes: [],
  ultimo_dia_mes: false,
  modo_horario: 'horarios' as const,
  horarios: ['09:40'],
  intervalo_horas: null,
  hora_inicio: null,
  hora_fim: null
};

describe('preverProximaExecucao (mesma lógica do agendador do sync-api)', () => {
  it('calcula o próximo horário da regra a partir de agora', () => {
    expect(preverProximaExecucao(regra, AGORA)).toBe('2026-10-05T12:40:00.000Z');
  });

  it('passado o horário de hoje, vai para a próxima semana', () => {
    expect(preverProximaExecucao(regra, new Date('2026-10-05T12:45:00Z'))).toBe('2026-10-12T12:40:00.000Z');
  });

  it('agendamento inativo ou com regra inválida não tem próximo envio', () => {
    expect(preverProximaExecucao({ ...regra, ativo: false }, AGORA)).toBeNull();
    expect(preverProximaExecucao({ ...regra, horarios: [] }, AGORA)).toBeNull();
  });
});
