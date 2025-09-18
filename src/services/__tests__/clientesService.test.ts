import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { clientesService, ClienteError } from '../clientesService';
import { supabase } from '@/integrations/supabase/client';
import { Cliente_STATUS } from '@/types/clientBooksTypes';
import type { ClienteFormData } from '@/types/clientBooksTypes';

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

describe('ClientesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('criarCliente', () => {
    const clienteValidoData: ClienteFormData = {
      nomeCompleto: 'João Silva',
      email: 'joao.silva@empresa.com',
      funcao: 'Gerente',
      empresaId: 'empresa-1',
      status: 'ativo',
      principalContato: false
    };

    it('deve criar um cliente com dados válidos', async () => {
      const clienteCriado = {
        id: 'cliente-1',
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
            data: clienteCriado,
            error: null
          })
        })
      });

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmpresaQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmailQuery) })
        .mockReturnValueOnce({ insert: mockInsert });

      const resultado = await clientesService.criarCliente(clienteValidoData);

      expect(resultado).toEqual(clienteCriado);
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
      const dadosInvalidos = { ...clienteValidoData, nomeCompleto: '' };

      await expect(clientesService.criarCliente(dadosInvalidos))
        .rejects
        .toThrow(new ClienteError('Nome completo é obrigatório', 'NOME_COMPLETO_REQUIRED'));
    });

    it('deve lançar erro quando e-mail não for fornecido', async () => {
      const dadosInvalidos = { ...clienteValidoData, email: '' };

      await expect(clientesService.criarCliente(dadosInvalidos))
        .rejects
        .toThrow(new ClienteError('E-mail é obrigatório', 'EMAIL_REQUIRED'));
    });

    it('deve lançar erro quando empresa não for fornecida', async () => {
      const dadosInvalidos = { ...clienteValidoData, empresaId: '' };

      await expect(clientesService.criarCliente(dadosInvalidos))
        .rejects
        .toThrow(new ClienteError('Empresa é obrigatória', 'EMPRESA_REQUIRED'));
    });

    it('deve lançar erro quando e-mail for inválido', async () => {
      const dadosInvalidos = { ...clienteValidoData, email: 'email-invalido' };

      await expect(clientesService.criarCliente(dadosInvalidos))
        .rejects
        .toThrow(new ClienteError('E-mail inválido', 'INVALID_EMAIL'));
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

      await expect(clientesService.criarCliente(clienteValidoData))
        .rejects
        .toThrow(new ClienteError('Empresa não encontrada', 'EMPRESA_NOT_FOUND'));
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

      await expect(clientesService.criarCliente(clienteValidoData))
        .rejects
        .toThrow(new ClienteError('Não é possível associar cliente a empresa inativa', 'EMPRESA_INACTIVE'));
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
        data: [{ id: 'cliente-existente' }], 
        error: null 
      });

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmpresaQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmailQuery) });

      await expect(clientesService.criarCliente(clienteValidoData))
        .rejects
        .toThrow(new ClienteError('Já existe um cliente com este e-mail nesta empresa', 'EMAIL_ALREADY_EXISTS'));
    });

    it('deve remover principal contato existente quando novo cliente for principal', async () => {
      const dadosComPrincipal = { ...clienteValidoData, principalContato: true };

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
            data: { id: 'cliente-1' },
            error: null
          })
        })
      });

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmpresaQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmailQuery) })
        .mockReturnValueOnce({ update: mockUpdatePrincipal })
        .mockReturnValueOnce({ insert: mockInsert });

      await clientesService.criarCliente(dadosComPrincipal);

      expect(mockUpdatePrincipal).toHaveBeenCalled();
    });
  });

  describe('listarClientes', () => {
    it('deve listar clientes ativos por padrão', async () => {
      const clientes = [
        { id: '1', nome_completo: 'João Silva', status: 'ativo' },
        { id: '2', nome_completo: 'Maria Santos', status: 'ativo' }
      ];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: clientes, error: null })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await clientesService.listarClientes();

      expect(resultado).toEqual(clientes);
      expect(mockQuery.eq).toHaveBeenCalledWith('status', Cliente_STATUS.ATIVO);
    });

    it('deve aplicar filtro por empresa', async () => {
      const clientes = [
        { id: '1', nome_completo: 'João Silva', empresa_id: 'empresa-1' }
      ];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: clientes, error: null })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await clientesService.listarClientes({ empresaId: 'empresa-1' });

      expect(resultado).toEqual(clientes);
      expect(mockQuery.eq).toHaveBeenCalledWith('empresa_id', 'empresa-1');
    });

    it('deve aplicar filtro de busca', async () => {
      const clientes = [
        { id: '1', nome_completo: 'João Silva' }
      ];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: clientes, error: null })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await clientesService.listarClientes({ busca: 'João' });

      expect(resultado).toEqual(clientes);
      expect(mockQuery.or).toHaveBeenCalledWith('nome_completo.ilike.%João%,email.ilike.%João%,funcao.ilike.%João%');
    });
  });

  describe('obterClientePorId', () => {
    it('deve retornar cliente quando encontrado', async () => {
      const cliente = {
        id: '1',
        nome_completo: 'João Silva',
        email: 'joao@empresa.com'
      };

      const mockQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: cliente, error: null })
        })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await clientesService.obterClientePorId('1');

      expect(resultado).toEqual(cliente);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1');
    });

    it('deve retornar null quando cliente não for encontrado', async () => {
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

      const resultado = await clientesService.obterClientePorId('inexistente');

      expect(resultado).toBeNull();
    });
  });

  describe('atualizarCliente', () => {
    it('deve atualizar cliente com dados válidos', async () => {
      const clienteAtual = {
        id: '1',
        nome_completo: 'João Silva',
        email: 'joao@empresa.com',
        empresa_id: 'empresa-1',
        principal_contato: false
      };

      // Mock para obter cliente atual
      const mockGetQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: clienteAtual, error: null })
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

      await clientesService.atualizarCliente('1', dadosAtualizacao);

      expect(mockUpdate).toHaveBeenCalledWith({
        nome_completo: 'João Silva Santos',
        status: 'inativo',
        data_status: expect.any(String),
        descricao_status: 'Saiu da empresa',
        updated_at: expect.any(String)
      });
    });

    it('deve lançar erro quando cliente não for encontrado', async () => {
      const mockGetQuery = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      };

      (supabase.from as any).mockReturnValue({ 
        select: vi.fn().mockReturnValue(mockGetQuery) 
      });

      await expect(clientesService.atualizarCliente('inexistente', {}))
        .rejects
        .toThrow(new ClienteError('Cliente não encontrado', 'NOT_FOUND'));
    });
  });

  describe('atualizarStatus', () => {
    it('deve atualizar status com dados válidos', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      (supabase.from as any).mockReturnValue({ update: mockUpdate });

      await clientesService.atualizarStatus('1', Cliente_STATUS.INATIVO, 'Saiu da empresa');

      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'inativo',
        data_status: expect.any(String),
        descricao_status: 'Saiu da empresa',
        updated_at: expect.any(String)
      });
    });

    it('deve lançar erro quando status for inválido', async () => {
      await expect(clientesService.atualizarStatus('1', 'status-invalido', ''))
        .rejects
        .toThrow(new ClienteError('Status inválido', 'INVALID_STATUS'));
    });

    it('deve exigir descrição para status inativo', async () => {
      await expect(clientesService.atualizarStatus('1', Cliente_STATUS.INATIVO, ''))
        .rejects
        .toThrow(new ClienteError('Descrição é obrigatória para status Inativo', 'DESCRIPTION_REQUIRED'));
    });
  });

  describe('deletarCliente', () => {
    it('deve deletar cliente quando não há histórico de disparos', async () => {
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

      await clientesService.deletarCliente('1');

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

      await expect(clientesService.deletarCliente('1'))
        .rejects
        .toThrow(new ClienteError('Não é possível deletar cliente com histórico de disparos', 'HAS_DISPATCH_HISTORY'));
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

      const resultado = await clientesService.obterPrincipalContato('empresa-1');

      expect(resultado).toEqual(principalContato);
      expect(mockQuery.eq).toHaveBeenCalledWith('empresa_id', 'empresa-1');
      expect(mockQuery.eq).toHaveBeenCalledWith('principal_contato', true);
      expect(mockQuery.eq).toHaveBeenCalledWith('status', Cliente_STATUS.ATIVO);
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

      const resultado = await clientesService.obterPrincipalContato('empresa-1');

      expect(resultado).toBeNull();
    });
  });

  describe('listarAtivos', () => {
    it('deve listar apenas clientes ativos da empresa', async () => {
      const clientesAtivos = [
        { id: '1', nome_completo: 'João Silva', status: 'ativo' },
        { id: '2', nome_completo: 'Maria Santos', status: 'ativo' }
      ];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: clientesAtivos, error: null })
      };

      const mockSelect = vi.fn().mockReturnValue(mockQuery);
      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const resultado = await clientesService.listarAtivos('empresa-1');

      expect(resultado).toEqual(clientesAtivos);
      expect(mockQuery.eq).toHaveBeenCalledWith('empresa_id', 'empresa-1');
      expect(mockQuery.eq).toHaveBeenCalledWith('status', Cliente_STATUS.ATIVO);
    });
  });

  describe('Validações', () => {
    it('deve validar e-mail corretamente', () => {
      const service = clientesService as any;
      
      expect(service.validarEmail('teste@email.com')).toBe(true);
      expect(service.validarEmail('email.invalido')).toBe(false);
      expect(service.validarEmail('')).toBe(false);
      expect(service.validarEmail('teste@')).toBe(false);
    });

    it('deve validar dados do cliente corretamente', async () => {
      const service = clientesService as any;
      
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
      await expect(service.validarDadosCliente({
        nomeCompleto: 'a'.repeat(256),
        email: 'teste@email.com',
        empresaId: 'empresa-1'
      })).rejects.toThrow(new ClienteError('Nome completo deve ter no máximo 255 caracteres', 'NOME_COMPLETO_TOO_LONG'));

      // Teste de função muito longa
      await expect(service.validarDadosCliente({
        nomeCompleto: 'João Silva',
        email: 'teste@email.com',
        funcao: 'a'.repeat(101),
        empresaId: 'empresa-1'
      })).rejects.toThrow(new ClienteError('Função deve ter no máximo 100 caracteres', 'FUNCAO_TOO_LONG'));
    });
  });
});