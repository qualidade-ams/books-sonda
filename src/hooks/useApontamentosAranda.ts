/**
 * Hook para gerenciar apontamentos sincronizados da tabela AMSapontamento do SQL Server Aranda
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ApontamentoAranda, ApontamentoArandaFiltros } from '@/types/apontamentosAranda';

/**
 * Hook para buscar apontamentos com filtros
 */
export function useApontamentosAranda(filtros?: ApontamentoArandaFiltros) {
  return useQuery({
    queryKey: ['apontamentos-aranda', filtros],
    queryFn: async () => {
      let query = supabase
        .from('apontamentos_aranda')
        .select('*')
        .order('data_abertura', { ascending: false });

      // Aplicar filtros
      if (filtros?.nro_chamado) {
        query = query.ilike('nro_chamado', `%${filtros.nro_chamado}%`);
      }

      if (filtros?.caso_grupo) {
        query = query.ilike('caso_grupo', `%${filtros.caso_grupo}%`);
      }

      if (filtros?.analista_tarefa) {
        query = query.ilike('analista_tarefa', `%${filtros.analista_tarefa}%`);
      }

      if (filtros?.data_abertura_inicio) {
        query = query.gte('data_abertura', filtros.data_abertura_inicio);
      }

      if (filtros?.data_abertura_fim) {
        query = query.lte('data_abertura', filtros.data_abertura_fim);
      }

      if (filtros?.data_fechamento_inicio) {
        query = query.gte('data_fechamento', filtros.data_fechamento_inicio);
      }

      if (filtros?.data_fechamento_fim) {
        query = query.lte('data_fechamento', filtros.data_fechamento_fim);
      }

      // Busca geral (nro_chamado, solicitante, analista_tarefa)
      if (filtros?.busca) {
        query = query.or(
          `nro_chamado.ilike.%${filtros.busca}%,` +
          `solicitante.ilike.%${filtros.busca}%,` +
          `analista_tarefa.ilike.%${filtros.busca}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar apontamentos:', error);
        throw error;
      }

      return data as ApontamentoAranda[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para buscar um apontamento específico por ID
 */
export function useApontamentoAranda(id: string) {
  return useQuery({
    queryKey: ['apontamento-aranda', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apontamentos_aranda')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erro ao buscar apontamento:', error);
        throw error;
      }

      return data as ApontamentoAranda;
    },
    enabled: !!id,
  });
}

/**
 * Hook para buscar estatísticas de apontamentos
 */
export function useEstatisticasApontamentos(filtros?: ApontamentoArandaFiltros) {
  return useQuery({
    queryKey: ['estatisticas-apontamentos', filtros],
    queryFn: async () => {
      let query = supabase
        .from('apontamentos_aranda')
        .select('*');

      // Aplicar mesmos filtros
      if (filtros?.nro_chamado) {
        query = query.ilike('nro_chamado', `%${filtros.nro_chamado}%`);
      }

      if (filtros?.caso_grupo) {
        query = query.ilike('caso_grupo', `%${filtros.caso_grupo}%`);
      }

      if (filtros?.analista_tarefa) {
        query = query.ilike('analista_tarefa', `%${filtros.analista_tarefa}%`);
      }

      if (filtros?.data_abertura_inicio) {
        query = query.gte('data_abertura', filtros.data_abertura_inicio);
      }

      if (filtros?.data_abertura_fim) {
        query = query.lte('data_abertura', filtros.data_abertura_fim);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar estatísticas:', error);
        throw error;
      }

      const apontamentos = data as ApontamentoAranda[];

      // Calcular estatísticas
      const total = apontamentos.length;
      const abertos = apontamentos.filter(a => !a.data_fechamento).length;
      const fechados = apontamentos.filter(a => a.data_fechamento).length;

      // Calcular tempo total em horas
      const tempoTotalHoras = apontamentos.reduce((acc, a) => {
        if (a.tempo_gasto_minutos) {
          return acc + (a.tempo_gasto_minutos / 60);
        }
        return acc;
      }, 0);

      const tempoMedioHoras = total > 0 ? tempoTotalHoras / total : 0;

      // Agrupar por grupo
      const porGrupo: Record<string, number> = {};
      apontamentos.forEach(a => {
        if (a.caso_grupo) {
          porGrupo[a.caso_grupo] = (porGrupo[a.caso_grupo] || 0) + 1;
        }
      });

      // Agrupar por analista
      const porAnalista: Record<string, number> = {};
      apontamentos.forEach(a => {
        if (a.analista_tarefa) {
          porAnalista[a.analista_tarefa] = (porAnalista[a.analista_tarefa] || 0) + 1;
        }
      });

      return {
        total,
        abertos,
        fechados,
        tempo_total_horas: Math.round(tempoTotalHoras * 100) / 100,
        tempo_medio_horas: Math.round(tempoMedioHoras * 100) / 100,
        por_grupo: porGrupo,
        por_analista: porAnalista,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para buscar grupos únicos (para filtros)
 */
export function useGruposApontamentos() {
  return useQuery({
    queryKey: ['grupos-apontamentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apontamentos_aranda')
        .select('caso_grupo')
        .not('caso_grupo', 'is', null)
        .order('caso_grupo');

      if (error) {
        console.error('Erro ao buscar grupos:', error);
        throw error;
      }

      // Retornar apenas valores únicos
      const grupos = [...new Set(data.map(d => d.caso_grupo))];
      return grupos as string[];
    },
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
}

/**
 * Hook para buscar analistas únicos (para filtros)
 */
export function useAnalistasApontamentos() {
  return useQuery({
    queryKey: ['analistas-apontamentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apontamentos_aranda')
        .select('analista_tarefa')
        .not('analista_tarefa', 'is', null)
        .order('analista_tarefa');

      if (error) {
        console.error('Erro ao buscar analistas:', error);
        throw error;
      }

      // Retornar apenas valores únicos
      const analistas = [...new Set(data.map(d => d.analista_tarefa))];
      return analistas as string[];
    },
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
}

/**
 * Hook para invalidar cache de apontamentos
 */
export function useInvalidateApontamentos() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['apontamentos-aranda'] });
    queryClient.invalidateQueries({ queryKey: ['estatisticas-apontamentos'] });
    queryClient.invalidateQueries({ queryKey: ['grupos-apontamentos'] });
    queryClient.invalidateQueries({ queryKey: ['analistas-apontamentos'] });
  };
}
