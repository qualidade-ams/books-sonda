import { useState } from 'react';
import { useAuth } from './useAuth';
import { userSettingsService } from '@/services/userSettingsService';
import type { UserProfile } from '@/types/userSettings';

export const useUserSettings = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Atualizar perfil do usuário
  const updateProfile = async (profile: Partial<UserProfile>): Promise<boolean> => {
    if (!user?.id) return false;

    setIsLoading(true);
    setError(null);

    try {
      const success = await userSettingsService.updateUserProfile(user.id, profile);

      if (!success) {
        setError('Erro ao atualizar perfil');
        return false;
      }

      return true;
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      setError('Erro ao atualizar perfil');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    updateProfile
  };
};