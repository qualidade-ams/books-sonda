import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EmpresasStats {
  total: number;
  ativas: number;
  inativas: number;
  suspensas: number;
}

/**
 * Hook para buscar estatísticas reais das empresas do banco de dados
 * Independente dos filtros aplicados na tela
 */
export const useEmpresasStats = () => {
  return useQuery({
    queryKey: ['empresas-stats'],
    queryFn: async (): Promise<EmpresasStats> => {
      try {
        // Buscar contagem total
        const { count: total, error: totalError } = await supabase
          .from('empresas_clientes')
          .select('*', { count: 'exact', head: true });

        if (totalError) throw totalError;

        // Buscar contagem por status usando RPC para melhor performance
        const [ativasResult, inativasResult, suspensasResult] = await Promise.all([
          supabase
            .from('empresas_clientes')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'ativo'),
          supabase
            .from('empresas_clientes')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'inativo'),
          supabase
            .from('empresas_clientes')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'suspenso')
        ]);

        if (ativasResult.error) throw ativasResult.error;
        if (inativasResult.error) throw inativasResult.error;
        if (suspensasResult.error) throw suspensasResult.error;

        return {
          total: total || 0,
          ativas: ativasResult.count || 0,
          inativas: inativasResult.count || 0,
          suspensas: suspensasResult.count || 0,
        };
      } catch (error) {
        console.error('Erro ao buscar estatísticas das empresas:', error);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
};