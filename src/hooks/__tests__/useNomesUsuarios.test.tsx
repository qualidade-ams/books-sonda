import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useNomesUsuarios } from '../useNomesUsuarios';
import { perfisResumoService } from '@/services/perfisResumoService';

vi.mock('@/services/perfisResumoService', () => ({
  perfisResumoService: { nomes: vi.fn(async () => ({ u1: 'Pessoa A' })) },
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('useNomesUsuarios', () => {
  it('busca os nomes dos ids, na mesma ordem para a mesma lista', async () => {
    const { result } = renderHook(() => useNomesUsuarios(['u2', 'u1', null]), { wrapper });
    await waitFor(() => expect(result.current).toEqual({ u1: 'Pessoa A' }));
    expect(perfisResumoService.nomes).toHaveBeenCalledWith(['u1', 'u2']);
  });

  it('sem ids, não consulta e devolve vazio', () => {
    vi.mocked(perfisResumoService.nomes).mockClear();
    const { result } = renderHook(() => useNomesUsuarios([null]), { wrapper });
    expect(result.current).toEqual({});
    expect(perfisResumoService.nomes).not.toHaveBeenCalled();
  });
});
