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
 * Usa contagens (count) em vez de select('*') para evitar o limite de 1000 registros do Supabase
 */
export const useEstatisticasPesquisasLocal = (ano: number, grupo: string = 'todos') => {
  return useQuery<EstatisticasPesquisas>({
    queryKey: ['estatisticas-pesquisas-local', ano, grupo],
    queryFn: async (): Promise<EstatisticasPesquisas> => {
      try {
        // Query base: total de pesquisas enviadas (SQL Server + Manuais)
        let totalQuery = supabase
          .from('pesquisas_satisfacao')
          .select('*', { count: 'exact', head: true })
          .eq('ano_abertura', ano)
          .in('origem', ['sql_server', 'manual']);

        if (grupo !== 'todos') {
          totalQuery = totalQuery.eq('grupo', grupo);
        }

        const { count: total_enviadas, error: errorTotal } = await totalQuery;

        if (errorTotal) {
          console.error('Erro ao contar pesquisas:', errorTotal);
          throw new Error(`Erro ao contar pesquisas: ${errorTotal.message}`);
        }

        const totalEnviadas = total_enviadas ?? 0;

        if (totalEnviadas === 0) {
          return {
            total_enviadas: 0,
            total_respondidas: 0,
            total_nao_respondidas: 0,
            taxa_resposta: 0
          };
        }

        // Contar respondidas: resposta preenchida e diferente de 'sem_resposta'
        // Precisamos buscar em lotes apenas o campo 'resposta' para contar corretamente
        const BATCH_SIZE = 1000;
        let offset = 0;
        let hasMore = true;
        let totalRespondidas = 0;
        let totalNaoRespondidas = 0;
        let countSqlServer = 0;
        let countManual = 0;

        while (hasMore) {
          let query = supabase
            .from('pesquisas_satisfacao')
            .select('resposta, origem')
            .eq('ano_abertura', ano)
            .in('origem', ['sql_server', 'manual'])
            .range(offset, offset + BATCH_SIZE - 1);

          if (grupo !== 'todos') {
            query = query.eq('grupo', grupo);
          }

          const { data, error } = await query;

          if (error) {
            console.error('Erro ao buscar respostas:', error);
            throw new Error(`Erro ao buscar respostas: ${error.message}`);
          }

          if (data && data.length > 0) {
            data.forEach(p => {
              if (p.resposta && p.resposta !== 'sem_resposta') {
                totalRespondidas++;
              } else {
                totalNaoRespondidas++;
              }
              if (p.origem === 'sql_server') countSqlServer++;
              if (p.origem === 'manual') countManual++;
            });
            offset += BATCH_SIZE;
            hasMore = data.length === BATCH_SIZE;
          } else {
            hasMore = false;
          }
        }

        const taxa_resposta = totalEnviadas > 0
          ? Math.round((totalRespondidas / totalEnviadas) * 100)
          : 0;

        console.log('📊 Estatísticas calculadas (SQL Server + Manuais):', {
          ano,
          grupo,
          total_enviadas: totalEnviadas,
          total_respondidas: totalRespondidas,
          total_nao_respondidas: totalNaoRespondidas,
          taxa_resposta,
          detalhes: {
            sql_server: countSqlServer,
            manual: countManual
          }
        });

        return {
          total_enviadas: totalEnviadas,
          total_respondidas: totalRespondidas,
          total_nao_respondidas: totalNaoRespondidas,
          taxa_resposta
        };
      } catch (error) {
        console.error('Erro ao calcular estatísticas:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    enabled: !!ano
  });
};

export type { EstatisticasPesquisas };
