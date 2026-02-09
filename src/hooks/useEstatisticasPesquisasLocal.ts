import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EstatisticasPesquisas {
  total_enviadas: number;
  total_respondidas: number;
  total_nao_respondidas: number;
  taxa_resposta: number;
}

/**
 * Hook para buscar estatísticas de pesquisas da tabela local pesquisas_satisfacao
 * Busca pesquisas do ano especificado (origem: sql_server e manual) e calcula estatísticas baseadas no campo resposta
 */
export const useEstatisticasPesquisasLocal = (ano: number, grupo: string = 'todos') => {
  return useQuery<EstatisticasPesquisas>({
    queryKey: ['estatisticas-pesquisas-local', ano, grupo],
    queryFn: async (): Promise<EstatisticasPesquisas> => {
      try {
        // Buscar todas as pesquisas do ano especificado (SQL Server + Manuais)
        let query = supabase
          .from('pesquisas_satisfacao')
          .select('*')
          .eq('ano_abertura', ano)
          .in('origem', ['sql_server', 'manual']); // Incluir ambas as origens

        // Filtrar por grupo se não for 'todos'
        if (grupo !== 'todos') {
          query = query.eq('grupo', grupo);
        }

        const { data: pesquisas, error } = await query;

        if (error) {
          console.error('Erro ao buscar pesquisas:', error);
          throw new Error(`Erro ao buscar pesquisas: ${error.message}`);
        }

        if (!pesquisas) {
          return {
            total_enviadas: 0,
            total_respondidas: 0,
            total_nao_respondidas: 0,
            taxa_resposta: 0
          };
        }

        // Calcular estatísticas
        const total_enviadas = pesquisas.length;
        
        // Respondidas: pesquisas com campo resposta preenchido (não NULL e diferente de 'sem_resposta')
        const total_respondidas = pesquisas.filter(p => 
          p.resposta && p.resposta !== 'sem_resposta'
        ).length;
        
        // Não respondidas: pesquisas com resposta NULL ou 'sem_resposta'
        const total_nao_respondidas = pesquisas.filter(p => 
          !p.resposta || p.resposta === 'sem_resposta'
        ).length;
        
        // Taxa de resposta
        const taxa_resposta = total_enviadas > 0 
          ? Math.round((total_respondidas / total_enviadas) * 100) 
          : 0;

        console.log('📊 Estatísticas calculadas (SQL Server + Manuais):', {
          ano,
          grupo,
          total_enviadas,
          total_respondidas,
          total_nao_respondidas,
          taxa_resposta,
          detalhes: {
            sql_server: pesquisas.filter(p => p.origem === 'sql_server').length,
            manual: pesquisas.filter(p => p.origem === 'manual').length
          }
        });

        return {
          total_enviadas,
          total_respondidas,
          total_nao_respondidas,
          taxa_resposta
        };
      } catch (error) {
        console.error('Erro ao calcular estatísticas:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: 2,
    enabled: !!ano // Só executa se o ano estiver definido
  });
};

export type { EstatisticasPesquisas };
