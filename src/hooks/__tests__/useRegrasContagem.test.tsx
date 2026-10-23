import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useRegrasContagem } from '../useRegrasContagem';
import { regrasContagemService } from '@/services/regrasContagemService';

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

vi.mock('@/services/regrasContagemService', () => ({
  regrasContagemService: { carregar: vi.fn(), salvar: vi.fn() },
}));

const service = regrasContagemService as unknown as Record<string, ReturnType<typeof vi.fn>>;

function criarWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

const regras = {
  filtros: {
    gruposQueContam: ['AMS APL'],
    tiposChamado: ['IM'],
    ignorarAtividadeInterna: true,
    itensExcluidos: [],
    soTicketsFechados: true,
  },
  codigos: [{ codigo: 'Alocação' }],
  codigosSemRegra: [],
  atualizadoEm: '2026-10-22T12:00:00Z',
  atualizadoPor: 'u1',
};

describe('useRegrasContagem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.carregar.mockResolvedValue(regras);
  });

  it('carrega as regras', async () => {
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useRegrasContagem(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.regras).toEqual(regras);
    expect(result.current.error).toBeNull();
  });

  it('expõe o erro de carregamento', async () => {
    service.carregar.mockRejectedValue(new Error('Sem permissão'));
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useRegrasContagem(), { wrapper });

    await waitFor(() => expect(result.current.error?.message).toBe('Sem permissão'));
  });

  it('recarregar busca de novo (tentar novamente)', async () => {
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useRegrasContagem(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(() => result.current.recarregar());
    expect(service.carregar).toHaveBeenCalledTimes(2);
  });

  it('salvar grava com o motivo, recarrega e avisa', async () => {
    service.salvar.mockResolvedValue(undefined);
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useRegrasContagem(), { wrapper });
    const input = { motivo: 'Ajuste', codigos: [] };

    await act(() => result.current.salvar(input));

    expect(service.salvar).toHaveBeenCalledWith(input);
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['regras-contagem'] });
    expect(toast).toHaveBeenCalledWith({
      title: 'Regras de contagem salvas',
      description: 'Valem a partir do próximo recálculo; meses fechados não mudam.',
    });
  });

  it('erro ao salvar aparece no aviso', async () => {
    service.salvar.mockRejectedValue(new Error('Informe o motivo da alteração.'));
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useRegrasContagem(), { wrapper });

    await act(() => result.current.salvar({ motivo: '' }).catch(() => undefined));

    expect(toast).toHaveBeenCalledWith({
      title: 'Erro ao salvar as regras de contagem',
      description: 'Informe o motivo da alteração.',
      variant: 'destructive',
    });
  });
});
