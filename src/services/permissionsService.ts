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
  PermissionsServiceMethods
} from '@/types/permissions';
import { PermissionErrors, retryPermissionOperation } from '@/errors/permissionErrors';

/**
 * Service for managing user groups, permissions, and user assignments
 * Implements CRUD operations for the permissions system
 */
class PermissionsService implements PermissionsServiceMethods {

  /**
   * Get all permissions for a specific user based on their group assignment
   */
  async getUserPermissions(userId: string): Promise<UserPermissions> {
    return retryPermissionOperation(async () => {
      // First, get the user's group assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from('user_group_assignments')
        .select('group_id')
        .eq('user_id', userId)
        .single();

      if (assignmentError) {
        if (assignmentError.code === 'PGRST116') {
          // No assignment found - return empty permissions
          return {};
        }
        throw PermissionErrors.userNotAssigned(userId);
      }

      // Get all screen permissions for the user's group
      const { data: permissions, error: permissionsError } = await supabase
        .from('screen_permissions')
        .select('screen_key, permission_level')
        .eq('group_id', assignment.group_id);

      if (permissionsError) {
        throw new Error(`Failed to get group permissions: ${permissionsError.message}`);
      }

      // Convert to UserPermissions format
      const userPermissions: UserPermissions = {};
      permissions?.forEach(permission => {
        userPermissions[permission.screen_key] = permission.permission_level;
      });

      return userPermissions;
    });
  }

  /**
   * Get the user group for a specific user
   */
  async getUserGroup(userId: string): Promise<UserGroup | null> {
    try {
      const { data: assignment, error: assignmentError } = await supabase
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
        .eq('user_id', userId)
        .single();

      if (assignmentError) {
        if (assignmentError.code === 'PGRST116') {
          // No assignment found
          return null;
        }
        throw new Error(`Failed to get user group: ${assignmentError.message}`);
      }

      return assignment.user_groups as UserGroup;
    } catch (error) {
      console.error('Error getting user group:', error);
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
   * Assign a user to a group
   */
  async assignUserToGroup(userId: string, groupId: string, assignedBy: string): Promise<void> {
    try {
      // Validate group exists
      await this.validateGroupExists(groupId);

      // Check if user already has an assignment
      const { data: existingAssignments } = await supabase
        .from('user_group_assignments')
        .select('id')
        .eq('user_id', userId);

      const existingAssignment = existingAssignments && existingAssignments.length > 0 ? existingAssignments[0] : null;

      if (existingAssignment) {
        // Update existing assignment
        const { error: updateError } = await supabase
          .from('user_group_assignments')
          .update({
            group_id: groupId,
            assigned_by: assignedBy,
            updated_by: assignedBy,
            assigned_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (updateError) {
          throw new Error(`Failed to update user assignment: ${updateError.message}`);
        }
      } else {
        // Create new assignment
        const { error: insertError } = await supabase
          .from('user_group_assignments')
          .insert({
            user_id: userId,
            group_id: groupId,
            assigned_by: assignedBy,
            updated_by: assignedBy
          });

        if (insertError) {
          throw new Error(`Failed to create user assignment: ${insertError.message}`);
        }
      }
    } catch (error) {
      console.error('Error assigning user to group:', error);
      throw error;
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
  async getAllUsersWithGroups(): Promise<Array<{
    id: string;
    email: string;
    full_name: string;
    group_id: string | null;
    group_name: string | null;
  }>> {
    try {
      // First, try to get users from profiles table
      let { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('full_name');

      // If profiles table doesn't exist or is empty, get from auth.users
      if (profilesError || !profilesData || profilesData.length === 0) {
        console.warn('Profiles table not available, using auth.users directly');

        // Get users from auth.users and their group assignments
        const { data: usersData, error: usersError } = await supabase
          .from('user_group_assignments')
          .select(`
            user_id,
            group_id,
            user_groups (
              id,
              name
            )
          `);

        if (usersError) {
          throw new Error(`Failed to get user assignments: ${usersError.message}`);
        }

        // Get all auth users
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

        if (authError) {
          throw new Error(`Failed to get auth users: ${authError.message}`);
        }

        // Combine the data
        return authUsers.users.map(user => {
          const assignment = usersData?.find(a => a.user_id === user.id);
          return {
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || user.email || 'Usuário sem nome',
            group_id: assignment?.group_id || null,
            group_name: assignment?.user_groups?.name || null,
          };
        });
      }

      // Get group assignments for profiles
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

      // Combine profiles with their group assignments
      return profilesData.map(user => {
        const assignment = assignmentsData?.find(a => a.user_id === user.id);
        return {
          id: user.id,
          email: user.email || '',
          full_name: user.full_name || 'Usuário sem nome',
          group_id: assignment?.group_id || null,
          group_name: assignment?.user_groups?.name || null,
        };
      });
    } catch (error) {
      console.error('Error getting all users with groups:', error);
      throw error;
    }
  }

  /**
   * Remove user from their current group
   */
  async removeUserFromGroup(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_group_assignments')
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to remove user from group: ${error.message}`);
      }
    } catch (error) {
      console.error('Error removing user from group:', error);
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