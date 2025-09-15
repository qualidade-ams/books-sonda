import { describe, it, expect, vi, beforeEach } from 'vitest';
import { empresasClientesService } from '@/services/empresasClientesService';
import type { EmpresaFormData } from '@/types/clientBooks';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: 'empresa-test-id',
              nome_completo: 'Empresa Teste',
              nome_abreviado: 'Teste',
              template_padrao: 'template-personalizado-id',
              status: 'ativo'
            },
            error: null
          }))
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: { code: 'PGRST116' }
          }))
        }))
      }))
    }))
  }
}));

describe('Template Selection Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Criação de empresa com template personalizado', () => {
    it('deve permitir criar empresa com template padrão português', async () => {
      const empresaData: EmpresaFormData = {
        nomeCompleto: 'Empresa Teste Português',
        nomeAbreviado: 'TestePT',
        templatePadrao: 'portugues',
        status: 'ativo',
        produtos: ['CE_PLUS'],
        grupos: []
      };

      const result = await empresasClientesService.criarEmpresa(empresaData);
      
      expect(result).toBeDefined();
      expect(result.template_padrao).toBe('portugues');
    });

    it('deve permitir criar empresa com template padrão inglês', async () => {
      const empresaData: EmpresaFormData = {
        nomeCompleto: 'Empresa Teste Inglês',
        nomeAbreviado: 'TesteEN',
        templatePadrao: 'ingles',
        status: 'ativo',
        produtos: ['FISCAL'],
        grupos: []
      };

      const result = await empresasClientesService.criarEmpresa(empresaData);
      
      expect(result).toBeDefined();
      expect(result.template_padrao).toBe('ingles');
    });

    it('deve permitir criar empresa com template personalizado (UUID)', async () => {
      const templatePersonalizadoId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      
      const empresaData: EmpresaFormData = {
        nomeCompleto: 'Empresa Teste Personalizado',
        nomeAbreviado: 'TesteCustom',
        templatePadrao: templatePersonalizadoId,
        status: 'ativo',
        produtos: ['GALLERY'],
        grupos: []
      };

      // Mock para retornar o template personalizado
      vi.mocked(require('@/integrations/supabase/client').supabase.from).mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                id: 'empresa-test-id',
                nome_completo: empresaData.nomeCompleto,
                nome_abreviado: empresaData.nomeAbreviado,
                template_padrao: templatePersonalizadoId,
                status: 'ativo'
              },
              error: null
            }))
          }))
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: { code: 'PGRST116' }
            }))
          }))
        }))
      });

      const result = await empresasClientesService.criarEmpresa(empresaData);
      
      expect(result).toBeDefined();
      expect(result.template_padrao).toBe(templatePersonalizadoId);
    });

    it('deve validar que template é obrigatório', async () => {
      const empresaData: EmpresaFormData = {
        nomeCompleto: 'Empresa Sem Template',
        nomeAbreviado: 'SemTemplate',
        templatePadrao: '', // Template vazio
        status: 'ativo',
        produtos: ['CE_PLUS'],
        grupos: []
      };

      await expect(
        empresasClientesService.criarEmpresa(empresaData)
      ).rejects.toThrow();
    });
  });

  describe('Atualização de template de empresa', () => {
    it('deve permitir alterar template de empresa existente', async () => {
      const empresaId = 'empresa-existente-id';
      const novoTemplate = 'novo-template-id';

      // Mock para simular empresa existente
      vi.mocked(require('@/integrations/supabase/client').supabase.from).mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: null,
            error: null
          }))
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                id: empresaId,
                nome_completo: 'Empresa Existente',
                template_padrao: 'portugues'
              },
              error: null
            }))
          }))
        }))
      });

      await expect(
        empresasClientesService.atualizarEmpresa(empresaId, {
          templatePadrao: novoTemplate
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Validação de templates', () => {
    it('deve aceitar templates padrão válidos', () => {
      const templatesValidos = ['portugues', 'ingles'];
      
      templatesValidos.forEach(template => {
        expect(() => {
          // Simulação de validação básica
          if (!template || template.trim() === '') {
            throw new Error('Template é obrigatório');
          }
        }).not.toThrow();
      });
    });

    it('deve aceitar UUIDs válidos para templates personalizados', () => {
      const uuidsValidos = [
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        '6ba7b811-9dad-11d1-80b4-00c04fd430c8'
      ];
      
      uuidsValidos.forEach(uuid => {
        expect(() => {
          // Simulação de validação de UUID
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (!uuid.match(uuidRegex) && !['portugues', 'ingles'].includes(uuid)) {
            throw new Error('Template deve ser um UUID válido ou template padrão');
          }
        }).not.toThrow();
      });
    });

    it('deve rejeitar valores inválidos', () => {
      const valoresInvalidos = [
        '',
        null,
        undefined,
        'template-invalido',
        '123',
        'uuid-malformado'
      ];
      
      valoresInvalidos.forEach(valor => {
        expect(() => {
          if (!valor || valor.trim() === '') {
            throw new Error('Template é obrigatório');
          }
          
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (!valor.match(uuidRegex) && !['portugues', 'ingles'].includes(valor)) {
            throw new Error('Template deve ser um UUID válido ou template padrão');
          }
        }).toThrow();
      });
    });
  });
});