import { useState } from 'react';
import { ClientBooksPermissionsService } from '@/services/clientBooksPermissionsService';
import { toast } from 'sonner';

/**
 * Hook para gerenciar permissões do sistema de client books
 */
export function useClientBooksPermissions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Configura todas as permissões do sistema
   */
  const setupPermissions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await ClientBooksPermissionsService.setupPermissions();
      
      toast.success('Permissões configuradas com sucesso!', {
        description: `${result.details.screens.length} telas registradas e ${result.details.permissions.length} permissões configuradas`
      });
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      
      toast.error('Erro ao configurar permissões', {
        description: errorMessage
      });
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Registra apenas as telas no sistema
   */
  const registerScreens = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await ClientBooksPermissionsService.registerScreens();
      
      toast.success('Telas registradas com sucesso!');
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      
      toast.error('Erro ao registrar telas', {
        description: errorMessage
      });
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Configura apenas as permissões padrão
   */
  const configureDefaultPermissions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await ClientBooksPermissionsService.configureDefaultPermissions();
      
      toast.success('Permissões padrão configuradas!');
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      
      toast.error('Erro ao configurar permissões padrão', {
        description: errorMessage
      });
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Verifica o status das permissões
   */
  const verifyPermissions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await ClientBooksPermissionsService.verifyPermissions();
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      
      toast.error('Erro ao verificar permissões', {
        description: errorMessage
      });
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    setupPermissions,
    registerScreens,
    configureDefaultPermissions,
    verifyPermissions,
    isLoading,
    error
  };
}