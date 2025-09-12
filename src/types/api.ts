/**
 * API response types and validation schemas for the permissions system
 */

import { PermissionLevel, UserGroup, Screen, ScreenPermission, UserGroupAssignment } from './permissions';

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// API Error response
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API request types
export interface CreateGroupRequest {
  name: string;
  description: string;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
}

export interface AssignUserToGroupRequest {
  userId: string;
  groupId: string;
}

export interface UpdateGroupPermissionsRequest {
  groupId: string;
  permissions: Array<{
    screenKey: string;
    permissionLevel: PermissionLevel;
  }>;
}

// API response types
export interface GetUserPermissionsResponse {
  userGroup: UserGroup | null;
  permissions: Record<string, PermissionLevel>;
}

export interface GetGroupsResponse {
  groups: UserGroup[];
}

export interface GetScreensResponse {
  screens: Screen[];
}

export interface GetGroupPermissionsResponse {
  groupId: string;
  permissions: ScreenPermission[];
}

export interface GetUsersWithGroupsResponse {
  users: Array<{
    id: string;
    email: string;
    group: UserGroup | null;
  }>;
}

// Validation error types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationErrorResponse {
  success: false;
  errors: ValidationError[];
}

// Permission check types
export interface PermissionCheckRequest {
  screenKey: string;
  requiredLevel: PermissionLevel;
}

export interface PermissionCheckResponse {
  hasPermission: boolean;
  userLevel: PermissionLevel;
  requiredLevel: PermissionLevel;
}

// Audit log types
export interface AuditLogEntry {
  id: string;
  action: 'CREATE_GROUP' | 'UPDATE_GROUP' | 'DELETE_GROUP' | 'ASSIGN_USER' | 'UPDATE_PERMISSIONS';
  entityType: 'USER_GROUP' | 'SCREEN_PERMISSION' | 'USER_GROUP_ASSIGNMENT';
  entityId: string;
  userId: string;
  changes: Record<string, any>;
  timestamp: string;
}

export interface GetAuditLogsResponse {
  logs: AuditLogEntry[];
}