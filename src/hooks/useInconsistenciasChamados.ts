import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inconsistenciasChamadosService } from '@/services/inconsistenciasChamadosService';
import type { 
  InconsistenciaChamado,
  InconsistenciasChamadosFiltros,
  InconsistenciasChamadosEstatisticas,
  HistoricoInconsistencia,
  EnviarNotificacaoRequest
} from '@/types/inconsistenciasChamados';

/**
 * Hook para gerenciar inconsistências de chamados
 */
export function useInconsistenciasChamados(filtros?: InconsistenciasChamadosFiltros) {
  const {
    data: inconsistencias = [],
    isLoading,
    error,
    refetch
  } = useQuery<InconsistenciaChamado[]>({
    queryKey: ['inconsistencias-chamados', filtros],
    queryFn: () => inconsistenciasChamadosService.buscarInconsistencias(filtros),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  return {
    inconsistencias,
    isLoading,
    error,
    refetch
  };
}

/**
 * Hook para buscar estatísticas de inconsistências
 */
export function useInconsistenciasEstatisticas(filtros?: InconsistenciasChamadosFiltros) {
  const {
    data: estatisticas,
    isLoading,
    error,
    refetch
  } = useQuery<InconsistenciasChamadosEstatisticas>({
    queryKey: ['inconsistencias-estatisticas', filtros],
    queryFn: () => inconsistenciasChamadosService.buscarEstatisticas(filtros),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  return {
    estatisticas,
    isLoading,
    error,
    refetch
  };
}

/**
 * Hook para buscar histórico de inconsistências
 */
export function useHistoricoInconsistencias(mes: number, ano: number) {
  const {
    data: historico = [],
    isLoading,
    error,
    refetch
  } = useQuery<HistoricoInconsistencia[]>({
    queryKey: ['historico-inconsistencias', mes, ano],
    queryFn: () => inconsistenciasChamadosService.buscarHistorico(mes, ano),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  return {
    historico,
    isLoading,
    error,
    refetch
  };
}

/**
 * Hook para enviar notificações
 */
export function useEnviarNotificacao() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (request: EnviarNotificacaoRequest) => 
      inconsistenciasChamadosService.enviarNotificacao(request),
    onSuccess: () => {
      // Invalidar queries para atualizar dados
      queryClient.invalidateQueries({ queryKey: ['inconsistencias-chamados'] });
      queryClient.invalidateQueries({ queryKey: ['inconsistencias-estatisticas'] });
      queryClient.invalidateQueries({ queryKey: ['historico-inconsistencias'] });
    }
  });

  return {
    enviarNotificacao: mutation.mutate,
    isEnviando: mutation.isPending,
    erro: mutation.error
  };
}
