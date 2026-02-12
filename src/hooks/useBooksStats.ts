/**
 * Hook para estatísticas de Books
 * Calcula métricas agregadas para exibição nos cards
 */

import { useQuery } from '@tanstack/react-query';
import type { BooksStats, BooksFiltros } from '@/types/books';
import { booksService } from '@/services/booksService';

/**
 * Hook para buscar estatísticas de books
 */
export function useBooksStats(filtros: BooksFiltros) {
  const {
    data: stats,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['books-stats', filtros],
    queryFn: () => booksService.buscarEstatisticas(filtros),
    staleTime: 1000 * 60 * 5, // 5 minutos
    placeholderData: {
      total_empresas: 0,
      total_horas: '0h00min',
      valor_total: 0,
      valores_selecionados: 0
    } as BooksStats
  });

  return {
    stats: stats || {
      total_empresas: 0,
      total_horas: '0h00min',
      valor_total: 0,
      valores_selecionados: 0
    },
    isLoading,
    error,
    refetch
  };
}

/**
 * Hook para calcular estatísticas de seleção
 */
export function useSelectionStats(selectedEmpresaIds: string[], mes: number, ano: number) {
  const {
    data: stats,
    isLoading
  } = useQuery({
    queryKey: ['selection-stats', selectedEmpresaIds, mes, ano],
    queryFn: () => booksService.calcularEstatisticasSelecao(selectedEmpresaIds, mes, ano),
    enabled: selectedEmpresaIds.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutos
    placeholderData: {
      total_horas: '0h00min',
      valor_total: 0
    }
  });

  return {
    totalHoras: stats?.total_horas || '0h00min',
    valorTotal: stats?.valor_total || 0,
    isLoading
  };
}
