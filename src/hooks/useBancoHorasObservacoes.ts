/**
 * Hook para gerenciar observações do banco de horas
 * Permite criar, editar, excluir e listar observações por empresa e período
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { bancoHorasObservacoesService } from '@/services/bancoHorasObservacoesService';
import type { ObservacaoUnificada } from '@/services/bancoHorasObservacoesService';

export type {
  BancoHorasObservacao,
  ObservacaoReajuste,
  ObservacaoUnificada
} from '@/services/bancoHorasObservacoesService';

/**
 * Hook para buscar observações de uma empresa
 * @param empresaId - ID da empresa
 * @param mes - Mês para filtrar (opcional - se não informado, busca todas)
 * @param ano - Ano para filtrar (opcional - se não informado, busca todas)
 * @param filtrarPorPeriodo - Se true, filtra por mês/ano. Se false, busca todas (padrão: false)
 */
export function useBancoHorasObservacoes(
  empresaId?: string,
  mes?: number,
  ano?: number,
  filtrarPorPeriodo: boolean = false // ✅ NOVO: Controle explícito de filtro
) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ✅ FILTRAR POR PERÍODO APENAS SE SOLICITADO
  const periodo = filtrarPorPeriodo && mes !== undefined && ano !== undefined ? { mes, ano } : undefined;

  // Buscar observações manuais
  const {
    data: observacoesManuais = [],
    isLoading: isLoadingManuais,
    error: errorManuais
  } = useQuery({
    queryKey: ['banco-horas-observacoes', empresaId, filtrarPorPeriodo ? mes : 'all', filtrarPorPeriodo ? ano : 'all'],
    queryFn: () => (empresaId ? bancoHorasObservacoesService.listarObservacoesManuais(empresaId, periodo) : []),
    enabled: !!empresaId,
    staleTime: 0, // Sempre considerar dados como stale para refetch imediato
    gcTime: 5 * 60 * 1000 // 5 minutos de cache
  });

  // Buscar observações de reajustes (ajustes)
  const {
    data: observacoesReajustes = [],
    isLoading: isLoadingReajustes,
    error: errorReajustes
  } = useQuery({
    queryKey: ['banco-horas-observacoes-reajustes', empresaId, filtrarPorPeriodo ? mes : 'all', filtrarPorPeriodo ? ano : 'all'],
    queryFn: () => (empresaId ? bancoHorasObservacoesService.listarObservacoesReajustes(empresaId, periodo) : []),
    enabled: !!empresaId,
    staleTime: 0, // Sempre considerar dados como stale para refetch imediato
    gcTime: 5 * 60 * 1000 // 5 minutos de cache
  });

  // Unificar observações manuais e de reajustes
  const observacoesUnificadas: ObservacaoUnificada[] = bancoHorasObservacoesService.unificarObservacoes(
    observacoesManuais,
    observacoesReajustes
  );

  // Criar observação manual
  const criarObservacao = useMutation({
    mutationFn: async (dados: {
      empresa_id: string;
      mes: number;
      ano: number;
      observacao: string;
      created_by?: string;
    }) => {
      const { data, error } = await supabase
        .from('banco_horas_observacoes' as any)
        .insert([dados])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banco-horas-observacoes', empresaId] });
      toast({
        title: 'Sucesso',
        description: 'Observação adicionada com sucesso!',
        variant: 'default'
      });
    },
    onError: (error: any) => {
      console.error('Erro ao criar observação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar a observação.',
        variant: 'destructive'
      });
    }
  });

  // Atualizar observação manual
  const atualizarObservacao = useMutation({
    mutationFn: async (dados: {
      id: string;
      observacao: string;
    }) => {
      const { data, error } = await supabase
        .from('banco_horas_observacoes' as any)
        .update({ observacao: dados.observacao })
        .eq('id', dados.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banco-horas-observacoes', empresaId] });
      toast({
        title: 'Sucesso',
        description: 'Observação atualizada com sucesso!',
        variant: 'default'
      });
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar observação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a observação.',
        variant: 'destructive'
      });
    }
  });

  // Excluir observação manual
  const excluirObservacao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('banco_horas_observacoes' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banco-horas-observacoes', empresaId] });
      toast({
        title: 'Sucesso',
        description: 'Observação excluída com sucesso!',
        variant: 'default'
      });
    },
    onError: (error: any) => {
      console.error('Erro ao excluir observação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a observação.',
        variant: 'destructive'
      });
    }
  });

  return {
    observacoesManuais,
    observacoesReajustes,
    observacoesUnificadas,
    isLoading: isLoadingManuais || isLoadingReajustes,
    error: errorManuais || errorReajustes,
    criarObservacao: criarObservacao.mutateAsync,
    atualizarObservacao: atualizarObservacao.mutateAsync,
    excluirObservacao: excluirObservacao.mutateAsync,
    isCreating: criarObservacao.isPending,
    isUpdating: atualizarObservacao.isPending,
    isDeleting: excluirObservacao.isPending
  };
}
