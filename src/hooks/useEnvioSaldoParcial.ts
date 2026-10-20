import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { envioSaldoParcialService } from '@/services/envioSaldoParcialService';
import type {
  AgendamentoSaldoParcial,
  AgendamentoSaldoParcialInput,
  ClienteElegivelSaldoParcial,
  ExecucaoSaldoParcial,
} from '@/types/envioSaldoParcial';
import type { RegraRecorrencia } from '@/types/syncAgendamentos';

const CHAVE_AGENDAMENTOS = ['envio-saldo-parcial', 'agendamentos'];
const CHAVE_EXECUCOES = ['envio-saldo-parcial', 'execucoes'];
// Sob ['clientes']: criar/editar/inativar um contato (useClientes) invalida e recarrega a contagem
const CHAVE_CLIENTES = ['clientes', 'elegiveis-saldo-parcial'];

/** Enquanto houver envio em andamento, o histórico é atualizado a cada 3s */
export function intervaloPollingExecucoesSaldoParcial(execucoes: ExecucaoSaldoParcial[] | undefined): number | false {
  return execucoes?.some((e) => e.status === 'executando') ? 3000 : false;
}

/**
 * Após salvar, o banco zera proxima_execucao e o sync-api recalcula no ciclo seguinte (até 60s):
 * enquanto algum agendamento ativo estiver sem ela, a lista é consultada a cada 5s.
 */
export function intervaloPollingAgendamentosSaldoParcial(agendamentos: AgendamentoSaldoParcial[] | undefined): number {
  return agendamentos?.some((a) => a.ativo && !a.proxima_execucao) ? 5000 : 60_000;
}

export function useAgendamentosSaldoParcial() {
  const { data: agendamentos = [], isLoading, error, refetch } = useQuery<AgendamentoSaldoParcial[]>({
    queryKey: CHAVE_AGENDAMENTOS,
    queryFn: () => envioSaldoParcialService.listarAgendamentos(),
    refetchInterval: (query) => intervaloPollingAgendamentosSaldoParcial(query.state.data),
  });

  return { agendamentos, isLoading, error, refetch };
}

export function useExecucoesSaldoParcial(limite = 50) {
  const { data: execucoes = [], isLoading, error, refetch } = useQuery<ExecucaoSaldoParcial[]>({
    queryKey: [...CHAVE_EXECUCOES, limite],
    queryFn: () => envioSaldoParcialService.listarExecucoes(limite),
    refetchInterval: (query) => intervaloPollingExecucoesSaldoParcial(query.state.data) || 60_000,
  });

  return { execucoes, isLoading, error, refetch };
}

export function useClientesElegiveisSaldoParcial() {
  const { data: clientes = [], isLoading, error } = useQuery<ClienteElegivelSaldoParcial[]>({
    queryKey: CHAVE_CLIENTES,
    queryFn: () => envioSaldoParcialService.listarClientesElegiveis(),
    staleTime: 5 * 60 * 1000,
  });

  return { clientes, isLoading, error };
}

export function useSalvarAgendamentoSaldoParcial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dados }: { id?: string; dados: AgendamentoSaldoParcialInput }) =>
      id ? envioSaldoParcialService.atualizarAgendamento(id, dados) : envioSaldoParcialService.criarAgendamento(dados),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_AGENDAMENTOS }),
  });
}

export function useAlternarAgendamentoSaldoParcial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => envioSaldoParcialService.alternarAtivo(id, ativo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_AGENDAMENTOS }),
  });
}

export function useExcluirAgendamentoSaldoParcial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => envioSaldoParcialService.excluirAgendamento(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_AGENDAMENTOS }),
  });
}

export function useExecutarSaldoParcialAgora() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agendamentoId: string) => envioSaldoParcialService.executarAgora(agendamentoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_EXECUCOES }),
  });
}

/** Status do sync-api; os campos ficam undefined enquanto não há resposta */
export function useStatusSaldoParcial() {
  const { data } = useQuery({
    queryKey: [...CHAVE_AGENDAMENTOS, 'status-sync-api'],
    queryFn: () => envioSaldoParcialService.statusSyncApi(),
    refetchInterval: 60_000,
    retry: false,
  });

  return { agendadorAtivo: data?.agendadorAtivo, renderImagemConfigurado: data?.renderImagemConfigurado };
}

/** Pré-visualização das próximas execuções de uma regra ainda não salva */
export function usePreverExecucoesSaldoParcial(regra: RegraRecorrencia, habilitado: boolean) {
  const chaveRegra: RegraRecorrencia = {
    frequencia: regra.frequencia,
    dias_semana: regra.dias_semana,
    dias_mes: regra.dias_mes,
    ultimo_dia_mes: regra.ultimo_dia_mes,
    modo_horario: regra.modo_horario,
    horarios: regra.horarios,
    intervalo_horas: regra.intervalo_horas,
    hora_inicio: regra.hora_inicio,
    hora_fim: regra.hora_fim,
  };

  const { data: previsao = [], isFetching, error } = useQuery<string[]>({
    queryKey: [...CHAVE_AGENDAMENTOS, 'previsao', chaveRegra],
    queryFn: () => envioSaldoParcialService.preverExecucoes(chaveRegra, 48),
    enabled: habilitado,
    retry: false,
    staleTime: 30_000,
  });

  return { previsao, isFetching, error: error as Error | null };
}
