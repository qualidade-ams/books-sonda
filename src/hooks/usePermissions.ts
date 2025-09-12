import { useContext } from 'react';
import { PermissionsContext } from '@/contexts/PermissionsContext';
import type { UsePermissionsReturn } from '@/types/permissions';

/**
 * Hook to access permissions context
 * Must be used within a PermissionsProvider
 * 
 * @returns {UsePermissionsReturn} Object containing user permissions, group info, and utility functions
 */
export const usePermissions = (): UsePermissionsReturn => {
  const context = useContext(PermissionsContext);
  
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  
  return {
    userPermissions: context.userPermissions,
    userGroup: context.userGroup,
    loading: context.loading,
    error: context.error,
    retryCount: context.retryCount,
    refreshPermissions: context.refreshPermissions,
    hasPermission: context.hasPermission
  };
};