import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useComparacao, useMesesComparacao } from '../useComparacao';
import { comparacaoService } from '@/services/comparacaoService';
import type { ComparacaoEmpresa } from '@/types/comparacao';

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));

vi.mock('@/services/comparacaoService', () => ({
  comparacaoService: { listar: vi.fn(), meses: vi.fn(), validar: vi.fn(), recalcular: vi.fn() },
}));
const service = comparacaoService as unknown as Record<string, ReturnType<typeof vi.fn>>;

const empresa = (v: Partial<ComparacaoEmpresa>): ComparacaoEmpresa => ({
  empresaId: 'e',
  empresa: 'EMPRESA',
  bancosAtivos: 1,
  situacao: 'identico',
  mesesComparados: 12,
  consumoLegadoMinutos: 0,
  consumoNovoMinutos: 0,
  consumoLegadoTickets: 0,
  consumoNovoTickets: 0,
  calculadoEm: '2026-10-28T09:00:00Z',
  erro: null,
  erroEm: null,
  validacao: null,
  ...v,
});

const LISTA = [
  empresa({ empresaId: 'e1', situacao: 'identico' }),
  empresa({ empresaId: 'e2', situacao: 'soma_confere' }),
  empresa({ empresaId: 'e3', situacao: 'explicada' }),
  empresa({ empresaId: 'e4', situacao: 'divergente' }),
  empresa({
    empresaId: 'e5',
    situacao: 'identico',
    validacao: { por: 'Usuário Teste', em: '2026-10-27T15:00:00Z', situacao: 'identico' },
  }),
  empresa({ empresaId: 'e6', situacao: null, erro: 'Falha', calculadoEm: null }),
];

function criarWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe('useComparacao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.listar.mockResolvedValue(LISTA);
  });

  it('carrega a lista com a contagem por grupo (validada vale mais que a situação; sem resultado não conta)', async () => {
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useComparacao(), { wrapper });

    await waitFor(() => expect(result.current.empresas).toHaveLength(6));
    expect(result.current.contagem).toEqual({
      conferem: 2,
      explicada: 1,
      divergente: 1,
      validada: 1,
    });
  });

  it('expõe o erro de carregamento', async () => {
    service.listar.mockRejectedValue(new Error('Sem permissão'));
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useComparacao(), { wrapper });
    await waitFor(() => expect(result.current.error?.message).toBe('Sem permissão'));
  });

  it('validar e desfazer avisam e recarregam a lista', async () => {
    service.validar.mockResolvedValue(undefined);
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useComparacao(), { wrapper });
    await waitFor(() => expect(result.current.empresas).toHaveLength(6));
    service.listar.mockClear();

    await act(() => result.current.validar({ empresaId: 'e1', validar: true }));
    await act(() =>
      result.current.validar({ empresaId: 'e5', validar: false, motivo: 'Retificado' })
    );

    expect(service.validar).toHaveBeenNthCalledWith(1, 'e1', true, undefined);
    expect(service.validar).toHaveBeenNthCalledWith(2, 'e5', false, 'Retificado');
    expect(toast).toHaveBeenNthCalledWith(1, { title: 'avisos.comparacao.validada' });
    expect(toast).toHaveBeenNthCalledWith(2, { title: 'avisos.comparacao.validacaoDesfeita' });
    await waitFor(() => expect(service.listar).toHaveBeenCalled());
  });

  it('erro ao validar avisa com o texto do erro', async () => {
    service.validar.mockRejectedValue(new Error('Empresa com divergência'));
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useComparacao(), { wrapper });
    await waitFor(() => expect(result.current.empresas).toHaveLength(6));

    await act(() =>
      result.current.validar({ empresaId: 'e4', validar: true }).catch(() => undefined)
    );

    expect(toast).toHaveBeenCalledWith({
      title: 'avisos.comparacao.erroValidar',
      description: 'Empresa com divergência',
      variant: 'destructive',
    });
  });

  it('recalcular: acompanha a empresa até chegar o resultado novo', async () => {
    service.recalcular.mockResolvedValue(undefined);
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useComparacao({ intervaloRecalculoMs: 20 }), { wrapper });
    await waitFor(() => expect(result.current.empresas).toHaveLength(6));

    await act(() => result.current.recalcular('e4'));
    expect(service.recalcular).toHaveBeenCalledWith('e4');
    expect(result.current.recalculando).toBe('e4');
    expect(toast).toHaveBeenCalledWith({
      title: 'avisos.comparacao.recalculando',
      description: 'avisos.comparacao.recalculandoDescricao',
    });

    service.listar.mockResolvedValue(
      LISTA.map((e) => (e.empresaId === 'e4' ? { ...e, calculadoEm: '2026-10-28T11:00:00Z' } : e))
    );
    await waitFor(() => expect(result.current.recalculando).toBeNull());
    expect(toast).toHaveBeenCalledWith({ title: 'avisos.comparacao.recalculada' });
  });

  it('recalcular que termina em erro também encerra o acompanhamento', async () => {
    service.recalcular.mockResolvedValue(undefined);
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useComparacao({ intervaloRecalculoMs: 20 }), { wrapper });
    await waitFor(() => expect(result.current.empresas).toHaveLength(6));

    await act(() => result.current.recalcular('e4'));
    service.listar.mockResolvedValue(
      LISTA.map((e) =>
        e.empresaId === 'e4' ? { ...e, erro: 'Timeout', erroEm: '2026-10-28T11:00:00Z' } : e
      )
    );
    await waitFor(() => expect(result.current.recalculando).toBeNull());
    expect(toast).toHaveBeenCalledWith({
      title: 'avisos.comparacao.erroRecalcular',
      description: 'Timeout',
      variant: 'destructive',
    });
  });

  it('erro ao pedir o recálculo avisa e não acompanha', async () => {
    service.recalcular.mockRejectedValue(new Error('Sync-api fora do ar'));
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useComparacao(), { wrapper });
    await waitFor(() => expect(result.current.empresas).toHaveLength(6));

    await act(() => result.current.recalcular('e4').catch(() => undefined));

    expect(result.current.recalculando).toBeNull();
    expect(toast).toHaveBeenCalledWith({
      title: 'avisos.comparacao.erroRecalcular',
      description: 'Sync-api fora do ar',
      variant: 'destructive',
    });
  });
});

describe('useMesesComparacao', () => {
  beforeEach(() => vi.clearAllMocks());

  it('carrega os meses da empresa aberta; sem empresa, não carrega', async () => {
    service.meses.mockResolvedValue([{ mes: { mes: 9, ano: 2026 } }]);
    const { wrapper } = criarWrapper();
    const { result, rerender } = renderHook(({ id }) => useMesesComparacao(id), {
      wrapper,
      initialProps: { id: null as string | null },
    });
    expect(service.meses).not.toHaveBeenCalled();

    rerender({ id: 'e4' });
    await waitFor(() => expect(result.current.meses).toHaveLength(1));
    expect(service.meses).toHaveBeenCalledWith('e4');
  });
});
