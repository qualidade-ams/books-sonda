import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientBooksPermissionsService } from '@/services/clientBooksPermissionsService';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn(() => ({ error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ 
          data: [{ id: 'test-group-id' }], 
          error: null 
        })),
        in: vi.fn(() => ({
          data: [
            { key: 'empresas_clientes', name: 'Cadastro de Empresas' },
            { key: 'colaboradores', name: 'Cadastro de Colaboradores' }
          ],
          error: null
        }))
      }))
    }))
  }
}));

describe('ClientBooksPermissionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerScreens', () => {
    it('deve registrar todas as telas do sistema de client books', async () => {
      const result = await ClientBooksPermissionsService.registerScreens();
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Telas registradas com sucesso');
    });
  });

  describe('configureDefaultPermissions', () => {
    it('deve configurar permissões padrão para administradores', async () => {
      const result = await ClientBooksPermissionsService.configureDefaultPermissions();
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Permissões configuradas com sucesso');
    });
  });

  describe('verifyPermissions', () => {
    it('deve verificar se as permissões estão configuradas', async () => {
      const result = await ClientBooksPermissionsService.verifyPermissions();
      
      expect(result.success).toBe(true);
      expect(result.screens).toBeDefined();
      expect(result.permissions).toBeDefined();
    });
  });

  describe('setupPermissions', () => {
    it('deve executar a configuração completa das permissões', async () => {
      const result = await ClientBooksPermissionsService.setupPermissions();
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Permissões configuradas com sucesso');
      expect(result.details).toBeDefined();
    });
  });
});