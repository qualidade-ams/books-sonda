
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Navigate } from 'react-router-dom';
import LoadingFallback from '@/components/errors/LoadingFallback';
import { isRetryableError } from '@/utils/retryUtils';
import type { ProtectedRouteProps } from '@/types/permissions';

const ProtectedRoute = ({
  children,
  screenKey,
  requiredLevel = 'view',
  fallback
}: ProtectedRouteProps) => {
  const { user, loading: authLoading, isReady } = useAuth();
  const { hasPermission, loading: permissionsLoading, error, retryCount, refreshPermissions } = usePermissions();

  const isLoading = authLoading || !isReady || permissionsLoading;

  if (error && !isLoading && !isRetryableError(error)) {
    return (
      <LoadingFallback
        type="permissions"
        error={true}
        errorMessage="Falha ao carregar permissões. Verifique sua conexão e tente novamente."
        showRetry={true}
        onRetry={refreshPermissions}
        fullScreen={true}
      />
    );
  }

  if (isLoading) {
    const loadingMessage = retryCount > 0
      ? `Carregando permissões... (tentativa ${retryCount + 1})`
      : 'Verificando permissões...';

    const loadingFallback = fallback || (
      <LoadingFallback
        type="permissions"
        message={loadingMessage}
        size="md"
        fullScreen={true}
      />
    );

    return <>{loadingFallback}</>;
  }

  if (!user) {
    console.log('ProtectedRoute: Usuário não autenticado, redirecionando para /login');
    return <Navigate to="/" replace />;
  }

  if (screenKey && !hasPermission(screenKey, requiredLevel)) {
    console.log('ProtectedRoute: Permissão insuficiente, redirecionando para /access-denied');
    return <Navigate
      to="/access-denied"
      replace
      state={{ screenKey, requiredLevel }}
    />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
