import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DeParaCategoria, CategoriaOption, GrupoOption } from '@/types/deParaCategoria';

/**
 * Hook para buscar todos os registros DE-PARA ativos
 * Usa paginação para buscar TODOS os registros (Supabase limita a 1000 por query)
 */
export function useDeParaCategoria() {
  return useQuery({
    queryKey: ['de-para-categoria'],
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      let allData: DeParaCategoria[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error } = await supabase
          .from('de_para_categoria')
          .select('*')
          .eq('status', 'ativa')
          .order('grupo')
          .range(from, to);

        if (error) {
          console.error('Erro ao buscar DE-PARA categoria:', error);
          throw error;
        }

        if (data && data.length > 0) {
          allData = allData.concat(data as DeParaCategoria[]);
          hasMore = data.length === PAGE_SIZE;
          page++;
        } else {
          hasMore = false;
        }
      }

      return allData;
    },
  });
}

/**
 * Hook para buscar lista única de grupo_book ativos
 * Para o formulário de novas pesquisas - exibe valores únicos de grupo_book
 * Mantém o nome useCategorias para compatibilidade com imports existentes
 */
export function useCategorias() {
  return useQuery({
    queryKey: ['grupo-book-unicos'],
    queryFn: async () => {
      console.log('🔍 [HOOK] Buscando grupo_book únicos (com paginação)...');
      
      const PAGE_SIZE = 1000;
      let allData: { grupo_book: string }[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error } = await supabase
          .from('de_para_categoria')
          .select('grupo_book')
          .eq('status', 'ativa')
          .not('grupo_book', 'is', null)
          .order('grupo_book')
          .range(from, to);

        if (error) {
          console.error('❌ [HOOK] Erro ao buscar grupo_book:', error);
          throw error;
        }

        if (data && data.length > 0) {
          allData = allData.concat(data);
          hasMore = data.length === PAGE_SIZE;
          page++;
        } else {
          hasMore = false;
        }
      }

      console.log('📊 [HOOK] Total de registros buscados:', allData.length);

      // Remover duplicatas, trim de espaços e criar array de opções
      const gruposBookUnicos = Array.from(
        new Set(allData.map((item) => item.grupo_book.trim()).filter(g => g.length > 0))
      ).sort();

      const gruposOptions = gruposBookUnicos.map((grupo) => ({
        value: grupo,
        label: grupo,
      })) as CategoriaOption[];

      console.log('✅ [HOOK] Grupo_book únicos processados:', gruposOptions.length);
      
      return gruposOptions;
    },
  });
}

/**
 * @deprecated Não há mais dependência categoria → grupo. Usar useCategorias() que retorna grupos diretamente.
 * Mantido para compatibilidade - retorna array vazio.
 */
export function useGruposPorCategoria(categoria?: string) {
  return useQuery({
    queryKey: ['grupos-por-categoria-deprecated', categoria],
    queryFn: async () => {
      return [] as GrupoOption[];
    },
    enabled: false,
  });
}

/**
 * @deprecated Usar useCategorias() que retorna grupos diretamente.
 * Mantido para compatibilidade.
 */
export function useGrupoPorCategoria(categoria?: string) {
  return useQuery({
    queryKey: ['grupo-por-categoria-deprecated', categoria],
    queryFn: async () => {
      return null;
    },
    enabled: false,
  });
}
