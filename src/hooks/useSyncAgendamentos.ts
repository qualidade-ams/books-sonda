import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { syncAgendamentosService } from '@/services/syncAgendamentosService';
import { booksService } from '@/services/booksService';
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

/**
 * A próxima execução é calculada pelo sync-api (ciclo de 60s). Enquanto algum agendamento
 * ativo está "Calculando…" (novo ou regra alterada), a lista é atualizada a cada 5s.
 */
export function intervaloPollingAgendamentos(agendamentos: SyncAgendamento[] | undefined): number {
  return agendamentos?.some((ag) => ag.ativo && !ag.proxima_execucao) ? 5000 : 60_000;
}

export function useSyncAgendamentos() {
  const { data: agendamentos = [], isLoading, error, refetch } = useQuery<SyncAgendamento[]>({
    queryKey: CHAVE_AGENDAMENTOS,
    queryFn: () => syncAgendamentosService.listarAgendamentos(),
    refetchInterval: (query) => intervaloPollingAgendamentos(query.state.data),
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

/** Geração de books agora (no sync-api); o andamento aparece no histórico */
export function useGerarBooksAgora() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (empresaIds: string[] = []) => syncAgendamentosService.gerarBooksAgora(empresaIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_EXECUCOES }),
  });
}

/** Empresas que recebem book, para escolher quais a geração automática processa */
export function useEmpresasBook(habilitado: boolean) {
  const { data: empresas = [], isLoading, error } = useQuery({
    queryKey: [...CHAVE_AGENDAMENTOS, 'empresas-book'],
    queryFn: () => booksService.listarEmpresasBook(),
    enabled: habilitado,
    staleTime: 5 * 60_000,
  });

  return { empresas, isLoading, error: error as Error | null };
}

/** Status do sync-api; `agendadorAtivo` fica undefined enquanto não há resposta */
export function useStatusSyncJobs() {
  const { data } = useQuery({
    queryKey: [...CHAVE_AGENDAMENTOS, 'status-sync-api'],
    queryFn: () => syncAgendamentosService.statusSyncApi(),
    refetchInterval: 60_000,
    retry: false,
  });

  return { agendadorAtivo: data?.agendadorAtivo };
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
    // 48 = limite do sync-api; a tela filtra as próximas 24 horas (execucoesParaPrevisao)
    queryFn: () => syncAgendamentosService.preverExecucoes(chaveRegra, 48),
    enabled: habilitado,
    retry: false,
    staleTime: 30_000,
  });

  return { previsao, isFetching, error: error as Error | null };
}
