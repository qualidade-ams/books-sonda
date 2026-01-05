import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Filter, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  children?: React.ReactNode;
  showFilters: boolean;
  onToggleFilters: () => void;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  className?: string;
}

export function FilterBar({
  children,
  showFilters,
  onToggleFilters,
  onClearFilters,
  hasActiveFilters = false,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  className
}: FilterBarProps) {
  return (
    <div className={cn("bg-white p-4 rounded-lg shadow-sm border border-gray-200", className)}>
      {/* Barra superior com busca e controles */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
        {/* Campo de busca */}
        {onSearchChange && (
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={searchPlaceholder}
                value={searchValue || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
              />
            </div>
          </div>
        )}

        {/* Controles de filtro */}
        <div className="flex items-center space-x-2">
          {hasActiveFilters && onClearFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-gray-600 hover:text-gray-800"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleFilters}
            className={cn(
              "flex items-center space-x-2 border-sonda-blue text-sonda-blue hover:bg-sonda-light-blue/10",
              showFilters && "bg-sonda-light-blue/10"
            )}
          >
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
          </Button>
        </div>
      </div>

      {/* Área de filtros expansível */}
      {showFilters && children && (
        <div className="pt-4 border-t border-gray-200 mt-4">
          {children}
        </div>
      )}
    </div>
  );
}

interface FilterGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function FilterGrid({ children, columns = 4, className }: FilterGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={cn(`grid ${gridCols[columns]} gap-4`, className)}>
      {children}
    </div>
  );
}

interface FilterFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function FilterField({ label, children, className }: FilterFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}