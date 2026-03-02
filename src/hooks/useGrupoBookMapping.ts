/**
 * Hook para mapear caso_grupo para grupo_book usando tabela de_para_categoria
 * 
 * Este hook busca o grupo_book correspondente a uma categoria (caso_grupo)
 * na tabela de_para_categoria, permitindo exibir o nome correto do grupo
 * nas abas Volumetria e Backlog dos Books.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface GrupoBookMapping {
  categoria: string;
  grupo_book: string;
}

/**
 * Hook para buscar o mapeamento completo de categorias para grupos
 * Retorna um Map para lookup rápido
 */
export function useGrupoBookMapping() {
  return useQuery({
    queryKey: ['grupo-book-mapping'],
    queryFn: async () => {
      console.log('🔍 [useGrupoBookMapping] Buscando mapeamento de categorias...');
      
      const { data, error } = await supabase
        .from('de_para_categoria')
        .select('categoria, grupo')
        .eq('status', 'ativa')
        .order('categoria');

      if (error) {
        console.error('❌ [useGrupoBookMapping] Erro ao buscar mapeamento:', error);
        throw error;
      }

      console.log('📊 [useGrupoBookMapping] Dados brutos:', data);

      // Criar Map para lookup rápido: categoria -> grupo_book
      const mappingMap = new Map<string, string>();
      
      data.forEach((item) => {
        mappingMap.set(item.categoria, item.grupo);
      });

      console.log('✅ [useGrupoBookMapping] Mapeamento criado:', {
        total: mappingMap.size,
        exemplos: Array.from(mappingMap.entries()).slice(0, 3)
      });
      
      return mappingMap;
    },
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });
}

/**
 * Hook para buscar o grupo_book de uma categoria específica
 */
export function useGrupoBookPorCategoria(categoria?: string) {
  return useQuery({
    queryKey: ['grupo-book', categoria],
    queryFn: async () => {
      if (!categoria) {
        console.log('⏭️ [useGrupoBookPorCategoria] Categoria não fornecida');
        return null;
      }

      console.log('🔍 [useGrupoBookPorCategoria] Buscando grupo para categoria:', categoria);

      const { data, error } = await supabase
        .from('de_para_categoria')
        .select('grupo')
        .eq('categoria', categoria)
        .eq('status', 'ativa')
        .limit(1)
        .single();

      if (error) {
        console.error('❌ [useGrupoBookPorCategoria] Erro ao buscar grupo:', error);
        return null;
      }

      console.log('✅ [useGrupoBookPorCategoria] Grupo encontrado:', {
        categoria,
        grupo: data?.grupo
      });

      return data?.grupo || null;
    },
    enabled: !!categoria,
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });
}

/**
 * Função utilitária para mapear caso_grupo para grupo_book
 * Usa o Map de mapeamento para fazer lookup rápido
 */
export function mapearCasoGrupoParaGrupoBook(
  casoGrupo: string,
  mappingMap: Map<string, string>
): string {
  const grupoBook = mappingMap.get(casoGrupo);
  
  if (grupoBook) {
    console.log(`📧 [Mapeamento] "${casoGrupo}" → "${grupoBook}"`);
    return grupoBook;
  }
  
  console.warn(`⚠️ [Mapeamento] Categoria "${casoGrupo}" não encontrada no mapeamento, mantendo original`);
  return casoGrupo;
}

/**
 * Função utilitária para mapear múltiplos grupos de uma vez
 * Útil para processar arrays de dados
 */
export function mapearMultiplosGrupos<T extends { grupo: string }>(
  items: T[],
  mappingMap: Map<string, string>
): T[] {
  return items.map(item => ({
    ...item,
    grupo: mapearCasoGrupoParaGrupoBook(item.grupo, mappingMap)
  }));
}
