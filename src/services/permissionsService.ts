import { supabase } from '@/integrations/supabase/client';
import type {
  UserGroup,
  ScreenPermission,
  UserGroupAssignment,
  UserPermissions,
  CreateUserGroupInput,
  UpdateUserGroupInput,
  CreateScreenPermissionInput,
  CreateUserGroupAssignmentInput,
  PermissionError,
  PermissionLevel,
  PermissionsServiceMethods,
  UserWithGroup
} from '@/types/permissions';
import { PermissionErrors, retryPermissionOperation } from '@/errors/permissionErrors';

const PERMISSION_WEIGHT: Record<PermissionLevel, number> = { none: 1, view: 2, edit: 3 };

/**
 * Service for managing user groups, permissions, and user assignments
 * Implements CRUD operations for the permissions system
 */
class PermissionsService implements PermissionsServiceMethods {

  /**
   * Get all permissions for a specific user, merging every group they belong to.
   * The effective level per screen is the highest one among the groups (edit > view > none).
   */
  async getUserPermissions(userId: string): Promise<UserPermissions> {
    return retryPermissionOperation(async () => {
      // First, get the user's group assignments
      const { data: assignments, error: assignmentError } = await supabase
        .from('user_group_assignments')
        .select('group_id')
        .eq('user_id', userId);

      if (assignmentError) {
        // Handle 406 (Not Acceptable) which can occur with publishable keys
        // when session is not yet ready or token is being refreshed
        if (assignmentError.code === 'PGRST116' || assignmentError.message?.includes('406')) {
          // No assignment found - return empty permissions
          return {};
        }
        throw PermissionErrors.userNotAssigned(userId);
      }

      const groupIds = (assignments || []).map(assignment => assignment.group_id).filter(Boolean);
      if (groupIds.length === 0) {
        return {};
      }

      // Get all screen permissions for the user's groups
      const { data: permissions, error: permissionsError } = await supabase
        .from('screen_permissions')
        .select('screen_key, permission_level')
        .in('group_id', groupIds);

      if (permissionsError) {
        throw new Error(`Failed to get group permissions: ${permissionsError.message}`);
      }

      // Convert to UserPermissions format, keeping the highest level per screen
      const userPermissions: UserPermissions = {};
      permissions?.forEach(permission => {
        const current = userPermissions[permission.screen_key];
        const level = permission.permission_level as PermissionLevel;
        if (!current || PERMISSION_WEIGHT[level] > PERMISSION_WEIGHT[current]) {
          userPermissions[permission.screen_key] = level;
        }
      });

      return userPermissions;
    });
  }

