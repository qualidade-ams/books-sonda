// =====================================================
// HOOK: PLANOS DE AÇÃO (CORRETO)
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  buscarPlanosAcao,
  buscarPlanoAcaoPorId,
  criarPlanoAcao,
  atualizarPlanoAcao,
  deletarPlanoAcao,
  obterEstatisticas,
} from '@/services/planoAcaoService';
import type { 
  PlanoAcaoCompleto, 
  PlanoAcaoFormData, 
  FiltrosPlanoAcao,
  EstatisticasPlanoAcao 
} from '@/types/planoAcao';

/**
 * Hook para buscar todos os planos de ação (formato correto)
 */
export function usePlanosAcao(filtros?: FiltrosPlanoAcao) {
  return useQuery({
    queryKey: ['planos-acao', filtros],
    queryFn: () => buscarPlanosAcao(filtros),
    staleTime: 30000, // 30 segundos
  });
}

/**
 * Hook para buscar um plano de ação específico
 */
export function usePlanoAcao(id: string) {
  return useQuery({
    queryKey: ['plano-acao', id],
    queryFn: () => buscarPlanoAcaoPorId(id),
    enabled: !!id,
  });
}

/**
 * Hook para criar plano de ação
 */
export function useCriarPlanoAcao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dados: PlanoAcaoFormData) => criarPlanoAcao(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos-acao'] });
      queryClient.invalidateQueries({ queryKey: ['estatisticas-planos-acao'] });
      toast.success('Plano de ação criado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar plano de ação:', error);
      toast.error('Erro ao criar plano de ação');
    },
  });
}

/**
 * Hook para atualizar plano de ação
 */
export function useAtualizarPlanoAcao(options?: { silent?: boolean }) {
  const queryClient = useQueryClient();
  const { silent = false } = options || {};

  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: Partial<PlanoAcaoFormData> }) => 
      atualizarPlanoAcao(id, dados),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['planos-acao'] });
      queryClient.invalidateQueries({ queryKey: ['plano-acao', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['estatisticas-planos-acao'] });
      if (!silent) {
        toast.success('Plano de ação atualizado com sucesso!');
      }
    },
    onError: (error) => {
      console.error('Erro ao atualizar plano de ação:', error);
      if (!silent) {
        toast.error('Erro ao atualizar plano de ação');
      }
    },
  });
}

/**
 * Hook para deletar plano de ação
 */
export function useDeletarPlanoAcao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletarPlanoAcao(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos-acao'] });
      queryClient.invalidateQueries({ queryKey: ['estatisticas-planos-acao'] });
      toast.success('Plano de ação deletado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao deletar plano de ação:', error);
      toast.error('Erro ao deletar plano de ação');
    },
  });
}

/**
 * Hook para buscar estatísticas dos planos de ação
 */
export function useEstatisticasPlanosAcao(filtros?: FiltrosPlanoAcao) {
  return useQuery({
    queryKey: ['estatisticas-planos-acao', filtros],
    queryFn: () => obterEstatisticas(filtros),
    staleTime: 60000, // 1 minuto
  });
}

/**
 * Alias para compatibilidade com outros arquivos
 */
export const useEstatisticasPlanos = useEstatisticasPlanosAcao;

/**
 * Hook para buscar histórico de um plano de ação
 */
export function useHistoricoPlano(planoId: string) {
  return useQuery({
    queryKey: ['historico-plano', planoId],
    queryFn: async () => {
      // Aqui você pode implementar a busca do histórico
      // Por enquanto, retornando um array vazio como placeholder
      const { data, error } = await supabase
        .from('planos_acao_historico') // assumindo que existe uma tabela de histórico
        .select('*')
        .eq('plano_id', planoId)
        .order('criado_em', { ascending: false });

      if (error) {
        console.error('Erro ao buscar histórico do plano:', error);
        // Se a tabela não existir, retornar array vazio ao invés de erro
        return [];
      }

      return data || [];
    },
    enabled: !!planoId,
    staleTime: 30000, // 30 segundos
  });
}