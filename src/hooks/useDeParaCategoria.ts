import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DeParaCategoria, CategoriaOption, GrupoOption } from '@/types/deParaCategoria';

/**
 * Hook para buscar todos os registros DE-PARA ativos
 */
export function useDeParaCategoria() {
  return useQuery({
    queryKey: ['de-para-categoria'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('de_para_categoria')
        .select('*')
        .eq('status', 'ativa')
        .order('categoria');

      if (error) {
        console.error('Erro ao buscar DE-PARA categoria:', error);
        throw error;
      }

      return data as DeParaCategoria[];
    },
  });
}

/**
 * Hook para buscar lista única de categorias ativas
 */
export function useCategorias() {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('de_para_categoria')
        .select('categoria')
        .eq('status', 'ativa')
        .order('categoria');

      if (error) {
        console.error('Erro ao buscar categorias:', error);
        throw error;
      }

      // Remover duplicatas e criar array de opções
      const categoriasUnicas = Array.from(
        new Set(data.map((item) => item.categoria))
      );

      return categoriasUnicas.map((categoria) => ({
        value: categoria,
        label: categoria,
      })) as CategoriaOption[];
    },
  });
}

/**
 * Hook para buscar grupos baseado na categoria selecionada
 */
export function useGruposPorCategoria(categoria?: string) {
  return useQuery({
    queryKey: ['grupos', categoria],
    queryFn: async () => {
      if (!categoria) {
        return [] as GrupoOption[];
      }

      const { data, error } = await supabase
        .from('de_para_categoria')
        .select('grupo')
        .eq('categoria', categoria)
        .eq('status', 'ativa')
        .order('grupo');

      if (error) {
        console.error('Erro ao buscar grupos:', error);
        throw error;
      }

      // Remover duplicatas e criar array de opções
      const gruposUnicos = Array.from(
        new Set(data.map((item) => item.grupo))
      );

      return gruposUnicos.map((grupo) => ({
        value: grupo,
        label: grupo,
      })) as GrupoOption[];
    },
    enabled: !!categoria, // Só executa se categoria estiver definida
  });
}

/**
 * Hook para buscar o grupo correspondente a uma categoria
 * Útil para preencher automaticamente o campo grupo ao selecionar categoria
 */
export function useGrupoPorCategoria(categoria?: string) {
  return useQuery({
    queryKey: ['grupo-por-categoria', categoria],
    queryFn: async () => {
      if (!categoria) {
        return null;
      }

      const { data, error } = await supabase
        .from('de_para_categoria')
        .select('grupo')
        .eq('categoria', categoria)
        .eq('status', 'ativa')
        .limit(1)
        .single();

      if (error) {
        console.error('Erro ao buscar grupo por categoria:', error);
        return null;
      }

      return data?.grupo || null;
    },
    enabled: !!categoria,
  });
}
