import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bancoHorasObservacoesService } from '../bancoHorasObservacoesService';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() }
}));

type Chamada = [string, unknown[]];

/** Query encadeável que registra as chamadas e resolve com o resultado configurado */
function criarQuery(resultado: { data: unknown; error: unknown }) {
  const chamadas: Chamada[] = [];
  const query: any = new Proxy(
    {},
    {
      get(_alvo, prop) {
        if (prop === 'then') {
          return (res: any, rej: any) => Promise.resolve(resultado).then(res, rej);
        }
        return (...args: unknown[]) => {
          chamadas.push([String(prop), args]);
          return query;
        };
      }
    }
  );
  return { query, chamadas };
}

const consultas = (chamadas: Chamada[], metodo: string) => chamadas.filter(([m]) => m === metodo).map(([, a]) => a);

describe('bancoHorasObservacoesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista observações manuais da empresa com o nome de quem criou', async () => {
    const observacoes = criarQuery({
      data: [{ id: 'o1', mes: 10, ano: 2026, observacao: 'Texto', created_by: 'u1', created_at: '2026-10-01T10:00:00Z' }],
      error: null
    });
    const perfis = criarQuery({ data: [{ id: 'u1', full_name: 'Fulano', email: 'f@sonda.com' }], error: null });
    (supabase.from as any).mockImplementation((tabela: string) =>
      tabela === 'banco_horas_observacoes' ? observacoes.query : perfis.query
    );

    const resultado = await bancoHorasObservacoesService.listarObservacoesManuais('empresa-1');

    expect(consultas(observacoes.chamadas, 'eq')).toContainEqual(['empresa_id', 'empresa-1']);
    expect(resultado[0]).toMatchObject({ id: 'o1', usuario_nome: 'Fulano' });
  });

  it('filtra por mês/ano quando o período é informado', async () => {
    const observacoes = criarQuery({ data: [], error: null });
    (supabase.from as any).mockReturnValue(observacoes.query);

    await bancoHorasObservacoesService.listarObservacoesManuais('empresa-1', { mes: 10, ano: 2026 });

    expect(consultas(observacoes.chamadas, 'eq')).toEqual(
      expect.arrayContaining([['mes', 10], ['ano', 2026]])
    );
  });

  it('lista só reajustes ativos e com observação preenchida', async () => {
    const reajustes = criarQuery({ data: [], error: null });
    (supabase.from as any).mockReturnValue(reajustes.query);

    await bancoHorasObservacoesService.listarObservacoesReajustes('empresa-1');

    expect(supabase.from).toHaveBeenCalledWith('banco_horas_reajustes');
    expect(consultas(reajustes.chamadas, 'eq')).toEqual(
      expect.arrayContaining([['empresa_id', 'empresa-1'], ['ativo', true]])
    );
    expect(consultas(reajustes.chamadas, 'not')).toContainEqual(['observacao', 'is', null]);
    expect(consultas(reajustes.chamadas, 'neq')).toContainEqual(['observacao', '']);
  });

  it('lança erro quando a consulta falha', async () => {
    (supabase.from as any).mockReturnValue(criarQuery({ data: null, error: { message: 'falhou' } }).query);

    await expect(bancoHorasObservacoesService.listarObservacoesManuais('empresa-1')).rejects.toBeTruthy();
  });

  it('unifica manuais e reajustes, do mais recente para o mais antigo', () => {
    const unificadas = bancoHorasObservacoesService.unificarObservacoes(
      [{ id: 'm1', empresa_id: 'e', mes: 9, ano: 2026, observacao: 'Manual', tipo: 'manual', created_by: null, created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' }],
      [{ id: 'r1', mes: 10, ano: 2026, observacao: 'Reajuste', tipo_reajuste: 'entrada', valor_reajuste_horas: '02:00', valor_reajuste_tickets: 0, created_by: null, created_at: '2026-10-01T00:00:00Z' }]
    );

    expect(unificadas.map(o => o.id)).toEqual(['r1', 'm1']);
    expect(unificadas[0]).toMatchObject({ tipo: 'ajuste', tipo_ajuste: 'entrada', valor_horas: '02:00' });
    expect(unificadas[1]).toMatchObject({ tipo: 'manual', observacao: 'Manual' });
  });
});
