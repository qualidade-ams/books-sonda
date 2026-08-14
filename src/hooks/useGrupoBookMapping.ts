/**
 * Hook para mapear caso_grupo para grupo_book usando tabela de_para_categoria
 * 
 * Este hook busca o grupo_book correspondente a uma categoria (caso_grupo)
 * na tabela de_para_categoria, permitindo exibir o nome correto do grupo
 * nas abas Volumetria e Backlog dos Books.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para buscar o mapeamento completo de categorias para grupos
 * Retorna um Map para lookup rápido
 * 
 * Colunas da tabela de_para_categoria:
 * - grupo: código de resolução / nome_grupo de origem (chave de lookup)
 * - grupo_book: nome mapeado para exibição no book (valor final)
 */
export function useGrupoBookMapping() {
  return useQuery({
    queryKey: ['grupo-book-mapping'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('de_para_categoria')
        .select('grupo, grupo_book')
        .eq('status', 'ativa')
        .order('grupo');

      if (error) {
        console.error('Erro ao buscar mapeamento de grupos:', error.message);
        throw error;
      }

      // Criar Map para lookup rápido: grupo -> grupo_book
      const mappingMap = new Map<string, string>();
      
      data?.forEach((item) => {
        if (item.grupo && item.grupo_book) {
          mappingMap.set(item.grupo, item.grupo_book);
        }
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
        return null;
      }

      const { data, error } = await supabase
        .from('de_para_categoria')
        .select('grupo_book')
        .eq('grupo', categoria)
        .eq('status', 'ativa')
        .limit(1)
        .single();

      if (error) {
        console.error('Erro ao buscar grupo_book:', error.message);
        return null;
      }

      return data?.grupo_book || null;
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
  return mappingMap.get(casoGrupo) || casoGrupo;
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
