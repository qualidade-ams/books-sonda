import { useQuery } from '@tanstack/react-query';
import { buscarRequerimentosFaturadosParaBook } from '@/services/requerimentosBookService';
import type { RequerimentoEmDesenvolvimentoData } from '@/types/books';

/**
 * Requerimentos da aba "Requerimentos Faturados" do book.
 * Usa o snapshot do book; books gerados antes da aba existir não têm snapshot
 * (undefined) e buscam em tempo real.
 */
export function useRequerimentosFaturadosBook({
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
  const temSnapshot = Array.isArray(snapshot);

  const { data, isLoading, error } = useQuery({
    queryKey: ['books', 'requerimentos-faturados', empresaId, mes, ano],
    queryFn: () => buscarRequerimentosFaturadosParaBook(empresaId!, mes!, ano!),
    staleTime: 5 * 60 * 1000,
    enabled: !temSnapshot && !!empresaId && !!mes && !!ano,
  });

  return {
    requerimentosFaturados: temSnapshot ? snapshot : (data ?? []),
    isLoading: !temSnapshot && isLoading,
    error,
  };
}
