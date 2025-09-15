import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { GrupoResponsavelCompleto } from '@/types/clientBooks';

/**
 * Hook para gerenciamento de grupos responsáveis
 */
export const useGrupos = () => {
  const {
    data: grupos = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['grupos'],
    queryFn: async (): Promise<GrupoResponsavelCompleto[]> => {
      const { data, error } = await supabase
        .from('grupos_responsaveis')
        .select(`
          *,
          emails:grupo_emails(
            id,
            email,
            nome
          )
        `)
        .order('nome');

      if (error) {
        throw new Error(`Erro ao carregar grupos: ${error.message}`);
      }

      return data as GrupoResponsavelCompleto[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });

  return {
    grupos,
    isLoading,
    error,
    refetch,
  };
};