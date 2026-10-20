import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/requerimentosBookService', () => ({
  buscarRequerimentosFaturadosParaBook: vi.fn(),
}));

import { useRequerimentosFaturadosBook } from '../useRequerimentosFaturadosBook';
import { buscarRequerimentosFaturadosParaBook } from '@/services/requerimentosBookService';

const buscar = buscarRequerimentosFaturadosParaBook as unknown as ReturnType<typeof vi.fn>;

const criarWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const LINHA = { id: 'r1', numero_chamado: 'RF-1', total_horas: '24:00', status: 'Faturado' };

describe('useRequerimentosFaturadosBook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('usa o snapshot do book quando existe, sem consultar o banco', () => {
    const { result } = renderHook(
      () =>
        useRequerimentosFaturadosBook({
          empresaId: 'e1',
          mes: 9,
          ano: 2026,
          snapshot: [LINHA] as any,
        }),
      { wrapper: criarWrapper() }
    );

    expect(result.current.requerimentosFaturados).toEqual([LINHA]);
    expect(buscar).not.toHaveBeenCalled();
  });

  it('respeita snapshot vazio (book gerado sem faturados) sem consultar o banco', () => {
    const { result } = renderHook(
      () => useRequerimentosFaturadosBook({ empresaId: 'e1', mes: 9, ano: 2026, snapshot: [] }),
      { wrapper: criarWrapper() }
    );

    expect(result.current.requerimentosFaturados).toEqual([]);
    expect(buscar).not.toHaveBeenCalled();
  });

  it('busca em tempo real quando o book foi gerado antes da aba existir (sem snapshot)', async () => {
    buscar.mockResolvedValue([LINHA]);

    const { result } = renderHook(
      () =>
        useRequerimentosFaturadosBook({ empresaId: 'e1', mes: 9, ano: 2026, snapshot: undefined }),
      { wrapper: criarWrapper() }
    );

    await waitFor(() => expect(result.current.requerimentosFaturados).toEqual([LINHA]));
    expect(buscar).toHaveBeenCalledWith('e1', 9, 2026);
  });

  it('não consulta sem empresa', () => {
    const { result } = renderHook(
      () =>
        useRequerimentosFaturadosBook({
          empresaId: undefined,
          mes: 9,
          ano: 2026,
          snapshot: undefined,
        }),
      { wrapper: criarWrapper() }
    );

    expect(result.current.requerimentosFaturados).toEqual([]);
    expect(buscar).not.toHaveBeenCalled();
  });
});
