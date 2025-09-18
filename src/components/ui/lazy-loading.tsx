import React, { Suspense, lazy, ComponentType, memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

/**
 * Componente de fallback para carregamento
 */
export const LoadingFallback = memo<{
  rows?: number;
  height?: string;
  className?: string;
}>(({ rows = 5, height = "h-4", className }) => (
  <div className={className}>
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={`w-full ${height}`} />
      ))}
    </div>
  </div>
));

LoadingFallback.displayName = 'LoadingFallback';

/**
 * Componente de fallback para tabelas
 */
export const TableLoadingFallback = memo<{
  columns?: number;
  rows?: number;
}>(({ columns = 4, rows = 5 }) => (
  <div className="space-y-3">
    {/* Header */}
    <div className="flex gap-4">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={`header-${i}`} className="h-4 flex-1" />
      ))}
    </div>

    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={`row-${rowIndex}`} className="flex gap-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-8 flex-1" />
        ))}
      </div>
    ))}
  </div>
));

TableLoadingFallback.displayName = 'TableLoadingFallback';

/**
 * Componente de fallback para formulários
 */
export const FormLoadingFallback = memo<{
  fields?: number;
}>(({ fields = 6 }) => (
  <div className="space-y-6">
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    ))}
    <div className="flex gap-2 pt-4">
      <Skeleton className="h-10 w-20" />
      <Skeleton className="h-10 w-20" />
    </div>
  </div>
));

FormLoadingFallback.displayName = 'FormLoadingFallback';

/**
 * Componente de fallback para cards
 */
export const CardLoadingFallback = memo<{
  count?: number;
}>(({ count = 3 }) => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-lg border p-6 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-8 w-1/2" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    ))}
  </div>
));

CardLoadingFallback.displayName = 'CardLoadingFallback';

/**
 * Componente de erro para lazy loading
 */
interface LazyErrorFallbackProps {
  error?: Error;
  retry?: () => void;
  message?: string;
}

export const LazyErrorFallback = memo<LazyErrorFallbackProps>(({
  error,
  retry,
  message = "Erro ao carregar componente"
}) => (
  <Alert variant="destructive">
    <AlertDescription className="flex items-center justify-between">
      <span>{message}</span>
      {retry && (
        <Button
          variant="outline"
          size="sm"
          onClick={retry}
          className="ml-2"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
      )}
    </AlertDescription>
    {error && process.env.NODE_ENV === 'development' && (
      <details className="mt-2 text-xs">
        <summary>Detalhes do erro (desenvolvimento)</summary>
        <pre className="mt-1 whitespace-pre-wrap">{error.message}</pre>
      </details>
    )}
  </Alert>
));

LazyErrorFallback.displayName = 'LazyErrorFallback';

/**
 * HOC para criar componentes lazy com fallbacks customizados
 */
export function withLazyLoading<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback?: React.ComponentType,
  errorFallback?: React.ComponentType<LazyErrorFallbackProps>
) {
  const LazyComponent = lazy(importFn);
  const FallbackComponent = fallback || LoadingFallback;
  const ErrorComponent = errorFallback || LazyErrorFallback;

  return memo<P>((props) => (
    <Suspense fallback={<FallbackComponent />}>
      <LazyComponent {...(props as any)} />
    </Suspense>
  ));
}

/**
 * Componente wrapper para lazy loading com error boundary
 */
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ComponentType;
  errorFallback?: React.ComponentType<LazyErrorFallbackProps>;
  onError?: (error: Error) => void;
}

class LazyErrorBoundary extends React.Component<
  LazyWrapperProps,
  { hasError: boolean; error?: Error }
> {
  constructor(props: LazyWrapperProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy loading error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      const ErrorComponent = this.props.errorFallback || LazyErrorFallback;
      return (
        <ErrorComponent
          error={this.state.error}
          retry={() => this.setState({ hasError: false, error: undefined })}
        />
      );
    }

    return this.props.children;
  }
}

export const LazyWrapper = memo<LazyWrapperProps>(({
  children,
  fallback = LoadingFallback,
  errorFallback,
  onError
}) => {
  const FallbackComponent = fallback;

  return (
    <LazyErrorBoundary errorFallback={errorFallback} onError={onError}>
      <Suspense fallback={<FallbackComponent />}>
        {children}
      </Suspense>
    </LazyErrorBoundary>
  );
});

LazyWrapper.displayName = 'LazyWrapper';

/**
 * Hook para lazy loading condicional
 */
export function useConditionalLazyLoading<T>(
  condition: boolean,
  importFn: () => Promise<T>,
  deps: React.DependencyList = []
) {
  const [component, setComponent] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!condition) {
      setComponent(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    importFn()
      .then(setComponent)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [condition, ...deps]);

  return { component, loading, error };
}

/**
 * Componentes lazy pré-configurados para o sistema de books
 */

// Lazy loading para tabelas grandes
export const LazyEmpresasTable = withLazyLoading(
  () => import('@/components/admin/client-books/EmpresasTable'),
  () => <TableLoadingFallback columns={6} rows={10} />
);

export const LazyGruposTable = withLazyLoading(
  () => import('@/components/admin/client-books/GruposTable'),
  () => <TableLoadingFallback columns={4} rows={6} />
);

// Lazy loading para formulários complexos
export const LazyEmpresaForm = withLazyLoading(
  () => import('@/components/admin/client-books/EmpresaForm'),
  () => <FormLoadingFallback fields={8} />
);

// Lazy loading para componentes de importação
// Temporariamente removido - componente não tem export default
// export const LazyExcelImport = withLazyLoading(
//   () => import('@/components/admin/excel/ExcelImportDialog'),
//   () => <LoadingFallback rows={3} />
// );

/**
 * Utilitário para pré-carregar componentes
 */
export class LazyPreloader {
  private static preloadedComponents = new Set<string>();

  static async preload(
    componentName: string,
    importFn: () => Promise<any>
  ): Promise<void> {
    if (this.preloadedComponents.has(componentName)) {
      return;
    }

    try {
      await importFn();
      this.preloadedComponents.add(componentName);
      console.debug(`✅ Componente pré-carregado: ${componentName}`);
    } catch (error) {
      console.error(`❌ Erro ao pré-carregar componente ${componentName}:`, error);
    }
  }

  static preloadClientBooksComponents(): void {
    // Pré-carregar componentes críticos do sistema de books
    const components = [
      {
        name: 'EmpresasTable',
        import: () => import('@/components/admin/client-books/EmpresasTable')
      },
      // Temporariamente removido devido a erros de compilação
      // {
      //   name: 'ClientesTable',
      //   import: () => import('@/components/admin/client-books/ClientesTable')
      // },
      {
        name: 'EmpresaForm',
        import: () => import('@/components/admin/client-books/EmpresaForm')
      }
    ];

    components.forEach(({ name, import: importFn }) => {
      // Pré-carregar após um pequeno delay para não bloquear a renderização inicial
      setTimeout(() => this.preload(name, importFn), 1000);
    });
  }

  static isPreloaded(componentName: string): boolean {
    return this.preloadedComponents.has(componentName);
  }

  static clearPreloaded(): void {
    this.preloadedComponents.clear();
  }
}