import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { auditoriaService } from '@/services/auditoriaService';
import type { FiltrosAuditoria } from '@/types/auditoria';

/** Tela Auditoria: páginas de 100, cada uma a partir do último registro da anterior */
export function useAuditoria(filtros: FiltrosAuditoria) {
  const query = useInfiniteQuery({
    queryKey: ['auditoria-bh', filtros],
    queryFn: ({ pageParam }) =>
      auditoriaService.buscar(pageParam ? { ...filtros, antesDe: pageParam } : filtros),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (pagina) =>
      pagina.temMais ? pagina.registros[pagina.registros.length - 1]?.em : undefined,
    staleTime: 60 * 1000,
  });

  const registros = useMemo(
    () => query.data?.pages.flatMap((p) => p.registros) ?? [],
    [query.data]
  );

  return {
    registros,
    temMais: !!query.hasNextPage,
    carregarMais: () => query.fetchNextPage(),
    recarregar: () => query.refetch(),
    isCarregandoMais: query.isFetchingNextPage,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
