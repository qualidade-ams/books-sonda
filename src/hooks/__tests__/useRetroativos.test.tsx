import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEmailsConsultores, useRetroativos } from '../useRetroativos';
import { pedirRegularizacao } from '@/services/retroativos/envioRegularizacao';
import { retroativosService } from '@/services/retroativosService';

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));

vi.mock('@/services/retroativosService', () => ({
  retroativosService: {
    listar: vi.fn(),
    decidir: vi.fn(),
    registrarAviso: vi.fn(),
    emailsDosConsultores: vi.fn(),
  },
}));

vi.mock('@/services/retroativos/envioRegularizacao', () => ({ pedirRegularizacao: vi.fn() }));
const pedir = vi.mocked(pedirRegularizacao);

const service = retroativosService as unknown as Record<string, ReturnType<typeof vi.fn>>;

function criarWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe('useRetroativos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.listar.mockResolvedValue([
      { id: 'rt1', situacao: 'pendente' },
      { id: 'rt2', situacao: 'pendente' },
      { id: 'rt3', situacao: 'aplicado' },
    ]);
  });

  it('carrega a lista com a contagem por situação', async () => {
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useRetroativos(), { wrapper });

    await waitFor(() => expect(result.current.retroativos).toHaveLength(3));
    expect(result.current.contagem).toEqual({
      pendente: 2,
      aprovado: 0,
      aplicado: 1,
      descartado: 0,
    });
  });

  it('expõe o erro de carregamento', async () => {
    service.listar.mockRejectedValue(new Error('Sem permissão'));
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useRetroativos(), { wrapper });
    await waitFor(() => expect(result.current.error?.message).toBe('Sem permissão'));
  });

  it('tentar de novo busca a lista outra vez', async () => {
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useRetroativos(), { wrapper });
    await waitFor(() => expect(result.current.retroativos).toHaveLength(3));
    service.listar.mockClear();

    await act(() => result.current.recarregar());

    expect(service.listar).toHaveBeenCalledTimes(1);
  });

  it('aprovar recarrega a lista e o sino, e avisa', async () => {
    service.decidir.mockResolvedValue(undefined);
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useRetroativos(), { wrapper });

    await act(() =>
      result.current.decidir({ retroativoId: 'rt1', decisao: 'aprovar', justificativa: 'Real' })
    );

    expect(service.decidir).toHaveBeenCalledWith('rt1', 'aprovar', 'Real');
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['retroativos-bh'] });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['notificacoes'] });
    expect(toast).toHaveBeenCalledWith({
      title: 'avisos.retroativos.aprovado',
      description: 'avisos.retroativos.aprovadoDescricao',
    });
  });

  it('descartar avisa sem a retificação', async () => {
    service.decidir.mockResolvedValue(undefined);
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useRetroativos(), { wrapper });

    await act(() =>
      result.current.decidir({ retroativoId: 'rt1', decisao: 'descartar', justificativa: 'Teste' })
    );

    expect(toast).toHaveBeenCalledWith({ title: 'avisos.retroativos.descartado' });
  });

  it('registrar aviso recarrega a lista', async () => {
    service.registrarAviso.mockResolvedValue(undefined);
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useRetroativos(), { wrapper });

    await act(() => result.current.registrarAviso({ retroativoId: 'rt1', itemIds: ['ap1'] }));

    expect(service.registrarAviso).toHaveBeenCalledWith('rt1', ['ap1']);
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['retroativos-bh'] });
  });

  it('erro na decisão aparece no aviso', async () => {
    service.decidir.mockRejectedValue(new Error('Só o pendente é aprovado ou descartado.'));
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useRetroativos(), { wrapper });

    await act(() =>
      result.current
        .decidir({ retroativoId: 'rt3', decisao: 'aprovar', justificativa: 'x' })
        .catch(() => undefined)
    );

    expect(toast).toHaveBeenCalledWith({
      title: 'avisos.retroativos.erroDecidir',
      description: 'Só o pendente é aprovado ou descartado.',
      variant: 'destructive',
    });
  });

  it('pedir regularização: avisa quem recebeu e quem ficou de fora, e recarrega', async () => {
    pedir.mockResolvedValue({
      enviados: ['Ana Souza', 'Bruno Lima'],
      semEmail: ['Carla Dias'],
      falhas: [{ consultor: 'Davi Reis', erro: 'Caixa cheia' }],
    });
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useRetroativos(), { wrapper });
    const input = { envelopes: [], copia: [] };

    await act(() => result.current.pedirRegularizacao(input));

    expect(pedir).toHaveBeenCalledWith(input);
    expect(toast).toHaveBeenCalledWith({
      title: 'avisos.retroativos.emailsEnviados.varios {"n":2}',
    });
    expect(toast).toHaveBeenCalledWith({
      title: 'avisos.retroativos.naoReceberam',
      description:
        'avisos.retroativos.semEmail {"nome":"Carla Dias"} · avisos.retroativos.falha {"nome":"Davi Reis","erro":"Caixa cheia"}',
      variant: 'destructive',
    });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['retroativos-bh'] });
  });
});

describe('useEmailsConsultores', () => {
  it('só busca com a tela de envio aberta', async () => {
    service.emailsDosConsultores.mockResolvedValue({ 'Ana Souza': 'ana@sonda.com' });
    const { wrapper } = criarWrapper();
    renderHook(() => useEmailsConsultores(['Ana Souza'], false), { wrapper });
    expect(service.emailsDosConsultores).not.toHaveBeenCalled();

    const { result } = renderHook(() => useEmailsConsultores(['Ana Souza'], true), { wrapper });
    await waitFor(() => expect(result.current.emails).toEqual({ 'Ana Souza': 'ana@sonda.com' }));
    expect(service.emailsDosConsultores).toHaveBeenCalledWith(['Ana Souza']);
  });
});
