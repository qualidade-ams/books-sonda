/**
 * Utilitários para paginação otimizada
 */

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface PaginationConfig {
  defaultPageSize: number;
  maxPageSize: number;
  allowedSortFields: string[];
}

/**
 * Configurações padrão de paginação para diferentes entidades
 */
export const PAGINATION_CONFIGS: Record<string, PaginationConfig> = {
  empresas: {
    defaultPageSize: 20,
    maxPageSize: 100,
    allowedSortFields: ['nome_completo', 'nome_abreviado', 'status', 'created_at', 'updated_at']
  },
  clientes: {
    defaultPageSize: 25,
    maxPageSize: 100,
    allowedSortFields: ['nome_completo', 'email', 'funcao', 'status', 'created_at', 'updated_at']
  },
  grupos: {
    defaultPageSize: 15,
    maxPageSize: 50,
    allowedSortFields: ['nome', 'created_at', 'updated_at']
  },
  historico: {
    defaultPageSize: 50,
    maxPageSize: 200,
    allowedSortFields: ['data_disparo', 'status', 'created_at']
  },
  controle: {
    defaultPageSize: 30,
    maxPageSize: 100,
    allowedSortFields: ['mes', 'ano', 'status', 'data_processamento']
  }
};

/**
 * Classe utilitária para paginação
 */
export class PaginationUtils {
  /**
   * Valida e normaliza parâmetros de paginação
   */
  static validatePaginationParams(
    params: Partial<PaginationParams>,
    entityType: string
  ): PaginationParams {
    const config = PAGINATION_CONFIGS[entityType];
    if (!config) {
      throw new Error(`Configuração de paginação não encontrada para: ${entityType}`);
    }

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(
      config.maxPageSize,
      Math.max(1, params.pageSize || config.defaultPageSize)
    );

    let sortBy = params.sortBy;
    if (sortBy && !config.allowedSortFields.includes(sortBy)) {
      console.warn(`Campo de ordenação inválido: ${sortBy}. Usando padrão.`);
      sortBy = config.allowedSortFields[0];
    }

    const sortOrder = params.sortOrder === 'desc' ? 'desc' : 'asc';

    return {
      page,
      pageSize,
      sortBy,
      sortOrder
    };
  }

  /**
   * Calcula offset para consultas SQL
   */
  static calculateOffset(page: number, pageSize: number): number {
    return (page - 1) * pageSize;
  }

  /**
   * Cria resultado paginado
   */
  static createPaginationResult<T>(
    data: T[],
    total: number,
    params: PaginationParams
  ): PaginationResult<T> {
    const totalPages = Math.ceil(total / params.pageSize);
    const hasNext = params.page < totalPages;
    const hasPrevious = params.page > 1;

    return {
      data,
      pagination: {
        page: params.page,
        pageSize: params.pageSize,
        total,
        totalPages,
        hasNext,
        hasPrevious
      }
    };
  }

  /**
   * Gera chave de cache para consulta paginada
   */
  static generateCacheKey(
    baseKey: string,
    params: PaginationParams,
    filters?: Record<string, any>
  ): string {
    const filterStr = filters ? JSON.stringify(filters) : '';
    const sortStr = params.sortBy ? `${params.sortBy}_${params.sortOrder}` : '';
    
    return `${baseKey}:page_${params.page}:size_${params.pageSize}:sort_${sortStr}:filters_${btoa(filterStr)}`;
  }

  /**
   * Calcula estatísticas de paginação
   */
  static calculatePaginationStats(
    currentPage: number,
    pageSize: number,
    total: number
  ): {
    startItem: number;
    endItem: number;
    totalItems: number;
    currentPageItems: number;
  } {
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, total);
    const currentPageItems = endItem - startItem + 1;

