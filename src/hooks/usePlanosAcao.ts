// =====================================================
// HOOK: PLANOS DE AÇÃO
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  PlanoAcaoCompleto,
  PlanoAcaoFormData,
  PlanoAcaoHistorico,
  FiltrosPlanoAcao,
  EstatisticasPlanoAcao,
} from '@/types/planoAcao';
import * as planoAcaoService from '@/services/planoAcaoService';

/**
 * Hook para buscar todos os planos de ação
 */
export function usePlanosAcao(filtros?: FiltrosPlanoAcao) {
  return useQuery({
    queryKey: ['planos-acao', filtros],
    queryFn: () => planoAcaoService.buscarPlanosAcao(filtros),
    staleTime: 30000, // 30 segundos
  });
}

/**
 * Hook para buscar um plano de ação específico
 */
export function usePlanoAcao(id: string) {
  return useQuery({
    queryKey: ['plano-acao', id],
    queryFn: () => planoAcaoService.buscarPlanoAcaoPorId(id),
    enabled: !!id,
  });
}

/**
 * Hook para buscar plano de ação por pesquisa
 */
export function usePlanoAcaoPorPesquisa(pesquisaId: string) {
  return useQuery({
    queryKey: ['plano-acao-pesquisa', pesquisaId],
    queryFn: () => planoAcaoService.buscarPlanoAcaoPorPesquisa(pesquisaId),
    enabled: !!pesquisaId,
  });
}

/**
 * Hook para criar plano de ação
 */
export function useCriarPlanoAcao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dados: PlanoAcaoFormData) => planoAcaoService.criarPlanoAcao(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos-acao'] });
      queryClient.invalidateQueries({ queryKey: ['estatisticas-planos'] });
      queryClient.invalidateQueries({ queryKey: ['pesquisas-satisfacao'] });
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
export function useAtualizarPlanoAcao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: Partial<PlanoAcaoFormData> }) =>
      planoAcaoService.atualizarPlanoAcao(id, dados),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['planos-acao'] });
      queryClient.invalidateQueries({ queryKey: ['plano-acao', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['estatisticas-planos'] });
      queryClient.invalidateQueries({ queryKey: ['historico-plano', variables.id] });
      toast.success('Plano de ação atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar plano de ação:', error);
      toast.error('Erro ao atualizar plano de ação');
    },
  });
}

/**
 * Hook para deletar plano de ação
 */
export function useDeletarPlanoAcao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => planoAcaoService.deletarPlanoAcao(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos-acao'] });
      queryClient.invalidateQueries({ queryKey: ['estatisticas-planos'] });
      queryClient.invalidateQueries({ queryKey: ['pesquisas-satisfacao'] });
      toast.success('Plano de ação deletado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao deletar plano de ação:', error);
      toast.error('Erro ao deletar plano de ação');
    },
  });
}

/**
 * Hook para buscar histórico de um plano
 */
export function useHistoricoPlano(planoId: string) {
  return useQuery({
    queryKey: ['historico-plano', planoId],
    queryFn: () => planoAcaoService.buscarHistoricoPlano(planoId),
    enabled: !!planoId,
  });
}

/**
 * Hook para adicionar entrada no histórico
 */
export function useAdicionarHistorico() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planoId,
      descricao,
      tipo,
    }: {
      planoId: string;
      descricao: string;
      tipo: 'contato' | 'atualizacao';
    }) => planoAcaoService.adicionarHistorico(planoId, descricao, tipo),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['historico-plano', variables.planoId] });
      toast.success('Histórico atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao adicionar histórico:', error);
      toast.error('Erro ao adicionar histórico');
    },
  });
}

/**
 * Hook para obter estatísticas
 */
export function useEstatisticasPlanos(filtros?: FiltrosPlanoAcao) {
  return useQuery({
    queryKey: ['estatisticas-planos', filtros],
    queryFn: () => planoAcaoService.obterEstatisticas(filtros),
    staleTime: 60000, // 1 minuto
  });
}
