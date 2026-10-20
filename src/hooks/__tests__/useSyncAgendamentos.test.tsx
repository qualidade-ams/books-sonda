import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SyncAgendamentoInput, SyncExecucao } from '@/types/syncAgendamentos';

vi.mock('@/services/booksService', () => ({
  booksService: { listarEmpresasBook: vi.fn() },
}));

vi.mock('@/services/syncAgendamentosService', () => ({
  syncAgendamentosService: {
    listarAgendamentos: vi.fn(),
    criarAgendamento: vi.fn(),
    atualizarAgendamento: vi.fn(),
    alternarAtivo: vi.fn(),
    excluirAgendamento: vi.fn(),
    listarExecucoes: vi.fn(),
    executarAgora: vi.fn(),
    gerarBooksAgora: vi.fn(),
    preverExecucoes: vi.fn(),
    statusSyncApi: vi.fn(),
  },
}));

import { syncAgendamentosService } from '@/services/syncAgendamentosService';
import { booksService } from '@/services/booksService';
import {
  useSyncAgendamentos,
  useSyncExecucoes,
  useSalvarAgendamento,
  useExecutarSyncAgora,
  useGerarBooksAgora,
  useEmpresasBook,
  usePreverExecucoes,
  useStatusSyncJobs,
  intervaloPollingExecucoes,
  intervaloPollingAgendamentos,
} from '../useSyncAgendamentos';

const servico = syncAgendamentosService as any;

function criarWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidar = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidar };
}

const input = {
  nome: 'Diário',
  ativo: true,
  tabelas: { pesquisas: true },
  frequencia: 'diario',
  dias_semana: [],
  dias_mes: [],
  ultimo_dia_mes: false,
  modo_horario: 'horarios',
  horarios: ['07:00'],
  intervalo_horas: null,
  hora_inicio: null,
  hora_fim: null,
} as SyncAgendamentoInput;

describe('useSyncAgendamentos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista os agendamentos', async () => {
    servico.listarAgendamentos.mockResolvedValue([{ id: 'a1' }]);
    const { result } = renderHook(() => useSyncAgendamentos(), { wrapper: criarWrapper().wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.agendamentos).toEqual([{ id: 'a1' }]);
  });

  it('lista as execuções', async () => {
    servico.listarExecucoes.mockResolvedValue([{ id: 'e1', status: 'sucesso' }]);
    const { result } = renderHook(() => useSyncExecucoes(), { wrapper: criarWrapper().wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.execucoes).toEqual([{ id: 'e1', status: 'sucesso' }]);
  });
});

describe('intervaloPollingExecucoes', () => {
  it('atualiza a cada 3s enquanto houver execução em andamento', () => {
    expect(intervaloPollingExecucoes([{ status: 'executando' } as SyncExecucao])).toBe(3000);
  });

  it('não atualiza quando nada está rodando', () => {
    expect(intervaloPollingExecucoes([{ status: 'sucesso' } as SyncExecucao])).toBe(false);
    expect(intervaloPollingExecucoes(undefined)).toBe(false);
  });
});

describe('useSalvarAgendamento', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cria quando não há id e invalida a lista', async () => {
    servico.criarAgendamento.mockResolvedValue({ id: 'a1' });
    const { wrapper, invalidar } = criarWrapper();
    const { result } = renderHook(() => useSalvarAgendamento(), { wrapper });

    await act(() => result.current.mutateAsync({ dados: input }));

    expect(servico.criarAgendamento).toHaveBeenCalledWith(input);
    expect(servico.atualizarAgendamento).not.toHaveBeenCalled();
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['sync-agendamentos'] });
  });

  it('atualiza quando há id', async () => {
    servico.atualizarAgendamento.mockResolvedValue({ id: 'a1' });
    const { result } = renderHook(() => useSalvarAgendamento(), { wrapper: criarWrapper().wrapper });

    await act(() => result.current.mutateAsync({ id: 'a1', dados: input }));

    expect(servico.atualizarAgendamento).toHaveBeenCalledWith('a1', input);
  });
});

