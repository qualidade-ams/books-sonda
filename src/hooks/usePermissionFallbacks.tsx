import { ReactNode } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

/**
 * Hook that provides standardized fallback components for permission-related states
 */
export const usePermissionFallbacks = () => {
  /**
   * Loading fallback for when permissions are being loaded
   */
  const loadingFallback: ReactNode = (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600 dark:text-gray-400">Carregando permissões...</p>
      </div>
    </div>
  );

  /**
   * Small loading fallback for inline components
   */
  const inlineLoadingFallback: ReactNode = (
    <div className="inline-flex items-center justify-center p-2">
      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
    </div>
  );

  /**
   * Error fallback for when permissions fail to load
   */
  const errorFallback: ReactNode = (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
        <p className="text-gray-600 dark:text-gray-400">Erro ao carregar permissões</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );

  /**
   * Fallback for when user doesn't have permission (used in ProtectedAction)
   */
  const noPermissionFallback: ReactNode = null;

  return {
    loadingFallback,
    inlineLoadingFallback,
    errorFallback,
    noPermissionFallback
  };
};
