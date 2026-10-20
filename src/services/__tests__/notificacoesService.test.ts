import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { notificacoesService } from '../notificacoesService';

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
          return builder;
        };
      },
    }
  );
  (supabase.from as any).mockReturnValue(builder);
  return chamadas;
}

const linha = (sobrescrever: Record<string, any> = {}) => ({
  id: 'n1',
  tipo: 'book_precisa_retificacao',
  screen_key: 'geracao_books',
  titulo: 'Book precisa de retificação',
  mensagem: 'O book de ACME de 05/2026 precisa ser retificado.',
  link: '/admin/geracao-books',
  empresa_id: 'e1',
  created_at: '2026-10-14T10:00:00Z',
  updated_at: '2026-10-14T10:00:00Z',
  notificacoes_leituras: [],
  ...sobrescrever,
});

describe('notificacoesService.listarAbertas', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca só as abertas, mais recentes primeiro, com a leitura do usuário', async () => {
    const chamadas = mockBuilder({ data: [linha()], error: null });

    const lista = await notificacoesService.listarAbertas();

    expect(supabase.from).toHaveBeenCalledWith('notificacoes');
    const select = chamadas.find(([m]) => m === 'select')![1][0] as string;
    expect(select).toContain('notificacoes_leituras(lida_em)');
    expect(chamadas).toContainEqual(['is', ['resolvida_em', null]]);
    expect(chamadas).toContainEqual(['order', ['created_at', { ascending: false }]]);
    expect(lista[0]).toMatchObject({ id: 'n1', titulo: 'Book precisa de retificação', lida: false });
    expect(lista[0]).not.toHaveProperty('notificacoes_leituras');
  });

  it('considera lida quando a leitura é posterior à última atualização', async () => {
    mockBuilder({
      data: [linha({ notificacoes_leituras: [{ lida_em: '2026-10-14T11:00:00Z' }] })],
      error: null,
    });

    const [notificacao] = await notificacoesService.listarAbertas();

    expect(notificacao.lida).toBe(true);
  });

  it('volta a não lida quando a notificação foi atualizada depois da leitura', async () => {
    mockBuilder({
      data: [
        linha({
          updated_at: '2026-10-14T12:00:00Z',
          notificacoes_leituras: [{ lida_em: '2026-10-14T11:00:00Z' }],
        }),
      ],
      error: null,
    });

    const [notificacao] = await notificacoesService.listarAbertas();

    expect(notificacao.lida).toBe(false);
  });

  it('lança erro descritivo quando a consulta falha', async () => {
    mockBuilder({ data: null, error: { message: 'falhou' } });

    await expect(notificacoesService.listarAbertas()).rejects.toThrow('Falha ao buscar notificações: falhou');
  });
});

describe('notificacoesService.marcarComoLidas', () => {
  beforeEach(() => vi.clearAllMocks());

  it('grava a leitura do usuário logado para cada notificação', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'u1' } } });
    const chamadas = mockBuilder({ data: null, error: null });

    await notificacoesService.marcarComoLidas(['n1', 'n2']);

    expect(supabase.from).toHaveBeenCalledWith('notificacoes_leituras');
    const [linhas, opcoes] = chamadas.find(([m]) => m === 'upsert')![1];
    expect(linhas).toEqual([
      expect.objectContaining({ notificacao_id: 'n1', user_id: 'u1' }),
      expect.objectContaining({ notificacao_id: 'n2', user_id: 'u1' }),
    ]);
    expect(linhas[0].lida_em).toEqual(expect.any(String));
    expect(opcoes).toEqual({ onConflict: 'notificacao_id,user_id' });
  });

  it('não chama o banco quando a lista está vazia', async () => {
    await notificacoesService.marcarComoLidas([]);

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('exige usuário logado', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: null } });

    await expect(notificacoesService.marcarComoLidas(['n1'])).rejects.toThrow('Sessão expirada');
  });

  it('lança erro descritivo quando a gravação falha', async () => {
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockBuilder({ data: null, error: { message: 'negado' } });

    await expect(notificacoesService.marcarComoLidas(['n1'])).rejects.toThrow(
      'Falha ao marcar notificação como lida: negado'
    );
  });
});

describe('notificacoesService.assinarMudancas', () => {
  beforeEach(() => vi.clearAllMocks());

  it('assina as mudanças da tabela e devolve função para cancelar', () => {
    const canal: any = { on: vi.fn(), subscribe: vi.fn() };
    canal.on.mockReturnValue(canal);
    canal.subscribe.mockReturnValue(canal);
    (supabase.channel as any).mockReturnValue(canal);
    const aoMudar = vi.fn();

    const cancelar = notificacoesService.assinarMudancas(aoMudar);

    expect(canal.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notificacoes' },
      expect.any(Function)
    );
    canal.on.mock.calls[0][2]({});
    expect(aoMudar).toHaveBeenCalled();

    cancelar();
    expect(supabase.removeChannel).toHaveBeenCalledWith(canal);
  });
});
