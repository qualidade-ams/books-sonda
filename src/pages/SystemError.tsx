import React from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface SystemErrorProps {
  /**
   * Error title
   */
  title?: string;
  
  /**
   * Error message
   */
  message?: string;
  
  /**
   * Error code for reference
   */
  errorCode?: string;
  
  /**
   * Whether to show retry button
   */
  showRetry?: boolean;
  
  /**
   * Custom retry action
   */
  onRetry?: () => void;
  
  /**
   * Whether to show back button
   */
  showBack?: boolean;
  
  /**
   * Whether to show home button
   */
  showHome?: boolean;
}

/**
 * Generic system error page component
 * Used for displaying various system-level errors with appropriate actions
 */
const SystemError: React.FC<SystemErrorProps> = ({
  title = 'Erro do Sistema',
  message = 'Ocorreu um erro interno do sistema. Nossa equipe foi notificada e está trabalhando para resolver o problema.',
  errorCode,
  showRetry = true,
  onRetry,
  showBack = true,
  showHome = true
}) => {
  const navigate = useNavigate();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full mx-auto text-center px-6">
        <div className="mb-8">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {message}
          </p>
          
          {errorCode && (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Código do erro: <code className="font-mono text-red-600 dark:text-red-400">{errorCode}</code>
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {showRetry && (
            <Button
              onClick={handleRetry}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          )}
          
          {showBack && (
            <Button
              onClick={handleBack}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          )}
          
          {showHome && (
            <Button
              asChild
              variant="ghost"
              className="w-full"
            >
              <Link to="/">
                <Home className="h-4 w-4 mr-2" />
                Ir para Página Inicial
              </Link>
            </Button>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Se o problema persistir, entre em contato com o suporte técnico.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SystemError;