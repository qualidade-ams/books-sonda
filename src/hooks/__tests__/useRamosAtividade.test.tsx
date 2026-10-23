import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useRamosAtividade } from '../useRamosAtividade';
import { ramosAtividadeService } from '@/services/ramosAtividadeService';

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

vi.mock('@/services/ramosAtividadeService', () => ({
  ramosAtividadeService: { listar: vi.fn(), salvar: vi.fn() },
}));

const service = ramosAtividadeService as unknown as Record<string, ReturnType<typeof vi.fn>>;

function criarWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe('useRamosAtividade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.listar.mockResolvedValue({ ramos: [{ id: 'r1', nome: 'Energia' }], totalEmpresas: 10 });
  });

  it('carrega os ramos e o total de empresas', async () => {
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useRamosAtividade(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.ramos).toHaveLength(1);
    expect(result.current.totalEmpresas).toBe(10);
    expect(result.current.error).toBeNull();
  });

  it('enquanto carrega, a lista vazia é sempre a mesma (a tela sincroniza o rascunho com ela)', () => {
    service.listar.mockReturnValue(new Promise(() => undefined));
    const { wrapper } = criarWrapper();
    const { result, rerender } = renderHook(() => useRamosAtividade(), { wrapper });
    const primeira = result.current.ramos;
    rerender();
    expect(result.current.ramos).toBe(primeira);
  });

  it('recarregar busca de novo (tentar novamente)', async () => {
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useRamosAtividade(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(() => result.current.recarregar());
    expect(service.listar).toHaveBeenCalledTimes(2);
  });

  it('salvar grava o rascunho, recarrega e avisa', async () => {
    service.salvar.mockResolvedValue(undefined);
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useRamosAtividade(), { wrapper });
    const rascunho = [{ id: 'r1', nome: 'Energia', ativo: true }];

    await act(() => result.current.salvar(rascunho));

    expect(service.salvar).toHaveBeenCalledWith(rascunho);
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['ramos-atividade'] });
    expect(toast).toHaveBeenCalledWith({ title: 'Ramos salvos' });
  });

  it('erro ao salvar recarrega a lista (parte pode ter sido gravada) e avisa', async () => {
    service.salvar.mockRejectedValue(
      new Error('O ramo Têxtil está em uso nas empresas: inative em vez de excluir.')
    );
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useRamosAtividade(), { wrapper });

    await act(() => result.current.salvar([]).catch(() => undefined));

    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['ramos-atividade'] });
    expect(toast).toHaveBeenCalledWith({
      title: 'Erro ao salvar os ramos',
      description: 'O ramo Têxtil está em uso nas empresas: inative em vez de excluir.',
      variant: 'destructive',
    });
  });
});
