import { useState, useCallback, useMemo } from 'react';
import { 
  PaginationUtils, 
  createPaginationState,
  type PaginationParams, 
  type UsePaginationOptions,
  type EntityType 
} from '@/utils/paginationUtils';

/**
 * Hook personalizado para gerenciar estado de paginação
 */
export function usePagination(options: UsePaginationOptions) {
  const { initialParams, validateAndUpdate } = createPaginationState(options);
  
  const [params, setParams] = useState<PaginationParams>(initialParams);

  // Função para atualizar página
  const setPage = useCallback((page: number) => {
    setParams(current => validateAndUpdate({ ...current, page }));
  }, [validateAndUpdate]);

  // Função para atualizar tamanho da página
  const setPageSize = useCallback((pageSize: number) => {
    setParams(current => validateAndUpdate({ 
      ...current, 
      pageSize, 
      page: 1 // Reset para primeira página quando muda o tamanho
    }));
  }, [validateAndUpdate]);

  // Função para atualizar ordenação
  const setSorting = useCallback((sortBy: string, sortOrder: 'asc' | 'desc' = 'asc') => {
    setParams(current => validateAndUpdate({ 
      ...current, 
      sortBy, 
      sortOrder,
      page: 1 // Reset para primeira página quando muda ordenação
    }));
  }, [validateAndUpdate]);

  // Função para resetar paginação
  const reset = useCallback(() => {
    setParams(initialParams);
  }, [initialParams]);

  // Função para gerar chave de cache
  const generateCacheKey = useCallback((baseKey: string, filters?: Record<string, any>) => {
    return PaginationUtils.generateCacheKey(baseKey, params, filters);
  }, [params]);

  // Função para ir para próxima página
  const nextPage = useCallback(() => {
    setParams(current => validateAndUpdate({ 
      ...current, 
      page: current.page + 1 
    }));
  }, [validateAndUpdate]);

  // Função para ir para página anterior
  const previousPage = useCallback(() => {
    setParams(current => validateAndUpdate({ 
      ...current, 
      page: Math.max(1, current.page - 1) 
    }));
  }, [validateAndUpdate]);

  // Função para ir para primeira página
  const firstPage = useCallback(() => {
    setParams(current => validateAndUpdate({ ...current, page: 1 }));
  }, [validateAndUpdate]);

  // Função para ir para última página
  const lastPage = useCallback((totalPages: number) => {
    setParams(current => validateAndUpdate({ 
      ...current, 
      page: Math.max(1, totalPages) 
    }));
  }, [validateAndUpdate]);

  return {
    params,
    setPage,
    setPageSize,
    setSorting,
    reset,
    generateCacheKey,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    
    // Helpers computados
    offset: useMemo(() => PaginationUtils.calculateOffset(params.page, params.pageSize), [params]),
    
    // Função para validar se página existe
    validatePage: useCallback((total: number) => {
      return PaginationUtils.validatePageExists(params.page, total, params.pageSize);
    }, [params]),
    
    // Função para gerar resumo
    generateSummary: useCallback((total: number) => {
      return PaginationUtils.generatePaginationSummary(params.page, params.pageSize, total);
    }, [params]),
    
    // Função para gerar links de navegação
    generateNavigation: useCallback((totalPages: number, maxLinks: number = 5) => {
      return PaginationUtils.generateNavigationLinks(params.page, totalPages, maxLinks);
    }, [params])
  };
}

/**
 * Hook específico para empresas
 */
export function useEmpresasPagination(initialOptions?: Partial<UsePaginationOptions>) {
  return usePagination({
    entityType: 'empresas',
    ...initialOptions
  });
}

/**
 * Hook específico para colaboradores
 */
export function useColaboradoresPagination(initialOptions?: Partial<UsePaginationOptions>) {
  return usePagination({
    entityType: 'colaboradores',
    ...initialOptions
  });
}

/**
 * Hook específico para grupos
 */
export function useGruposPagination(initialOptions?: Partial<UsePaginationOptions>) {
  return usePagination({
    entityType: 'grupos',
    ...initialOptions
  });
}

/**
 * Hook específico para histórico
 */
export function useHistoricoPagination(initialOptions?: Partial<UsePaginationOptions>) {
  return usePagination({
    entityType: 'historico',
    ...initialOptions
  });
}

/**
 * Hook específico para controle mensal
 */
export function useControlePagination(initialOptions?: Partial<UsePaginationOptions>) {
  return usePagination({
    entityType: 'controle',
    ...initialOptions
  });
}

/**
 * Hook para gerenciar múltiplas paginações na mesma tela
 */
export function useMultiplePagination(entities: EntityType[]) {
  const paginations = useMemo(() => {
    const result: Record<EntityType, ReturnType<typeof usePagination>> = {} as any;
    
    entities.forEach(entity => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      result[entity] = usePagination({ entityType: entity });
    });
    
    return result;
  }, [entities]);

  return paginations;
}

/**
 * Hook para sincronizar paginação com URL (para uso futuro)
 */
export function usePaginationWithURL(
  options: UsePaginationOptions,
  urlParams?: URLSearchParams
) {
  const pagination = usePagination(options);
  
  // TODO: Implementar sincronização com URL quando necessário
  // Isso permitiria que os usuários compartilhassem links com paginação específica
  
  return pagination;
}