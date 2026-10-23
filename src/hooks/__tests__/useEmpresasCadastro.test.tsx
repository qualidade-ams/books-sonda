import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEmpresaCadastro, useEmpresasCadastro } from '../useEmpresasCadastro';
import { empresasService } from '@/services/empresasService';

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

vi.mock('@/services/empresasService', async (original) => ({
  ...(await original<typeof import('@/services/empresasService')>()),
  empresasService: {
    listar: vi.fn(),
    carregar: vi.fn(),
    salvarSolucoes: vi.fn(),
    salvarInformacoes: vi.fn(),
  },
}));

const service = empresasService as unknown as Record<string, ReturnType<typeof vi.fn>>;

function criarWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe('useEmpresasCadastro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.listar.mockResolvedValue([
      { id: 'e1', status: 'ativo', pendencias: ['ramo'] },
      { id: 'e2', status: 'inativo', pendencias: [] },
    ]);
  });

  it('carrega a lista com os totais', async () => {
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useEmpresasCadastro(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.empresas).toHaveLength(2);
    expect(result.current.totais).toEqual({ total: 2, ativas: 1, inativas: 1, pendentes: 1 });
  });

  it('expõe o erro de carregamento', async () => {
    service.listar.mockRejectedValue(new Error('Falha ao carregar as empresas: sem rede'));
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useEmpresasCadastro(), { wrapper });

    await waitFor(() =>
      expect(result.current.error?.message).toBe('Falha ao carregar as empresas: sem rede')
    );
  });
});

describe('useEmpresaCadastro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.carregar.mockResolvedValue({ id: 'e1', nomeAbreviado: 'EMPRESA ALFA' });
  });

  it('não carrega sem id', () => {
    const { wrapper } = criarWrapper();
    renderHook(() => useEmpresaCadastro(undefined), { wrapper });
    expect(service.carregar).not.toHaveBeenCalled();
  });

  it('carrega o detalhe', async () => {
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useEmpresaCadastro('e1'), { wrapper });

    await waitFor(() => expect(result.current.empresa?.nomeAbreviado).toBe('EMPRESA ALFA'));
    expect(service.carregar).toHaveBeenCalledWith('e1');
  });

  it('salvar AMS e projetos recarrega empresa e lista, e avisa', async () => {
    service.salvarSolucoes.mockResolvedValue(undefined);
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useEmpresaCadastro('e1'), { wrapper });
    const solucoes = [{ id: 'es1', temAms: true, emProjeto: false, justificativaProjeto: null }];

    await act(() => result.current.salvarSolucoes(solucoes));

    expect(service.salvarSolucoes).toHaveBeenCalledWith(solucoes);
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['empresas-cadastro'] });
    expect(toast).toHaveBeenCalledWith({ title: 'AMS e projetos salvos' });
  });

  it('salvar informações grava pela empresa aberta e avisa', async () => {
    service.salvarInformacoes.mockResolvedValue(undefined);
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useEmpresaCadastro('e1'), { wrapper });
    const input = { idAranda: null, organizacoes: ['ALFA'], informacoes: {} as any };

    await act(() => result.current.salvarInformacoes(input));

    expect(service.salvarInformacoes).toHaveBeenCalledWith('e1', input);
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['empresas-cadastro'] });
    expect(toast).toHaveBeenCalledWith({ title: 'Informações salvas' });
  });

  it('erro ao salvar recarrega (parte pode ter sido gravada) e avisa', async () => {
    service.salvarInformacoes.mockRejectedValue(
      new Error('A organização EMPRESA BETA LTDA já pertence à EMPRESA BETA.')
    );
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useEmpresaCadastro('e1'), { wrapper });

    await act(() =>
      result.current
        .salvarInformacoes({ idAranda: null, organizacoes: [], informacoes: {} as any })
        .catch(() => undefined)
    );

    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['empresas-cadastro'] });
    expect(toast).toHaveBeenCalledWith({
      title: 'Erro ao salvar as informações',
      description: 'A organização EMPRESA BETA LTDA já pertence à EMPRESA BETA.',
      variant: 'destructive',
    });
  });
});
