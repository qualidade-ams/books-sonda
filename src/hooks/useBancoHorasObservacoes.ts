/**
 * Hook para gerenciar observações do banco de horas
 * Permite criar, editar, excluir e listar observações por empresa e período
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BancoHorasObservacao {
  id: string;
  empresa_id: string;
  mes: number;
  ano: number;
  observacao: string;
  tipo: 'manual' | 'ajuste';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Dados do usuário (join)
  usuario_nome?: string;
  usuario_email?: string;
}

export interface ObservacaoReajuste {
  id: string;
  mes: number;
  ano: number;
  observacao: string;
  tipo_reajuste: 'entrada' | 'saida';
  valor_reajuste_horas: string;
  valor_reajuste_tickets: number;
  created_by: string | null;
  created_at: string;
  // Dados do usuário (join)
  usuario_nome?: string;
  usuario_email?: string;
}

export interface ObservacaoUnificada {
  id: string;
  mes: number;
  ano: number;
  observacao: string;
  tipo: 'manual' | 'ajuste';
  tipo_ajuste?: 'entrada' | 'saida';
  valor_horas?: string;
  valor_tickets?: number;
  created_by: string | null;
  created_at: string;
  updated_at?: string;
  usuario_nome?: string;
  usuario_email?: string;
}

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

  // Buscar observações manuais
  const {
    data: observacoesManuais = [],
    isLoading: isLoadingManuais,
    error: errorManuais
  } = useQuery({
    queryKey: ['banco-horas-observacoes', empresaId, filtrarPorPeriodo ? mes : 'all', filtrarPorPeriodo ? ano : 'all'],
    queryFn: async () => {
      if (!empresaId) return [];

      // Buscar observações sem o join (fazer join manual depois)
      let query = supabase
        .from('banco_horas_observacoes' as any)
        .select('*')
        .eq('empresa_id', empresaId);

      // ✅ FILTRAR POR PERÍODO APENAS SE SOLICITADO
      if (filtrarPorPeriodo && mes !== undefined && ano !== undefined) {
        query = query.eq('mes', mes).eq('ano', ano);
      }

      const { data: observacoes, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar observações manuais:', error);
        throw error;
      }

      if (!observacoes || observacoes.length === 0) return [];

      // Buscar informações dos usuários separadamente
      const userIds = [...new Set(observacoes.map((obs: any) => obs.created_by).filter(Boolean))];
      
      if (userIds.length === 0) {
        return observacoes.map((obs: any) => ({
          ...obs,
          usuario_nome: 'Usuário desconhecido',
          usuario_email: ''
        }));
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) {
        console.error('Erro ao buscar profiles:', profilesError);
      }

      // Mapear profiles por ID
      const profilesMap = new Map(
        (profiles || []).map((p: any) => [p.id, p])
      );

      return observacoes.map((obs: any) => ({
        ...obs,
        usuario_nome: profilesMap.get(obs.created_by)?.full_name || 'Usuário desconhecido',
        usuario_email: profilesMap.get(obs.created_by)?.email || ''
      })) as BancoHorasObservacao[];
    },
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
    queryFn: async () => {
      if (!empresaId) return [];

      // Buscar reajustes sem o join (fazer join manual depois)
      // ✅ IMPORTANTE: Filtrar apenas reajustes ativos (ativo = true)
      let query = supabase
        .from('banco_horas_reajustes' as any)
        .select('id, mes, ano, observacao, tipo_reajuste, valor_reajuste_horas, valor_reajuste_tickets, created_by, created_at')
        .eq('empresa_id', empresaId)
        .eq('ativo', true) // ✅ FILTRAR APENAS ATIVOS
        .not('observacao', 'is', null)
        .neq('observacao', '');

      // ✅ FILTRAR POR PERÍODO APENAS SE SOLICITADO
      if (filtrarPorPeriodo && mes !== undefined && ano !== undefined) {
        query = query.eq('mes', mes).eq('ano', ano);
      }

      const { data: reajustes, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar observações de reajustes:', error);
        throw error;
      }

      if (!reajustes || reajustes.length === 0) return [];

      // Buscar informações dos usuários separadamente
      const userIds = [...new Set(reajustes.map((rea: any) => rea.created_by).filter(Boolean))];
      
      if (userIds.length === 0) {
        return reajustes.map((rea: any) => ({
          ...rea,
          usuario_nome: 'Usuário desconhecido',
          usuario_email: ''
        }));
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) {
        console.error('Erro ao buscar profiles:', profilesError);
      }

      // Mapear profiles por ID
      const profilesMap = new Map(
        (profiles || []).map((p: any) => [p.id, p])
      );

      return reajustes.map((rea: any) => ({
        ...rea,
        usuario_nome: profilesMap.get(rea.created_by)?.full_name || 'Usuário desconhecido',
        usuario_email: profilesMap.get(rea.created_by)?.email || ''
      })) as ObservacaoReajuste[];
    },
    enabled: !!empresaId,
    staleTime: 0, // Sempre considerar dados como stale para refetch imediato
    gcTime: 5 * 60 * 1000 // 5 minutos de cache
  });

  // Unificar observações manuais e de reajustes
  const observacoesUnificadas: ObservacaoUnificada[] = [
    ...observacoesManuais.map(obs => ({
      id: obs.id,
      mes: obs.mes,
      ano: obs.ano,
      observacao: obs.observacao,
      tipo: 'manual' as const,
      created_by: obs.created_by,
      created_at: obs.created_at,
      updated_at: obs.updated_at,
      usuario_nome: obs.usuario_nome,
      usuario_email: obs.usuario_email
    })),
    ...observacoesReajustes.map(obs => ({
      id: obs.id,
      mes: obs.mes,
      ano: obs.ano,
      observacao: obs.observacao,
      tipo: 'ajuste' as const,
      tipo_ajuste: obs.tipo_reajuste,
      valor_horas: obs.valor_reajuste_horas,
      valor_tickets: obs.valor_reajuste_tickets,
      created_by: obs.created_by,
      created_at: obs.created_at,
      usuario_nome: obs.usuario_nome,
      usuario_email: obs.usuario_email
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
