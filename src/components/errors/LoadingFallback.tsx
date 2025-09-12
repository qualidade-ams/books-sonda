import React from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LoadingFallbackProps {
  /**
   * Type of loading state
   */
  type?: 'permissions' | 'data' | 'page' | 'component';
  
  /**
   * Custom loading message
   */
  message?: string;
  
  /**
   * Whether to show retry button
   */
  showRetry?: boolean;
  
  /**
   * Retry callback function
   */
  onRetry?: () => void;
  
  /**
   * Whether loading failed
   */
  error?: boolean;
  
  /**
   * Error message to display
   */
  errorMessage?: string;
  
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Whether to show as full screen
   */
  fullScreen?: boolean;
}

/**
* Componente de fallback de carregamento reutilizável com estados de erro e funcionalidade de nova tentativa
*/
const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  type = 'data',
  message,
  showRetry = false,
  onRetry,
  error = false,
  errorMessage,
  size = 'md',
  fullScreen = false
}) => {
  const getDefaultMessage = () => {
    switch (type) {
      case 'permissions':
        return 'Carregando permissões...';
      case 'data':
        return 'Carregando dados...';
      case 'page':
        return 'Carregando página...';
      case 'component':
        return 'Carregando...';
      default:
        return 'Carregando...';
    }
  };

  const getDefaultErrorMessage = () => {
    switch (type) {
      case 'permissions':
        return 'Falha ao carregar permissões. Verifique sua conexão e tente novamente.';
      case 'data':
        return 'Falha ao carregar dados. Verifique sua conexão e tente novamente.';
      case 'page':
        return 'Falha ao carregar página. Verifique sua conexão e tente novamente.';
      case 'component':
        return 'Falha ao carregar componente. Tente novamente.';
      default:
        return 'Falha ao carregar. Tente novamente.';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'p-4',
          icon: 'h-4 w-4',
          title: 'text-sm',
          message: 'text-xs'
        };
      case 'lg':
        return {
          container: 'p-8',
          icon: 'h-12 w-12',
          title: 'text-xl',
          message: 'text-base'
        };
      default: // md
        return {
          container: 'p-6',
          icon: 'h-8 w-8',
          title: 'text-lg',
          message: 'text-sm'
        };
    }
  };

  const sizeClasses = getSizeClasses();
  const displayMessage = message || (error ? getDefaultErrorMessage() : getDefaultMessage());
  const displayErrorMessage = errorMessage || getDefaultErrorMessage();

  const containerClasses = fullScreen
    ? `min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 ${sizeClasses.container}`
    : `flex flex-col items-center justify-center ${sizeClasses.container}`;

  if (error) {
    return (
      <div className={containerClasses}>
        <div className="text-center max-w-md">
          <AlertCircle className={`${sizeClasses.icon} text-red-500 mx-auto mb-4`} />
          <h3 className={`font-semibold text-gray-900 dark:text-gray-100 mb-2 ${sizeClasses.title}`}>
            Erro ao Carregar
          </h3>
          <p className={`text-gray-600 dark:text-gray-400 mb-4 ${sizeClasses.message}`}>
            {displayErrorMessage}
          </p>
          {(showRetry || onRetry) && (
            <Button
              onClick={onRetry}
              variant="outline"
              size={size === 'sm' ? 'sm' : 'default'}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <div className="text-center">
        <Loader2 className={`${sizeClasses.icon} animate-spin mx-auto mb-4 text-blue-500`} />
        <p className={`text-gray-600 dark:text-gray-400 ${sizeClasses.message}`}>
          {displayMessage}
        </p>
      </div>
    </div>
  );
};

export default LoadingFallback;