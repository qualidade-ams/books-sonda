/**
 * Utilitários de performance para o sistema de requerimentos
 * Implementa otimizações de cache, debounce e lazy loading
 */

import React, { useMemo, useCallback, useRef } from 'react';

/**
 * Implementação nativa de debounce
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Hook para debounce de busca
 */
export function useDebounceSearch(callback: (value: string) => void, delay: number = 300) {
  const debouncedCallback = useRef(
    debounce((value: string) => {
      callback(value);
    }, delay)
  ).current;

  return useCallback((value: string) => {
    debouncedCallback(value);
  }, [debouncedCallback]);
}

/**
 * Hook para memoização de filtros complexos
 */
export function useMemoizedFilter<T>(
  items: T[],
  filterFn: (item: T) => boolean,
  dependencies: any[]
) {
  return useMemo(() => {
    if (!items || items.length === 0) return [];
    return items.filter(filterFn);
  }, [items, ...dependencies]);
}

/**
 * Hook para estatísticas memoizadas
 */
export function useMemoizedStats<T>(
  items: T[],
  statsFn: (items: T[]) => any,
  dependencies: any[]
) {
  return useMemo(() => {
    if (!items || items.length === 0) return null;
    return statsFn(items);
  }, [items, ...dependencies]);
}

/**
 * Utilitário para lazy loading de componentes
 */
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallbackComponent?: React.ComponentType
) {
  const LazyComponent = React.lazy(importFn);
  
  return (props: React.ComponentProps<T>) => {
    const loadingElement = fallbackComponent ? React.createElement(fallbackComponent) : React.createElement('div', {}, 'Carregando...');
    
    return React.createElement(
      React.Suspense,
      { fallback: loadingElement },
      React.createElement(LazyComponent, props)
    );
  };
}

/**
 * Hook para otimização de re-renders
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback((...args: any[]) => {
    return callbackRef.current(...args);
  }, []) as T;
}

/**
 * Utilitário para formatação de números com cache
 */
const formatCache = new Map<string, string>();

export function formatNumberCached(
  value: number,
  options: Intl.NumberFormatOptions = {}
): string {
  const key = `${value}-${JSON.stringify(options)}`;
  
  if (formatCache.has(key)) {
    return formatCache.get(key)!;
  }

  const formatted = new Intl.NumberFormat('pt-BR', options).format(value);
  formatCache.set(key, formatted);
  
  // Limpar cache se ficar muito grande
  if (formatCache.size > 1000) {
    const entries = Array.from(formatCache.entries());
    formatCache.clear();
    // Manter apenas os últimos 500
    entries.slice(-500).forEach(([k, v]) => formatCache.set(k, v));
  }
  
  return formatted;
}

/**
 * Hook para paginação virtual
 */
export function useVirtualPagination<T>(
  items: T[],
  itemsPerPage: number = 20,
  currentPage: number = 1
) {
  return useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    return {
      items: items.slice(startIndex, endIndex),
      totalPages: Math.ceil(items.length / itemsPerPage),
      totalItems: items.length,
      hasNextPage: endIndex < items.length,
      hasPrevPage: currentPage > 1,
      startIndex: startIndex + 1,
      endIndex: Math.min(endIndex, items.length)
    };
  }, [items, itemsPerPage, currentPage]);
}

/**
 * Hook para intersection observer (lazy loading de imagens/componentes)
 */
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        ...options
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, options]);

  return isIntersecting;
}

/**
 * Utilitário para otimização de queries
 */
export const QUERY_OPTIMIZATIONS = {
  // Configurações de stale time otimizadas por tipo de dados
  STATIC_DATA: 1000 * 60 * 30, // 30 minutos para dados estáticos
  DYNAMIC_DATA: 1000 * 60 * 5,  // 5 minutos para dados dinâmicos
  REAL_TIME_DATA: 1000 * 30,    // 30 segundos para dados em tempo real
  
  // Configurações de cache time
  CACHE_TIME: 1000 * 60 * 10,   // 10 minutos
  
  // Configurações de retry
  RETRY_DELAY: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  MAX_RETRIES: 3
};

/**
 * Hook para otimização de scroll
 */
export function useOptimizedScroll(threshold: number = 100) {
  const [isScrolled, setIsScrolled] = React.useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  React.useEffect(() => {
    const handleScroll = () => {
      // Debounce scroll events
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolled(window.scrollY > threshold);
      }, 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [threshold]);

  return isScrolled;
}