    return {
      startItem,
      endItem,
      totalItems: total,
      currentPageItems
    };
  }

  /**
   * Gera links de navegação para paginação
   */
  static generateNavigationLinks(
    currentPage: number,
    totalPages: number,
    maxLinks: number = 5
  ): {
    pages: number[];
    showFirst: boolean;
    showLast: boolean;
    showPrevious: boolean;
    showNext: boolean;
  } {
    const halfLinks = Math.floor(maxLinks / 2);
    let startPage = Math.max(1, currentPage - halfLinks);
    let endPage = Math.min(totalPages, currentPage + halfLinks);

    // Ajustar para sempre mostrar o número máximo de links quando possível
    if (endPage - startPage + 1 < maxLinks) {
      if (startPage === 1) {
        endPage = Math.min(totalPages, startPage + maxLinks - 1);
      } else if (endPage === totalPages) {
        startPage = Math.max(1, endPage - maxLinks + 1);
      }
    }

    const pages = Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => startPage + i
    );

    return {
      pages,
      showFirst: startPage > 1,
      showLast: endPage < totalPages,
      showPrevious: currentPage > 1,
      showNext: currentPage < totalPages
    };
  }

  /**
   * Otimiza consulta para paginação com índices
   */
  static optimizeQuery(
    baseQuery: any,
    params: PaginationParams,
    entityType: string
  ): any {
    const config = PAGINATION_CONFIGS[entityType];
    
    // Aplicar ordenação se especificada e válida
    if (params.sortBy && config.allowedSortFields.includes(params.sortBy)) {
      baseQuery = baseQuery.order(params.sortBy, { ascending: params.sortOrder === 'asc' });
    } else {
      // Ordenação padrão por created_at desc para melhor performance com índices
      baseQuery = baseQuery.order('created_at', { ascending: false });
    }

    // Aplicar paginação
    const offset = PaginationUtils.calculateOffset(params.page, params.pageSize);
    baseQuery = baseQuery.range(offset, offset + params.pageSize - 1);

    return baseQuery;
  }

  /**
   * Valida se a página solicitada existe
   */
  static validatePageExists(page: number, total: number, pageSize: number): boolean {
    const totalPages = Math.ceil(total / pageSize);
    return page >= 1 && page <= Math.max(1, totalPages);
  }

  /**
   * Calcula página baseada em um item específico
   */
  static calculatePageForItem(itemIndex: number, pageSize: number): number {
    return Math.floor(itemIndex / pageSize) + 1;
  }

  /**
   * Gera resumo de paginação para exibição
   */
  static generatePaginationSummary(
    page: number,
    pageSize: number,
    total: number
  ): string {
    if (total === 0) {
      return 'Nenhum item encontrado';
    }

    const stats = PaginationUtils.calculatePaginationStats(page, pageSize, total);
    
    if (total === 1) {
      return '1 item';
    }

    if (stats.totalItems <= pageSize) {
      return `${stats.totalItems} itens`;
    }

    return `${stats.startItem}-${stats.endItem} de ${stats.totalItems} itens`;
  }
}

/**
 * Hook personalizado para gerenciar estado de paginação
 */
export interface UsePaginationOptions {
  entityType: string;
  initialPage?: number;
  initialPageSize?: number;
  initialSortBy?: string;
  initialSortOrder?: 'asc' | 'desc';
}

export interface UsePaginationReturn {
  params: PaginationParams;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSorting: (sortBy: string, sortOrder?: 'asc' | 'desc') => void;
  reset: () => void;
  generateCacheKey: (baseKey: string, filters?: Record<string, any>) => string;
}

/**
 * Função para criar estado de paginação (para uso em hooks personalizados)
 */
export function createPaginationState(options: UsePaginationOptions): {
  initialParams: PaginationParams;
  validateAndUpdate: (updates: Partial<PaginationParams>) => PaginationParams;
} {
  const config = PAGINATION_CONFIGS[options.entityType];
  if (!config) {
    throw new Error(`Configuração de paginação não encontrada para: ${options.entityType}`);
  }

  const initialParams: PaginationParams = {
    page: options.initialPage || 1,
    pageSize: options.initialPageSize || config.defaultPageSize,
    sortBy: options.initialSortBy || config.allowedSortFields[0],
    sortOrder: options.initialSortOrder || 'asc'
  };

  const validateAndUpdate = (updates: Partial<PaginationParams>): PaginationParams => {
    return PaginationUtils.validatePaginationParams(
      { ...initialParams, ...updates },
      options.entityType
    );
  };

  return {
    initialParams,
    validateAndUpdate
  };
}

/**
 * Constantes para tamanhos de página comuns
 */
export const PAGE_SIZES = {
  SMALL: 10,
  MEDIUM: 25,
  LARGE: 50,
  EXTRA_LARGE: 100
} as const;

/**
 * Tipos para facilitar o uso
 */
export type PageSize = typeof PAGE_SIZES[keyof typeof PAGE_SIZES];
export type SortOrder = 'asc' | 'desc';
export type EntityType = keyof typeof PAGINATION_CONFIGS;