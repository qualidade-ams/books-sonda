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

import { sincronizarTicketsIncremental } from '../incrementalSyncTicketsService';

describe('sincronizarTicketsIncremental — consultas ao SQL Server', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    estado.cliente = criarSupabaseFake(() => null).cliente;
  });

  afterEach(() => vi.restoreAllMocks());

  it('faz uma única consulta em AMSticketsabertos, sem queries de diagnóstico', async () => {
    const { pool, queries } = criarPoolFake();

    const resultado = await sincronizarTicketsIncremental(pool, '2026-10-01');

    expect(resultado.sucesso).toBe(true);
    const emTickets = queries.filter((q) => /FROM\s+AMSticketsabertos\b/.test(q));
    expect(emTickets).toHaveLength(1);
    expect(emTickets[0]).toContain('@dataInicio');
    expect(emTickets[0]).toContain("Nome_Grupo NOT LIKE 'AMS SAP%'");
    expect(queries.some((q) => /SQL_VARIANT_PROPERTY|COUNT\(\*\)|MIN\(CAST/.test(q))).toBe(false);
  });
});
