import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { requerimentosService } from '@/services/requerimentosService';
import {
  Requerimento,
  RequerimentoFormData,
  FaturamentoData,
  ClienteRequerimento,
  EstatisticasRequerimentos,
  FiltrosRequerimentos,
  StatusRequerimento
} from '@/types/requerimentos';
import { getRequerimentoErrorMessage } from '@/errors/requerimentosErrors';

// Chaves de cache para React Query
export const REQUERIMENTOS_QUERY_KEYS = {
  all: ['requerimentos'] as const,
  lists: () => [...REQUERIMENTOS_QUERY_KEYS.all, 'list'] as const,
  list: (filtros?: FiltrosRequerimentos) => [...REQUERIMENTOS_QUERY_KEYS.lists(), filtros] as const,
  details: () => [...REQUERIMENTOS_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...REQUERIMENTOS_QUERY_KEYS.details(), id] as const,
  naoEnviados: () => [...REQUERIMENTOS_QUERY_KEYS.all, 'nao-enviados'] as const,
  enviados: (filtros?: FiltrosRequerimentos) => [...REQUERIMENTOS_QUERY_KEYS.all, 'enviados', filtros] as const,
  faturamento: (mes?: number, ano?: number) => [...REQUERIMENTOS_QUERY_KEYS.all, 'faturamento', mes, ano] as const,
  clientes: () => ['clientes-requerimentos'] as const,
  estatisticas: (filtros?: FiltrosRequerimentos) => [...REQUERIMENTOS_QUERY_KEYS.all, 'estatisticas', filtros] as const
};

/**
 * Hook para listar requerimentos com filtros
 */
export function useRequerimentos(filtros?: FiltrosRequerimentos) {
  return useQuery({
    queryKey: REQUERIMENTOS_QUERY_KEYS.list(filtros),
    queryFn: () => requerimentosService.listarRequerimentos(filtros),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
}

/**
 * Hook para buscar requerimentos não enviados para faturamento
 */
export function useRequerimentosNaoEnviados() {
  return useQuery({
    queryKey: REQUERIMENTOS_QUERY_KEYS.naoEnviados(),
    queryFn: () => requerimentosService.buscarRequerimentosNaoEnviados(),
    staleTime: 1000 * 30, // 30 segundos
    gcTime: 1000 * 60 * 5, // 5 minutos
    refetchInterval: 1000 * 60, // Atualizar a cada 1 minuto
    refetchOnWindowFocus: true, // Atualizar quando focar na janela
  });
}

/**
 * Hook para buscar requerimentos enviados para faturamento (histórico)
 */
export function useRequerimentosEnviados(filtros?: FiltrosRequerimentos) {
  return useQuery({
    queryKey: REQUERIMENTOS_QUERY_KEYS.enviados(filtros),
    queryFn: () => {
      // Buscar requerimentos enviados para faturamento ou já faturados
      // Usar buscarRequerimentosFaturados que busca ambos os status
      const mesCobranca = filtros?.mes_cobranca;
      return requerimentosService.buscarRequerimentosFaturados(mesCobranca);
    },
    staleTime: 1000 * 30, // 30 segundos
    gcTime: 1000 * 60 * 5, // 5 minutos
    refetchInterval: 1000 * 60, // Atualizar a cada 1 minuto
    refetchOnWindowFocus: true, // Atualizar quando focar na janela
  });
}

/**
 * Hook para buscar requerimentos para faturamento
 */
export function useRequerimentosFaturamento(mes?: number, ano?: number) {
  // Converter mês e ano para formato MM/YYYY se fornecidos
  const mesCobranca = mes && ano ? `${String(mes).padStart(2, '0')}/${ano}` : undefined;
  
  console.log('useRequerimentosFaturamento - Parâmetros:', { mes, ano, mesCobranca });
  
  return useQuery({
    queryKey: REQUERIMENTOS_QUERY_KEYS.faturamento(mes, ano),
    queryFn: () => requerimentosService.gerarDadosFaturamento(mesCobranca),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
}

/**
 * Hook para obter requerimento por ID
 */
export function useRequerimento(id: string) {
  return useQuery({
    queryKey: REQUERIMENTOS_QUERY_KEYS.detail(id),
    queryFn: () => requerimentosService.obterRequerimentoPorId(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
}

/**
 * Hook para buscar clientes
 */
export function useClientesRequerimentos() {
  return useQuery({
    queryKey: REQUERIMENTOS_QUERY_KEYS.clientes(),
    queryFn: () => requerimentosService.buscarClientes(),
    staleTime: 1000 * 60 * 10, // 10 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos
  });
}

/**
 * Hook para obter estatísticas
 */
export function useEstatisticasRequerimentos(filtros?: FiltrosRequerimentos) {
  return useQuery({
    queryKey: REQUERIMENTOS_QUERY_KEYS.estatisticas(filtros),
    queryFn: () => requerimentosService.obterEstatisticas(filtros),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
}

/**
 * Hook para criar requerimento
 */
export function useCreateRequerimento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RequerimentoFormData) => {
      // Obter dados do usuário autenticado do Supabase
      const { data: { user } } = await supabase.auth.getUser();
      
      // Adicionar dados do autor se usuário estiver autenticado
      const dataComAutor: RequerimentoFormData = {
        ...data,
        autor_id: user?.id || undefined,
        autor_nome: user?.user_metadata?.full_name || user?.email || 'Usuário não identificado'
      };
      
      return requerimentosService.criarRequerimento(dataComAutor);
    },
    onSuccess: (novoRequerimento) => {
      // Invalidar todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: REQUERIMENTOS_QUERY_KEYS.all });
      
      // Adicionar o novo requerimento ao cache de não enviados
      queryClient.setQueryData<Requerimento[]>(
        REQUERIMENTOS_QUERY_KEYS.naoEnviados(),
        (old) => old ? [novoRequerimento, ...old] : [novoRequerimento]
      );

      toast.success('Requerimento criado com sucesso!');
    },
    onError: (error: unknown) => {
      console.error('Erro ao criar requerimento:', error);
      const message = getRequerimentoErrorMessage(error);
      toast.error(`Erro ao criar requerimento: ${message}`);
    }
  });
}

/**
 * Hook para atualizar requerimento
 */
export function useUpdateRequerimento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RequerimentoFormData> }) =>
      requerimentosService.atualizarRequerimento(id, data),
    onSuccess: (_, { id }) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: REQUERIMENTOS_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: REQUERIMENTOS_QUERY_KEYS.detail(id) });

      toast.success('Requerimento atualizado com sucesso!');
    },
    onError: (error: unknown) => {
      console.error('Erro ao atualizar requerimento:', error);
      const message = getRequerimentoErrorMessage(error);
      toast.error(`Erro ao atualizar requerimento: ${message}`);
    }
  });
}

