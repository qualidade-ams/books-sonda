import { describe, it, expect } from 'vitest';
import { criarSupabaseEmMemoria } from '@/test/fakes/supabaseEmMemoria';
import { PerfisResumoService } from '../perfisResumoService';

const fake = () =>
  criarSupabaseEmMemoria(
    {},
    {
      perfis_resumo: ({ p_ids }: { p_ids: string[] }) =>
        [
          { id: 'u1', email: 'a@sonda.com', full_name: 'Pessoa A' },
          { id: 'u2', email: 'b@sonda.com', full_name: null },
        ].filter((p) => p_ids.includes(p.id)),
    }
  );

describe('PerfisResumoService.nomes', () => {
  it('devolve o nome de cada id pedido, sem repetir a consulta para ids iguais', async () => {
    const cliente = fake();
    const nomes = await new PerfisResumoService(cliente as any).nomes(['u1', 'u1', 'u2', null]);
    expect(nomes).toEqual({ u1: 'Pessoa A' });
    expect(cliente.chamadasRpc).toEqual([
      { nome: 'perfis_resumo', args: { p_ids: ['u1', 'u2'], p_emails: null } },
    ]);
  });

  it('sem ids, não consulta', async () => {
    const cliente = fake();
    expect(await new PerfisResumoService(cliente as any).nomes([null])).toEqual({});
    expect(cliente.chamadasRpc).toHaveLength(0);
  });

  it('sem permissão para os nomes, devolve vazio: a tela mostra só a data', async () => {
    const cliente = fake();
    cliente.rpc = async () => ({ data: null, error: { message: 'Sem permissão', code: '42501' } });
    expect(await new PerfisResumoService(cliente as any).nomes(['u1'])).toEqual({});
  });
});
