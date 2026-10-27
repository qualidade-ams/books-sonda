import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useDePara } from '../useDePara';
import { deParaService } from '@/services/deParaService';

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));

vi.mock('@/services/deParaService', () => ({
  deParaService: {
    listar: vi.fn(),
    uso: vi.fn(),
    naoMapeados: vi.fn(),
    salvar: vi.fn(),
    atribuirDestino: vi.fn(),
    excluir: vi.fn(),
    importar: vi.fn(),
  },
}));

const service = deParaService as unknown as Record<string, ReturnType<typeof vi.fn>>;

function criarWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

const destino = { solucaoId: 's1', produtoId: null, moduloId: null };

describe('useDePara', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.listar.mockResolvedValue([{ id: 'g1', grupoAranda: 'G1' }]);
    service.uso.mockResolvedValue({ g1: { apontamentos: 4, tickets: 0, empresasMultiplos: [] } });
    service.naoMapeados.mockResolvedValue([{ grupoAranda: 'G9' }]);
  });

  it('carrega mapeamentos, uso e não mapeados', async () => {
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useDePara(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.mapeamentos).toHaveLength(1);
    expect(result.current.uso.g1.apontamentos).toBe(4);
    expect(result.current.naoMapeados).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('expõe o erro de carregamento', async () => {
    service.naoMapeados.mockRejectedValue(new Error('Sem permissão'));
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useDePara(), { wrapper });

    await waitFor(() => expect(result.current.error?.message).toBe('Sem permissão'));
  });

  it('recarregar busca de novo (tentar novamente)', async () => {
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useDePara(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.recarregar());
    await waitFor(() => expect(service.listar).toHaveBeenCalledTimes(2));
    expect(service.naoMapeados).toHaveBeenCalledTimes(2);
  });

  it('salvar grava, recarrega o de-para e o sino, e avisa', async () => {
    service.salvar.mockResolvedValue(undefined);
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useDePara(), { wrapper });
    const input = { grupoAranda: 'G9', grupoBook: 'B', destino };

    await act(() => result.current.salvar(input));

    expect(service.salvar).toHaveBeenCalledWith(input);
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['grupos-aranda'] });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['notificacoes'] });
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'avisos.dePara.salvo' }));
  });

  it('atribuir em lote conta quantos grupos mudaram', async () => {
    service.atribuirDestino.mockResolvedValue(undefined);
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useDePara(), { wrapper });

    await act(() => result.current.atribuirDestino({ ids: ['g1', 'g2'], destino }));

    expect(service.atribuirDestino).toHaveBeenCalledWith(['g1', 'g2'], destino);
    expect(toast).toHaveBeenCalledWith({ title: 'avisos.dePara.destinoAtribuido.varios {"n":2}' });
  });

  it('excluir avisa que o grupo voltou para os não mapeados', async () => {
    service.excluir.mockResolvedValue(undefined);
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useDePara(), { wrapper });

    await act(() => result.current.excluir('g1'));

    expect(service.excluir).toHaveBeenCalledWith('g1');
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['grupos-aranda'] });
    expect(toast).toHaveBeenCalledWith({
      title: 'avisos.dePara.excluido',
      description: 'avisos.dePara.excluidoDescricao',
    });
  });

  it('erro ao salvar aparece no aviso', async () => {
    service.salvar.mockRejectedValue(new Error('Este grupo do Aranda já está no de-para.'));
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useDePara(), { wrapper });

    await act(() =>
      result.current.salvar({ grupoAranda: 'G1', grupoBook: 'B', destino }).catch(() => undefined)
    );

    expect(toast).toHaveBeenCalledWith({
      title: 'avisos.dePara.erroSalvar',
      description: 'Este grupo do Aranda já está no de-para.',
      variant: 'destructive',
    });
  });

  it('importar grava as linhas, recarrega e dá um aviso só', async () => {
    service.importar.mockResolvedValue(undefined);
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useDePara(), { wrapper });
    const inputs = [
      { grupoAranda: 'G1', grupoBook: 'B', destino },
      { grupoAranda: 'G2', grupoBook: 'B', destino },
    ];

    await act(() => result.current.importar(inputs));

    expect(service.importar).toHaveBeenCalledWith(inputs);
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['grupos-aranda'] });
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith({ title: 'avisos.dePara.importados.varios {"n":2}' });
  });

  it('erro ao importar avisa e recarrega (as linhas anteriores ficam gravadas)', async () => {
    service.importar.mockRejectedValue(new Error('G2: sem permissão'));
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useDePara(), { wrapper });

    await act(() =>
      result.current
        .importar([{ grupoAranda: 'G2', grupoBook: 'B', destino }])
        .catch(() => undefined)
    );

    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['grupos-aranda'] });
    expect(toast).toHaveBeenCalledWith({
      title: 'avisos.dePara.erroImportar',
      description: 'G2: sem permissão',
      variant: 'destructive',
    });
  });
});
