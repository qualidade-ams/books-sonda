import { usePermissions } from '@/hooks/usePermissions';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isRetryableError } from '@/utils/retryUtils';
import type { ProtectedActionProps } from '@/types/permissions';

/**
* Componente que renderiza filhos condicionalmente com base nas permissões do usuário
* Usado para proteger botões, ações e outros elementos da interface do usuário
*/
const ProtectedAction = ({ 
  children, 
  screenKey, 
  requiredLevel,
  fallback = null 
}: ProtectedActionProps) => {
  const { hasPermission, loading, error, retryCount, refreshPermissions } = usePermissions();

  if (error && !loading && !isRetryableError(error)) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={refreshPermissions}
        className="text-red-600 hover:text-red-700"
      >
        <AlertCircle className="h-4 w-4 mr-1" />
        Erro
      </Button>
    );
  }

  if (loading) {
    return (
      <div className="inline-flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
        {retryCount > 0 && (
          <span className="ml-2 text-xs text-gray-500">
            Tentativa {retryCount + 1}
          </span>
        )}
      </div>
    );
  }

  if (!hasPermission(screenKey, requiredLevel)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default ProtectedAction;