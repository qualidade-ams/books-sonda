import { useQuery } from '@tanstack/react-query';
import { buscarRequerimentosEmDesenvolvimentoParaBook } from '@/services/requerimentosBookService';
import type { RequerimentoEmDesenvolvimentoData } from '@/types/books';

/**
 * Requerimentos da aba "Requerimentos em Andamento" do book.
 * Usa o snapshot do book quando ele tem requerimentos; vazio ou ausente busca em tempo real.
 */
export function useRequerimentosEmDesenvolvimentoBook({
  empresaId,
  mes,
  ano,
  snapshot,
}: {
  empresaId?: string;
  mes?: number;
  ano?: number;
  snapshot?: RequerimentoEmDesenvolvimentoData[] | null;
}) {
  const temSnapshot = Array.isArray(snapshot) && snapshot.length > 0;

  const { data, isLoading, error } = useQuery({
    queryKey: ['books', 'requerimentos-em-desenvolvimento', empresaId, mes, ano],
    queryFn: () => buscarRequerimentosEmDesenvolvimentoParaBook(empresaId!, mes!, ano!),
    staleTime: 5 * 60 * 1000,
    enabled: !temSnapshot && !!empresaId && !!mes && !!ano,
  });

  return {
    requerimentosEmDesenvolvimento: temSnapshot ? snapshot : (data ?? []),
    isLoading: !temSnapshot && isLoading,
    error,
  };
}
