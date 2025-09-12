import { supabase } from '@/integrations/supabase/client';
import type { Screen, ScreenServiceMethods } from '@/types/permissions';

/**
 * Service for managing system screens/pages
 * Handles registration and retrieval of screens for permission management
 */
class ScreenService implements ScreenServiceMethods {
  
  /**
   * Get all registered screens in the system
   */
  async getAllScreens(): Promise<Screen[]> {
    try {
      const { data, error } = await supabase
        .from('screens')
        .select('*')
        .order('category, name');

      if (error) {
        throw new Error(`Failed to get screens: ${error.message}`);
      }

      return data as Screen[];
    } catch (error) {
      console.error('Error getting all screens:', error);
      throw error;
    }
  }

  /**
   * Register a new screen in the system
   * Uses upsert to handle both creation and updates
   */
  async registerScreen(screen: Screen): Promise<void> {
    try {
      // Validate required fields
      this.validateScreen(screen);

      const { error } = await supabase
        .from('screens')
        .upsert(screen, {
          onConflict: 'key'
        });

      if (error) {
        throw new Error(`Failed to register screen: ${error.message}`);
      }

      // If this is a new screen, ensure admin group gets full access
      await this.ensureAdminAccess(screen.key);
    } catch (error) {
      console.error('Error registering screen:', error);
      throw error;
    }
  }

  /**
   * Get screens filtered by category
   */
  async getScreensByCategory(category: string): Promise<Screen[]> {
    try {
      const { data, error } = await supabase
        .from('screens')
        .select('*')
        .eq('category', category)
        .order('name');

      if (error) {
        throw new Error(`Failed to get screens by category: ${error.message}`);
      }

      return data as Screen[];
    } catch (error) {
      console.error('Error getting screens by category:', error);
      throw error;
    }
  }

  /**
   * Get available screen categories
   */
  async getScreenCategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('screens')
        .select('category')
        .not('category', 'is', null);

      if (error) {
        throw new Error(`Failed to get screen categories: ${error.message}`);
      }

      // Extract unique categories
      const categories = [...new Set(data?.map(item => item.category).filter(Boolean))];
      return categories.sort();
    } catch (error) {
      console.error('Error getting screen categories:', error);
      throw error;
    }
  }

  /**
   * Check if a screen exists by key
   */
  async screenExists(screenKey: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('screens')
        .select('key')
        .eq('key', screenKey)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to check screen existence: ${error.message}`);
      }

      return !!data;
    } catch (error) {
      console.error('Error checking screen existence:', error);
      throw error;
    }
  }

  /**
   * Get a specific screen by key
   */
  async getScreen(screenKey: string): Promise<Screen | null> {
    try {
      const { data, error } = await supabase
        .from('screens')
        .select('*')
        .eq('key', screenKey)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to get screen: ${error.message}`);
      }

      return data as Screen;
    } catch (error) {
      console.error('Error getting screen:', error);
      throw error;
    }
  }

  /**
   * Update an existing screen
   */
  async updateScreen(screenKey: string, updates: Partial<Omit<Screen, 'key'>>): Promise<void> {
    try {
      // Validate screen exists
      const exists = await this.screenExists(screenKey);
      if (!exists) {
        throw new Error(`Screen with key '${screenKey}' not found`);
      }

      const { error } = await supabase
        .from('screens')
        .update(updates)
        .eq('key', screenKey);

      if (error) {
        throw new Error(`Failed to update screen: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating screen:', error);
      throw error;
    }
  }

  /**
   * Delete a screen and all associated permissions
   */
  async deleteScreen(screenKey: string): Promise<void> {
    try {
      // Validate screen exists
      const exists = await this.screenExists(screenKey);
      if (!exists) {
        throw new Error(`Screen with key '${screenKey}' not found`);
      }

      // Delete the screen (permissions will be deleted by cascade)
      const { error } = await supabase
        .from('screens')
        .delete()
        .eq('key', screenKey);

      if (error) {
        throw new Error(`Failed to delete screen: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting screen:', error);
      throw error;
    }
  }

  /**
   * Bulk register multiple screens
   */
  async registerScreens(screens: Screen[]): Promise<void> {
    try {
      // Validate all screens
      screens.forEach(screen => this.validateScreen(screen));

      const { error } = await supabase
        .from('screens')
        .upsert(screens, {
          onConflict: 'key'
        });

      if (error) {
        throw new Error(`Failed to register screens: ${error.message}`);
      }

      // Ensure admin access for all new screens
      for (const screen of screens) {
        await this.ensureAdminAccess(screen.key);
      }
    } catch (error) {
      console.error('Error registering screens:', error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Validate screen data
   */
  private validateScreen(screen: Screen): void {
    if (!screen.key || screen.key.trim() === '') {
      throw new Error('Screen key is required');
    }

    if (!screen.name || screen.name.trim() === '') {
      throw new Error('Screen name is required');
    }

    if (!screen.category || screen.category.trim() === '') {
      throw new Error('Screen category is required');
    }

    if (!screen.route || screen.route.trim() === '') {
      throw new Error('Screen route is required');
    }

    // Validate key format (alphanumeric, hyphens, underscores only)
    const keyRegex = /^[a-zA-Z0-9_-]+$/;
    if (!keyRegex.test(screen.key)) {
      throw new Error('Screen key must contain only alphanumeric characters, hyphens, and underscores');
    }
  }

  /**
   * Ensure the default admin group has full access to a screen
   */
  private async ensureAdminAccess(screenKey: string): Promise<void> {
    try {
      // Get the default admin group
      const { data: adminGroup, error: adminError } = await supabase
        .from('user_groups')
        .select('id')
        .eq('is_default_admin', true)
        .single();

      if (adminError || !adminGroup) {
        console.warn('No default admin group found, skipping admin access setup');
        return;
      }

      // Check if permission already exists
      const { data: existingPermission, error: permissionError } = await supabase
        .from('screen_permissions')
        .select('id')
        .eq('group_id', adminGroup.id)
        .eq('screen_key', screenKey)
        .single();

      if (permissionError && permissionError.code !== 'PGRST116') {
        throw new Error(`Failed to check existing permission: ${permissionError.message}`);
      }

      // If permission doesn't exist, create it with edit level
      if (!existingPermission) {
        const { error: insertError } = await supabase
          .from('screen_permissions')
          .insert({
            group_id: adminGroup.id,
            screen_key: screenKey,
            permission_level: 'edit'
          });

        if (insertError) {
          console.error(`Failed to create admin permission for screen ${screenKey}:`, insertError);
        }
      }
    } catch (error) {
      console.error('Error ensuring admin access:', error);
      // Don't throw here as this is a background operation
    }
  }
}

// Export singleton instance
export const screenService = new ScreenService();