import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { syncAgendamentosService } from '@/services/syncAgendamentosService';
import type {
  RegraRecorrencia,
  SyncAgendamento,
  SyncAgendamentoInput,
  SyncExecucao,
  TabelasSync,
} from '@/types/syncAgendamentos';

const CHAVE_AGENDAMENTOS = ['sync-agendamentos'];
const CHAVE_EXECUCOES = ['sync-execucoes'];

/** Enquanto houver execução em andamento, o histórico é atualizado a cada 3s */
export function intervaloPollingExecucoes(execucoes: SyncExecucao[] | undefined): number | false {
  return execucoes?.some((e) => e.status === 'executando') ? 3000 : false;
}

export function useSyncAgendamentos() {
  const { data: agendamentos = [], isLoading, error, refetch } = useQuery<SyncAgendamento[]>({
    queryKey: CHAVE_AGENDAMENTOS,
    queryFn: () => syncAgendamentosService.listarAgendamentos(),
    // próxima execução é recalculada pelo sync-api a cada minuto
    refetchInterval: 60_000,
  });

  return { agendamentos, isLoading, error, refetch };
}

export function useSyncExecucoes(limite = 50) {
  const { data: execucoes = [], isLoading, error, refetch } = useQuery<SyncExecucao[]>({
    queryKey: [...CHAVE_EXECUCOES, limite],
    queryFn: () => syncAgendamentosService.listarExecucoes(limite),
    refetchInterval: (query) => intervaloPollingExecucoes(query.state.data) || 60_000,
  });

  return { execucoes, isLoading, error, refetch };
}

export function useSalvarAgendamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dados }: { id?: string; dados: SyncAgendamentoInput }) =>
      id ? syncAgendamentosService.atualizarAgendamento(id, dados) : syncAgendamentosService.criarAgendamento(dados),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_AGENDAMENTOS }),
  });
}

export function useAlternarAgendamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => syncAgendamentosService.alternarAtivo(id, ativo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_AGENDAMENTOS }),
  });
}

export function useExcluirAgendamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => syncAgendamentosService.excluirAgendamento(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_AGENDAMENTOS }),
  });
}

export function useExecutarSyncAgora() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tabelas: TabelasSync) => syncAgendamentosService.executarAgora(tabelas),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_EXECUCOES }),
  });
}

/** Pré-visualização das próximas execuções de uma regra ainda não salva */
export function usePreverExecucoes(regra: RegraRecorrencia, habilitado: boolean) {
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
    queryFn: () => syncAgendamentosService.preverExecucoes(chaveRegra, 5),
    enabled: habilitado,
    retry: false,
    staleTime: 30_000,
  });

  return { previsao, isFetching, error: error as Error | null };
}
