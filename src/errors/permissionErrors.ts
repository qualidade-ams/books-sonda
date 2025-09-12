import type { PermissionError, PermissionLevel } from '@/types/permissions';

/**
 * Permission-specific error classes and utilities
 */

/**
 * Create a standardized permission error
 */
export function createPermissionError(
  code: PermissionError['code'],
  message: string,
  screenKey?: string,
  requiredLevel?: PermissionLevel,
  userLevel?: PermissionLevel
): PermissionError {
  const error = new Error(message) as PermissionError;
  error.name = 'PermissionError';
  error.code = code;
  error.screenKey = screenKey;
  error.requiredLevel = requiredLevel;
  error.userLevel = userLevel;
  return error;
}

/**
 * Check if an error is a permission error
 */
export function isPermissionError(error: any): error is PermissionError {
  return error && error.name === 'PermissionError' && error.code;
}

/**
 * Permission error factory functions
 */
export const PermissionErrors = {
  /**
   * User doesn't have sufficient permissions for an action
   */
  insufficientPermissions(
    screenKey: string,
    requiredLevel: PermissionLevel,
    userLevel?: PermissionLevel
  ): PermissionError {
    return createPermissionError(
      'INSUFFICIENT_PERMISSIONS',
      `Insufficient permissions for screen '${screenKey}'. Required: ${requiredLevel}${userLevel ? `, User has: ${userLevel}` : ''}`,
      screenKey,
      requiredLevel,
      userLevel
    );
  },

  /**
   * Group not found error
   */
  groupNotFound(groupId: string): PermissionError {
    return createPermissionError(
      'GROUP_NOT_FOUND',
      `User group with ID '${groupId}' not found`
    );
  },

  /**
   * User not assigned to any group
   */
  userNotAssigned(userId: string): PermissionError {
    return createPermissionError(
      'USER_NOT_ASSIGNED',
      `User '${userId}' is not assigned to any group`
    );
  },

  /**
   * Invalid permission level
   */
  invalidPermissionLevel(level: string): PermissionError {
    return createPermissionError(
      'INVALID_PERMISSION_LEVEL',
      `Invalid permission level '${level}'. Must be one of: none, view, edit`
    );
  },

  /**
   * Cannot delete admin group
   */
  cannotDeleteAdminGroup(): PermissionError {
    return createPermissionError(
      'INVALID_PERMISSION_LEVEL',
      'Cannot delete the default administrators group'
    );
  },

  /**
   * Cannot delete group with users
   */
  cannotDeleteGroupWithUsers(groupName: string): PermissionError {
    return createPermissionError(
      'INVALID_PERMISSION_LEVEL',
      `Cannot delete group '${groupName}' because it has assigned users. Remove users first.`
    );
  },

  /**
   * Group name already exists
   */
  groupNameExists(name: string): PermissionError {
    return createPermissionError(
      'INVALID_PERMISSION_LEVEL',
      `Group name '${name}' already exists`
    );
  },

  /**
   * Screen not found
   */
  screenNotFound(screenKey: string): PermissionError {
    return createPermissionError(
      'GROUP_NOT_FOUND', // Reusing this code for screen not found
      `Screen with key '${screenKey}' not found`
    );
  }
};

/**
 * Get user-friendly error message for permission errors
 */
export function getPermissionErrorMessage(error: PermissionError): string {
  switch (error.code) {
    case 'INSUFFICIENT_PERMISSIONS':
      return `Você não tem permissão para acessar esta funcionalidade. ${error.requiredLevel === 'edit' ? 'Permissão de edição necessária.' : 'Permissão de visualização necessária.'}`;
    
    case 'GROUP_NOT_FOUND':
      return 'Grupo não encontrado. Verifique se o grupo ainda existe.';
    
    case 'USER_NOT_ASSIGNED':
      return 'Usuário não está atribuído a nenhum grupo. Entre em contato com o administrador.';
    
    case 'INVALID_PERMISSION_LEVEL':
      return error.message; // These usually have specific messages
    
    default:
      return 'Erro de permissão. Entre em contato com o administrador.';
  }
}

/**
 * Handle permission errors in a standardized way
 */
export function handlePermissionError(error: any): {
  message: string;
  shouldRedirect: boolean;
  redirectPath?: string;
} {
  if (isPermissionError(error)) {
    switch (error.code) {
      case 'INSUFFICIENT_PERMISSIONS':
        return {
          message: getPermissionErrorMessage(error),
          shouldRedirect: true,
          redirectPath: '/access-denied'
        };
      
      case 'USER_NOT_ASSIGNED':
        return {
          message: getPermissionErrorMessage(error),
          shouldRedirect: true,
          redirectPath: '/'
        };
      
      default:
        return {
          message: getPermissionErrorMessage(error),
          shouldRedirect: false
        };
    }
  }

  // Handle generic errors
  return {
    message: 'Ocorreu um erro inesperado. Tente novamente.',
    shouldRedirect: false
  };
}

/**
 * Retry configuration for permission operations
 */
export const PERMISSION_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 5000,  // 5 seconds
  backoffFactor: 2
};

/**
 * Retry a permission operation with exponential backoff
 */
export async function retryPermissionOperation<T>(
  operation: () => Promise<T>,
  config = PERMISSION_RETRY_CONFIG
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry permission errors (they won't resolve with retry)
      if (isPermissionError(error)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === config.maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt),
        config.maxDelay
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}