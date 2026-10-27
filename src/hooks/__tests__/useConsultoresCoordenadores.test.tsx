import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useConsultoresCoordenadores,
  useBuscarEspecialistasParaEmail,
} from '../useConsultoresCoordenadores';
import { consultoresCoordenadoresService } from '@/services/consultoresCoordenadoresService';

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));

vi.mock('@/services/consultoresCoordenadoresService', () => ({
  consultoresCoordenadoresService: {
    listarConsultores: vi.fn(),
    listarResponsaveis: vi.fn(),
    definirCoordenador: vi.fn(),
    listarEspecialistasParaEmail: vi.fn(),
  },
}));

const service = consultoresCoordenadoresService as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

function criarWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe('useConsultoresCoordenadores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.listarConsultores.mockResolvedValue([
      { especialistaId: 'e1', nome: 'Ana', email: null, status: 'ativo', coordenadorId: null },
    ]);
    service.listarResponsaveis.mockResolvedValue([
      { id: 'c1', nome: 'Carlos', cargo: 'Coordenador', email: 'carlos@sonda.com' },
    ]);
  });

  it('carrega consultores e responsáveis', async () => {
    const { wrapper } = criarWrapper();

    const { result } = renderHook(() => useConsultoresCoordenadores(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.consultores).toHaveLength(1);
    expect(result.current.responsaveis).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('expõe o erro de carregamento', async () => {
    service.listarResponsaveis.mockRejectedValue(new Error('sem permissão'));
    const { wrapper } = criarWrapper();

    const { result } = renderHook(() => useConsultoresCoordenadores(), { wrapper });

    await waitFor(() => expect(result.current.error?.message).toBe('sem permissão'));
  });

  it('definir coordenador grava, recarrega a lista e avisa', async () => {
    service.definirCoordenador.mockResolvedValue(undefined);
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useConsultoresCoordenadores(), { wrapper });

    await act(() =>
      result.current.definirCoordenador({ especialistaId: 'e1', coordenadorId: 'c1' })
    );

    expect(service.definirCoordenador).toHaveBeenCalledWith('e1', 'c1');
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['consultores-coordenadores'] });
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'avisos.coordenadores.atualizado' })
    );
  });

  it('erro ao definir coordenador mostra toast destrutivo', async () => {
    service.definirCoordenador.mockRejectedValue(new Error('RLS'));
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useConsultoresCoordenadores(), { wrapper });

    await act(async () => {
      await result.current
        .definirCoordenador({ especialistaId: 'e1', coordenadorId: null })
        .catch(() => undefined);
    });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'avisos.coordenadores.erroSalvar',
        description: 'RLS',
        variant: 'destructive',
      })
    );
  });
});

describe('useBuscarEspecialistasParaEmail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca sempre dados novos (vínculo pode ter mudado desde a última abertura do modal)', async () => {
    service.listarEspecialistasParaEmail
      .mockResolvedValueOnce([{ nome: 'Ana', email: 'ana@sonda.com', email_coordenador: null }])
      .mockResolvedValueOnce([
        { nome: 'Ana', email: 'ana@sonda.com', email_coordenador: 'carlos@sonda.com' },
      ]);
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useBuscarEspecialistasParaEmail(), { wrapper });

    const primeira = await result.current();
    const segunda = await result.current();

    expect(primeira[0].email_coordenador).toBeNull();
    expect(segunda[0].email_coordenador).toBe('carlos@sonda.com');
    expect(service.listarEspecialistasParaEmail).toHaveBeenCalledTimes(2);
  });
});
