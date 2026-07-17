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
 * Hook para buscar inconsistências ativas (pendentes de correção)
 */
export function useInconsistenciasChamados(filtros?: InconsistenciasChamadosFiltros) {
  const {
    data: inconsistencias = [],
    isLoading,
    error,
    refetch
  } = useQuery<InconsistenciaChamado[]>({
    queryKey: ['inconsistencias-chamados', 'ativas', filtros],
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
 * Hook para buscar inconsistências resolvidas (corrigidas pelo analista)
 */
export function useInconsistenciasResolvidas(filtros?: InconsistenciasChamadosFiltros) {
  const {
    data: resolvidas = [],
    isLoading,
    error,
    refetch
  } = useQuery<InconsistenciaChamado[]>({
    queryKey: ['inconsistencias-chamados', 'resolvidas', filtros],
    queryFn: () => inconsistenciasChamadosService.buscarResolvidas(filtros),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  return {
    resolvidas,
    isLoading,
    error,
    refetch
  };
}

/**
 * Hook para buscar estatísticas de inconsistências ativas
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
 * Hook para buscar histórico de emails enviados
 */
export function useHistoricoEmailsInconsistencias(ano: number) {
  const {
    data: historico = [],
    isLoading,
    error,
    refetch
  } = useQuery<HistoricoInconsistencia[]>({
    queryKey: ['historico-emails-inconsistencias', ano],
    queryFn: () => inconsistenciasChamadosService.buscarHistoricoEmails(ano),
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
 * @deprecated Use useHistoricoEmailsInconsistencias instead
 * Mantido para compatibilidade
 */
export function useHistoricoInconsistencias(ano: number) {
  return useHistoricoEmailsInconsistencias(ano);
}

/**
 * Hook para arquivar inconsistências (mover para histórico)
 */
export function useArquivarInconsistencia() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => 
      inconsistenciasChamadosService.arquivarInconsistencia(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inconsistencias-chamados'] });
      queryClient.invalidateQueries({ queryKey: ['inconsistencias-estatisticas'] });
    }
  });

  const mutationMultiplas = useMutation({
    mutationFn: (ids: string[]) => 
      inconsistenciasChamadosService.arquivarMultiplas(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inconsistencias-chamados'] });
      queryClient.invalidateQueries({ queryKey: ['inconsistencias-estatisticas'] });
    }
  });

  return {
    arquivar: mutation.mutate,
    arquivarAsync: mutation.mutateAsync,
    isArquivando: mutation.isPending,
    arquivarMultiplas: mutationMultiplas.mutate,
    arquivarMultiplasAsync: mutationMultiplas.mutateAsync,
    isArquivandoMultiplas: mutationMultiplas.isPending
  };
}

/**
 * Hook para enviar notificações por email
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
      queryClient.invalidateQueries({ queryKey: ['historico-emails-inconsistencias'] });
    }
  });

  return {
    enviarNotificacao: mutation.mutate,
    isEnviando: mutation.isPending,
    erro: mutation.error
  };
}
