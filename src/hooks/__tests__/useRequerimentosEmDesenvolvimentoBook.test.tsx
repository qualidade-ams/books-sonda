import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/requerimentosBookService', () => ({
  buscarRequerimentosEmDesenvolvimentoParaBook: vi.fn(),
}));

import { useRequerimentosEmDesenvolvimentoBook } from '../useRequerimentosEmDesenvolvimentoBook';
import { buscarRequerimentosEmDesenvolvimentoParaBook } from '@/services/requerimentosBookService';

const buscar = buscarRequerimentosEmDesenvolvimentoParaBook as unknown as ReturnType<typeof vi.fn>;

const criarWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const LINHA = {
  id: 'r1',
  numero_chamado: 'RF-1',
  total_horas: '14:00',
  status: 'Em desenvolvimento',
};

describe('useRequerimentosEmDesenvolvimentoBook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('usa o snapshot do book quando tem requerimentos, sem consultar o banco', () => {
    const { result } = renderHook(
      () =>
        useRequerimentosEmDesenvolvimentoBook({
          empresaId: 'e1',
          mes: 9,
          ano: 2026,
          snapshot: [LINHA] as any,
        }),
      { wrapper: criarWrapper() }
    );

    expect(result.current.requerimentosEmDesenvolvimento).toEqual([LINHA]);
    expect(result.current.isLoading).toBe(false);
    expect(buscar).not.toHaveBeenCalled();
  });

  it.each([
    ['vazio', []],
    ['ausente', undefined],
  ])('busca em tempo real quando o snapshot está %s', async (_caso, snapshot) => {
    buscar.mockResolvedValue([LINHA]);

    const { result } = renderHook(
      () => useRequerimentosEmDesenvolvimentoBook({ empresaId: 'e1', mes: 9, ano: 2026, snapshot }),
      { wrapper: criarWrapper() }
    );

    await waitFor(() => expect(result.current.requerimentosEmDesenvolvimento).toEqual([LINHA]));
    expect(buscar).toHaveBeenCalledWith('e1', 9, 2026);
  });

  it('não consulta sem empresa', () => {
    const { result } = renderHook(
      () =>
        useRequerimentosEmDesenvolvimentoBook({
          empresaId: undefined,
          mes: 9,
          ano: 2026,
          snapshot: undefined,
        }),
      { wrapper: criarWrapper() }
    );

    expect(result.current.requerimentosEmDesenvolvimento).toEqual([]);
    expect(buscar).not.toHaveBeenCalled();
  });
});
