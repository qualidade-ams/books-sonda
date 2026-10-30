import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCatalogo, useModulosRequerimento } from '../useCatalogo';
import { catalogoService } from '@/services/catalogoService';

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));

vi.mock('@/services/catalogoService', () => ({
  catalogoService: {
    carregar: vi.fn(),
    usosEmBancos: vi.fn(),
    salvarSolucao: vi.fn(),
    salvarProduto: vi.fn(),
    reordenarProdutos: vi.fn(),
    salvarModulo: vi.fn(),
    moverModulo: vi.fn(),
    excluir: vi.fn(),
    importar: vi.fn(),
    modulosRequerimento: vi.fn(),
    salvarModuloRequerimento: vi.fn(),
  },
}));

const service = catalogoService as unknown as Record<string, ReturnType<typeof vi.fn>>;

function criarWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

const catalogo = {
  solucoes: [{ id: 's1', codigo: 'COMEX', nome: 'COMEX', ordem: 1, ativo: true }],
  produtos: [{ id: 'p1', solucaoId: 's1', nome: 'CE PLUS' }],
  modulos: [],
};

describe('useCatalogo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.carregar.mockResolvedValue(catalogo);
    service.usosEmBancos.mockResolvedValue([
      { produtoId: 'p1', moduloId: null, bancoId: 'b1', banco: 'B', empresa: 'E' },
    ]);
  });

  it('carrega o catálogo e os usos nos bancos', async () => {
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useCatalogo(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.solucoes).toEqual(catalogo.solucoes);
    expect(result.current.produtos).toEqual(catalogo.produtos);
    expect(result.current.modulos).toEqual([]);
    expect(result.current.usos).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('expõe o erro de carregamento', async () => {
    service.carregar.mockRejectedValue(new Error('Falha ao carregar o catálogo: sem rede'));
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useCatalogo(), { wrapper });

    await waitFor(() =>
      expect(result.current.error?.message).toBe('Falha ao carregar o catálogo: sem rede')
    );
  });

  it('salvar produto grava, recarrega o catálogo e avisa', async () => {
    service.salvarProduto.mockResolvedValue(undefined);
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCatalogo(), { wrapper });
    const input = { solucaoId: 's1', nome: 'FCI', descricao: null, ativo: true };

    await act(() => result.current.salvarProduto(input));

    expect(service.salvarProduto).toHaveBeenCalledWith(input);
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['catalogo'] });
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'avisos.catalogo.produtoSalvo' })
    );
  });

  it('erro ao salvar aparece no aviso com a mensagem do service', async () => {
    service.salvarModulo.mockRejectedValue(
      new Error('Já existe um módulo com este nome no produto.')
    );
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useCatalogo(), { wrapper });

    await act(() =>
      result.current
        .salvarModulo({ produtoId: 'p1', nome: 'X', descricao: null, ativo: true })
        .catch(() => undefined)
    );

    expect(toast).toHaveBeenCalledWith({
      title: 'avisos.catalogo.erroSalvarModulo',
      description: 'Já existe um módulo com este nome no produto.',
      variant: 'destructive',
    });
  });

  it('salvar solução avisa', async () => {
    service.salvarSolucao.mockResolvedValue(undefined);
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useCatalogo(), { wrapper });

    await act(() => result.current.salvarSolucao({ nome: 'X', codigo: 'X', ativo: true }));

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'avisos.catalogo.solucaoSalva' })
    );
  });

  it('excluir apaga o item sem uso, recarrega e avisa; em uso, avisa com o motivo', async () => {
    service.excluir.mockResolvedValueOnce(undefined);
    const { client, wrapper } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCatalogo(), { wrapper });

    await act(() => result.current.excluir({ tipo: 'produto', id: 'p9' }));
    expect(service.excluir).toHaveBeenCalledWith('produto', 'p9');
    expect(toast).toHaveBeenCalledWith({ title: 'avisos.catalogo.excluido' });
    expect(invalidar).toHaveBeenCalled();

    service.excluir.mockRejectedValueOnce(new Error('Este item já foi usado: inative-o.'));
    await act(() => result.current.excluir({ tipo: 'modulo', id: 'm9' }).catch(() => undefined));
    expect(toast).toHaveBeenCalledWith({
      title: 'avisos.catalogo.erroExcluir',
      description: 'Este item já foi usado: inative-o.',
      variant: 'destructive',
    });
  });

  it('reordenar não avisa no sucesso, só recarrega', async () => {
    service.reordenarProdutos.mockResolvedValue(undefined);
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCatalogo(), { wrapper });

    await act(() => result.current.reordenarProdutos(['p1']));

    expect(service.reordenarProdutos).toHaveBeenCalledWith(['p1']);
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['catalogo'] });
    expect(toast).not.toHaveBeenCalled();
  });

  it('mover módulo recarrega também o de-para e conta quando o provisório foi inativado', async () => {
    service.moverModulo.mockResolvedValue({ provisorioInativado: true });
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCatalogo(), { wrapper });

    await act(() => result.current.moverModulo({ moduloId: 'm1', produtoId: 'p1' }));

    expect(service.moverModulo).toHaveBeenCalledWith('m1', 'p1');
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['catalogo'] });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['grupos-aranda'] });
    expect(toast).toHaveBeenCalledWith({
      title: 'avisos.catalogo.moduloMovido',
      description: 'avisos.catalogo.aClassificarInativado',
    });
  });

  it('importar grava as linhas, recarrega e dá um aviso só', async () => {
    service.carregar.mockResolvedValue(catalogo);
    service.usosEmBancos.mockResolvedValue([]);
    service.importar.mockResolvedValue(undefined);
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCatalogo(), { wrapper });
    const linhas = [{ solucaoId: 's1', produto: 'FC', modulo: null, descricao: null }];

    await act(() => result.current.importar(linhas));

    expect(service.importar).toHaveBeenCalledWith(linhas);
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['catalogo'] });
    expect(toast).toHaveBeenCalledWith({ title: 'avisos.catalogo.importados.um {"n":1}' });
  });

  it('erro ao importar avisa e recarrega (parte pode ter sido gravada)', async () => {
    service.carregar.mockResolvedValue(catalogo);
    service.usosEmBancos.mockResolvedValue([]);
    service.importar.mockRejectedValue(new Error('FC: sem permissão'));
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCatalogo(), { wrapper });

    await act(() =>
      result.current
        .importar([{ solucaoId: 's1', produto: 'FC', modulo: null, descricao: null }])
        .catch(() => undefined)
    );

    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['catalogo'] });
    expect(toast).toHaveBeenCalledWith({
      title: 'avisos.catalogo.erroImportar',
      description: 'FC: sem permissão',
      variant: 'destructive',
    });
  });
});

describe('useModulosRequerimento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.modulosRequerimento.mockResolvedValue([
      { id: 'r1', moduloRequerimento: 'Comex', produtoId: 'p1', moduloId: null },
    ]);
  });

  it('carrega a correspondência e grava a mudança', async () => {
    service.salvarModuloRequerimento.mockResolvedValue(undefined);
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useModulosRequerimento(), { wrapper });

    await waitFor(() => expect(result.current.modulosRequerimento).toHaveLength(1));
    await act(() => result.current.salvar({ id: 'r1', produtoId: 'p1', moduloId: 'm2' }));

    expect(service.salvarModuloRequerimento).toHaveBeenCalledWith('r1', 'p1', 'm2');
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['catalogo', 'modulos-requerimento'] });
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'avisos.catalogo.correspondenciaSalva' })
    );
  });
});
