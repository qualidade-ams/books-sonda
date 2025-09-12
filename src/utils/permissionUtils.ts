import type { PermissionLevel, UserPermissions } from '@/types/permissions';

/**
 * Utility functions for permission checking and validation
 */

/**
 * Check if a user has the required permission level for a screen
 */
export function hasPermission(
  userPermissions: UserPermissions,
  screenKey: string,
  requiredLevel: PermissionLevel
): boolean {
  const userLevel = userPermissions[screenKey];
  
  if (!userLevel || userLevel === 'none') {
    return false;
  }

  // Permission hierarchy: edit > view > none
  const permissionHierarchy: Record<PermissionLevel, number> = {
    none: 0,
    view: 1,
    edit: 2
  };

  return permissionHierarchy[userLevel] >= permissionHierarchy[requiredLevel];
}

/**
 * Check if a user can view a screen
 */
export function canView(userPermissions: UserPermissions, screenKey: string): boolean {
  return hasPermission(userPermissions, screenKey, 'view');
}

/**
 * Check if a user can edit a screen
 */
export function canEdit(userPermissions: UserPermissions, screenKey: string): boolean {
  return hasPermission(userPermissions, screenKey, 'edit');
}

/**
 * Get the effective permission level for a screen
 */
export function getPermissionLevel(
  userPermissions: UserPermissions,
  screenKey: string
): PermissionLevel {
  return userPermissions[screenKey] || 'none';
}

/**
 * Filter screens based on user permissions and minimum required level
 */
export function filterScreensByPermission(
  screens: Array<{ key: string; [key: string]: any }>,
  userPermissions: UserPermissions,
  minLevel: PermissionLevel = 'view'
): Array<{ key: string; [key: string]: any }> {
  return screens.filter(screen => 
    hasPermission(userPermissions, screen.key, minLevel)
  );
}

/**
 * Validate permission level value
 */
export function isValidPermissionLevel(level: string): level is PermissionLevel {
  return ['none', 'view', 'edit'].includes(level);
}

/**
 * Get all screens that a user has access to (view or edit)
 */
export function getAccessibleScreens(userPermissions: UserPermissions): string[] {
  return Object.entries(userPermissions)
    .filter(([, level]) => level !== 'none')
    .map(([screenKey]) => screenKey);
}

/**
 * Get all screens that a user can edit
 */
export function getEditableScreens(userPermissions: UserPermissions): string[] {
  return Object.entries(userPermissions)
    .filter(([, level]) => level === 'edit')
    .map(([screenKey]) => screenKey);
}

/**
 * Check if user has any permissions at all
 */
export function hasAnyPermissions(userPermissions: UserPermissions): boolean {
  return Object.values(userPermissions).some(level => level !== 'none');
}

/**
 * Check if user has admin-level permissions (can edit most screens)
 */
export function hasAdminPermissions(
  userPermissions: UserPermissions,
  adminScreens: string[] = []
): boolean {
  if (adminScreens.length === 0) {
    // If no admin screens specified, check if user can edit any screen
    return getEditableScreens(userPermissions).length > 0;
  }

  // Check if user can edit all specified admin screens
  return adminScreens.every(screenKey => canEdit(userPermissions, screenKey));
}

/**
 * Merge multiple permission objects (useful for role inheritance)
 */
export function mergePermissions(
  ...permissionSets: UserPermissions[]
): UserPermissions {
  const merged: UserPermissions = {};
  
  for (const permissions of permissionSets) {
    for (const [screenKey, level] of Object.entries(permissions)) {
      const currentLevel = merged[screenKey] || 'none';
      
      // Take the highest permission level
      if (getPermissionPriority(level) > getPermissionPriority(currentLevel)) {
        merged[screenKey] = level;
      }
    }
  }
  
  return merged;
}

/**
 * Get numeric priority for permission level (higher = more permissive)
 */
function getPermissionPriority(level: PermissionLevel): number {
  const priorities: Record<PermissionLevel, number> = {
    none: 0,
    view: 1,
    edit: 2
  };
  
  return priorities[level];
}

/**
 * Create a permission summary for display purposes
 */
export function createPermissionSummary(userPermissions: UserPermissions): {
  totalScreens: number;
  viewableScreens: number;
  editableScreens: number;
  noAccessScreens: number;
} {
  const allScreens = Object.keys(userPermissions);
  const viewable = getAccessibleScreens(userPermissions);
  const editable = getEditableScreens(userPermissions);
  
  return {
    totalScreens: allScreens.length,
    viewableScreens: viewable.length,
    editableScreens: editable.length,
    noAccessScreens: allScreens.length - viewable.length
  };
}

/**
 * Validate that a permission configuration is valid
 */
export function validatePermissionConfig(
  permissions: Array<{ screenKey: string; permissionLevel: string }>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const permission of permissions) {
    if (!permission.screenKey || permission.screenKey.trim() === '') {
      errors.push('Screen key cannot be empty');
    }
    
    if (!isValidPermissionLevel(permission.permissionLevel)) {
      errors.push(`Invalid permission level: ${permission.permissionLevel}`);
    }
  }
  
  // Check for duplicate screen keys
  const screenKeys = permissions.map(p => p.screenKey);
  const duplicates = screenKeys.filter((key, index) => screenKeys.indexOf(key) !== index);
  
  if (duplicates.length > 0) {
    errors.push(`Duplicate screen keys found: ${duplicates.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}