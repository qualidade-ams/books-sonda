/**
 * Hook para gerenciamento de reajustes de banco de horas
 * 
 * Fornece funcionalidades para:
 * - Criar reajustes
 * - Buscar reajustes
 * - Desativar reajustes
 * 
 * @module hooks/useBancoHorasReajustes
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reajustesService, type ReajusteData } from '@/services/bancoHorasReajustesService';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook para gerenciamento de reajustes
 */
export function useBancoHorasReajustes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  /**
   * Mutation para criar reajuste
   */
  const criarReajusteMutation = useMutation({
    mutationFn: async (dados: ReajusteData) => {
      setIsCreating(true);
      try {
        return await reajustesService.criarReajuste(dados);
      } finally {
        setIsCreating(false);
      }
    },
    onSuccess: (resultado, dados) => {
      toast({
        title: 'Reajuste criado com sucesso',
        description: `${resultado.meses_recalculados} mês(es) recalculado(s)`,
      });

      // ✅ CORREÇÃO CRÍTICA: Invalidar cache de TODOS os cálculos da empresa
      queryClient.invalidateQueries({ 
        queryKey: ['banco-horas-calculo', dados.empresa_id] 
      });
      
      // Invalidar cálculos segmentados de TODOS os meses
      queryClient.invalidateQueries({ 
        queryKey: ['banco-horas-calculos-segmentados', dados.empresa_id] 
      });
      
      // Invalidar versões de TODOS os meses
      queryClient.invalidateQueries({ 
        queryKey: ['banco-horas-versoes', dados.empresa_id] 
      });
      
      // Invalidar versões do período completo
      queryClient.invalidateQueries({ 
        queryKey: ['banco-horas-versoes-periodo', dados.empresa_id] 
      });
      
      // Invalidar reajustes de TODOS os meses
      queryClient.invalidateQueries({ 
        queryKey: ['banco-horas-reajustes', dados.empresa_id] 
      });
    },
    onError: (error: any) => {
      console.error('Erro ao criar reajuste:', error);
      toast({
        title: 'Erro ao criar reajuste',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  /**
   * Mutation para desativar reajuste
   */
  const desativarReajusteMutation = useMutation({
    mutationFn: async (reajusteId: string) => {
      return await reajustesService.desativarReajuste(reajusteId);
    },
    onSuccess: () => {
      toast({
        title: 'Reajuste desativado',
        description: 'O reajuste foi desativado com sucesso',
      });

      // ✅ CORREÇÃO CRÍTICA: Invalidar cache de TODOS os reajustes e cálculos
      queryClient.invalidateQueries({ queryKey: ['banco-horas-reajustes'] });
      queryClient.invalidateQueries({ queryKey: ['banco-horas-calculo'] });
      queryClient.invalidateQueries({ queryKey: ['banco-horas-calculos-segmentados'] });
      queryClient.invalidateQueries({ queryKey: ['banco-horas-versoes'] });
      queryClient.invalidateQueries({ queryKey: ['banco-horas-versoes-periodo'] });
    },
    onError: (error: any) => {
      console.error('Erro ao desativar reajuste:', error);
      toast({
        title: 'Erro ao desativar reajuste',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  return {
    criarReajuste: criarReajusteMutation.mutateAsync,
    desativarReajuste: desativarReajusteMutation.mutateAsync,
    isCreating,
    isDesativando: desativarReajusteMutation.isPending,
  };
}
