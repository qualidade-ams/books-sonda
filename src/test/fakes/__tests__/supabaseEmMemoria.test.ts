import { describe, it, expect } from 'vitest';
import { criarSupabaseEmMemoria } from '../supabaseEmMemoria';

describe('supabaseEmMemoria', () => {
  const linhas = () => [
    { id: 'a', empresa_id: 'e1', mes: 1, ano: 2026, valor: 10 },
    { id: 'b', empresa_id: 'e1', mes: 2, ano: 2026, valor: 30 },
    { id: 'c', empresa_id: 'e2', mes: 1, ano: 2026, valor: 20 },
  ];

  it('filtra, ordena e limita', async () => {
    const db = criarSupabaseEmMemoria({ t: linhas() });

    const { data } = await db.from('t').select('*').eq('empresa_id', 'e1').gte('valor', 10).order('valor', { ascending: false }).limit(1);

    expect(data.map((l: any) => l.id)).toEqual(['b']);
  });

  it('is(null), in e lte', async () => {
    const db = criarSupabaseEmMemoria({ t: [...linhas(), { id: 'd', empresa_id: null, mes: 3, ano: 2026, valor: 5 }] });

    expect((await db.from('t').select().is('empresa_id', null)).data.map((l: any) => l.id)).toEqual(['d']);
    expect((await db.from('t').select().in('id', ['a', 'c']).lte('valor', 15)).data.map((l: any) => l.id)).toEqual(['a']);
  });

  it('single: erro sem linha; maybeSingle: null sem erro', async () => {
    const db = criarSupabaseEmMemoria({ t: linhas() });

    expect((await db.from('t').select().eq('id', 'x').single()).error).not.toBeNull();
    expect(await db.from('t').select().eq('id', 'x').maybeSingle()).toEqual({ data: null, error: null });
    expect((await db.from('t').select().eq('id', 'a').single()).data).toMatchObject({ valor: 10 });
  });

  it('upsert atualiza pela chave de conflito ou insere', async () => {
    const db = criarSupabaseEmMemoria({ t: linhas() });

    const { data } = await db.from('t').upsert({ empresa_id: 'e1', mes: 1, ano: 2026, valor: 99 }, { onConflict: 'empresa_id,mes,ano' }).select().single();
    await db.from('t').upsert({ empresa_id: 'e3', mes: 1, ano: 2026, valor: 1 }, { onConflict: 'empresa_id,mes,ano' });

    expect(data).toMatchObject({ id: 'a', valor: 99 });
    expect(db.tabelas.t).toHaveLength(4);
  });

  it('update e delete afetam só as linhas filtradas', async () => {
    const db = criarSupabaseEmMemoria({ t: linhas() });

    await db.from('t').update({ valor: 0 }).eq('empresa_id', 'e2');
    await db.from('t').delete().eq('id', 'b');

    expect(db.tabelas.t.map((l) => [l.id, l.valor])).toEqual([
      ['a', 10],
      ['c', 0],
    ]);
  });

  it('rpc devolve o resultado da função registrada e erro para função inexistente', async () => {
    const db = criarSupabaseEmMemoria({}, { soma: ({ a, b }) => a + b });

    expect(await db.rpc('soma', { a: 1, b: 2 })).toEqual({ data: 3, error: null });
    expect((await db.rpc('outra')).error).not.toBeNull();
    expect(db.chamadasRpc.map((c) => c.nome)).toEqual(['soma', 'outra']);
  });
});
