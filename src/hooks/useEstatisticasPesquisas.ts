import { useQuery } from '@tanstack/react-query';

interface EstatisticasPesquisas {
  total_enviadas: number;
  total_respondidas: number;
  total_nao_respondidas: number;
  taxa_resposta: number;
}

interface ResponseEstatisticasPesquisas {
  success: boolean;
  ano: number;
  grupo: string;
  estatisticas: EstatisticasPesquisas;
}

/**
 * Hook para buscar estatísticas de pesquisas (enviadas vs respondidas)
 */
export const useEstatisticasPesquisas = (ano: number, grupo: string = 'todos') => {
  return useQuery<EstatisticasPesquisas>({
    queryKey: ['estatisticas-pesquisas', ano, grupo],
    queryFn: async (): Promise<EstatisticasPesquisas> => {
      const syncApiUrl = import.meta.env.VITE_SYNC_API_URL || 'http://SAPSERVDB.sondait.com.br:3001';
      
      const params = new URLSearchParams({
        ano: ano.toString(),
        ...(grupo !== 'todos' && { grupo })
      });
      
      const response = await fetch(`${syncApiUrl}/api/stats-pesquisas?${params}`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar estatísticas: ${response.status}`);
      }
      
      const data: ResponseEstatisticasPesquisas = await response.json();
      
      if (!data.success) {
        throw new Error('Erro na resposta da API de estatísticas');
      }
      
      return data.estatisticas;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos (anteriormente cacheTime)
    retry: 2,
    enabled: !!ano // Só executa se o ano estiver definido
  });
};

export type { EstatisticasPesquisas };