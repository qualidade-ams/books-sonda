import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SyncAgendamentoInput } from '@/types/syncAgendamentos';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getUser: vi.fn(), getSession: vi.fn() },
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { syncAgendamentosService } from '../syncAgendamentosService';

/** Builder encadeável: registra as chamadas e resolve com `resultado` */
function mockBuilder(resultado: { data: any; error: any }) {
  const chamadas: [string, any[]][] = [];
  const builder: any = new Proxy(
    {},
    {
      get(_a, prop: string) {
        if (prop === 'then') return (ok: any, falha: any) => Promise.resolve(resultado).then(ok, falha);
        return (...args: any[]) => {
          chamadas.push([prop, args]);
          if (prop === 'single' || prop === 'maybeSingle') return Promise.resolve(resultado);
          return builder;
        };
      },
    }
  );
  (supabase.from as any).mockReturnValue(builder);
  return chamadas;
}

const input: SyncAgendamentoInput = {
  nome: 'Diário',
  ativo: true,
  tabelas: { pesquisas: true },
  frequencia: 'diario',
  dias_semana: [],
  dias_mes: [],
  ultimo_dia_mes: false,
  modo_horario: 'horarios',
  horarios: ['07:00'],
  intervalo_horas: null,
  hora_inicio: null,
  hora_fim: null,
};

describe('syncAgendamentosService — agendamentos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista agendamentos em ordem de criação', async () => {
    const chamadas = mockBuilder({ data: [{ id: 'a1' }], error: null });
    const lista = await syncAgendamentosService.listarAgendamentos();

    expect(supabase.from).toHaveBeenCalledWith('sync_agendamentos');
    expect(chamadas).toContainEqual(['order', ['created_at', { ascending: true }]]);
    expect(lista).toEqual([{ id: 'a1' }]);
  });

  it('cria agendamento registrando o autor', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'u1' } } });
    const chamadas = mockBuilder({ data: { id: 'a1' }, error: null });

    const criado = await syncAgendamentosService.criarAgendamento(input);

    const insert = chamadas.find(([m]) => m === 'insert')!;
    expect(insert[1][0]).toEqual({ ...input, created_by: 'u1' });
    expect(criado).toEqual({ id: 'a1' });
  });

  it('atualiza agendamento pelo id', async () => {
    const chamadas = mockBuilder({ data: { id: 'a1' }, error: null });
    await syncAgendamentosService.atualizarAgendamento('a1', input);

    expect(chamadas.find(([m]) => m === 'update')![1][0]).toEqual(input);
    expect(chamadas).toContainEqual(['eq', ['id', 'a1']]);
  });

  it('liga/desliga agendamento', async () => {
    const chamadas = mockBuilder({ data: null, error: null });
    await syncAgendamentosService.alternarAtivo('a1', false);
    expect(chamadas).toContainEqual(['update', [{ ativo: false }]]);
    expect(chamadas).toContainEqual(['eq', ['id', 'a1']]);
  });

  it('exclui agendamento', async () => {
    const chamadas = mockBuilder({ data: null, error: null });
    await syncAgendamentosService.excluirAgendamento('a1');
    expect(chamadas).toContainEqual(['delete', []]);
    expect(chamadas).toContainEqual(['eq', ['id', 'a1']]);
  });

  it('propaga erro do banco', async () => {
    mockBuilder({ data: null, error: { message: 'RLS' } });
    await expect(syncAgendamentosService.listarAgendamentos()).rejects.toEqual({ message: 'RLS' });
  });
});

describe('syncAgendamentosService — execuções', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista as execuções mais recentes com o nome do agendamento', async () => {
    const chamadas = mockBuilder({ data: [{ id: 'e1' }], error: null });
    const lista = await syncAgendamentosService.listarExecucoes(30);

    expect(supabase.from).toHaveBeenCalledWith('sync_execucoes');
    expect(chamadas).toContainEqual(['select', ['*, agendamento:sync_agendamentos(nome)']]);
    expect(chamadas).toContainEqual(['order', ['iniciado_em', { ascending: false }]]);
    expect(chamadas).toContainEqual(['limit', [30]]);
    expect(lista).toEqual([{ id: 'e1' }]);
  });
});

describe('syncAgendamentosService — sync-api', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: { access_token: 'tok' } } });
  });

  afterEach(() => vi.unstubAllGlobals());

  const resposta = (status: number, corpo: any) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo,
  });

  it('executarAgora envia as tabelas com o token da sessão', async () => {
    fetchMock.mockResolvedValue(resposta(202, { execucaoId: 'e1' }));

    const r = await syncAgendamentosService.executarAgora({ pesquisas: true });

    const [url, opcoes] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/sync-jobs\/executar$/);
    expect(opcoes.method).toBe('POST');
    expect(opcoes.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(opcoes.body)).toEqual({ tabelas: { pesquisas: true } });
    expect(r).toEqual({ execucaoId: 'e1' });
  });

  it('executarAgora explica quando já há sincronização em andamento', async () => {
    fetchMock.mockResolvedValue(resposta(409, { erro: 'Já existe uma sincronização em andamento' }));
    await expect(syncAgendamentosService.executarAgora({ pesquisas: true })).rejects.toThrow(
      'Já existe uma sincronização em andamento'
    );
  });

  it('executarAgora falha sem sessão', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });
    await expect(syncAgendamentosService.executarAgora({ pesquisas: true })).rejects.toThrow(/sessão/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preverExecucoes devolve as datas calculadas pelo sync-api', async () => {
    fetchMock.mockResolvedValue(resposta(200, { execucoes: ['2026-09-24T10:00:00.000Z'] }));

    const datas = await syncAgendamentosService.preverExecucoes(input, 5);

    const [url, opcoes] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/sync-jobs\/proximas-execucoes$/);
    expect(JSON.parse(opcoes.body).n).toBe(5);
    expect(datas).toEqual(['2026-09-24T10:00:00.000Z']);
  });

  it('preverExecucoes repassa os erros de validação', async () => {
    fetchMock.mockResolvedValue(resposta(400, { erros: ['Informe ao menos um horário'] }));
    await expect(syncAgendamentosService.preverExecucoes(input)).rejects.toThrow('Informe ao menos um horário');
  });
});