  /**
   * Get every group the user belongs to
   */
  async getUserGroups(userId: string): Promise<UserGroup[]> {
    try {
      const { data: assignments, error: assignmentError } = await supabase
        .from('user_group_assignments')
        .select(`
          group_id,
          user_groups (
            id,
            name,
            description,
            is_default_admin,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId);

      if (assignmentError) {
        if (assignmentError.code === 'PGRST116' || assignmentError.message?.includes('406')) {
          // No assignment found or session issue
          return [];
        }
        throw new Error(`Failed to get user groups: ${assignmentError.message}`);
      }

      return (assignments || [])
        .map(assignment => assignment.user_groups as UserGroup)
        .filter(Boolean);
    } catch (error) {
      console.error('Error getting user groups:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Update permissions for a specific group
   */
  async updateGroupPermissions(groupId: string, permissions: ScreenPermission[], updatedBy?: string): Promise<void> {
    try {
      // Validate group exists
      await this.validateGroupExists(groupId);

      // Delete existing permissions for the group
      const { error: deleteError } = await supabase
        .from('screen_permissions')
        .delete()
        .eq('group_id', groupId);

      if (deleteError) {
        throw new Error(`Failed to delete existing permissions: ${deleteError.message}`);
      }

      // Insert new permissions (only if there are permissions to insert)
      if (permissions.length > 0) {
        const permissionsToInsert = permissions.map(permission => ({
          group_id: groupId,
          screen_key: permission.screen_key,
          permission_level: permission.permission_level,
          created_by: updatedBy,
          updated_by: updatedBy
        }));

        const { error: insertError } = await supabase
          .from('screen_permissions')
          .insert(permissionsToInsert);

        if (insertError) {
          throw new Error(`Failed to insert new permissions: ${insertError.message}`);
        }
      }
    } catch (error) {
      console.error('Error updating group permissions:', error);
      throw error;
    }
  }

  /**
   * Replace the user's groups with the given list (empty list removes every group).
   * The RPC checks edit permission on usuarios-grupos and records who made the change.
   */
  async setUserGroups(userId: string, groupIds: string[]): Promise<void> {
    const { error } = await supabase.rpc('set_user_groups', {
      p_user_id: userId,
      p_group_ids: groupIds
    });

    if (error) {
      console.error('Error setting user groups:', error.message);
      throw new Error(error.message);
    }
  }

  /**
   * Create a new user group
   */
  async createGroup(group: CreateUserGroupInput, createdBy?: string): Promise<UserGroup> {
    try {
      // Validate name is unique
      await this.validateGroupNameUnique(group.name);

      const { data, error } = await supabase
        .from('user_groups')
        .insert({
          ...group,
          created_by: createdBy,
          updated_by: createdBy
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create group: ${error.message}`);
      }

      return data as UserGroup;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  /**
   * Update an existing user group
   */
  async updateGroup(groupId: string, updates: UpdateUserGroupInput, updatedBy?: string): Promise<void> {
    try {
      // Validate group exists
      await this.validateGroupExists(groupId);

      // If updating name, validate it's unique
      if (updates.name) {
        await this.validateGroupNameUnique(updates.name, groupId);
      }

      const { error } = await supabase
        .from('user_groups')
        .update({
          ...updates,
          updated_by: updatedBy,
          updated_at: new Date().toISOString()
        })
        .eq('id', groupId);

      if (error) {
        throw new Error(`Failed to update group: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating group:', error);
      throw error;
    }
  }

  /**
   * Delete a user group
   */
  async deleteGroup(groupId: string): Promise<void> {
    try {
      // Validate group exists and get group info
      const group = await this.validateGroupExists(groupId);

      // Prevent deletion of default admin group
      if (group.is_default_admin) {
        throw PermissionErrors.cannotDeleteAdminGroup();
      }

      // Check if group has assigned users
      const { data: assignments, error: assignmentError } = await supabase
        .from('user_group_assignments')
        .select('id')
        .eq('group_id', groupId)
        .limit(1);

      if (assignmentError) {
        throw new Error(`Failed to check group assignments: ${assignmentError.message}`);
      }

      if (assignments && assignments.length > 0) {
        throw PermissionErrors.cannotDeleteGroupWithUsers(group.name);
      }

      // Delete the group (permissions will be deleted by cascade)
      const { error } = await supabase
        .from('user_groups')
        .delete()
        .eq('id', groupId);

      if (error) {
        throw new Error(`Failed to delete group: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  }

  /**
   * Get all user groups
   */
  async getAllGroups(): Promise<UserGroup[]> {
    try {
      const { data, error } = await supabase
        .from('user_groups')
        .select('*')
        .order('name');

      if (error) {
        throw new Error(`Failed to get groups: ${error.message}`);
      }

      return data as UserGroup[];
    } catch (error) {
      console.error('Error getting all groups:', error);
      throw error;
    }
  }

  /**
   * Get all permissions for a specific group
   */
  async getGroupPermissions(groupId: string): Promise<ScreenPermission[]> {
    try {
      // Validate group exists
      await this.validateGroupExists(groupId);

      const { data, error } = await supabase
        .from('screen_permissions')
        .select('*')
        .eq('group_id', groupId)
        .order('screen_key');

      if (error) {
        throw new Error(`Failed to get group permissions: ${error.message}`);
      }

      return data as ScreenPermission[];
    } catch (error) {
      console.error('Error getting group permissions:', error);
      throw error;
    }
  }

  /**
   * Get all users in the system with their group assignments
   */
  async getAllUsersWithGroups(): Promise<UserWithGroup[]> {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('full_name');

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('user_group_assignments')
        .select(`
          user_id,
          group_id,
          user_groups (
            id,
            name
          )
        `);

      if (assignmentsError) {
        throw new Error(`Failed to get group assignments: ${assignmentsError.message}`);
      }

      // Group the assignments by user
      const groupsByUser = new Map<string, { group_ids: string[]; group_names: string[] }>();
      assignmentsData?.forEach(assignment => {
        if (!assignment.group_id) return;
        const groups = groupsByUser.get(assignment.user_id) ?? { group_ids: [], group_names: [] };
        groups.group_ids.push(assignment.group_id);
        groups.group_names.push(assignment.user_groups?.name || '');
        groupsByUser.set(assignment.user_id, groups);
      });

      // Without profiles, list only the users that have assignments
      if (profilesError || !profilesData || profilesData.length === 0) {
        console.warn('Profiles table not available, listing users from group assignments');
        return [...groupsByUser.entries()].map(([userId, groups]) => ({
          id: userId,
          email: '',
          full_name: 'Usuário sem nome',
          ...groups,
        }));
      }

      return profilesData.map(user => ({
        id: user.id,
        email: user.email || '',
        full_name: user.full_name || 'Usuário sem nome',
        ...(groupsByUser.get(user.id) ?? { group_ids: [], group_names: [] }),
      }));
    } catch (error) {
      console.error('Error getting all users with groups:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Validate that a group exists and return the group data
   */
  private async validateGroupExists(groupId: string): Promise<UserGroup> {
    const { data, error } = await supabase
      .from('user_groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (error || !data) {
      throw PermissionErrors.groupNotFound(groupId);
    }

    return data as UserGroup;
  }

  /**
   * Validate that a group name is unique
   */
  private async validateGroupNameUnique(name: string, excludeId?: string): Promise<void> {
    let query = supabase
      .from('user_groups')
      .select('id')
      .eq('name', name);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to validate group name: ${error.message}`);
    }

    if (data && data.length > 0) {
      throw PermissionErrors.groupNameExists(name);
    }
  }


}

// Export singleton instance
export const permissionsService = new PermissionsService();