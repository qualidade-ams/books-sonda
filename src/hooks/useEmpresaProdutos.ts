/**
 * Hook para buscar produtos vinculados a uma empresa
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useEmpresaProdutos(empresaId: string | null) {
  return useQuery({
    queryKey: ['empresa-produtos', empresaId],
    queryFn: async () => {
      console.log('🔍 useEmpresaProdutos - Buscando produtos para empresa:', empresaId);
      
      if (!empresaId) {
        console.log('⚠️ useEmpresaProdutos - empresaId é null');
        return [];
      }

      const { data, error } = await supabase
        .from('empresa_produtos')
        .select('produto')
        .eq('empresa_id', empresaId)
        .order('produto');

      if (error) {
        console.error('❌ useEmpresaProdutos - Erro ao buscar produtos:', error);
        throw error;
      }

      const produtos = data.map(item => item.produto);
      console.log('✅ useEmpresaProdutos - Produtos encontrados:', produtos);

      // Retornar apenas array de strings com os produtos
      return produtos;
    },
    enabled: !!empresaId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
