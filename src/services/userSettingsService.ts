import { supabase } from '@/integrations/supabase/client';
import type { UserProfile } from '@/types/userSettings';

class UserSettingsService {

  // Atualizar perfil do usuário (consistente com userManagementService)
  async updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<boolean> {
    try {

      // 1. Atualizar dados no Supabase Auth (user_metadata)
      const authUpdates: any = {};
      
      if (profile.name) {
        authUpdates.user_metadata = {
          full_name: profile.name,
          name: profile.name,
          display_name: profile.name
        };
      }

      // Atualizar no Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        data: authUpdates
      });

      if (authError) {
        console.error('Erro ao atualizar usuário no auth:', authError);
        return false;
      }

      // 2. Atualizar perfil na tabela profiles (para consistência)
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: profile.name,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (profileError) {
          console.warn('Erro ao atualizar perfil na tabela (não crítico):', profileError);
          // Não falhar se não conseguir atualizar a tabela profiles
          // O importante é que o auth foi atualizado
        } else {
        }
      } catch (profileException) {
        console.warn('Exceção ao atualizar perfil na tabela (não crítico):', profileException);
      }

      return true;
    } catch (error) {
      console.error('Erro ao atualizar perfil do usuário:', error);
      return false;
    }
  }


}

export const userSettingsService = new UserSettingsService();