/**
 * Database-specific types for the permissions system
 * These types match the Supabase database schema
 */

import { PermissionLevel } from './permissions';

// Database table types (matching Supabase schema)
export interface DbUserGroup {
  id: string;
  name: string;
  description: string | null;
  is_default_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbScreen {
  key: string;
  name: string;
  description: string | null;
  category: string | null;
  route: string | null;
}

export interface DbScreenPermission {
  id: string;
  group_id: string;
  screen_key: string;
  permission_level: PermissionLevel;
  created_at: string;
  updated_at: string;
}

export interface DbUserGroupAssignment {
  id: string;
  user_id: string;
  group_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

// Database insert types (for new records)
export interface DbUserGroupInsert {
  name: string;
  description?: string;
  is_default_admin?: boolean;
}

export interface DbScreenInsert {
  key: string;
  name: string;
  description?: string;
  category?: string;
  route?: string;
}

export interface DbScreenPermissionInsert {
  group_id: string;
  screen_key: string;
  permission_level: PermissionLevel;
}

export interface DbUserGroupAssignmentInsert {
  user_id: string;
  group_id: string;
  assigned_by?: string;
}

// Database update types (for existing records)
export interface DbUserGroupUpdate {
  name?: string;
  description?: string;
  is_default_admin?: boolean;
  updated_at?: string;
}

export interface DbScreenPermissionUpdate {
  permission_level?: PermissionLevel;
  updated_at?: string;
}

// Query result types with joins
export interface UserWithGroup {
  id: string;
  email: string;
  user_groups: DbUserGroup | null;
}

export interface GroupWithPermissions {
  id: string;
  name: string;
  description: string | null;
  is_default_admin: boolean;
  created_at: string;
  updated_at: string;
  screen_permissions: Array<{
    screen_key: string;
    permission_level: PermissionLevel;
    screens: {
      name: string;
      category: string | null;
    };
  }>;
}

export interface UserPermissionsQuery {
  user_id: string;
  group_id: string | null;
  group_name: string | null;
  screen_permissions: Array<{
    screen_key: string;
    permission_level: PermissionLevel;
  }>;
}

// Supabase response types
export interface SupabaseResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface SupabaseListResponse<T> {
  data: T[] | null;
  error: Error | null;
  count?: number;
}