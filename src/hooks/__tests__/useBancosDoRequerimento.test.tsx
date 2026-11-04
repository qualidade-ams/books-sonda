import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useBancosDoRequerimento } from '../useBancosDoRequerimento';
import { requerimentoBancoService } from '@/services/requerimentoBancoService';

vi.mock('@/services/requerimentoBancoService', () => ({
  requerimentoBancoService: { bancosDisponiveis: vi.fn() },
}));

const bancosDisponiveis = vi.mocked(requerimentoBancoService.bancosDisponiveis);

function criarWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const banco = (id: string, escolhido = false) => ({
  id,
  nome: id,
  padrao: false,
  ordem: 1,
  inicioVigencia: '2026-07-01',
  fimVigencia: null,
  escolhido,
});

describe('useBancosDoRequerimento', () => {
  beforeEach(() => {
    bancosDisponiveis.mockReset();
  });

  it('empresa liberada: traz os bancos e o já escolhido', async () => {
    bancosDisponiveis.mockResolvedValue([banco('padrao'), banco('fiscal', true)]);

    const { result } = renderHook(() => useBancosDoRequerimento('empresa-1', 'req-1'), {
      wrapper: criarWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(bancosDisponiveis).toHaveBeenCalledWith('empresa-1', 'req-1');
    expect(result.current.liberada).toBe(true);
    expect(result.current.bancos.map((b) => b.id)).toEqual(['padrao', 'fiscal']);
    expect(result.current.bancoEscolhidoId).toBe('fiscal');
  });

  it('empresa no legado: lista vazia, não liberada', async () => {
    bancosDisponiveis.mockResolvedValue([]);

    const { result } = renderHook(() => useBancosDoRequerimento('empresa-1'), {
      wrapper: criarWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.liberada).toBe(false);
    expect(result.current.bancoEscolhidoId).toBeUndefined();
  });

  it('sem empresa escolhida, não consulta', () => {
    const { result } = renderHook(() => useBancosDoRequerimento(''), { wrapper: criarWrapper() });

    expect(bancosDisponiveis).not.toHaveBeenCalled();
    expect(result.current.liberada).toBe(false);
    expect(result.current.bancos).toEqual([]);
  });
});
