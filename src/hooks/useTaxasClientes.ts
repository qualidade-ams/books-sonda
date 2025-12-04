// =====================================================
// HOOKS: TAXAS DE CLIENTES
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  TaxaClienteCompleta,
  TaxaFormData,
  FiltrosTaxa
} from '@/types/taxasClientes';
import {
  buscarTaxas,
  buscarTaxaPorId,
  criarTaxa,
  atualizarTaxa,
  deletarTaxa
} from '@/services/taxasClientesService';

/**
 * Hook para buscar taxas com filtros
 */
export function useTaxas(filtros?: FiltrosTaxa) {
  return useQuery({
    queryKey: ['taxas', filtros],
    queryFn: () => buscarTaxas(filtros),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para buscar taxa por ID
 */
export function useTaxa(id: string | undefined) {
  return useQuery({
    queryKey: ['taxa', id],
    queryFn: () => id ? buscarTaxaPorId(id) : null,
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook para criar taxa
 */
export function useCriarTaxa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dados: TaxaFormData) => criarTaxa(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxas'] });
      toast.success('Taxa criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar taxa');
    },
  });
}

/**
 * Hook para atualizar taxa
 */
export function useAtualizarTaxa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: Partial<TaxaFormData> }) =>
      atualizarTaxa(id, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxas'] });
      queryClient.invalidateQueries({ queryKey: ['taxa'] });
      toast.success('Taxa atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar taxa');
    },
  });
}

/**
 * Hook para deletar taxa
 */
export function useDeletarTaxa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletarTaxa(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxas'] });
      toast.success('Taxa deletada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao deletar taxa');
    },
  });
}
