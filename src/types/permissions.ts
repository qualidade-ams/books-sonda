/**
 * Types and interfaces for the user permissions management system
 */

// Permission level enum
export type PermissionLevel = 'none' | 'view' | 'edit';

// User Group interface
export interface UserGroup {
  id: string;
  name: string;
  description: string;
  is_default_admin: boolean;
  created_at: string;
  updated_at: string;
}

// Screen interface - represents a screen/page in the system
export interface Screen {
  key: string;
  name: string;
  description: string;
  category: string;
  route: string;
}

// Screen Permission interface - defines permission level for a group on a specific screen
export interface ScreenPermission {
  id: string;
  group_id: string;
  screen_key: string;
  permission_level: PermissionLevel;
  created_at: string;
  updated_at: string;
}

// User Group Assignment interface - links users to groups
export interface UserGroupAssignment {
  id: string;
  user_id: string;
  group_id: string;
  assigned_at: string;
  assigned_by: string;
}

// User permissions type - maps screen keys to permission levels
export type UserPermissions = Record<string, PermissionLevel>;

// Permissions context type for React context
export interface PermissionsContextType {
  userPermissions: UserPermissions;
  userGroup: UserGroup | null;
  loading: boolean;
  error: Error | null;
  retryCount: number;
  refreshPermissions: () => Promise<void>;
  hasPermission: (screenKey: string, level: PermissionLevel) => boolean;
}

// Hook return type for usePermissions
export interface UsePermissionsReturn {
  userPermissions: UserPermissions;
  userGroup: UserGroup | null;
  loading: boolean;
  error: Error | null;
  retryCount: number;
  refreshPermissions: () => Promise<void>;
  hasPermission: (screenKey: string, level: PermissionLevel) => boolean;
}

// Types for creating new entities (without auto-generated fields)
export type CreateUserGroupInput = Omit<UserGroup, 'id' | 'created_at' | 'updated_at'>;
export type CreateScreenPermissionInput = Omit<ScreenPermission, 'id' | 'created_at' | 'updated_at'>;
export type CreateUserGroupAssignmentInput = Omit<UserGroupAssignment, 'id' | 'assigned_at'>;

// Types for updating entities (partial updates)
export type UpdateUserGroupInput = Partial<Omit<UserGroup, 'id' | 'created_at' | 'updated_at'>>;
export type UpdateScreenPermissionInput = Partial<Omit<ScreenPermission, 'id' | 'group_id' | 'screen_key' | 'created_at' | 'updated_at'>>;

// Permission matrix type for UI components
export interface PermissionMatrixItem {
  screenKey: string;
  screenName: string;
  category: string;
  permissionLevel: PermissionLevel;
}

export type PermissionMatrix = PermissionMatrixItem[];

// Error types for permission-related errors
export interface PermissionError extends Error {
  code: 'INSUFFICIENT_PERMISSIONS' | 'GROUP_NOT_FOUND' | 'USER_NOT_ASSIGNED' | 'INVALID_PERMISSION_LEVEL';
  screenKey?: string;
  requiredLevel?: PermissionLevel;
  userLevel?: PermissionLevel;
}

// Service method types
// User with group assignment type for admin interface
export interface UserWithGroup {
  id: string;
  email: string;
  full_name: string;
  group_id: string | null;
  group_name: string | null;
}

export interface PermissionsServiceMethods {
  getUserPermissions: (userId: string) => Promise<UserPermissions>;
  getUserGroup: (userId: string) => Promise<UserGroup | null>;
  updateGroupPermissions: (groupId: string, permissions: ScreenPermission[]) => Promise<void>;
  assignUserToGroup: (userId: string, groupId: string, assignedBy: string) => Promise<void>;
  createGroup: (group: CreateUserGroupInput) => Promise<UserGroup>;
  updateGroup: (groupId: string, updates: UpdateUserGroupInput) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  getAllGroups: () => Promise<UserGroup[]>;
  getGroupPermissions: (groupId: string) => Promise<ScreenPermission[]>;
  getAllUsersWithGroups: () => Promise<UserWithGroup[]>;
  removeUserFromGroup: (userId: string) => Promise<void>;
}

export interface ScreenServiceMethods {
  getAllScreens: () => Promise<Screen[]>;
  registerScreen: (screen: Screen) => Promise<void>;
  getScreensByCategory: (category: string) => Promise<Screen[]>;
}

// Component prop types
export interface ProtectedRouteProps {
  children: React.ReactNode;
  screenKey?: string;
  requiredLevel?: PermissionLevel;
  fallback?: React.ReactNode;
}

export interface ProtectedActionProps {
  children: React.ReactNode;
  screenKey: string;
  requiredLevel: PermissionLevel;
  fallback?: React.ReactNode;
}

// Form types for admin interfaces
export interface GroupFormData {
  name: string;
  description: string;
}

export interface UserGroupAssignmentFormData {
  userId: string;
  groupId: string;
}

export interface PermissionConfigFormData {
  groupId: string;
  permissions: Array<{
    screenKey: string;
    permissionLevel: PermissionLevel;
  }>;
}