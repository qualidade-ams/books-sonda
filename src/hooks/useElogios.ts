// =====================================================
// HOOK: ELOGIOS
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  ElogioCompleto,
  ElogioFormData,
  FiltrosElogio,
  EstatisticasElogio,
} from '@/types/elogios';
import * as elogiosService from '@/services/elogiosService';

/**
 * Hook para buscar todos os elogios
 */
export function useElogios(filtros?: FiltrosElogio) {
  return useQuery({
    queryKey: ['elogios', filtros],
    queryFn: () => elogiosService.buscarElogios(filtros),
    staleTime: 30000, // 30 segundos
  });
}

/**
 * Hook para buscar um elogio específico
 */
export function useElogio(id: string) {
  return useQuery({
    queryKey: ['elogio', id],
    queryFn: () => elogiosService.buscarElogioPorId(id),
    enabled: !!id,
  });
}

/**
 * Hook para criar elogio
 */
export function useCriarElogio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dados: ElogioFormData) => elogiosService.criarElogio(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elogios'] });
      queryClient.invalidateQueries({ queryKey: ['estatisticas-elogios'] });
      toast.success('Elogio registrado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar elogio:', error);
      toast.error('Erro ao registrar elogio');
    },
  });
}

/**
 * Hook para atualizar elogio
 */
export function useAtualizarElogio(options?: { silent?: boolean }) {
  const queryClient = useQueryClient();
  const { silent = false } = options || {};

  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: Partial<ElogioFormData> }) =>
      elogiosService.atualizarElogio(id, dados),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['elogios'] });
      queryClient.invalidateQueries({ queryKey: ['elogio', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['estatisticas-elogios'] });
      if (!silent) {
        toast.success('Elogio atualizado com sucesso!');
      }
    },
    onError: (error) => {
      console.error('Erro ao atualizar elogio:', error);
      if (!silent) {
        toast.error('Erro ao atualizar elogio');
      }
    },
  });
}

/**
 * Hook para deletar elogio
 */
export function useDeletarElogio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => elogiosService.deletarElogio(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elogios'] });
      queryClient.invalidateQueries({ queryKey: ['estatisticas-elogios'] });
      toast.success('Elogio deletado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao deletar elogio:', error);
      toast.error('Erro ao deletar elogio');
    },
  });
}

/**
 * Hook para obter estatísticas
 */
export function useEstatisticasElogios(filtros?: FiltrosElogio) {
  return useQuery({
    queryKey: ['estatisticas-elogios', filtros],
    queryFn: () => elogiosService.obterEstatisticas(filtros),
    staleTime: 60000, // 1 minuto
  });
}
