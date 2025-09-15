import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { empresasClientesService, EmpresaError, EMPRESA_STATUS, PRODUTOS } from '../empresasClientesService';
import { supabase } from '@/integrations/supabase/client';
import type { EmpresaFormData } from '@/types/clientBooks';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn()
        })),
        or: vi.fn(() => ({
          order: vi.fn()
        })),
        order: vi.fn()
      })),
      update: vi.fn(() => ({
        eq: vi.fn()
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      })),
      upsert: vi.fn()
    }))
  }
}));

describe('EmpresasClientesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('criarEmpresa', () => {
    const empresaValidaData: EmpresaFormData = {
      nomeCompleto: 'Empresa Teste Ltda',
      nomeAbreviado: 'Empresa Teste',
      linkSharepoint: 'https://sharepoint.com/empresa-teste',
      templatePadrao: 'portugues',
      status: 'ativo',
      emailGestor: 'gestor@empresa.com',
      produtos: ['CE_PLUS', 'FISCAL'],
      grupos: ['grupo-1', 'grupo-2']
    };

    it('deve criar uma empresa com dados válidos', async () => {
      const empresaCriada = {
        id: 'empresa-1',
        nome_completo: 'Empresa Teste Ltda',
        nome_abreviado: 'Empresa Teste',
        status: 'ativo'
      };

      // Mock para inserção da empresa
      const mockInsertEmpresa = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: empresaCriada,
            error: null
          })
        })
      });

      // Mock para inserção de produtos e grupos
      const mockInsertAssociacoes = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any)
        .mockReturnValueOnce({ insert: mockInsertEmpresa })
        .mockReturnValueOnce({ insert: mockInsertAssociacoes })
        .mockReturnValueOnce({ insert: mockInsertAssociacoes });

      const resultado = await empresasClientesService.criarEmpresa(empresaValidaData);

      expect(resultado).toEqual(empresaCriada);
      expect(mockInsertEmpresa).toHaveBeenCalledWith({
        nome_completo: 'Empresa Teste Ltda',
        nome_abreviado: 'Empresa Teste',
        link_sharepoint: 'https://sharepoint.com/empresa-teste',
        template_padrao: 'portugues',
        status: 'ativo',
        data_status: expect.any(String),
        descricao_status: null,
        email_gestor: 'gestor@empresa.com'
      });
    });

    it('deve lançar erro quando nome completo não for fornecido', async () => {
      const dadosInvalidos = { ...empresaValidaData, nomeCompleto: '' };

      await expect(empresasClientesService.criarEmpresa(dadosInvalidos))
        .rejects
        .toThrow(new EmpresaError('Nome completo é obrigatório', 'NOME_COMPLETO_REQUIRED'));
    });

    it('deve lançar erro quando nome abreviado não for fornecido', async () => {
      const dadosInvalidos = { ...empresaValidaData, nomeAbreviado: '' };

      await expect(empresasClientesService.criarEmpresa(dadosInvalidos))
        .rejects
        .toThrow(new EmpresaError('Nome abreviado é obrigatório', 'NOME_ABREVIADO_REQUIRED'));
    });

    it('deve lançar erro quando e-mail do gestor for inválido', async () => {
      const dadosInvalidos = { ...empresaValidaData, emailGestor: 'email-invalido' };

      await expect(empresasClientesService.criarEmpresa(dadosInvalidos))
        .rejects
        .toThrow(new EmpresaError('E-mail do gestor inválido', 'INVALID_EMAIL'));
    });

    it('deve lançar erro quando status for inválido', async () => {
      const dadosInvalidos = { ...empresaValidaData, status: 'status-invalido' as any };

      await expect(empresasClientesService.criarEmpresa(dadosInvalidos))
        .rejects
        .toThrow(new EmpresaError('Status inválido', 'INVALID_STATUS'));
    });

    it('deve lançar erro quando produto for inválido', async () => {
      const dadosInvalidos = { ...empresaValidaData, produtos: ['PRODUTO_INVALIDO'] as any };

      await expect(empresasClientesService.criarEmpresa(dadosInvalidos))
        .rejects
        .toThrow(new EmpresaError('Produto inválido: PRODUTO_INVALIDO', 'INVALID_PRODUCT'));
    });

    it('deve exigir descrição para status inativo', async () => {
      const dadosInvalidos = { 
        ...empresaValidaData, 
        status: 'inativo' as any,
        descricaoStatus: undefined
      };

      await expect(empresasClientesService.criarEmpresa(dadosInvalidos))
        .rejects
        .toThrow(new EmpresaError('Descrição é obrigatória para status Inativo ou Suspenso', 'DESCRIPTION_REQUIRED'));
    });

    it('deve tratar erro do banco de dados', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Erro de banco' }
          })
        })
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert
      });

      await expect(empresasClientesService.criarEmpresa(empresaValidaData))
        .rejects
        .toThrow(new EmpresaError('Erro ao criar empresa: Erro de banco', 'CREATE_ERROR'));
    });
  });

  describe('listarEmpresas', () => {
    it('deve listar empresas ativas por padrão', async () => {
      const empresas = [
        { id: '1', nome_completo: 'Empresa 1', status: 'ativo' },
        { id: '2', nome_completo: 'Empresa 2', status: 'ativo' }
      ];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: empresas, error: null })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await empresasClientesService.listarEmpresas();

      expect(resultado).toEqual(empresas);
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'ativo');
    });

    it('deve aplicar filtro de busca', async () => {
      const empresas = [
        { id: '1', nome_completo: 'Empresa Teste', status: 'ativo' }
      ];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: empresas, error: null })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await empresasClientesService.listarEmpresas({ busca: 'Teste' });

      expect(resultado).toEqual(empresas);
      expect(mockQuery.or).toHaveBeenCalledWith('nome_completo.ilike.%Teste%,nome_abreviado.ilike.%Teste%');
    });

    it('deve tratar erro do banco de dados', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Erro de consulta' } 
        })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      await expect(empresasClientesService.listarEmpresas())
        .rejects
        .toThrow(new EmpresaError('Erro ao listar empresas: Erro de consulta', 'LIST_ERROR'));
    });
  });

  describe('obterEmpresaPorId', () => {
    it('deve retornar empresa quando encontrada', async () => {
      const empresa = {
        id: '1',
        nome_completo: 'Empresa Teste',
        status: 'ativo'
      };

      const mockQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: empresa, error: null })
        })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await empresasClientesService.obterEmpresaPorId('1');

      expect(resultado).toEqual(empresa);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1');
    });

    it('deve retornar null quando empresa não for encontrada', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { code: 'PGRST116' } 
          })
        })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await empresasClientesService.obterEmpresaPorId('inexistente');

      expect(resultado).toBeNull();
    });

    it('deve tratar erro do banco de dados', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Erro de consulta', code: 'OTHER_ERROR' } 
          })
        })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      await expect(empresasClientesService.obterEmpresaPorId('1'))
        .rejects
        .toThrow(new EmpresaError('Erro ao obter empresa: Erro de consulta', 'GET_ERROR'));
    });
  });

  describe('atualizarEmpresa', () => {
    it('deve atualizar empresa com dados válidos', async () => {
      const dadosAtualizacao = {
        nomeCompleto: 'Empresa Atualizada',
        status: 'suspenso' as any,
        descricaoStatus: 'Motivo da suspensão'
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      (supabase.from as any).mockReturnValue({ update: mockUpdate });

      await empresasClientesService.atualizarEmpresa('1', dadosAtualizacao);

      expect(mockUpdate).toHaveBeenCalledWith({
        nome_completo: 'Empresa Atualizada',
        status: 'suspenso',
        data_status: expect.any(String),
        descricao_status: 'Motivo da suspensão',
        updated_at: expect.any(String)
      });
    });

    it('deve tratar erro do banco de dados', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'Erro de atualização' } })
      });

      (supabase.from as any).mockReturnValue({ update: mockUpdate });

      await expect(empresasClientesService.atualizarEmpresa('1', { nomeCompleto: 'Teste' }))
        .rejects
        .toThrow(new EmpresaError('Erro ao atualizar empresa: Erro de atualização', 'UPDATE_ERROR'));
    });
  });

  describe('deletarEmpresa', () => {
    it('deve deletar empresa quando não há colaboradores ativos', async () => {
      // Mock para verificar colaboradores
      const mockSelectColaboradores = vi.fn().mockResolvedValue({ 
        data: [], 
        error: null 
      });

      // Mock para deletar empresa
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      (supabase.from as any)
        .mockReturnValueOnce({ 
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        })
        .mockReturnValueOnce({ delete: mockDelete });

      await empresasClientesService.deletarEmpresa('1');

      expect(mockDelete).toHaveBeenCalled();
    });

    it('deve lançar erro quando há colaboradores ativos', async () => {
      const mockSelectColaboradores = vi.fn().mockResolvedValue({ 
        data: [{ id: 'colaborador-1' }], 
        error: null 
      });

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [{ id: 'colaborador-1' }], error: null })
          })
        })
      });

      await expect(empresasClientesService.deletarEmpresa('1'))
        .rejects
        .toThrow(new EmpresaError('Não é possível deletar empresa com colaboradores ativos', 'HAS_ACTIVE_COLLABORATORS'));
    });
  });

  describe('alterarStatusLote', () => {
    it('deve alterar status em lote com dados válidos', async () => {
      const ids = ['1', '2', '3'];
      const status = EMPRESA_STATUS.INATIVO;
      const descricao = 'Motivo da inativação';

      const mockUpdate = vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ error: null })
      });

      (supabase.from as any).mockReturnValue({ update: mockUpdate });

      await empresasClientesService.alterarStatusLote(ids, status, descricao);

      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'inativo',
        data_status: expect.any(String),
        descricao_status: 'Motivo da inativação',
        updated_at: expect.any(String)
      });
    });

    it('deve lançar erro quando lista de IDs estiver vazia', async () => {
      await expect(empresasClientesService.alterarStatusLote([], 'ativo', ''))
        .rejects
        .toThrow(new EmpresaError('Lista de IDs não pode estar vazia', 'EMPTY_IDS'));
    });

    it('deve lançar erro quando status for inválido', async () => {
      await expect(empresasClientesService.alterarStatusLote(['1'], 'status-invalido', ''))
        .rejects
        .toThrow(new EmpresaError('Status inválido', 'INVALID_STATUS'));
    });

    it('deve exigir descrição para status inativo ou suspenso', async () => {
      await expect(empresasClientesService.alterarStatusLote(['1'], EMPRESA_STATUS.INATIVO, ''))
        .rejects
        .toThrow(new EmpresaError('Descrição é obrigatória para status Inativo ou Suspenso', 'DESCRIPTION_REQUIRED'));
    });
  });

  describe('importarExcel', () => {
    it('deve lançar erro de não implementado', async () => {
      const arquivo = new File([''], 'test.xlsx');

      await expect(empresasClientesService.importarExcel(arquivo))
        .rejects
        .toThrow(new EmpresaError('Funcionalidade de importação Excel ainda não implementada', 'NOT_IMPLEMENTED'));
    });
  });

  describe('Validações', () => {
    it('deve validar e-mail corretamente', () => {
      const service = empresasClientesService as any;
      
      expect(service.validarEmail('teste@email.com')).toBe(true);
      expect(service.validarEmail('email.invalido')).toBe(false);
      expect(service.validarEmail('')).toBe(false);
      expect(service.validarEmail('teste@')).toBe(false);
    });

    it('deve validar dados da empresa corretamente', () => {
      const service = empresasClientesService as any;
      
      // Teste de nome muito longo
      expect(() => {
        service.validarDadosEmpresa({
          nomeCompleto: 'a'.repeat(256),
          nomeAbreviado: 'Teste'
        });
      }).toThrow(new EmpresaError('Nome completo deve ter no máximo 255 caracteres', 'NOME_COMPLETO_TOO_LONG'));

      // Teste de nome abreviado muito longo
      expect(() => {
        service.validarDadosEmpresa({
          nomeCompleto: 'Teste',
          nomeAbreviado: 'a'.repeat(101)
        });
      }).toThrow(new EmpresaError('Nome abreviado deve ter no máximo 100 caracteres', 'NOME_ABREVIADO_TOO_LONG'));
    });
  });
});