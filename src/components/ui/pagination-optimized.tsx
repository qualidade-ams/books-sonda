import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { PaginationUtils, PAGE_SIZES } from '@/utils/paginationUtils';
import { cn } from '@/lib/utils';

interface PaginationOptimizedProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  className?: string;
  showPageSizeSelector?: boolean;
  showSummary?: boolean;
  maxVisiblePages?: number;
  disabled?: boolean;
}

/**
 * Componente de paginação otimizado com performance melhorada
 */
export const PaginationOptimized = memo<PaginationOptimizedProps>(({
  currentPage,
  totalPages,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  className,
  showPageSizeSelector = true,
  showSummary = true,
  maxVisiblePages = 5,
  disabled = false
}) => {
  // Gerar links de navegação otimizados
  const navigation = PaginationUtils.generateNavigationLinks(
    currentPage,
    totalPages,
    maxVisiblePages
  );

  // Gerar resumo de paginação
  const summary = PaginationUtils.generatePaginationSummary(
    currentPage,
    pageSize,
    total
  );

  // Se não há dados, não mostrar paginação
  if (total === 0) {
    return null;
  }

  // Se há apenas uma página e não mostra seletor de tamanho, não mostrar
  if (totalPages <= 1 && !showPageSizeSelector) {
    return showSummary ? (
      <div className="text-sm text-muted-foreground">
        {summary}
      </div>
    ) : null;
  }

  return (
    <div className={cn(
      "flex items-center justify-between gap-4 px-2 py-4",
      className
    )}>
      {/* Resumo */}
      {showSummary && (
        <div className="text-sm text-muted-foreground">
          {summary}
        </div>
      )}

      {/* Controles de paginação */}
      <div className="flex items-center gap-2">
        {/* Seletor de tamanho de página */}
        {showPageSizeSelector && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Itens por página:
            </span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(Number(value))}
              disabled={disabled}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(PAGE_SIZES).map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Navegação */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            {/* Primeira página */}
            {navigation.showFirst && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(1)}
                disabled={disabled || currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronsLeft className="h-4 w-4" />
                <span className="sr-only">Primeira página</span>
              </Button>
            )}

            {/* Página anterior */}
            {navigation.showPrevious && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={disabled || currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Página anterior</span>
              </Button>
            )}

            {/* Páginas numeradas */}
            {navigation.pages.map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(page)}
                disabled={disabled}
                className="h-8 w-8 p-0"
              >
                {page}
              </Button>
            ))}

            {/* Próxima página */}
            {navigation.showNext && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={disabled || currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Próxima página</span>
              </Button>
            )}

            {/* Última página */}
            {navigation.showLast && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(totalPages)}
                disabled={disabled || currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronsRight className="h-4 w-4" />
                <span className="sr-only">Última página</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

PaginationOptimized.displayName = 'PaginationOptimized';

/**
 * Componente simplificado para casos onde só precisa de navegação básica
 */
export const SimplePagination = memo<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}>(({ currentPage, totalPages, onPageChange, disabled = false, className }) => {
  if (totalPages <= 1) return null;

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={disabled || currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
        Anterior
      </Button>
      
      <span className="text-sm text-muted-foreground px-4">
        Página {currentPage} de {totalPages}
      </span>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={disabled || currentPage === totalPages}
      >
        Próxima
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
});

SimplePagination.displayName = 'SimplePagination';

/**
 * Hook para usar com o componente de paginação
 */
export function usePaginationComponent(
  currentPage: number,
  pageSize: number,
  total: number
) {
  const totalPages = Math.ceil(total / pageSize);
  
  const stats = PaginationUtils.calculatePaginationStats(
    currentPage,
    pageSize,
    total
  );

  const navigation = PaginationUtils.generateNavigationLinks(
    currentPage,
    totalPages
  );

  return {
    totalPages,
    stats,
    navigation,
    summary: PaginationUtils.generatePaginationSummary(currentPage, pageSize, total)
  };
}