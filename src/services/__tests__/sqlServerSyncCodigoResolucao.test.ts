import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/services/bancoHorasQuarentenaService', () => ({ bancoHorasQuarentenaService: {} }));
vi.mock('@/utils/apiConfig', () => ({ safeFetch: vi.fn() }));

import { safeFetch } from '@/utils/apiConfig';
import { sincronizarTrocasCodigoResolucao } from '../sqlServerSyncPesquisasService';

describe('sincronizarTrocasCodigoResolucao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chama o endpoint de trocas de código de resolução e retorna o resultado da API', async () => {
    const resultadoApi = { sucesso: true, total_processados: 3, sincronizados: 3, ignorados: 0, erros: 0, mensagens: ['ok'] };
    (safeFetch as any).mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(resultadoApi) });

    const resultado = await sincronizarTrocasCodigoResolucao('https://api.teste');

    expect(safeFetch).toHaveBeenCalledWith(
      'https://api.teste/api/sync-codigo-resolucao-incremental',
      expect.objectContaining({ method: 'POST' })
    );
    expect(resultado).toEqual(resultadoApi);
  });

  it('retorna falha com o status HTTP quando a API responde com erro', async () => {
    (safeFetch as any).mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) });

    const resultado = await sincronizarTrocasCodigoResolucao('https://api.teste');

    expect(resultado.sucesso).toBe(false);
    expect(resultado.mensagens).toEqual(['Erro HTTP: 500']);
  });

  it('avisa que o endpoint não existe quando a API responde 404', async () => {
    (safeFetch as any).mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve({}) });

    const resultado = await sincronizarTrocasCodigoResolucao('https://api.teste');

    expect(resultado.sucesso).toBe(false);
    expect(resultado.mensagens[0]).toContain('/api/sync-codigo-resolucao-incremental');
  });
});
