import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useRetroativos } from '../useRetroativos';
import { retroativosService } from '@/services/retroativosService';

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

vi.mock('@/services/retroativosService', () => ({
  retroativosService: {
    listar: vi.fn(),
    decidir: vi.fn(),
    registrarAviso: vi.fn(),
    emailsDosConsultores: vi.fn(),
  },
}));

const service = retroativosService as unknown as Record<string, ReturnType<typeof vi.fn>>;

function criarWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe('useRetroativos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.listar.mockResolvedValue([
      { id: 'rt1', situacao: 'pendente' },
      { id: 'rt2', situacao: 'pendente' },
      { id: 'rt3', situacao: 'aplicado' },
    ]);
  });

  it('carrega a lista com a contagem por situação', async () => {
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useRetroativos(), { wrapper });

    await waitFor(() => expect(result.current.retroativos).toHaveLength(3));
    expect(result.current.contagem).toEqual({
      pendente: 2,
      aprovado: 0,
      aplicado: 1,
      descartado: 0,
    });
  });

  it('expõe o erro de carregamento', async () => {
    service.listar.mockRejectedValue(new Error('Sem permissão'));
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useRetroativos(), { wrapper });
    await waitFor(() => expect(result.current.error?.message).toBe('Sem permissão'));
  });

  it('tentar de novo busca a lista outra vez', async () => {
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useRetroativos(), { wrapper });
    await waitFor(() => expect(result.current.retroativos).toHaveLength(3));
    service.listar.mockClear();

    await act(() => result.current.recarregar());

    expect(service.listar).toHaveBeenCalledTimes(1);
  });

  it('aprovar recarrega a lista e o sino, e avisa', async () => {
    service.decidir.mockResolvedValue(undefined);
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useRetroativos(), { wrapper });

    await act(() =>
      result.current.decidir({ retroativoId: 'rt1', decisao: 'aprovar', justificativa: 'Real' })
    );

    expect(service.decidir).toHaveBeenCalledWith('rt1', 'aprovar', 'Real');
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['retroativos-bh'] });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['notificacoes'] });
    expect(toast).toHaveBeenCalledWith({
      title: 'Apontamento retroativo aprovado',
      description: 'Entra na retificação do Book do mês.',
    });
  });

  it('descartar avisa sem a retificação', async () => {
    service.decidir.mockResolvedValue(undefined);
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useRetroativos(), { wrapper });

    await act(() =>
      result.current.decidir({ retroativoId: 'rt1', decisao: 'descartar', justificativa: 'Teste' })
    );

    expect(toast).toHaveBeenCalledWith({ title: 'Apontamento retroativo descartado' });
  });

  it('registrar aviso recarrega a lista', async () => {
    service.registrarAviso.mockResolvedValue(undefined);
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useRetroativos(), { wrapper });

    await act(() => result.current.registrarAviso({ retroativoId: 'rt1', itemIds: ['ap1'] }));

    expect(service.registrarAviso).toHaveBeenCalledWith('rt1', ['ap1']);
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['retroativos-bh'] });
  });

  it('erro na decisão aparece no aviso', async () => {
    service.decidir.mockRejectedValue(new Error('Só o pendente é aprovado ou descartado.'));
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useRetroativos(), { wrapper });

    await act(() =>
      result.current
        .decidir({ retroativoId: 'rt3', decisao: 'aprovar', justificativa: 'x' })
        .catch(() => undefined)
    );

    expect(toast).toHaveBeenCalledWith({
      title: 'Erro ao decidir o apontamento retroativo',
      description: 'Só o pendente é aprovado ou descartado.',
      variant: 'destructive',
    });
  });
});