describe('useExecutarSyncAgora', () => {
  beforeEach(() => vi.clearAllMocks());

  it('dispara no sync-api e atualiza o histórico', async () => {
    servico.executarAgora.mockResolvedValue({ execucaoId: 'e1' });
    const { wrapper, invalidar } = criarWrapper();
    const { result } = renderHook(() => useExecutarSyncAgora(), { wrapper });

    await act(() => result.current.mutateAsync({ pesquisas: true }));

    expect(servico.executarAgora).toHaveBeenCalledWith({ pesquisas: true });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['sync-execucoes'] });
  });
});

describe('useStatusSyncJobs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('expõe se o agendador está ligado no sync-api', async () => {
    servico.statusSyncApi.mockResolvedValue({ emExecucao: false, agendadorAtivo: false });
    const { result } = renderHook(() => useStatusSyncJobs(), { wrapper: criarWrapper().wrapper });
    await waitFor(() => expect(result.current.agendadorAtivo).toBe(false));
  });

  it('não conclui nada enquanto o status não chegou (API fora do ar)', async () => {
    servico.statusSyncApi.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useStatusSyncJobs(), { wrapper: criarWrapper().wrapper });
    await waitFor(() => expect(servico.statusSyncApi).toHaveBeenCalled());
    expect(result.current.agendadorAtivo).toBeUndefined();
  });
});

describe('usePreverExecucoes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('busca a previsão só quando habilitado', async () => {
    servico.preverExecucoes.mockResolvedValue(['2026-09-24T10:00:00.000Z']);
    const { wrapper } = criarWrapper();

    renderHook(() => usePreverExecucoes(input, false), { wrapper });
    expect(servico.preverExecucoes).not.toHaveBeenCalled();

    const { result } = renderHook(() => usePreverExecucoes(input, true), { wrapper });
    await waitFor(() => expect(result.current.previsao).toEqual(['2026-09-24T10:00:00.000Z']));
    expect(servico.preverExecucoes).toHaveBeenCalledWith(
      expect.objectContaining({ frequencia: 'diario', horarios: ['07:00'] }),
      48
    );
  });
});

describe('useGerarBooksAgora', () => {
  beforeEach(() => vi.clearAllMocks());

  it('dispara a geração de books no sync-api e atualiza o histórico', async () => {
    servico.gerarBooksAgora.mockResolvedValue({ execucaoId: 'e2' });
    const { wrapper, invalidar } = criarWrapper();
    const { result } = renderHook(() => useGerarBooksAgora(), { wrapper });

    await act(() => result.current.mutateAsync(['emp-1']));

    expect(servico.gerarBooksAgora).toHaveBeenCalledWith(['emp-1']);
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['sync-execucoes'] });
  });
});

describe('useEmpresasBook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista as empresas que recebem book quando habilitado', async () => {
    (booksService.listarEmpresasBook as any).mockResolvedValue([{ id: 'e1', nome: 'ABBOTT' }]);
    const { result } = renderHook(() => useEmpresasBook(true), { wrapper: criarWrapper().wrapper });
    await waitFor(() => expect(result.current.empresas).toEqual([{ id: 'e1', nome: 'ABBOTT' }]));
  });

  it('não consulta quando desabilitado', () => {
    renderHook(() => useEmpresasBook(false), { wrapper: criarWrapper().wrapper });
    expect(booksService.listarEmpresasBook).not.toHaveBeenCalled();
  });
});

describe('intervaloPollingAgendamentos', () => {
  const ag = (extra: any) => ({ ativo: true, proxima_execucao: '2026-10-16T10:00:00Z', ...extra }) as any;

  it('recarrega a cada 5s enquanto um agendamento ativo aguarda o cálculo da próxima execução', () => {
    expect(intervaloPollingAgendamentos([ag({}), ag({ proxima_execucao: null })])).toBe(5000);
  });

  it('volta para 60s quando todos já têm próxima execução (inativos não contam)', () => {
    expect(intervaloPollingAgendamentos([ag({}), ag({ ativo: false, proxima_execucao: null })])).toBe(60000);
    expect(intervaloPollingAgendamentos(undefined)).toBe(60000);
  });
});
