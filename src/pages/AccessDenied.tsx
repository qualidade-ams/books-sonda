import { AlertTriangle, ArrowLeft, Home, RefreshCw, Shield } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';
import { useEffect, useState } from 'react';

interface AccessDeniedProps {
  /**
   * Custom message to display
   */
  message?: string;
  
  /**
   * Screen key that was being accessed
   */
  screenKey?: string;
  
  /**
   * Required permission level
   */
  requiredLevel?: 'view' | 'edit';
}

const AccessDenied: React.FC<AccessDeniedProps> = ({
  message,
  screenKey,
  requiredLevel
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshPermissions, userGroup } = usePermissions();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Extract screen info from location state if available
  const locationState = location.state as any;
  const finalScreenKey = screenKey || locationState?.screenKey;
  const finalRequiredLevel = requiredLevel || locationState?.requiredLevel;

  const getDetailedMessage = () => {
    if (message) return message;
    
    if (finalScreenKey && finalRequiredLevel) {
      const levelText = finalRequiredLevel === 'edit' ? 'edição' : 'visualização';
      return `Você não tem permissão de ${levelText} para acessar esta funcionalidade. Entre em contato com o administrador do sistema se acredita que isso é um erro.`;
    }
    
    return 'Você não tem permissão para acessar esta página. Entre em contato com o administrador do sistema se acredita que isso é um erro.';
  };

  const handleRefreshPermissions = async () => {
    setIsRefreshing(true);
    try {
      await refreshPermissions();
      // After refreshing, try to navigate back to the original page
      navigate(-1);
    } catch (error) {
      console.error('Failed to refresh permissions:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full mx-auto text-center px-6">
        <div className="mb-8">
          <div className="relative mb-4">
            <Shield className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto" />
            <AlertTriangle className="h-8 w-8 text-red-500 absolute top-0 right-1/2 translate-x-6 -translate-y-1" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Acesso Negado
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {getDetailedMessage()}
          </p>

          {/* Show user group info if available */}
          {userGroup && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Seu grupo atual:</strong> {userGroup.name}
              </p>
              {userGroup.description && (
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                  {userGroup.description}
                </p>
              )}
            </div>
          )}

          {/* Show technical details in development */}
          {process.env.NODE_ENV === 'development' && (finalScreenKey || finalRequiredLevel) && (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 mb-6 text-left">
              <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                <strong>Debug Info:</strong><br />
                Screen: {finalScreenKey || 'N/A'}<br />
                Required Level: {finalRequiredLevel || 'N/A'}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleRefreshPermissions}
            disabled={isRefreshing}
            className="w-full"
          >
            {isRefreshing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Atualizar Permissões
          </Button>
          
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          
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
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Se você acredita que deveria ter acesso a esta funcionalidade, entre em contato com o administrador do sistema.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;