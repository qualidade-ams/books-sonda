/**
 * Hook para gerenciamento de Books
 * Busca, cria, atualiza e gerencia estado de books
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { 
  BookData, 
  BookListItem, 
  BooksFiltros,
  BookGeracaoConfig,
  BooksGeracaoLoteResult
} from '@/types/books';
import { booksService } from '@/services/booksService';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook principal para gerenciar books
 */
export function useBooks(filtros: BooksFiltros) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar lista de books
  const {
    data: books = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['books', filtros],
    queryFn: () => booksService.listarBooks(filtros),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Mutation para gerar books
  const gerarBooksMutation = useMutation({
    mutationFn: (config: BookGeracaoConfig) => booksService.gerarBooksLote(config),
    onSuccess: async (result: BooksGeracaoLoteResult) => {
      // Invalidar cache
      await queryClient.invalidateQueries({ queryKey: ['books'] });
      await queryClient.invalidateQueries({ queryKey: ['books-stats'] });
      
      // Forçar refetch imediato
      await refetch();
      
      toast({
        title: 'Books gerados com sucesso!',
        description: `${result.sucesso} de ${result.total} books gerados.`,
        variant: 'default'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao gerar books',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Mutation para atualizar books
  const atualizarBooksMutation = useMutation({
    mutationFn: (config: BookGeracaoConfig) => 
      booksService.gerarBooksLote({ ...config, forcar_atualizacao: true }),
    onSuccess: async (result: BooksGeracaoLoteResult) => {
      // Invalidar cache
      await queryClient.invalidateQueries({ queryKey: ['books'] });
      await queryClient.invalidateQueries({ queryKey: ['books-stats'] });
      
      // Forçar refetch imediato
      await refetch();
      
      toast({
        title: 'Books atualizados com sucesso!',
        description: `${result.sucesso} de ${result.total} books atualizados.`,
        variant: 'default'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar books',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Mutation para deletar book
  const deletarBookMutation = useMutation({
    mutationFn: (bookId: string) => booksService.deletarBook(bookId),
    onSuccess: async () => {
      // Invalidar cache
      await queryClient.invalidateQueries({ queryKey: ['books'] });
      await queryClient.invalidateQueries({ queryKey: ['books-stats'] });
      
      // Forçar refetch imediato
      await refetch();
      
      toast({
        title: 'Book deletado',
        description: 'Book removido com sucesso.',
        variant: 'default'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao deletar book',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return {
    books,
    isLoading,
    error,
    refetch,
    gerarBooks: gerarBooksMutation.mutate,
    atualizarBooks: atualizarBooksMutation.mutate,
    deletarBook: deletarBookMutation.mutate,
    isGerando: gerarBooksMutation.isPending,
    isAtualizando: atualizarBooksMutation.isPending,
    isDeletando: deletarBookMutation.isPending
  };
}

/**
 * Hook para buscar dados completos de um book específico
 */
export function useBookData(bookId: string | null) {
  const { toast } = useToast();

  const {
    data: bookData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['book-data', bookId],
    queryFn: () => bookId ? booksService.buscarBookPorId(bookId) : null,
    enabled: !!bookId,
    staleTime: 1000 * 60 * 10, // 10 minutos (dados congelados)
  });

  useEffect(() => {
    if (error) {
      toast({
        title: 'Erro ao carregar book',
        description: 'Não foi possível carregar os dados do book.',
        variant: 'destructive'
      });
    }
  }, [error, toast]);

  return {
    bookData,
    isLoading,
    error,
    refetch
  };
}

/**
 * Hook para gerenciar seleção de books
 */
export function useBooksSelection(books: BookListItem[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelection = (bookId: string) => {
    setSelectedIds(prev => 
      prev.includes(bookId)
        ? prev.filter(id => id !== bookId)
        : [...prev, bookId]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === books.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(books.map(b => b.id));
    }
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const isSelected = (bookId: string) => selectedIds.includes(bookId);
  const isAllSelected = books.length > 0 && selectedIds.length === books.length;
  const hasSelection = selectedIds.length > 0;

  const selectedBooks = books.filter(b => selectedIds.includes(b.id));
  const selectedEmpresaIds = selectedBooks.map(b => b.empresa_id);

  return {
    selectedIds,
    selectedBooks,
    selectedEmpresaIds,
    toggleSelection,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
    hasSelection,
    count: selectedIds.length
  };
}

/**
 * Hook para navegação de período (mês/ano)
 */
export function usePeriodoNavigation(initialMes?: number, initialAno?: number) {
  const now = new Date();
  const [mes, setMes] = useState(initialMes || now.getMonth() + 1);
  const [ano, setAno] = useState(initialAno || now.getFullYear());

  const proximoPeriodo = () => {
    if (mes === 12) {
      setMes(1);
      setAno(ano + 1);
    } else {
      setMes(mes + 1);
    }
  };

  const periodoAnterior = () => {
    if (mes === 1) {
      setMes(12);
      setAno(ano - 1);
    } else {
      setMes(mes - 1);
    }
  };

  const setPeriodo = (novoMes: number, novoAno: number) => {
    setMes(novoMes);
    setAno(novoAno);
  };

  const mesNome = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(
    new Date(ano, mes - 1)
  );

  const periodoLabel = `${mesNome.charAt(0).toUpperCase() + mesNome.slice(1)} ${ano}`;

  return {
    mes,
    ano,
    mesNome: mesNome.charAt(0).toUpperCase() + mesNome.slice(1),
    periodoLabel,
    proximoPeriodo,
    periodoAnterior,
    setPeriodo
  };
}
