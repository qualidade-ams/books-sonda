import { describe, it, expect } from 'vitest';
import { execucoesParaPrevisao } from '../previsaoExecucoes';

const agora = new Date('2026-09-28T15:00:00Z'); // 12:00 em São Paulo

describe('execucoesParaPrevisao', () => {
  it('mostra todas as execuções das próximas 24 horas', () => {
    // a cada 2h: 13:30 hoje até 11:30 de amanhã (SP) = 12 execuções dentro de 24h
    const execucoes = Array.from({ length: 20 }, (_, i) =>
      new Date(Date.parse('2026-09-28T16:30:00Z') + i * 2 * 3600_000).toISOString()
    );

    const r = execucoesParaPrevisao(execucoes, agora);

    expect(r.periodo).toBe('24h');
    expect(r.execucoes).toHaveLength(12);
    expect(r.execucoes[0]).toBe('2026-09-28T16:30:00.000Z');
    expect(r.execucoes[11]).toBe('2026-09-29T14:30:00.000Z');
  });

  it('inclui uma execução exatamente 24 horas depois', () => {
    const r = execucoesParaPrevisao(['2026-09-29T15:00:00.000Z'], agora);
    expect(r).toEqual({ periodo: '24h', execucoes: ['2026-09-29T15:00:00.000Z'] });
  });

  it('sem nada nas próximas 24 horas (semanal/mensal), mostra as próximas 5', () => {
    const semanais = Array.from({ length: 8 }, (_, i) =>
      new Date(Date.parse('2026-10-05T10:00:00Z') + i * 7 * 86400_000).toISOString()
    );

    const r = execucoesParaPrevisao(semanais, agora);

    expect(r.periodo).toBe('proximas');
    expect(r.execucoes).toEqual(semanais.slice(0, 5));
  });

  it('lista vazia continua vazia', () => {
    expect(execucoesParaPrevisao([], agora)).toEqual({ periodo: 'proximas', execucoes: [] });
  });
});
