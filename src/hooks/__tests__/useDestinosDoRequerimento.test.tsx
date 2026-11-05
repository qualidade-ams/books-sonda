import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useDestinosDoRequerimento,
  useProdutosDosModulosLegados,
} from '../useDestinosDoRequerimento';
import { requerimentoBancoService } from '@/services/requerimentoBancoService';

vi.mock('@/services/requerimentoBancoService', () => ({
  requerimentoBancoService: { destinos: vi.fn(), produtosDosModulosLegados: vi.fn() },
}));

const destinos = vi.mocked(requerimentoBancoService.destinos);
const dePara = vi.mocked(requerimentoBancoService.produtosDosModulosLegados);

function criarWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const opcao = {
  bancoId: 'b-gallery',
  bancoNome: 'GALLERY',
  bancoOrdem: 2,
  inicioVigencia: '2026-07-01',
  fimVigencia: null,
  produtoId: 'p-gallery',
  produtoNome: 'GALLERY',
  produtoOrdem: 1,
  moduloId: null,
  moduloNome: null,
  moduloOrdem: null,
  totalModulos: 0,
};

describe('useDestinosDoRequerimento', () => {
  beforeEach(() => {
    destinos.mockReset();
  });

  it('empresa liberada: traz as opções e o destino já escolhido', async () => {
    destinos.mockResolvedValue({
      liberada: true,
      escolhido: { produtoId: 'p-gallery', moduloId: null, bancoId: 'b-gallery' },
      opcoes: [opcao],
    });

    const { result } = renderHook(() => useDestinosDoRequerimento('empresa-1', 'req-1'), {
      wrapper: criarWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(destinos).toHaveBeenCalledWith('empresa-1', 'req-1');
    expect(result.current.liberada).toBe(true);
    expect(result.current.opcoes).toEqual([opcao]);
    expect(result.current.escolhido).toEqual({
      produtoId: 'p-gallery',
      moduloId: null,
      bancoId: 'b-gallery',
    });
  });

  it('liberada mesmo sem nenhuma opção (bancos sem escopo): o campo aparece vazio', async () => {
    destinos.mockResolvedValue({ liberada: true, escolhido: null, opcoes: [] });

    const { result } = renderHook(() => useDestinosDoRequerimento('empresa-1'), {
      wrapper: criarWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.liberada).toBe(true);
    expect(result.current.opcoes).toEqual([]);
  });

  it('empresa no legado: não liberada', async () => {
    destinos.mockResolvedValue({ liberada: false, escolhido: null, opcoes: [] });

    const { result } = renderHook(() => useDestinosDoRequerimento('empresa-1'), {
      wrapper: criarWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.liberada).toBe(false);
    expect(result.current.escolhido).toBeNull();
  });

  it('sem empresa escolhida, não consulta', () => {
    const { result } = renderHook(() => useDestinosDoRequerimento(''), {
      wrapper: criarWrapper(),
    });

    expect(destinos).not.toHaveBeenCalled();
    expect(result.current.liberada).toBe(false);
    expect(result.current.opcoes).toEqual([]);
  });
});

describe('useProdutosDosModulosLegados', () => {
  it('traz o de-para do campo Módulo antigo, só quando pedido', async () => {
    dePara.mockResolvedValue({ Comex: { produtoId: 'p-ceplus', moduloId: null } });

    const { result, rerender } = renderHook(
      ({ ativo }: { ativo: boolean }) => useProdutosDosModulosLegados(ativo),
      { wrapper: criarWrapper(), initialProps: { ativo: false } }
    );
    expect(dePara).not.toHaveBeenCalled();
    expect(result.current).toEqual({});

    rerender({ ativo: true });
    await waitFor(() =>
      expect(result.current).toEqual({ Comex: { produtoId: 'p-ceplus', moduloId: null } })
    );
  });
});