/**
 * Hook para deletar requerimento
 */
export function useDeleteRequerimento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => requerimentosService.deletarRequerimento(id),
    onSuccess: (_, id) => {
      // Invalidar todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: REQUERIMENTOS_QUERY_KEYS.all });

      // Remover do cache específico
      queryClient.removeQueries({ queryKey: REQUERIMENTOS_QUERY_KEYS.detail(id) });

      // Atualizar cache de não enviados removendo o item
      queryClient.setQueryData<Requerimento[]>(
        REQUERIMENTOS_QUERY_KEYS.naoEnviados(),
        (old) => old ? old.filter(req => req.id !== id) : []
      );

      toast.success('Requerimento deletado com sucesso!');
    },
    onError: (error: unknown) => {
      console.error('Erro ao deletar requerimento:', error);
      const message = getRequerimentoErrorMessage(error);
      toast.error(`Erro ao deletar requerimento: ${message}`);
    }
  });
}

/**
 * Hook para enviar requerimento para faturamento
 */
export function useEnviarParaFaturamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => requerimentosService.enviarParaFaturamento(id),
    onSuccess: (_, id) => {
      // Invalidar todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: REQUERIMENTOS_QUERY_KEYS.all });

      // Remover do cache de não enviados
      queryClient.setQueryData<Requerimento[]>(
        REQUERIMENTOS_QUERY_KEYS.naoEnviados(),
        (old) => old ? old.filter(req => req.id !== id) : []
      );

      // Invalidar cache de faturamento para atualizar
      queryClient.invalidateQueries({ 
        queryKey: [...REQUERIMENTOS_QUERY_KEYS.all, 'faturamento'] 
      });

      // Invalidar cache de faturados para atualizar a aba "Histórico de Enviados"
      queryClient.invalidateQueries({ 
        queryKey: [...REQUERIMENTOS_QUERY_KEYS.all, 'faturados'] 
      });

      toast.success('Requerimento enviado para faturamento com sucesso!');
    },
    onError: (error: unknown) => {
      console.error('Erro ao enviar requerimento para faturamento:', error);
      const message = getRequerimentoErrorMessage(error);
      toast.error(`Erro ao enviar para faturamento: ${message}`);
    }
  });
}

/**
 * Hook para enviar múltiplos requerimentos para faturamento
 */
export function useEnviarMultiplosParaFaturamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const promises = ids.map(id => requerimentosService.enviarParaFaturamento(id));
      await Promise.all(promises);
      return ids;
    },
    onSuccess: (ids) => {
      // Invalidar todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: REQUERIMENTOS_QUERY_KEYS.all });

      // Remover do cache de não enviados
      queryClient.setQueryData<Requerimento[]>(
        REQUERIMENTOS_QUERY_KEYS.naoEnviados(),
        (old) => old ? old.filter(req => !ids.includes(req.id)) : []
      );

      // Invalidar cache de faturamento
      queryClient.invalidateQueries({ 
        queryKey: [...REQUERIMENTOS_QUERY_KEYS.all, 'faturamento'] 
      });

      // Invalidar cache de faturados para atualizar a aba "Histórico de Enviados"
      queryClient.invalidateQueries({ 
        queryKey: [...REQUERIMENTOS_QUERY_KEYS.all, 'faturados'] 
      });

      toast.success(`${ids.length} requerimento(s) enviado(s) para faturamento com sucesso!`);
    },
    onError: (error: unknown) => {
      console.error('Erro ao enviar requerimentos para faturamento:', error);
      const message = getRequerimentoErrorMessage(error);
      toast.error(`Erro ao enviar requerimentos para faturamento: ${message}`);
    }
  });
}

