/**
 * Hook para gerenciamento de especialistas
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { buscarEspecialistasAtivos, buscarEspecialistaPorId } from '@/integrations/supabase/admin-client';
import type { Especialista, FiltrosEspecialistas, EstatisticasEspecialistas } from '@/types/especialistas';

// ============================================
// QUERIES
// ============================================

/**
 * Hook para buscar especialistas
 */
export function useEspecialistas(filtros: FiltrosEspecialistas = {}) {
  return useQuery({
    queryKey: ['especialistas', filtros],
    queryFn: async (): Promise<Especialista[]> => {
      let query = supabase
        .from('especialistas')
        .select('*')
        .order('nome', { ascending: true });

      // Aplicar filtros
      if (filtros.status && filtros.status !== 'todos') {
        query = query.eq('status', filtros.status);
      }

      if (filtros.origem && filtros.origem !== 'todos') {
        query = query.eq('origem', filtros.origem);
      }

      if (filtros.busca) {
        query = query.or(`nome.ilike.%${filtros.busca}%,email.ilike.%${filtros.busca}%,empresa.ilike.%${filtros.busca}%`);
      }

      if (filtros.empresa) {
        query = query.eq('empresa', filtros.empresa);
      }

      if (filtros.departamento) {
        query = query.eq('departamento', filtros.departamento);
      }

      if (filtros.especialidade) {
        query = query.eq('especialidade', filtros.especialidade);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar especialistas:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false
  });
}

/**
 * Hook para buscar apenas especialistas ativos (para selectbox)
 */
export function useEspecialistasAtivos() {
  return useQuery({
    queryKey: ['especialistas-ativos'],
    queryFn: async (): Promise<Especialista[]> => {
      console.log('🔍 [useEspecialistasAtivos] Iniciando busca de especialistas ativos...');
      
      try {
        const data = await buscarEspecialistasAtivos();
        
        console.log('✅ [useEspecialistasAtivos] Especialistas encontrados:', data?.length || 0);
        
        // Ordenar por nome para melhor UX
        const dataOrdenada = data?.sort((a, b) => 
          a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
        ) || [];

        return dataOrdenada;
      } catch (error) {
        console.error('❌ [useEspecialistasAtivos] Erro ao buscar especialistas ativos:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 10, // 10 minutos (dados mais estáveis)
    refetchOnWindowFocus: false
  });
}

/**
 * Hook para buscar especialista por ID
 */
export function useEspecialista(id: string) {
  return useQuery({
    queryKey: ['especialista', id],
    queryFn: async (): Promise<Especialista | null> => {
      if (!id) return null;

      try {
        const data = await buscarEspecialistaPorId(id);
        return data;
      } catch (error) {
        console.error('Erro ao buscar especialista:', error);
        throw error;
      }
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false
  });
}

/**
 * Hook para buscar estatísticas de especialistas
 */
export function useEstatisticasEspecialistas(filtros: FiltrosEspecialistas = {}) {
  return useQuery({
    queryKey: ['especialistas-estatisticas', filtros],
    queryFn: async (): Promise<EstatisticasEspecialistas> => {
      // Buscar todos os especialistas com filtros aplicados
      let query = supabase
        .from('especialistas')
        .select('*');

      // Aplicar filtros
      if (filtros.origem && filtros.origem !== 'todos') {
        query = query.eq('origem', filtros.origem);
      }

      if (filtros.busca) {
        query = query.or(`nome.ilike.%${filtros.busca}%,email.ilike.%${filtros.busca}%,empresa.ilike.%${filtros.busca}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar estatísticas de especialistas:', error);
        throw error;
      }

      const especialistas = data || [];

      // Calcular estatísticas
      const estatisticas: EstatisticasEspecialistas = {
        total: especialistas.length,
        ativos: especialistas.filter(e => e.status === 'ativo').length,
        inativos: especialistas.filter(e => e.status === 'inativo').length,
        sql_server: especialistas.filter(e => e.origem === 'sql_server').length,
        manuais: especialistas.filter(e => e.origem === 'manual').length,
        por_empresa: {},
        por_departamento: {},
        por_especialidade: {}
      };

      // Agrupar por empresa
      especialistas.forEach(especialista => {
        if (especialista.empresa) {
          estatisticas.por_empresa[especialista.empresa] = 
            (estatisticas.por_empresa[especialista.empresa] || 0) + 1;
        }
      });

      // Agrupar por departamento
      especialistas.forEach(especialista => {
        if (especialista.departamento) {
          estatisticas.por_departamento[especialista.departamento] = 
            (estatisticas.por_departamento[especialista.departamento] || 0) + 1;
        }
      });

      // Agrupar por especialidade
      especialistas.forEach(especialista => {
        if (especialista.especialidade) {
          estatisticas.por_especialidade[especialista.especialidade] = 
            (estatisticas.por_especialidade[especialista.especialidade] || 0) + 1;
        }
      });

      return estatisticas;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false
  });
}