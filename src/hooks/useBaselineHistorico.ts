/**
 * Hook customizado para gerenciar histórico de baseline
 * 
 * Fornece funcionalidades para:
 * - Buscar histórico de baseline de uma empresa
 * - Buscar baseline vigente em uma data específica
 * - Criar nova vigência de baseline
 * - Atualizar vigência existente
 * - Validar sobreposição de vigências
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  BaselineHistorico,
  BaselineHistoricoInsert,
  BaselineHistoricoUpdate,
  BaselineVigente,
  BaselineHistoricoFiltros,
  ValidacaoVigencia
} from '@/types/baselineHistorico';

/**
 * Hook para buscar histórico de baseline de uma empresa
 */
export function useBaselineHistorico(empresaId: string | undefined) {
  return useQuery({
    queryKey: ['baseline-historico', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];

      const { data, error } = await supabase
        .from('baseline_historico')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('data_inicio', { ascending: false });

      if (error) throw error;
      return data as BaselineHistorico[];
    },
    enabled: !!empresaId
  });
}

/**
 * Hook para buscar baseline vigente em uma data específica
 */
export function useBaselineVigente(empresaId: string | undefined, data?: string) {
  return useQuery({
    queryKey: ['baseline-vigente', empresaId, data],
    queryFn: async () => {
      if (!empresaId) return null;

      const dataConsulta = data || new Date().toISOString().split('T')[0];

      const { data: result, error } = await supabase
        .rpc('get_baseline_vigente', {
          p_empresa_id: empresaId,
          p_data: dataConsulta
        });

      if (error) throw error;
      return result?.[0] as BaselineVigente | null;
    },
    enabled: !!empresaId
  });
}

/**
 * Hook para buscar baseline vigente atual (simplificado)
 */
export function useBaselineAtual(empresaId: string | undefined) {
  return useQuery({
    queryKey: ['baseline-atual', empresaId],
    queryFn: async () => {
      if (!empresaId) return null;

      const { data, error } = await supabase
        .from('baseline_historico')
        .select('*')
        .eq('empresa_id', empresaId)
        .is('data_fim', null)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data as BaselineHistorico | null;
    },
    enabled: !!empresaId
  });
}

/**
 * Hook para criar nova vigência de baseline
 */
export function useCreateBaselineHistorico() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: BaselineHistoricoInsert) => {
      // Validar dados
      if (!data.empresa_id) {
        throw new Error('Empresa é obrigatória');
      }
      if (!data.baseline_horas || data.baseline_horas < 0) {
        throw new Error('Baseline de horas deve ser maior ou igual a zero');
      }
      if (!data.data_inicio) {
        throw new Error('Data de início é obrigatória');
      }

      // Inserir novo registro
      const { data: result, error } = await supabase
        .from('baseline_historico')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result as BaselineHistorico;
    },
    onSuccess: (data) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['baseline-historico', data.empresa_id] });
      queryClient.invalidateQueries({ queryKey: ['baseline-vigente', data.empresa_id] });
      queryClient.invalidateQueries({ queryKey: ['baseline-atual', data.empresa_id] });

      toast({
        title: 'Baseline criado com sucesso',
        description: `Nova vigência de baseline iniciada em ${new Date(data.data_inicio).toLocaleDateString('pt-BR')}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar baseline',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

/**
 * Hook para atualizar vigência de baseline
 */
export function useUpdateBaselineHistorico() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: BaselineHistoricoUpdate }) => {
      const { data: result, error } = await supabase
        .from('baseline_historico')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result as BaselineHistorico;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['baseline-historico', data.empresa_id] });
      queryClient.invalidateQueries({ queryKey: ['baseline-vigente', data.empresa_id] });
      queryClient.invalidateQueries({ queryKey: ['baseline-atual', data.empresa_id] });

      toast({
        title: 'Baseline atualizado',
        description: 'Vigência de baseline atualizada com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar baseline',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

/**
 * Hook para deletar vigência de baseline
 */
export function useDeleteBaselineHistorico() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Buscar dados antes de deletar para invalidar cache
      const { data: baseline } = await supabase
        .from('baseline_historico')
        .select('empresa_id')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('baseline_historico')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return baseline?.empresa_id;
    },
    onSuccess: (empresaId) => {
      if (empresaId) {
        queryClient.invalidateQueries({ queryKey: ['baseline-historico', empresaId] });
        queryClient.invalidateQueries({ queryKey: ['baseline-vigente', empresaId] });
        queryClient.invalidateQueries({ queryKey: ['baseline-atual', empresaId] });
      }

      toast({
        title: 'Baseline removido',
        description: 'Vigência de baseline removida com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover baseline',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

/**
 * Hook para validar sobreposição de vigências
 */
export function useValidarVigencia() {
  return useMutation({
    mutationFn: async ({
      empresaId,
      dataInicio,
      dataFim,
      excluirId
    }: {
      empresaId: string;
      dataInicio: string;
      dataFim?: string | null;
      excluirId?: string;
    }): Promise<ValidacaoVigencia> => {
      // Buscar vigências existentes
      let query = supabase
        .from('baseline_historico')
        .select('*')
        .eq('empresa_id', empresaId);

      // Excluir registro atual se estiver editando
      if (excluirId) {
        query = query.neq('id', excluirId);
      }

      const { data: vigencias, error } = await query;

      if (error) throw error;

      // Verificar sobreposição
      const conflitos = vigencias?.filter((v: BaselineHistorico) => {
        const vInicio = new Date(v.data_inicio);
        const vFim = v.data_fim ? new Date(v.data_fim) : null;
        const novoInicio = new Date(dataInicio);
        const novoFim = dataFim ? new Date(dataFim) : null;

        // Caso 1: Nova vigência sem fim (ativa) - não pode haver outras ativas
        if (!novoFim && !v.data_fim) {
          return true;
        }

        // Caso 2: Nova vigência com fim
        if (novoFim) {
          // Conflito se:
          // - Vigência existente começa antes do fim da nova E
          // - Vigência existente termina depois do início da nova (ou não tem fim)
          if (vInicio <= novoFim && (!vFim || vFim >= novoInicio)) {
            return true;
          }
        }

        // Caso 3: Nova vigência sem fim, mas vigência existente tem fim
        if (!novoFim && vFim) {
          // Conflito se vigência existente termina depois do início da nova
          if (vFim >= novoInicio) {
            return true;
          }
        }

        return false;
      }) || [];

      if (conflitos.length > 0) {
        return {
          valido: false,
          erro: 'Há conflito com vigências existentes',
          conflitos
        };
      }

      return { valido: true };
    }
  });
}

/**
 * Hook para buscar histórico com filtros
 */
export function useBaselineHistoricoFiltrado(filtros: BaselineHistoricoFiltros) {
  return useQuery({
    queryKey: ['baseline-historico-filtrado', filtros],
    queryFn: async () => {
      let query = supabase
        .from('baseline_historico')
        .select('*, empresas_clientes(id, nome_completo, nome_abreviado)');

      if (filtros.empresa_id) {
        query = query.eq('empresa_id', filtros.empresa_id);
      }

      if (filtros.data_inicio) {
        query = query.gte('data_inicio', filtros.data_inicio);
      }

      if (filtros.data_fim) {
        query = query.lte('data_fim', filtros.data_fim);
      }

      if (filtros.motivo) {
        query = query.eq('motivo', filtros.motivo);
      }

      if (filtros.apenas_vigentes) {
        query = query.is('data_fim', null);
      }

      query = query.order('data_inicio', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data;
    }
  });
}
