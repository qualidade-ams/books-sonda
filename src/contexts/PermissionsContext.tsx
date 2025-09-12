import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { permissionsService } from '@/services/permissionsService';
import { retryWithBackoff, RETRY_CONFIGS, isRetryableError } from '@/utils/retryUtils';
import { isPermissionError, handlePermissionError } from '@/errors/permissionErrors';
import type {
  PermissionsContextType,
  UserPermissions,
  UserGroup,
  PermissionLevel
} from '@/types/permissions';

export const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isReady } = useAuth();
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({});
  const [userGroup, setUserGroup] = useState<UserGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  /**
   * Load user permissions and group information with retry logic
   */
  const loadPermissions = useCallback(async (userId: string, attempt: number = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      // Load permissions and group in parallel with retry logic
      const [permissions, group] = await Promise.all([
        retryWithBackoff(
          () => permissionsService.getUserPermissions(userId),
          RETRY_CONFIGS.permissions
        ),
        retryWithBackoff(
          () => permissionsService.getUserGroup(userId),
          RETRY_CONFIGS.permissions
        )
      ]);

      setUserPermissions(permissions);
      setUserGroup(group);
      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.error('Error loading user permissions:', error);
      setError(error as Error);
      
      // Handle different types of errors
      if (isPermissionError(error)) {
        const errorInfo = handlePermissionError(error);
        console.error('Permission error:', errorInfo.message);
        
        // For permission errors, set empty permissions but don't retry
        setUserPermissions({});
        setUserGroup(null);
      } else if (isRetryableError(error) && attempt < 2) {
        // For retryable errors, increment retry count and try again
        setRetryCount(attempt + 1);
        console.warn(`Retrying permission load (attempt ${attempt + 1})`);
        
        // Retry after a delay
        setTimeout(() => {
          loadPermissions(userId, attempt + 1);
        }, 2000 * (attempt + 1)); // Increasing delay
        
        return; // Don't set loading to false yet
      } else {
        // For non-retryable errors or max retries reached, set empty permissions
        setUserPermissions({});
        setUserGroup(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh permissions - can be called externally when permissions change
   */
  const refreshPermissions = useCallback(async () => {
    if (user?.id) {
      setRetryCount(0); // Reset retry count when manually refreshing
      await loadPermissions(user.id);
    }
  }, [user?.id, loadPermissions]);

  /**
   * Check if user has required permission level for a screen
   */
  const hasPermission = useCallback((screenKey: string, level: PermissionLevel): boolean => {
    // If loading, deny access for safety
    if (loading) {
      return false;
    }

    // If no user, deny access
    if (!user) {
      return false;
    }

    // Get user's permission level for this screen
    const userLevel = userPermissions[screenKey];

    // If no permission defined, deny access
    if (!userLevel || userLevel === 'none') {
      return false;
    }

    // Check permission hierarchy: edit > view > none
    switch (level) {
      case 'view':
        return userLevel === 'view' || userLevel === 'edit';
      case 'edit':
        return userLevel === 'edit';
      case 'none':
        return true; // Everyone has 'none' level access
      default:
        return false;
    }
  }, [loading, user, userPermissions]);

  // Load permissions when user changes
  useEffect(() => {
    if (isReady) {
      if (user?.id) {
        loadPermissions(user.id);
      } else {
        // Clear permissions when user logs out
        setUserPermissions({});
        setUserGroup(null);
        setLoading(false);
      }
    }
  }, [user?.id, isReady, loadPermissions]);

  const contextValue: PermissionsContextType = {
    userPermissions,
    userGroup,
    loading,
    error,
    retryCount,
    refreshPermissions,
    hasPermission
  };

  return (
    <PermissionsContext.Provider value={contextValue}>
      {children}
    </PermissionsContext.Provider>
  );
};

