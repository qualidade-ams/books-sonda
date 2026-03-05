// =====================================================
// HOOK: COORDENADORES
// =====================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Coordenador {
  id: string;
  nome: string;
  cargo: string;
}

/**
 * Hook para buscar coordenadores da tabela organizacao_estrutura
 * Filtra apenas registros com cargo "Coordenador" ou "Coordenadora"
 */
export function useCoordenadores() {
  return useQuery({
    queryKey: ['coordenadores'],
    queryFn: async (): Promise<Coordenador[]> => {
      console.log('🔍 [useCoordenadores] Iniciando busca...');
      
      // Buscar todos os registros da tabela
      const { data, error } = await supabase
        .from('organizacao_estrutura' as any)
        .select('id, nome, cargo');

      console.log('📊 [useCoordenadores] Resultado da query:', { 
        totalRegistros: data?.length || 0, 
        erro: error 
      });

      if (error) {
        console.error('❌ [useCoordenadores] Erro ao buscar coordenadores:', error);
        throw error;
      }

      if (!data) {
        console.log('⚠️ [useCoordenadores] Nenhum dado retornado');
        return [];
      }

      // Filtrar coordenadores no client-side
      const coordenadores = data.filter((item: any) => {
        const cargo = item.cargo?.toLowerCase() || '';
        return cargo.includes('coordenador') || cargo.includes('coordenadora');
      });

      console.log('✅ [useCoordenadores] Coordenadores filtrados:', coordenadores.length);
      if (coordenadores.length > 0) {
        console.log('📋 [useCoordenadores] Primeiros 3:', coordenadores.slice(0, 3));
      }

      // Ordenar por nome
      return coordenadores.sort((a: any, b: any) => a.nome.localeCompare(b.nome));
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar um coordenador específico por ID
 */
export function useCoordenador(coordenadorId: string | undefined) {
  return useQuery({
    queryKey: ['coordenador', coordenadorId],
    queryFn: async (): Promise<Coordenador | null> => {
      if (!coordenadorId) return null;

      const { data, error } = await supabase
        .from('organizacao_estrutura')
        .select('id, nome, cargo')
        .eq('id', coordenadorId)
        .single();

      if (error) {
        console.error('❌ Erro ao buscar coordenador:', error);
        return null;
      }

      return data;
    },
    enabled: !!coordenadorId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
