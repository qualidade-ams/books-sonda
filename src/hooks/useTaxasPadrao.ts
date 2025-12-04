// =====================================================
// HOOKS: TAXAS PADRÃO
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  buscarHistoricoTaxasPadrao,
  criarTaxaPadrao,
  atualizarTaxaPadrao,
  deletarTaxaPadrao,
  type TaxaPadraoCompleta,
} from '@/services/taxaPadraoService';
import type { TaxaPadraoData } from '@/components/admin/taxas/TaxaPadraoForm';

/**
 * Hook para buscar histórico de taxas padrão por tipo de produto
 */
export function useHistoricoTaxasPadrao(tipoProduto: 'GALLERY' | 'OUTROS') {
  return useQuery({
    queryKey: ['taxas-padrao', 'historico', tipoProduto],
    queryFn: () => buscarHistoricoTaxasPadrao(tipoProduto),
  });
}

/**
 * Hook para criar taxa padrão
 */
export function useCriarTaxaPadrao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: criarTaxaPadrao,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxas-padrao'] });
      toast.success('Taxa padrão criada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao criar taxa padrão:', error);
      toast.error('Erro ao criar taxa padrão');
    },
  });
}

/**
 * Hook para atualizar taxa padrão
 */
export function useAtualizarTaxaPadrao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: Partial<TaxaPadraoData> }) =>
      atualizarTaxaPadrao(id, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxas-padrao'] });
      toast.success('Taxa padrão atualizada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar taxa padrão:', error);
      toast.error('Erro ao atualizar taxa padrão');
    },
  });
}

/**
 * Hook para deletar taxa padrão
 */
export function useDeletarTaxaPadrao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletarTaxaPadrao,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxas-padrao'] });
      toast.success('Taxa padrão deletada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao deletar taxa padrão:', error);
      toast.error('Erro ao deletar taxa padrão');
    },
  });
}

