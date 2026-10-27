import { describe, it, expect, vi } from 'vitest';
import { pedirRegularizacao, type EnvelopeRegularizacao } from '../envioRegularizacao';
import type { EmailData } from '@/services/emailService';

const item = (retroativoId: string, itemId: string, consultor: string) => ({
  retroativoId,
  itemId,
  empresa: 'ALFA',
  chamado: `CH-${itemId}`,
  tarefa: `T-${itemId}`,
  consultor,
  minutos: 60,
  mes: { ano: 2026, mes: 9 },
});

const ENVELOPES: EnvelopeRegularizacao[] = [
  {
    consultor: 'Ana Souza',
    email: 'ana@sonda.com',
    itens: [item('r1', 'ap1', 'Ana Souza'), item('r2', 'ap2', 'Ana Souza')],
  },
  { consultor: 'Bruno Lima', email: 'bruno@sonda.com', itens: [item('r1', 'ap3', 'Bruno Lima')] },
  { consultor: 'Carla Dias', email: null, itens: [item('r1', 'ap4', 'Carla Dias')] },
];

describe('pedirRegularizacao', () => {
  it('um e-mail por consultor com e-mail; marca avisados os itens de quem recebeu', async () => {
    const enviarEmail = vi.fn(
      async (dados: EmailData): Promise<{ success: boolean; error?: string }> =>
        [dados.to].flat()[0] === 'bruno@sonda.com'
          ? { success: false, error: 'Caixa cheia' }
          : { success: true }
    );
    const registrarAviso = vi.fn(async () => undefined);

    const resultado = await pedirRegularizacao(
      { envelopes: ENVELOPES, copia: ['qualidade@sonda.com'] },
      { enviarEmail, registrarAviso }
    );

    expect(enviarEmail).toHaveBeenCalledTimes(2);
    const [primeiro] = enviarEmail.mock.calls[0] as unknown as [Record<string, any>];
    expect(primeiro).toMatchObject({
      to: ['ana@sonda.com'],
      cc: ['qualidade@sonda.com'],
      subject: 'Ajuste de Apontamento - Banco de Horas',
    });
    expect(primeiro.html).toContain('Prezado(a) Ana,');
    expect(primeiro.html).toContain('CH-ap2');

    // Só os itens da Ana, agrupados pelo retroativo
    expect(registrarAviso).toHaveBeenCalledTimes(2);
    expect(registrarAviso).toHaveBeenCalledWith('r1', ['ap1']);
    expect(registrarAviso).toHaveBeenCalledWith('r2', ['ap2']);

    expect(resultado).toEqual({
      enviados: ['Ana Souza'],
      semEmail: ['Carla Dias'],
      falhas: [{ consultor: 'Bruno Lima', erro: 'Caixa cheia' }],
    });
  });

  it('e-mail enviado mas sem a marca de avisado: vira falha com a explicação', async () => {
    const resultado = await pedirRegularizacao(
      { envelopes: [ENVELOPES[1]], copia: [] },
      {
        enviarEmail: vi.fn(async () => ({ success: true })),
        registrarAviso: vi.fn(async () => Promise.reject(new Error('sem rede'))),
      }
    );
    expect(resultado.enviados).toEqual([]);
    expect(resultado.falhas).toEqual([
      {
        consultor: 'Bruno Lima',
        erro: expect.stringMatching(/enviado, mas não ficou marcado.*sem rede/),
      },
    ]);
  });
});
