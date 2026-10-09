import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { criarSupabaseFake } from '../../__tests__/helpers/supabaseFake';
import { criarPoolFake } from '../../__tests__/helpers/poolFake';

const estado = vi.hoisted(() => {
  process.env.SUPABASE_URL = 'http://supabase.teste';
  process.env.SUPABASE_SERVICE_KEY = 'chave-de-teste';
  return { cliente: null as any };
});

vi.mock('dotenv', () => ({ default: { config: () => ({}) } }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (tabela: string) => estado.cliente.from(tabela) }),
}));

import { sincronizarApontamentosIncremental } from '../incrementalSyncApontamentosService';

describe('sincronizarApontamentosIncremental — consultas ao SQL Server', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    estado.cliente = criarSupabaseFake((tabela, chamadas) => {
      if (tabela === 'apontamentos_aranda' && chamadas.some(([m]) => m === 'maybeSingle')) {
        return { data: { data_ult_modificacao_geral: '2026-10-08T10:00:00.000Z' }, error: null };
      }
      return null;
    }).cliente;
  });

  afterEach(() => vi.restoreAllMocks());

  it('faz uma única consulta em AMSapontamento, sem queries de diagnóstico', async () => {
    const { pool, queries } = criarPoolFake();

    const resultado = await sincronizarApontamentosIncremental(pool);

    expect(resultado.sucesso).toBe(true);
    const emApontamento = queries.filter((q) => /FROM\s+AMSapontamento\b/.test(q));
    expect(emApontamento).toHaveLength(1);
    expect(emApontamento[0]).toContain('@dataInicio');
    expect(emApontamento[0]).toContain("Caso_Grupo NOT LIKE 'AMS SAP%'");
    expect(queries.some((q) => /SQL_VARIANT_PROPERTY|COUNT\(\*\)|MIN\(CAST/.test(q))).toBe(false);
  });

  it('busca desde a última data sincronizada com folga de um dia', async () => {
    const { pool, entradas } = criarPoolFake();

    await sincronizarApontamentosIncremental(pool);

    const dataInicio = entradas.find(([nome]) => nome === 'dataInicio')?.[2] as Date;
    expect(dataInicio.toISOString()).toBe('2026-10-07T10:00:00.000Z');
  });
});
