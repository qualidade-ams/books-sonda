import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Componente de loading spinner
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export function LoadingSpinner({ 
  size = 'md', 
  text, 
  className 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
        sizeClasses[size]
      )} />
      {text && (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {text}
        </span>
      )}
    </div>
  );
}

// Skeleton para cards de estatísticas
export function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-20" />
      </CardHeader>
      <CardContent className="pt-0">
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  );
}

// Skeleton para cards de requerimentos
export function RequerimentoCardSkeleton() {
  return (
    <div className="py-2 px-3 border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-center text-sm">
        {/* Checkbox - 4% */}
        <div className="w-[4%] text-center pr-1">
          <Skeleton className="h-4 w-4 mx-auto rounded" />
        </div>
        
        {/* Chamado - 11% */}
        <div className="w-[11%] pr-1">
          <Skeleton className="h-4 w-20 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
        
        {/* Cliente - 9% */}
        <div className="w-[9%] pr-1">
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>
        
        {/* Módulo - 6% */}
        <div className="w-[6%] text-center pr-1">
          <Skeleton className="h-3 w-10 mx-auto" />
        </div>
        
        {/* Linguagem - 6% */}
        <div className="w-[6%] text-center pr-1">
          <Skeleton className="h-3 w-10 mx-auto" />
        </div>
        
        {/* Horas Func. - 5% */}
        <div className="w-[5%] text-center pr-1">
          <Skeleton className="h-3 w-8 mx-auto" />
        </div>
        
        {/* Horas Téc. - 5% */}
        <div className="w-[5%] text-center pr-1">
          <Skeleton className="h-3 w-8 mx-auto" />
        </div>
        
        {/* Total - 5% */}
        <div className="w-[5%] text-center pr-1">
          <Skeleton className="h-3 w-8 mx-auto" />
        </div>
        
        {/* Data Envio - 7% */}
        <div className="w-[7%] text-center pr-1">
          <Skeleton className="h-3 w-14 mx-auto" />
        </div>
        
        {/* Data Aprovação - 7% */}
        <div className="w-[7%] text-center pr-1">
          <Skeleton className="h-3 w-14 mx-auto" />
        </div>
        
        {/* Valor Total - 8% */}
        <div className="w-[8%] text-center pr-1">
          <Skeleton className="h-3 w-16 mx-auto" />
        </div>
        
        {/* Mês/Ano - 7% */}
        <div className="w-[7%] text-center pr-1">
          <Skeleton className="h-3 w-12 mx-auto" />
        </div>
        
        {/* Autor - 10% */}
        <div className="w-[10%] text-center pr-1">
          <Skeleton className="h-3 w-12 mx-auto" />
        </div>
        
        {/* Ações - 8% */}
        <div className="w-[8%] flex justify-center gap-1">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-6 rounded" />
        </div>
      </div>
    </div>
  );
}

// Skeleton para página completa
export function PageLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>
      
      {/* Content */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <RequerimentoCardSkeleton key={i} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// Skeleton para filtros
export function FiltersSkeleton() {
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-8 flex-1" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}