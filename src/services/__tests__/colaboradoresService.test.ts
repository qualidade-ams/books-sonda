import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { colaboradoresService, ColaboradorError } from '../colaboradoresService';
import { supabase } from '@/integrations/supabase/client';
import { COLABORADOR_STATUS } from '@/types/clientBooksTypes';
import type { ColaboradorFormData } from '@/types/clientBooksTypes';

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
          order: vi.fn(),
          limit: vi.fn()
        })),
        or: vi.fn(() => ({
          order: vi.fn()
        })),
        order: vi.fn(),
        neq: vi.fn(() => ({
          order: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
        neq: vi.fn()
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      }))
    }))
  }
}));

describe('ColaboradoresService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('criarColaborador', () => {
    const colaboradorValidoData: ColaboradorFormData = {
      nomeCompleto: 'João Silva',
      email: 'joao.silva@empresa.com',
      funcao: 'Gerente',
      empresaId: 'empresa-1',
      status: 'ativo',
      principalContato: false
    };

    it('deve criar um colaborador com dados válidos', async () => {
      const colaboradorCriado = {
        id: 'colaborador-1',
        nome_completo: 'João Silva',
        email: 'joao.silva@empresa.com',
        status: 'ativo'
      };

      // Mock para verificar empresa
      const mockEmpresaQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'empresa-1', status: 'ativo' },
            error: null
          })
        })
      };

      // Mock para verificar e-mail único
      const mockEmailQuery = {
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis()
      };
      mockEmailQuery.eq.mockResolvedValue({ data: [], error: null });

      // Mock para inserção
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: colaboradorCriado,
            error: null
          })
        })
      });

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmpresaQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmailQuery) })
        .mockReturnValueOnce({ insert: mockInsert });

      const resultado = await colaboradoresService.criarColaborador(colaboradorValidoData);

      expect(resultado).toEqual(colaboradorCriado);
      expect(mockInsert).toHaveBeenCalledWith({
        nome_completo: 'João Silva',
        email: 'joao.silva@empresa.com',
        funcao: 'Gerente',
        empresa_id: 'empresa-1',
        status: 'ativo',
        data_status: expect.any(String),
        descricao_status: null,
        principal_contato: false
      });
    });

    it('deve lançar erro quando nome completo não for fornecido', async () => {
      const dadosInvalidos = { ...colaboradorValidoData, nomeCompleto: '' };

      await expect(colaboradoresService.criarColaborador(dadosInvalidos))
        .rejects
        .toThrow(new ColaboradorError('Nome completo é obrigatório', 'NOME_COMPLETO_REQUIRED'));
    });

    it('deve lançar erro quando e-mail não for fornecido', async () => {
      const dadosInvalidos = { ...colaboradorValidoData, email: '' };

      await expect(colaboradoresService.criarColaborador(dadosInvalidos))
        .rejects
        .toThrow(new ColaboradorError('E-mail é obrigatório', 'EMAIL_REQUIRED'));
    });

    it('deve lançar erro quando empresa não for fornecida', async () => {
      const dadosInvalidos = { ...colaboradorValidoData, empresaId: '' };

      await expect(colaboradoresService.criarColaborador(dadosInvalidos))
        .rejects
        .toThrow(new ColaboradorError('Empresa é obrigatória', 'EMPRESA_REQUIRED'));
    });

    it('deve lançar erro quando e-mail for inválido', async () => {
      const dadosInvalidos = { ...colaboradorValidoData, email: 'email-invalido' };

      await expect(colaboradoresService.criarColaborador(dadosInvalidos))
        .rejects
        .toThrow(new ColaboradorError('E-mail inválido', 'INVALID_EMAIL'));
    });

    it('deve lançar erro quando empresa não existir', async () => {
      const mockEmpresaQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' }
          })
        })
      };

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue(mockEmpresaQuery) 
      });

      await expect(colaboradoresService.criarColaborador(colaboradorValidoData))
        .rejects
        .toThrow(new ColaboradorError('Empresa não encontrada', 'EMPRESA_NOT_FOUND'));
    });

    it('deve lançar erro quando empresa estiver inativa', async () => {
      const mockEmpresaQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'empresa-1', status: 'inativo' },
            error: null
          })
        })
      };

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue(mockEmpresaQuery) 
      });

      await expect(colaboradoresService.criarColaborador(colaboradorValidoData))
        .rejects
        .toThrow(new ColaboradorError('Não é possível associar colaborador a empresa inativa', 'EMPRESA_INACTIVE'));
    });

    it('deve lançar erro quando e-mail já existir na empresa', async () => {
      // Mock para empresa válida
      const mockEmpresaQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'empresa-1', status: 'ativo' },
            error: null
          })
        })
      };

      // Mock para e-mail duplicado
      const mockEmailQuery = {
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis()
      };
      mockEmailQuery.eq.mockResolvedValue({ 
        data: [{ id: 'colaborador-existente' }], 
        error: null 
      });

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmpresaQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmailQuery) });

      await expect(colaboradoresService.criarColaborador(colaboradorValidoData))
        .rejects
        .toThrow(new ColaboradorError('Já existe um colaborador com este e-mail nesta empresa', 'EMAIL_ALREADY_EXISTS'));
    });

    it('deve remover principal contato existente quando novo cliente for principal', async () => {
      const dadosComPrincipal = { ...colaboradorValidoData, principalContato: true };

      // Mock para empresa válida
      const mockEmpresaQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'empresa-1', status: 'ativo' },
            error: null
          })
        })
      };

      // Mock para e-mail único
      const mockEmailQuery = {
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis()
      };
      mockEmailQuery.eq.mockResolvedValue({ data: [], error: null });

      // Mock para remover principal contato existente
      const mockUpdatePrincipal = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis()
      });
      mockUpdatePrincipal().eq().eq = vi.fn().mockResolvedValue({ error: null });

      // Mock para inserção
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'colaborador-1' },
            error: null
          })
        })
      });

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmpresaQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmailQuery) })
        .mockReturnValueOnce({ update: mockUpdatePrincipal })
        .mockReturnValueOnce({ insert: mockInsert });

      await colaboradoresService.criarColaborador(dadosComPrincipal);

      expect(mockUpdatePrincipal).toHaveBeenCalled();
    });
  });

  describe('listarColaboradores', () => {
    it('deve listar colaboradores ativos por padrão', async () => {
      const colaboradores = [
        { id: '1', nome_completo: 'João Silva', status: 'ativo' },
        { id: '2', nome_completo: 'Maria Santos', status: 'ativo' }
      ];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: colaboradores, error: null })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await colaboradoresService.listarColaboradores();

      expect(resultado).toEqual(colaboradores);
      expect(mockQuery.eq).toHaveBeenCalledWith('status', COLABORADOR_STATUS.ATIVO);
    });

    it('deve aplicar filtro por empresa', async () => {
      const colaboradores = [
        { id: '1', nome_completo: 'João Silva', empresa_id: 'empresa-1' }
      ];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: colaboradores, error: null })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await colaboradoresService.listarColaboradores({ empresaId: 'empresa-1' });

      expect(resultado).toEqual(colaboradores);
      expect(mockQuery.eq).toHaveBeenCalledWith('empresa_id', 'empresa-1');
    });

    it('deve aplicar filtro de busca', async () => {
      const colaboradores = [
        { id: '1', nome_completo: 'João Silva' }
      ];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: colaboradores, error: null })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await colaboradoresService.listarColaboradores({ busca: 'João' });

      expect(resultado).toEqual(colaboradores);
      expect(mockQuery.or).toHaveBeenCalledWith('nome_completo.ilike.%João%,email.ilike.%João%,funcao.ilike.%João%');
    });
  });

  describe('obterColaboradorPorId', () => {
    it('deve retornar colaborador quando encontrado', async () => {
      const colaborador = {
        id: '1',
        nome_completo: 'João Silva',
        email: 'joao@empresa.com'
      };

      const mockQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: colaborador, error: null })
        })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await colaboradoresService.obterColaboradorPorId('1');

      expect(resultado).toEqual(colaborador);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1');
    });

    it('deve retornar null quando colaborador não for encontrado', async () => {
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

      const resultado = await colaboradoresService.obterColaboradorPorId('inexistente');

      expect(resultado).toBeNull();
    });
  });

  describe('atualizarColaborador', () => {
    it('deve atualizar colaborador com dados válidos', async () => {
      const colaboradorAtual = {
        id: '1',
        nome_completo: 'João Silva',
        email: 'joao@empresa.com',
        empresa_id: 'empresa-1',
        principal_contato: false
      };

      // Mock para obter colaborador atual
      const mockGetQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: colaboradorAtual, error: null })
        })
      };

      // Mock para atualização
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockGetQuery) })
        .mockReturnValueOnce({ update: mockUpdate });

      const dadosAtualizacao = {
        nomeCompleto: 'João Silva Santos',
        status: 'inativo' as any,
        descricaoStatus: 'Saiu da empresa'
      };

      await colaboradoresService.atualizarColaborador('1', dadosAtualizacao);

      expect(mockUpdate).toHaveBeenCalledWith({
        nome_completo: 'João Silva Santos',
        status: 'inativo',
        data_status: expect.any(String),
        descricao_status: 'Saiu da empresa',
        updated_at: expect.any(String)
      });
    });

    it('deve lançar erro quando colaborador não for encontrado', async () => {
      const mockGetQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      };

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue(mockGetQuery) 
      });

      await expect(colaboradoresService.atualizarColaborador('inexistente', {}))
        .rejects
        .toThrow(new ColaboradorError('Colaborador não encontrado', 'NOT_FOUND'));
    });
  });

  describe('atualizarStatus', () => {
    it('deve atualizar status com dados válidos', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      (supabase.from as any).mockReturnValue({ update: mockUpdate });

      await colaboradoresService.atualizarStatus('1', COLABORADOR_STATUS.INATIVO, 'Saiu da empresa');

      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'inativo',
        data_status: expect.any(String),
        descricao_status: 'Saiu da empresa',
        updated_at: expect.any(String)
      });
    });

    it('deve lançar erro quando status for inválido', async () => {
      await expect(colaboradoresService.atualizarStatus('1', 'status-invalido', ''))
        .rejects
        .toThrow(new ColaboradorError('Status inválido', 'INVALID_STATUS'));
    });

    it('deve exigir descrição para status inativo', async () => {
      await expect(colaboradoresService.atualizarStatus('1', COLABORADOR_STATUS.INATIVO, ''))
        .rejects
        .toThrow(new ColaboradorError('Descrição é obrigatória para status Inativo', 'DESCRIPTION_REQUIRED'));
    });
  });

  describe('deletarColaborador', () => {
    it('deve deletar colaborador quando não há histórico de disparos', async () => {
      // Mock para verificar histórico
      const mockHistoricoQuery = {
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      };

      // Mock para deletar
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockHistoricoQuery) })
        .mockReturnValueOnce({ delete: mockDelete });

      await colaboradoresService.deletarColaborador('1');

      expect(mockDelete).toHaveBeenCalled();
    });

    it('deve lançar erro quando há histórico de disparos', async () => {
      const mockHistoricoQuery = {
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ 
            data: [{ id: 'disparo-1' }], 
            error: null 
          })
        })
      };

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue(mockHistoricoQuery) 
      });

      await expect(colaboradoresService.deletarColaborador('1'))
        .rejects
        .toThrow(new ColaboradorError('Não é possível deletar colaborador com histórico de disparos', 'HAS_DISPATCH_HISTORY'));
    });
  });

  describe('obterPrincipalContato', () => {
    it('deve retornar principal contato da empresa', async () => {
      const principalContato = {
        id: '1',
        nome_completo: 'João Silva',
        principal_contato: true
      };

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: principalContato, error: null })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await colaboradoresService.obterPrincipalContato('empresa-1');

      expect(resultado).toEqual(principalContato);
      expect(mockQuery.eq).toHaveBeenCalledWith('empresa_id', 'empresa-1');
      expect(mockQuery.eq).toHaveBeenCalledWith('principal_contato', true);
      expect(mockQuery.eq).toHaveBeenCalledWith('status', COLABORADOR_STATUS.ATIVO);
    });

    it('deve retornar null quando não há principal contato', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { code: 'PGRST116' } 
        })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await colaboradoresService.obterPrincipalContato('empresa-1');

      expect(resultado).toBeNull();
    });
  });

  describe('listarAtivos', () => {
    it('deve listar apenas colaboradores ativos da empresa', async () => {
      const colaboradoresAtivos = [
        { id: '1', nome_completo: 'João Silva', status: 'ativo' },
        { id: '2', nome_completo: 'Maria Santos', status: 'ativo' }
      ];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: colaboradoresAtivos, error: null })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await colaboradoresService.listarAtivos('empresa-1');

      expect(resultado).toEqual(colaboradoresAtivos);
      expect(mockQuery.eq).toHaveBeenCalledWith('empresa_id', 'empresa-1');
      expect(mockQuery.eq).toHaveBeenCalledWith('status', COLABORADOR_STATUS.ATIVO);
    });
  });

  describe('Validações', () => {
    it('deve validar e-mail corretamente', () => {
      const service = colaboradoresService as any;
      
      expect(service.validarEmail('teste@email.com')).toBe(true);
      expect(service.validarEmail('email.invalido')).toBe(false);
      expect(service.validarEmail('')).toBe(false);
      expect(service.validarEmail('teste@')).toBe(false);
    });

    it('deve validar dados do colaborador corretamente', async () => {
      const service = colaboradoresService as any;
      
      // Mock para empresa válida
      const mockEmpresaQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'empresa-1', status: 'ativo' },
            error: null
          })
        })
      };

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue(mockEmpresaQuery) 
      });

      // Teste de nome muito longo
      await expect(service.validarDadosColaborador({
        nomeCompleto: 'a'.repeat(256),
        email: 'teste@email.com',
        empresaId: 'empresa-1'
      })).rejects.toThrow(new ColaboradorError('Nome completo deve ter no máximo 255 caracteres', 'NOME_COMPLETO_TOO_LONG'));

      // Teste de função muito longa
      await expect(service.validarDadosColaborador({
        nomeCompleto: 'João Silva',
        email: 'teste@email.com',
        funcao: 'a'.repeat(101),
        empresaId: 'empresa-1'
      })).rejects.toThrow(new ColaboradorError('Função deve ter no máximo 100 caracteres', 'FUNCAO_TOO_LONG'));
    });
  });
});