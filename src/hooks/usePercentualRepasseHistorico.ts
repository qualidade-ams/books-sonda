/**
 * Hook para gerenciar histórico de percentual de repasse
 * 
 * Funcionalidades:
 * - Buscar histórico completo de uma empresa
 * - Buscar percentual vigente atual
 * - Criar nova vigência
 * - Atualizar vigência existente
 * - Deletar vigência
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  PercentualRepasseHistorico,
  PercentualRepasseVigente,
  CreatePercentualRepasseHistoricoInput,
  UpdatePercentualRepasseHistoricoInput
} from '@/types/percentualRepasseHistorico';

// =====================================================
// QUERY KEYS
// =====================================================

export const percentualRepasseHistoricoKeys = {
  all: ['percentual-repasse-historico'] as const,
  byEmpresa: (empresaId: string) => [...percentualRepasseHistoricoKeys.all, empresaId] as const,
  vigente: (empresaId: string) => [...percentualRepasseHistoricoKeys.all, empresaId, 'vigente'] as const,
};

// =====================================================
// HOOK: Buscar histórico completo
// =====================================================

export function usePercentualRepasseHistorico(empresaId: string) {
  return useQuery({
    queryKey: percentualRepasseHistoricoKeys.byEmpresa(empresaId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('percentual_repasse_historico')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('data_inicio', { ascending: false });

      if (error) throw error;
      return data as PercentualRepasseHistorico[];
    },
    enabled: !!empresaId,
  });
}

// =====================================================
// HOOK: Buscar percentual vigente atual
// =====================================================

export function usePercentualRepasseAtual(empresaId: string) {
  return useQuery({
    queryKey: percentualRepasseHistoricoKeys.vigente(empresaId),
    queryFn: async () => {
      const hoje = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .rpc('get_percentual_repasse_vigente', {
          p_empresa_id: empresaId,
          p_data: hoje
        });

      if (error) throw error;
      
      // A função RPC retorna um array, pegamos o primeiro resultado
      return data && data.length > 0 ? (data[0] as PercentualRepasseVigente) : null;
    },
    enabled: !!empresaId,
  });
}

// =====================================================
// HOOK: Buscar percentual vigente para um mês/ano específico
// =====================================================

export function usePercentualRepasseVigentePorPeriodo(empresaId: string, mes: number, ano: number) {
  const dataReferencia = `${ano}-${String(mes).padStart(2, '0')}-01`;
  
  return useQuery({
    queryKey: [...percentualRepasseHistoricoKeys.vigente(empresaId), mes, ano] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_percentual_repasse_vigente', {
          p_empresa_id: empresaId,
          p_data: dataReferencia
        });

      if (error) throw error;
      
      return data && data.length > 0 ? (data[0] as PercentualRepasseVigente) : null;
    },
    enabled: !!empresaId && !!mes && !!ano,
  });
}

// =====================================================
// HOOK: Criar nova vigência
// =====================================================

export function useCreatePercentualRepasseHistorico() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreatePercentualRepasseHistoricoInput) => {
      console.log('🔧 Hook: Iniciando mutation com input:', input);
      
      // Buscar ID do usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('❌ Erro ao buscar usuário:', userError);
        throw userError;
      }
      
      console.log('👤 Usuário atual:', user?.id);
      
      const payload = {
        ...input,
        created_by: user?.id,
      };
      
      console.log('📤 Payload final para insert:', payload);
      
      const { data, error } = await supabase
        .from('percentual_repasse_historico')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro do Supabase:', error);
        throw error;
      }
      
      console.log('✅ Dados retornados do Supabase:', data);
      return data as PercentualRepasseHistorico;
    },
    onSuccess: (data) => {
      console.log('🎉 Mutation onSuccess chamado com:', data);
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ 
        queryKey: percentualRepasseHistoricoKeys.byEmpresa(data.empresa_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: percentualRepasseHistoricoKeys.vigente(data.empresa_id) 
      });

      toast({
        title: 'Sucesso!',
        description: 'Nova vigência de percentual de repasse criada com sucesso.',
      });
    },
    onError: (error: Error) => {
      console.error('❌ Mutation onError chamado:', error);
      console.error('Erro completo:', JSON.stringify(error, null, 2));
      
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar a vigência de percentual de repasse.',
        variant: 'destructive',
      });
    },
  });
}

// =====================================================
// HOOK: Atualizar vigência existente
// =====================================================

export function useUpdatePercentualRepasseHistorico() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, empresaId, ...input }: UpdatePercentualRepasseHistoricoInput & { id: string; empresaId: string }) => {
      // Buscar ID do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('percentual_repasse_historico')
        .update({
          ...input,
          updated_by: user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data: data as PercentualRepasseHistorico, empresaId };
    },
    onSuccess: ({ data, empresaId }) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ 
        queryKey: percentualRepasseHistoricoKeys.byEmpresa(empresaId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: percentualRepasseHistoricoKeys.vigente(empresaId) 
      });

      toast({
        title: 'Sucesso!',
        description: 'Vigência de percentual de repasse atualizada com sucesso.',
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar vigência de percentual de repasse:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar a vigência de percentual de repasse.',
        variant: 'destructive',
      });
    },
  });
}

// =====================================================
// HOOK: Deletar vigência
// =====================================================

export function useDeletePercentualRepasseHistorico() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, empresaId }: { id: string; empresaId: string }) => {
      const { error } = await supabase
        .from('percentual_repasse_historico')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return empresaId;
    },
    onSuccess: (empresaId) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ 
        queryKey: percentualRepasseHistoricoKeys.byEmpresa(empresaId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: percentualRepasseHistoricoKeys.vigente(empresaId) 
      });

      toast({
        title: 'Sucesso!',
        description: 'Vigência de percentual de repasse removida com sucesso.',
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao deletar vigência de percentual de repasse:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível remover a vigência de percentual de repasse.',
        variant: 'destructive',
      });
    },
  });
}
