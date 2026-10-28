import { describe, it, expect, vi } from 'vitest';
import { criarModoSombra, type PacoteComparacao } from '../modoSombraService';

const resumo = { empresas: 2, comparadas: 2, removidas: 0, fechamentos: 1, erros: 0 };

function criar(agora: Date, fecharDesde: string | null = '2026-11-01') {
  const pacote: PacoteComparacao = { rodarModoSombra: vi.fn(async () => resumo) };
  let relogio = agora;
  const modo = criarModoSombra({
    supabase: { from: vi.fn() } as any,
    pacote,
    fecharDesde,
    agora: () => relogio,
  });
  return { modo, pacote, avancar: (d: Date) => (relogio = d) };
}

describe('modoSombraService', () => {
  it('primeira rodada do dia depois das 6h de Brasília: compara tudo, no mês corrente de Brasília', async () => {
    // 02:00 UTC de 01/11 = 23:00 de 31/10 em Brasília
    const { modo, pacote } = criar(new Date('2026-11-01T02:00:00Z'));
    const r = await modo.executarEtapa();

    expect(pacote.rodarModoSombra).toHaveBeenCalledWith(expect.anything(), {
      hoje: { mes: 10, ano: 2026 },
      fecharDesde: '2026-11-01',
      somenteFechamento: false,
    });
    expect(r).toEqual({ ...resumo, completa: true });
  });

  it('nas sincronizações seguintes do mesmo dia: só o fechamento em sombra', async () => {
    const { modo, pacote, avancar } = criar(new Date('2026-11-03T10:00:00Z'));
    await modo.executarEtapa();
    avancar(new Date('2026-11-03T15:00:00Z'));
    const r = await modo.executarEtapa();

    expect(vi.mocked(pacote.rodarModoSombra).mock.calls[1][1]).toMatchObject({ somenteFechamento: true });
    expect(r.completa).toBe(false);
  });

  it('antes das 6h de Brasília: só o fechamento; depois das 6h, a rodada completa do dia', async () => {
    // 08:00 UTC = 05:00 em Brasília
    const { modo, pacote, avancar } = criar(new Date('2026-11-03T08:00:00Z'));
    await modo.executarEtapa();
    avancar(new Date('2026-11-03T09:30:00Z'));
    await modo.executarEtapa();

    const chamadas = vi.mocked(pacote.rodarModoSombra).mock.calls.map(([, o]) => o.somenteFechamento);
    expect(chamadas).toEqual([true, false]);
  });

  it('no dia seguinte, a rodada completa volta', async () => {
    const { modo, pacote, avancar } = criar(new Date('2026-11-03T10:00:00Z'));
    await modo.executarEtapa();
    avancar(new Date('2026-11-04T10:00:00Z'));
    await modo.executarEtapa();

    const chamadas = vi.mocked(pacote.rodarModoSombra).mock.calls.map(([, o]) => o.somenteFechamento);
    expect(chamadas).toEqual([false, false]);
  });

  it('rodada completa que falhou inteira não conta como feita', async () => {
    const { modo, pacote, avancar } = criar(new Date('2026-11-03T10:00:00Z'));
    vi.mocked(pacote.rodarModoSombra).mockRejectedValueOnce(new Error('Falha ao ler empresas em Legado'));
    await expect(modo.executarEtapa()).rejects.toThrow('Falha ao ler empresas em Legado');
    avancar(new Date('2026-11-03T11:00:00Z'));
    await modo.executarEtapa();

    expect(vi.mocked(pacote.rodarModoSombra).mock.calls[1][1]).toMatchObject({ somenteFechamento: false });
  });

  it('recalcular uma empresa: compara e fecha só ela', async () => {
    const { modo, pacote } = criar(new Date('2026-11-03T10:00:00Z'), null);
    await modo.recalcularEmpresa('e1');

    expect(pacote.rodarModoSombra).toHaveBeenCalledWith(expect.anything(), {
      hoje: { mes: 11, ano: 2026 },
      fecharDesde: null,
      somenteFechamento: false,
      empresaId: 'e1',
    });
  });

  it('recalcular uma empresa não conta como a rodada completa do dia', async () => {
    const { modo, pacote } = criar(new Date('2026-11-03T10:00:00Z'));
    await modo.recalcularEmpresa('e1');
    await modo.executarEtapa();

    expect(vi.mocked(pacote.rodarModoSombra).mock.calls[1][1]).toMatchObject({ somenteFechamento: false });
  });
});
