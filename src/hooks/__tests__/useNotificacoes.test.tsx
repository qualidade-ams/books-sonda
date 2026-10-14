import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Notificacao } from '@/types/notificacoes';

vi.mock('@/services/notificacoesService', () => ({
  notificacoesService: {
    listarAbertas: vi.fn(),
    marcarComoLidas: vi.fn(),
    assinarMudancas: vi.fn(),
  },
}));

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

const auth = { user: { id: 'u1' } as any };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));

import { notificacoesService } from '@/services/notificacoesService';
import { useNotificacoes } from '../useNotificacoes';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const notificacao = (id: string, lida: boolean): Notificacao => ({
  id,
  tipo: 'saldo_parcial_falha',
  screen_key: 'envio_saldo_parcial',
  titulo: 'Falha no envio do Saldo Parcial',
  mensagem: 'x',
  link: '/admin/envio-saldo-parcial',
  empresa_id: 'e1',
  created_at: '2026-10-14T10:00:00Z',
  updated_at: '2026-10-14T10:00:00Z',
  lida,
});

describe('useNotificacoes', () => {
  let aoMudar: () => void;
  const cancelar = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    auth.user = { id: 'u1' };
    (notificacoesService.assinarMudancas as any).mockImplementation((cb: () => void) => {
      aoMudar = cb;
      return cancelar;
    });
  });

  it('lista as notificações abertas e conta as não lidas', async () => {
    (notificacoesService.listarAbertas as any).mockResolvedValue([notificacao('n1', false), notificacao('n2', true)]);

    const { result } = renderHook(() => useNotificacoes(), { wrapper });

    await waitFor(() => expect(result.current.notificacoes).toHaveLength(2));
    expect(result.current.naoLidas).toBe(1);
  });

  it('não consulta nem assina sem usuário logado', () => {
    auth.user = null;

    const { result } = renderHook(() => useNotificacoes(), { wrapper });

    expect(result.current.notificacoes).toEqual([]);
    expect(result.current.naoLidas).toBe(0);
    expect(notificacoesService.listarAbertas).not.toHaveBeenCalled();
    expect(notificacoesService.assinarMudancas).not.toHaveBeenCalled();
  });

  it('recarrega quando o Realtime avisa uma mudança e cancela a assinatura ao desmontar', async () => {
    (notificacoesService.listarAbertas as any).mockResolvedValue([]);
    const { unmount } = renderHook(() => useNotificacoes(), { wrapper });
    await waitFor(() => expect(notificacoesService.listarAbertas).toHaveBeenCalledTimes(1));

    act(() => aoMudar());

    await waitFor(() => expect(notificacoesService.listarAbertas).toHaveBeenCalledTimes(2));
    unmount();
    expect(cancelar).toHaveBeenCalled();
  });

  it('marca uma notificação como lida e recarrega a lista', async () => {
    (notificacoesService.listarAbertas as any).mockResolvedValue([notificacao('n1', false)]);
    (notificacoesService.marcarComoLidas as any).mockResolvedValue(undefined);
    const { result } = renderHook(() => useNotificacoes(), { wrapper });
    await waitFor(() => expect(result.current.notificacoes).toHaveLength(1));

    await act(() => result.current.marcarComoLida('n1'));

    expect(notificacoesService.marcarComoLidas).toHaveBeenCalledWith(['n1']);
    await waitFor(() => expect(notificacoesService.listarAbertas).toHaveBeenCalledTimes(2));
  });

  it('marca todas as não lidas de uma vez', async () => {
    (notificacoesService.listarAbertas as any).mockResolvedValue([
      notificacao('n1', false),
      notificacao('n2', true),
      notificacao('n3', false),
    ]);
    (notificacoesService.marcarComoLidas as any).mockResolvedValue(undefined);
    const { result } = renderHook(() => useNotificacoes(), { wrapper });
    await waitFor(() => expect(result.current.notificacoes).toHaveLength(3));

    await act(() => result.current.marcarTodasComoLidas());

    expect(notificacoesService.marcarComoLidas).toHaveBeenCalledWith(['n1', 'n3']);
  });

  it('mostra toast quando não consegue marcar como lida', async () => {
    (notificacoesService.listarAbertas as any).mockResolvedValue([notificacao('n1', false)]);
    (notificacoesService.marcarComoLidas as any).mockRejectedValue(new Error('negado'));
    const { result } = renderHook(() => useNotificacoes(), { wrapper });
    await waitFor(() => expect(result.current.notificacoes).toHaveLength(1));

    await act(async () => {
      await result.current.marcarComoLida('n1').catch(() => undefined);
    });

    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'negado', variant: 'destructive' }));
  });
});
