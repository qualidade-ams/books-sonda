import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { criarSupabaseFake, tem, chamadasDe, type Consulta } from '../../__tests__/helpers/supabaseFake';
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

  it('faz só a consulta incremental e a de chaves em AMSapontamento, sem queries de diagnóstico', async () => {
    const { pool, queries } = criarPoolFake();

    const resultado = await sincronizarApontamentosIncremental(pool);

    expect(resultado.sucesso).toBe(true);
    const emApontamento = queries.filter((q) => /FROM\s+AMSapontamento\b/.test(q));
    expect(emApontamento).toHaveLength(2);
    expect(emApontamento[0]).toContain('@dataInicio');
    expect(emApontamento[0]).toContain("Caso_Grupo NOT LIKE 'AMS SAP%'");
    expect(emApontamento[1]).toContain('@dataReconciliacao');
    expect(emApontamento[1]).toContain("Caso_Grupo NOT LIKE 'AMS SAP%'");
    expect(queries.some((q) => /SQL_VARIANT_PROPERTY|COUNT\(\*\)|MIN\(CAST/.test(q))).toBe(false);
  });

  it('busca desde a última data sincronizada com folga de um dia', async () => {
    const { pool, entradas } = criarPoolFake();

    await sincronizarApontamentosIncremental(pool);

    const dataInicio = entradas.find(([nome]) => nome === 'dataInicio')?.[2] as Date;
    expect(dataInicio.toISOString()).toBe('2026-10-07T10:00:00.000Z');
  });
});

describe('sincronizarApontamentosIncremental — reconciliação por chave', () => {
  const ID_EXISTENTE = 'AMSapontamento|9621743|TK-9622342';
  const ID_FALTANTE = 'AMSapontamento|9621743|TK-9648529';
  let consultas: Consulta[];

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-03T12:00:00.000Z'));
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fake = criarSupabaseFake((tabela, chamadas) => {
      if (tabela !== 'apontamentos_aranda') return null;
      if (chamadas.some(([m]) => m === 'maybeSingle')) {
        // Registro existente por id_externo: nenhum; última data sincronizada: 02/11
        if (tem(chamadas, 'eq', 'id_externo', ID_FALTANTE)) return { data: null, error: null };
        return { data: { data_ult_modificacao_geral: '2026-11-03T05:59:29.000Z' }, error: null };
      }
      if (tem(chamadas, 'select', 'id_externo')) return { data: [{ id_externo: ID_EXISTENTE }], error: null };
      return null;
    });
    estado.cliente = fake.cliente;
    consultas = fake.consultas;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // Tarefa criada em 27/10 com atividade em 29/10: entrou no AMSapontamento depois
  // que a janela incremental (Data_Ult_Modificacao_Geral) já tinha passado por 27/10
  const tarefaAtrasada = {
    Nro_Chamado: '9621743',
    Nro_Tarefa: 'TK-9648529',
    Caso_Grupo: 'AMS APL - IMPORTACAO - N2',
    Data_Ult_Modificacao_Geral: new Date('2026-10-27T10:32:17.553Z'),
    Data_Atividade: new Date('2026-10-29T10:30:49.557Z'),
  };

  const responder = (q: string) => {
    if (q.includes('@dataReconciliacao')) {
      return [
        { Nro_Chamado: '9621743', Nro_Tarefa: 'TK-9622342' },
        { Nro_Chamado: '9621743', Nro_Tarefa: 'TK-9648529' },
      ];
    }
    if (q.includes('@chamado0')) return [tarefaAtrasada];
    return [];
  };

  it('insere a tarefa que está no SQL Server, mas ficou fora da janela incremental', async () => {
    const { pool, entradas } = criarPoolFake(responder);

    const resultado = await sincronizarApontamentosIncremental(pool);

    expect(resultado.inseridos).toBe(1);
    expect(resultado.mensagens.some((m) => m.includes('1 tarefa(s) faltando no Supabase'))).toBe(true);
    const inserts = chamadasDe(consultas, 'apontamentos_aranda', 'insert');
    expect(inserts).toHaveLength(1);
    expect(inserts[0][0].id_externo).toBe(ID_FALTANTE);
    // busca a linha completa só da chave faltante
    expect(entradas.filter(([nome]) => nome.startsWith('chamado')).map(([, , v]) => v)).toEqual(['9621743']);
    expect(entradas.filter(([nome]) => nome.startsWith('tarefa')).map(([, , v]) => v)).toEqual(['TK-9648529']);
  });

  it('confere as chaves dos últimos 60 dias de atividade', async () => {
    const { pool, entradas } = criarPoolFake(responder);

    await sincronizarApontamentosIncremental(pool);

    const corte = entradas.find(([nome]) => nome === 'dataReconciliacao')?.[2] as Date;
    expect(corte.toISOString()).toBe('2026-09-04T12:00:00.000Z');
  });

  it('não busca linhas completas quando nenhuma chave falta', async () => {
    const { pool, queries } = criarPoolFake((q) =>
      q.includes('@dataReconciliacao') ? [{ Nro_Chamado: '9621743', Nro_Tarefa: 'TK-9622342' }] : []
    );

    const resultado = await sincronizarApontamentosIncremental(pool);

    expect(resultado.inseridos).toBe(0);
    expect(queries.some((q) => q.includes('@chamado0'))).toBe(false);
  });
});
