/**
 * Hook para gerenciamento de dados da Pesquisa Mensal AMS
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PesquisaMensalAMS, PesquisaMensalAMSFormData, FiltrosPesquisaAMS, EstatisticasAMS } from '@/types/pesquisaMensalAMS';

const QUERY_KEY = 'pesquisa-mensal-ams';

/**
 * Buscar pesquisas AMS com filtros
 */
export function usePesquisasMensalAMS(filtros: FiltrosPesquisaAMS) {
  return useQuery({
    queryKey: [QUERY_KEY, filtros],
    queryFn: async () => {
      let query = supabase
        .from('pesquisa_mensal_ams')
        .select('*')
        .order('created_at', { ascending: false });

      if (filtros.mes) {
        query = query.eq('mes_referencia', filtros.mes);
      }
      if (filtros.ano) {
        query = query.eq('ano_referencia', filtros.ano);
      }
      if (filtros.cliente && filtros.cliente !== 'todos') {
        query = query.ilike('cliente', `%${filtros.cliente}%`);
      }
      if (filtros.vertical && filtros.vertical !== 'todos') {
        query = query.ilike('vertical', `%${filtros.vertical}%`);
      }
      if (filtros.unidade_negocio && filtros.unidade_negocio !== 'todos') {
        query = query.ilike('unidade_negocio', `%${filtros.unidade_negocio}%`);
      }
      if (filtros.situacao_resposta && filtros.situacao_resposta !== 'todas') {
        query = query.ilike('situacao_resposta', `%${filtros.situacao_resposta}%`);
      }
      if (filtros.busca) {
        query = query.or(
          `identificador_questionario.ilike.%${filtros.busca}%,nome_questionario.ilike.%${filtros.busca}%,nome_respondente.ilike.%${filtros.busca}%,cliente.ilike.%${filtros.busca}%,comentario.ilike.%${filtros.busca}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PesquisaMensalAMS[];
    },
  });
}


/**
 * Estatísticas das pesquisas AMS
 */
export function useEstatisticasAMS(filtros: FiltrosPesquisaAMS) {
  return useQuery({
    queryKey: [QUERY_KEY, 'estatisticas', filtros],
    queryFn: async () => {
      let query = supabase
        .from('pesquisa_mensal_ams')
        .select('*');

      if (filtros.mes) query = query.eq('mes_referencia', filtros.mes);
      if (filtros.ano) query = query.eq('ano_referencia', filtros.ano);

      const { data, error } = await query;
      if (error) throw error;

      const registros = (data || []) as PesquisaMensalAMS[];
      const notasValidas = registros.filter(r => r.nota !== null).map(r => r.nota as number);

      const stats: EstatisticasAMS = {
        total: registros.length,
        completas: registros.filter(r => !r.incompleto).length,
        incompletas: registros.filter(r => r.incompleto).length,
        cliente_foco: registros.filter(r => r.cliente_foco).length,
        media_nota: notasValidas.length > 0
          ? Math.round((notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length) * 100) / 100
          : 0,
      };
      return stats;
    },
  });
}

/**
 * Buscar valores únicos para filtros
 */
export function useFiltrosDistintosAMS() {
  return useQuery({
    queryKey: [QUERY_KEY, 'filtros-distintos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pesquisa_mensal_ams')
        .select('cliente, vertical, unidade_negocio, situacao_resposta');
      if (error) throw error;

      const registros = (data || []) as Pick<PesquisaMensalAMS, 'cliente' | 'vertical' | 'unidade_negocio' | 'situacao_resposta'>[];
      
      return {
        clientes: [...new Set(registros.map(r => r.cliente).filter(Boolean))] as string[],
        verticais: [...new Set(registros.map(r => r.vertical).filter(Boolean))] as string[],
        unidades_negocio: [...new Set(registros.map(r => r.unidade_negocio).filter(Boolean))] as string[],
        situacoes: [...new Set(registros.map(r => r.situacao_resposta).filter(Boolean))] as string[],
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Importar dados em lote
 */
export function useImportarPesquisasAMS() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (registros: PesquisaMensalAMSFormData[]) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const dadosParaInserir = registros.map(r => ({
        ...r,
        created_by: userId,
      }));

      // Inserir em lotes de 100
      const batchSize = 100;
      let totalInseridos = 0;

      for (let i = 0; i < dadosParaInserir.length; i += batchSize) {
        const batch = dadosParaInserir.slice(i, i + batchSize);
        const { error } = await supabase
          .from('pesquisa_mensal_ams')
          .insert(batch);
        if (error) throw error;
        totalInseridos += batch.length;
      }

      return { totalInseridos };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

/**
 * Atualizar pesquisa AMS
 */
export function useAtualizarPesquisaAMS() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: Partial<PesquisaMensalAMSFormData> }) => {
      const { data, error } = await supabase
        .from('pesquisa_mensal_ams')
        .update(dados)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

/**
 * Excluir pesquisa AMS
 */
export function useExcluirPesquisaAMS() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pesquisa_mensal_ams')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

/**
 * Excluir múltiplas pesquisas AMS
 */
export function useExcluirMultiplasPesquisasAMS() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('pesquisa_mensal_ams')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