/**
 * Hook para rejeitar requerimento (voltar para lançado)
 */
export function useRejeitarRequerimento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => requerimentosService.rejeitarRequerimento(id),
    onSuccess: (_, id) => {
      // Invalidar todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: REQUERIMENTOS_QUERY_KEYS.all });

      // Adicionar de volta ao cache de não enviados
      queryClient.invalidateQueries({ queryKey: REQUERIMENTOS_QUERY_KEYS.naoEnviados() });

      // Invalidar cache de faturamento
      queryClient.invalidateQueries({ 
        queryKey: [...REQUERIMENTOS_QUERY_KEYS.all, 'faturamento'] 
      });

      toast.success('Requerimento rejeitado com sucesso!');
    },
    onError: (error: unknown) => {
      console.error('Erro ao rejeitar requerimento:', error);
      const message = getRequerimentoErrorMessage(error);
      toast.error(`Erro ao rejeitar requerimento: ${message}`);
    }
  });
}

/**
 * Hook para marcar requerimentos como faturados
 */
export function useMarcarComoFaturados() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => requerimentosService.marcarComoFaturados(ids),
    onSuccess: (_, ids) => {
      // Invalidar todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: REQUERIMENTOS_QUERY_KEYS.all });

      // Invalidar cache de faturamento
      queryClient.invalidateQueries({ 
        queryKey: [...REQUERIMENTOS_QUERY_KEYS.all, 'faturamento'] 
      });

      toast.success(`${ids.length} requerimento(s) marcado(s) como faturado(s) com sucesso!`);
    },
    onError: (error: unknown) => {
      console.error('Erro ao marcar requerimentos como faturados:', error);
      const message = getRequerimentoErrorMessage(error);
      toast.error(`Erro ao marcar como faturados: ${message}`);
    }
  });
}

/**
 * Hook para buscar requerimentos faturados
 */
export function useRequerimentosFaturados(mesCobranca?: string) {
  return useQuery({
    queryKey: [...REQUERIMENTOS_QUERY_KEYS.all, 'faturados', mesCobranca],
    queryFn: () => requerimentosService.buscarRequerimentosFaturados(mesCobranca),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
}

/**
 * Hook para invalidar cache de requerimentos
 */
export function useInvalidateRequerimentos() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: REQUERIMENTOS_QUERY_KEYS.all });
    },
    invalidateList: (filtros?: FiltrosRequerimentos) => {
      queryClient.invalidateQueries({ queryKey: REQUERIMENTOS_QUERY_KEYS.list(filtros) });
    },
    invalidateDetail: (id: string) => {
      queryClient.invalidateQueries({ queryKey: REQUERIMENTOS_QUERY_KEYS.detail(id) });
    },
    invalidateNaoEnviados: () => {
      queryClient.invalidateQueries({ queryKey: REQUERIMENTOS_QUERY_KEYS.naoEnviados() });
    },
    invalidateFaturamento: (mes?: number, ano?: number) => {
      queryClient.invalidateQueries({ queryKey: REQUERIMENTOS_QUERY_KEYS.faturamento(mes, ano) });
    },
    invalidateClientes: () => {
      queryClient.invalidateQueries({ queryKey: REQUERIMENTOS_QUERY_KEYS.clientes() });
    },
    invalidateEstatisticas: (filtros?: FiltrosRequerimentos) => {
      queryClient.invalidateQueries({ queryKey: REQUERIMENTOS_QUERY_KEYS.estatisticas(filtros) });
    }
  };
}

/**
 * Hook principal que combina todas as funcionalidades
 */
export function useRequerimentosManager() {
  const invalidate = useInvalidateRequerimentos();
  
  return {
    // Queries
    useRequerimentos,
    useRequerimentosNaoEnviados,
    useRequerimentosEnviados,
    useRequerimentosFaturamento,
    useRequerimento,
    useClientesRequerimentos,
    useEstatisticasRequerimentos,
    
    // Mutations
    createRequerimento: useCreateRequerimento(),
    updateRequerimento: useUpdateRequerimento(),
    deleteRequerimento: useDeleteRequerimento(),
    enviarParaFaturamento: useEnviarParaFaturamento(),
    enviarMultiplosParaFaturamento: useEnviarMultiplosParaFaturamento(),
    rejeitarRequerimento: useRejeitarRequerimento(),
    marcarComoFaturados: useMarcarComoFaturados(),
    
    // Cache management
    invalidate
  };
}

// Export default
export default useRequerimentos;