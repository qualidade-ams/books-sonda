import type { PermissionLevel } from '@/types/permissions';

/**
 * Utility functions for working with permissions
 */

/**
 * Check if a permission level allows a specific action
 * @param userLevel - The user's permission level for a screen
 * @param requiredLevel - The required permission level for the action
 * @returns true if the user has sufficient permissions
 */
export function hasPermissionLevel(
  userLevel: PermissionLevel | undefined,
  requiredLevel: PermissionLevel
): boolean {
  if (!userLevel || userLevel === 'none') {
    return requiredLevel === 'none';
  }

  switch (requiredLevel) {
    case 'none':
      return true;
    case 'view':
      return userLevel === 'view' || userLevel === 'edit';
    case 'edit':
      return userLevel === 'edit';
    default:
      return false;
  }
}

/**
 * Get the highest permission level from a list of levels
 * @param levels - Array of permission levels
 * @returns The highest permission level
 */
export function getHighestPermissionLevel(levels: PermissionLevel[]): PermissionLevel {
  if (levels.includes('edit')) return 'edit';
  if (levels.includes('view')) return 'view';
  return 'none';
}

/**
 * Check if a permission level is higher than another
 * @param level1 - First permission level
 * @param level2 - Second permission level
 * @returns true if level1 is higher than level2
 */
export function isHigherPermissionLevel(
  level1: PermissionLevel,
  level2: PermissionLevel
): boolean {
  const hierarchy: Record<PermissionLevel, number> = {
    'none': 0,
    'view': 1,
    'edit': 2
  };

  return hierarchy[level1] > hierarchy[level2];
}

/**
 * Get user-friendly permission level name
 * @param level - Permission level
 * @returns Localized permission level name
 */
export function getPermissionLevelName(level: PermissionLevel): string {
  switch (level) {
    case 'none':
      return 'Sem acesso';
    case 'view':
      return 'Visualização';
    case 'edit':
      return 'Edição';
    default:
      return 'Desconhecido';
  }
}

/**
 * Get permission level description
 * @param level - Permission level
 * @returns Description of what the permission level allows
 */
export function getPermissionLevelDescription(level: PermissionLevel): string {
  switch (level) {
    case 'none':
      return 'Usuário não pode acessar esta funcionalidade';
    case 'view':
      return 'Usuário pode visualizar mas não editar';
    case 'edit':
      return 'Usuário pode visualizar e editar';
    default:
      return 'Nível de permissão desconhecido';
  }
}

/**
 * Validate permission level value
 * @param level - Permission level to validate
 * @returns true if the level is valid
 */
export function isValidPermissionLevel(level: string): level is PermissionLevel {
  return ['none', 'view', 'edit'].includes(level);
}

/**
 * Screen key constants for commonly used screens
 * This helps avoid typos and provides a central place to manage screen keys
 */
export const SCREEN_KEYS = {
  DASHBOARD: 'dashboard',
  USERS: 'users',
  USER_GROUPS: 'user-groups',
  PERMISSIONS: 'permissions',
  EMAIL_CONFIG: 'email-config',
  PRICING: 'pricing',
  APPLICATIONS: 'applications',
  APPROVALS: 'approvals',
  QUOTE_HISTORY: 'quote-history',
  USER_CONFIG: 'user-config',
  SETTINGS: 'settings',
  REPORTS: 'reports'
} as const;

/**
 * Type for screen keys
 */
export type ScreenKey = typeof SCREEN_KEYS[keyof typeof SCREEN_KEYS];