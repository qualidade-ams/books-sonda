import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useAgendamentosSaldoParcial,
  useClientesElegiveisSaldoParcial,
  useSalvarAgendamentoSaldoParcial,
  useExecutarSaldoParcialAgora,
  intervaloPollingExecucoesSaldoParcial,
  intervaloPollingAgendamentosSaldoParcial
} from '../useEnvioSaldoParcial';
import { envioSaldoParcialService } from '@/services/envioSaldoParcialService';

vi.mock('@/services/envioSaldoParcialService', () => ({
  envioSaldoParcialService: {
    listarAgendamentos: vi.fn(),
    listarClientesElegiveis: vi.fn(),
    criarAgendamento: vi.fn(),
    atualizarAgendamento: vi.fn(),
    executarAgora: vi.fn()
  }
}));

function criarWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

describe('useEnvioSaldoParcial', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista os agendamentos', async () => {
    (envioSaldoParcialService.listarAgendamentos as any).mockResolvedValue([{ id: 'ag-1' }]);
    const { wrapper } = criarWrapper();

    const { result } = renderHook(() => useAgendamentosSaldoParcial(), { wrapper });

    await waitFor(() => expect(result.current.agendamentos).toEqual([{ id: 'ag-1' }]));
  });

  it('lista os clientes elegíveis', async () => {
    (envioSaldoParcialService.listarClientesElegiveis as any).mockResolvedValue([{ id: 'e1', nome: 'A', qtdContatosSaldoParcial: 1 }]);
    const { wrapper } = criarWrapper();

    const { result } = renderHook(() => useClientesElegiveisSaldoParcial(), { wrapper });

    await waitFor(() => expect(result.current.clientes).toHaveLength(1));
  });

  it('salvar cria quando não há id e atualiza quando há, invalidando a lista', async () => {
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useSalvarAgendamentoSaldoParcial(), { wrapper });
    const dados = { nome: 'X' } as any;

    await act(() => result.current.mutateAsync({ dados }));
    await act(() => result.current.mutateAsync({ id: 'ag-1', dados }));

    expect(envioSaldoParcialService.criarAgendamento).toHaveBeenCalledWith(dados);
    expect(envioSaldoParcialService.atualizarAgendamento).toHaveBeenCalledWith('ag-1', dados);
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['envio-saldo-parcial', 'agendamentos'] });
  });

  it('executar agora dispara no sync-api e atualiza o histórico', async () => {
    const { wrapper, client } = criarWrapper();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useExecutarSaldoParcialAgora(), { wrapper });

    await act(() => result.current.mutateAsync('ag-1'));

    expect(envioSaldoParcialService.executarAgora).toHaveBeenCalledWith('ag-1');
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['envio-saldo-parcial', 'execucoes'] });
  });

  it('consulta os agendamentos a cada 5s enquanto algum ativo espera o servidor calcular o próximo envio', () => {
    expect(intervaloPollingAgendamentosSaldoParcial([{ ativo: true, proxima_execucao: null }] as any)).toBe(5000);
    expect(intervaloPollingAgendamentosSaldoParcial([{ ativo: false, proxima_execucao: null }] as any)).toBe(60_000);
    expect(intervaloPollingAgendamentosSaldoParcial([{ ativo: true, proxima_execucao: '2026-10-05T12:40:00Z' }] as any)).toBe(60_000);
    expect(intervaloPollingAgendamentosSaldoParcial(undefined)).toBe(60_000);
  });

  it('atualiza o histórico a cada 3s só enquanto houver envio em andamento', () => {
    expect(intervaloPollingExecucoesSaldoParcial([{ status: 'executando' }] as any)).toBe(3000);
    expect(intervaloPollingExecucoesSaldoParcial([{ status: 'sucesso' }] as any)).toBe(false);
    expect(intervaloPollingExecucoesSaldoParcial(undefined)).toBe(false);
  });
});
