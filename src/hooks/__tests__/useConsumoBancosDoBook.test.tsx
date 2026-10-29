import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useConsumoBancosDoBook } from '../useConsumoBancosDoBook';
import { bookConsumoBancosService } from '@/services/bookConsumoBancosService';

vi.mock('@/services/bookConsumoBancosService', () => ({
  bookConsumoBancosService: { doBook: vi.fn() },
}));
const doBook = bookConsumoBancosService.doBook as ReturnType<typeof vi.fn>;

const envolver = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useConsumoBancosDoBook', () => {
  beforeEach(() => {
    doBook.mockReset();
  });

  it('lê o snapshot por banco do Book', async () => {
    doBook.mockResolvedValue([{ ordem: 1, banco_id: 'b1' }]);
    const { result } = renderHook(() => useConsumoBancosDoBook('book1'), { wrapper: envolver() });

    await waitFor(() => expect(result.current.carregado).toBe(true));
    expect(doBook).toHaveBeenCalledWith('book1');
    expect(result.current.bancos).toEqual([{ ordem: 1, banco_id: 'b1' }]);
  });

  it('Book de empresa em Legado: sem bancos, a página de consumo atual continua', async () => {
    doBook.mockResolvedValue([]);
    const { result } = renderHook(() => useConsumoBancosDoBook('book1'), { wrapper: envolver() });
    await waitFor(() => expect(result.current.carregado).toBe(true));
    expect(result.current.bancos).toEqual([]);
  });

  it('falha na leitura: carregado, sem bancos (o Book não fica preso esperando)', async () => {
    doBook.mockRejectedValue(new Error('Sem conexão'));
    const { result } = renderHook(() => useConsumoBancosDoBook('book1'), { wrapper: envolver() });
    await waitFor(() => expect(result.current.erro?.message).toBe('Sem conexão'));
    expect(result.current.carregado).toBe(true);
    expect(result.current.bancos).toEqual([]);
  });

  it('sem Book: não consulta', () => {
    const { result } = renderHook(() => useConsumoBancosDoBook(null), { wrapper: envolver() });
    expect(doBook).not.toHaveBeenCalled();
    expect(result.current.carregado).toBe(false);
  });
});
