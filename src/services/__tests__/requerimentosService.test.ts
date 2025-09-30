import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RequerimentosService } from '../requerimentosService';
import { supabase } from '@/integrations/supabase/client';
import { RequerimentoFormData, Requerimento, StatusRequerimento } from '@/types/requerimentos';

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
          eq: vi.fn(() => ({
            single: vi.fn(),
            order: vi.fn(() => ({
              order: vi.fn()
            }))
          })),
          order: vi.fn(() => ({
            order: vi.fn()
          })),
          single: vi.fn()
        })),
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            order: vi.fn()
          }))
        })),
        order: vi.fn()
      })),
      update: vi.fn(() => ({
        eq: vi.fn()
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      }))
    }))
  }
}));

describe('RequerimentosService', () => {
  let service: RequerimentosService;
  let mockSupabaseFrom: any;

  const mockRequerimentoData: RequerimentoFormData = {
    chamado: 'RF-6017993',
    cliente_id: '123e4567-e89b-12d3-a456-426614174000',
    modulo: 'Comply',
    descricao: 'Descrição do requerimento de teste',
    data_envio: '2024-01-15',
    data_aprovacao: '2024-01-16',
    horas_funcional: 10.5,
    horas_tecnico: 5.0,
    linguagem: 'Funcional',
    tipo_cobranca: 'Faturado',
    mes_cobranca: 1,
    observacao: 'Observação de teste'
  };

  const mockRequerimento: Requerimento = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    chamado: 'RF-6017993',
    cliente_id: '123e4567-e89b-12d3-a456-426614174000',
    cliente_nome: 'Cliente Teste',
    modulo: 'Comply',
    descricao: 'Descrição do requerimento de teste',
    data_envio: '2024-01-15',
    data_aprovacao: '2024-01-16',
    horas_funcional: 10.5,
    horas_tecnico: 5.0,
    horas_total: 15.5,
    linguagem: 'Funcional',
    tipo_cobranca: 'Faturado',
    mes_cobranca: 1,
    observacao: 'Observação de teste',
    status: 'lancado',
    enviado_faturamento: false,
    data_envio_faturamento: null,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  };

  beforeEach(() => {
    service = new RequerimentosService();
    mockSupabaseFrom = vi.mocked(supabase.from);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('criarRequerimento', () => {
    it('deve criar um requerimento com dados válidos', async () => {
      // Arrange
      const mockClienteResponse = { data: { id: mockRequerimentoData.cliente_id }, error: null };
      const mockInsertResponse = { 
        data: { 
          ...mockRequerimento,
          cliente: { id: mockRequerimentoData.cliente_id, nome_completo: 'Cliente Teste' }
        }, 
        error: null 
      };

      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockClienteResponse)
            })
          })
        })
      });

      mockSupabaseFrom.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockInsertResponse)
          })
        })
      });

      // Act
      const result = await service.criarRequerimento(mockRequerimentoData);

      // Assert
      expect(result).toEqual(mockRequerimento);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('empresas_clientes');
      expect(mockSupabaseFrom).toHaveBeenCalledWith('requerimentos');
    });

    it('deve lançar erro quando chamado está vazio', async () => {
      // Arrange
      const invalidData = { ...mockRequerimentoData, chamado: '' };

      // Act & Assert
      await expect(service.criarRequerimento(invalidData))
        .rejects.toThrow('Dados inválidos: Chamado é obrigatório');
    });

    it('deve lançar erro quando chamado tem formato inválido', async () => {
      // Arrange
      const invalidData = { ...mockRequerimentoData, chamado: 'RF@123' };

      // Act & Assert
      await expect(service.criarRequerimento(invalidData))
        .rejects.toThrow('Dados inválidos: Chamado deve conter apenas letras, números e hífen');
    });

    it('deve lançar erro quando descrição excede 500 caracteres', async () => {
      // Arrange
      const invalidData = { 
        ...mockRequerimentoData, 
        descricao: 'a'.repeat(501) 
      };

      // Act & Assert
      await expect(service.criarRequerimento(invalidData))
        .rejects.toThrow('Dados inválidos: Descrição deve ter no máximo 500 caracteres');
    });

    it('deve lançar erro quando observação excede 1000 caracteres', async () => {
      // Arrange
      const invalidData = { 
        ...mockRequerimentoData, 
        observacao: 'a'.repeat(1001) 
      };

      // Act & Assert
      await expect(service.criarRequerimento(invalidData))
        .rejects.toThrow('Dados inválidos: Observação deve ter no máximo 1000 caracteres');
    });

    it('deve lançar erro quando cliente não existe', async () => {
      // Arrange
      const mockClienteResponse = { data: null, error: { code: 'PGRST116' } };

      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockClienteResponse)
            })
          })
        })
      });

      // Act & Assert
      await expect(service.criarRequerimento(mockRequerimentoData))
        .rejects.toThrow('Cliente não encontrado ou inativo');
    });

    it('deve lançar erro quando horas são negativas', async () => {
      // Arrange
      const invalidData = { 
        ...mockRequerimentoData, 
        horas_funcional: -1 
      };

      // Act & Assert
      await expect(service.criarRequerimento(invalidData))
        .rejects.toThrow('Dados inválidos: Horas funcionais são obrigatórias e devem ser >= 0');
    });

    it('deve lançar erro quando não há horas (funcional e técnica zeradas)', async () => {
      // Arrange
      const invalidData = { 
        ...mockRequerimentoData, 
        horas_funcional: 0,
        horas_tecnico: 0
      };

      // Act & Assert
      await expect(service.criarRequerimento(invalidData))
        .rejects.toThrow('Dados inválidos: Deve haver pelo menos uma hora (funcional ou técnica)');
    });

    it('deve lançar erro quando mês de cobrança está fora do range', async () => {
      // Arrange
      const invalidData = { 
        ...mockRequerimentoData, 
        mes_cobranca: 13 
      };

      // Act & Assert
      await expect(service.criarRequerimento(invalidData))
        .rejects.toThrow('Dados inválidos: Mês de cobrança é obrigatório e deve estar entre 1 e 12');
    });

    it('deve lançar erro quando data de aprovação é anterior à data de envio', async () => {
      // Arrange
      const invalidData = { 
        ...mockRequerimentoData, 
        data_envio: '2024-01-16',
        data_aprovacao: '2024-01-15'
      };

      // Act & Assert
      await expect(service.criarRequerimento(invalidData))
        .rejects.toThrow('Dados inválidos: Data de aprovação não pode ser anterior à data de envio');
    });
  });

  describe('listarRequerimentos', () => {
    it('deve listar requerimentos sem filtros', async () => {
      // Arrange
      const mockResponse = { 
        data: [{ 
          ...mockRequerimento,
          cliente: { id: mockRequerimento.cliente_id, nome_completo: 'Cliente Teste' }
        }], 
        error: null 
      };

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockResponse)
        })
      });

      // Act
      const result = await service.listarRequerimentos();

      // Assert
      expect(result).toEqual([mockRequerimento]);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('requerimentos');
    });

    it('deve listar requerimentos com filtro de status', async () => {
      // Arrange
      const mockResponse = { 
        data: [{ 
          ...mockRequerimento,
          cliente: { id: mockRequerimento.cliente_id, nome_completo: 'Cliente Teste' }
        }], 
        error: null 
      };

      const mockQuery = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue(mockResponse)
          })
        })
      };

      mockSupabaseFrom.mockReturnValue(mockQuery);

      // Act
      const result = await service.listarRequerimentos({ status: 'lancado' });

      // Assert
      expect(result).toEqual([mockRequerimento]);
      expect(mockQuery.select().eq).toHaveBeenCalledWith('status', 'lancado');
    });

    it('deve listar requerimentos com filtro de tipo de cobrança', async () => {
      // Arrange
      const mockResponse = { 
        data: [{ 
          ...mockRequerimento,
          cliente: { id: mockRequerimento.cliente_id, nome_completo: 'Cliente Teste' }
        }], 
        error: null 
      };

      const mockQuery = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue(mockResponse)
          })
        })
      };

      mockSupabaseFrom.mockReturnValue(mockQuery);

      // Act
      const result = await service.listarRequerimentos({ tipo_cobranca: 'Faturado' });

      // Assert
      expect(result).toEqual([mockRequerimento]);
      expect(mockQuery.select().eq).toHaveBeenCalledWith('tipo_cobranca', 'Faturado');
    });

    it('deve retornar array vazio quando não há dados', async () => {
      // Arrange
      const mockResponse = { data: null, error: null };

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockResponse)
        })
      });

      // Act
      const result = await service.listarRequerimentos();

      // Assert
      expect(result).toEqual([]);
    });

    it('deve lançar erro quando há erro no banco', async () => {
      // Arrange
      const mockResponse = { data: null, error: { message: 'Database error' } };

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockResponse)
        })
      });

      // Act & Assert
      await expect(service.listarRequerimentos())
        .rejects.toThrow('Erro ao listar requerimentos: Database error');
    });
  });

  describe('obterRequerimentoPorId', () => {
    it('deve retornar requerimento quando ID existe', async () => {
      // Arrange
      const mockResponse = { 
        data: { 
          ...mockRequerimento,
          cliente: { id: mockRequerimento.cliente_id, nome_completo: 'Cliente Teste' }
        }, 
        error: null 
      };

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockResponse)
          })
        })
      });

      // Act
      const result = await service.obterRequerimentoPorId(mockRequerimento.id);

      // Assert
      expect(result).toEqual(mockRequerimento);
    });

    it('deve retornar null quando requerimento não existe', async () => {
      // Arrange
      const mockResponse = { data: null, error: { code: 'PGRST116' } };

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockResponse)
          })
        })
      });

      // Act
      const result = await service.obterRequerimentoPorId('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });

    it('deve lançar erro quando ID está vazio', async () => {
      // Act & Assert
      await expect(service.obterRequerimentoPorId(''))
        .rejects.toThrow('ID é obrigatório');
    });

    it('deve lançar erro quando há erro no banco', async () => {
      // Arrange
      const mockResponse = { data: null, error: { message: 'Database error' } };

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockResponse)
          })
        })
      });

      // Act & Assert
      await expect(service.obterRequerimentoPorId(mockRequerimento.id))
        .rejects.toThrow('Erro ao obter requerimento: Database error');
    });
  });

  describe('atualizarRequerimento', () => {
    it('deve atualizar requerimento com dados válidos', async () => {
      // Arrange
      const updateData = { descricao: 'Nova descrição' };
      const mockResponse = { error: null };

      mockSupabaseFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockResponse)
        })
      });

      // Act
      await service.atualizarRequerimento(mockRequerimento.id, updateData);

      // Assert
      expect(mockSupabaseFrom).toHaveBeenCalledWith('requerimentos');
    });

    it('deve lançar erro quando ID está vazio', async () => {
      // Act & Assert
      await expect(service.atualizarRequerimento('', { descricao: 'Nova descrição' }))
        .rejects.toThrow('ID é obrigatório');
    });

    it('deve lançar erro quando há erro no banco', async () => {
      // Arrange
      const updateData = { descricao: 'Nova descrição' };
      const mockResponse = { error: { message: 'Database error' } };

      mockSupabaseFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockResponse)
        })
      });

      // Act & Assert
      await expect(service.atualizarRequerimento(mockRequerimento.id, updateData))
        .rejects.toThrow('Erro ao atualizar requerimento: Database error');
    });
  });

  describe('deletarRequerimento', () => {
    it('deve deletar requerimento quando não foi enviado para faturamento', async () => {
      // Arrange
      const mockGetResponse = { 
        data: { 
          ...mockRequerimento,
          cliente: { id: mockRequerimento.cliente_id, nome_completo: 'Cliente Teste' }
        }, 
        error: null 
      };
      const mockDeleteResponse = { error: null };

      // Mock para obterRequerimentoPorId
      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockGetResponse)
          })
        })
      });

      // Mock para delete
      mockSupabaseFrom.mockReturnValueOnce({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockDeleteResponse)
        })
      });

      // Act
      await service.deletarRequerimento(mockRequerimento.id);

      // Assert
      expect(mockSupabaseFrom).toHaveBeenCalledWith('requerimentos');
    });

    it('deve lançar erro quando requerimento não existe', async () => {
      // Arrange
      const mockGetResponse = { data: null, error: { code: 'PGRST116' } };

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockGetResponse)
          })
        })
      });

      // Act & Assert
      await expect(service.deletarRequerimento('non-existent-id'))
        .rejects.toThrow('Requerimento não encontrado');
    });

    it('deve lançar erro quando requerimento já foi enviado para faturamento', async () => {
      // Arrange
      const requerimentoEnviado = { 
        ...mockRequerimento, 
        enviado_faturamento: true,
        cliente: { id: mockRequerimento.cliente_id, nome_completo: 'Cliente Teste' }
      };
      const mockGetResponse = { data: requerimentoEnviado, error: null };

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockGetResponse)
          })
        })
      });

      // Act & Assert
      await expect(service.deletarRequerimento(mockRequerimento.id))
        .rejects.toThrow('Não é possível deletar requerimento já enviado para faturamento');
    });

    it('deve lançar erro quando ID está vazio', async () => {
      // Act & Assert
      await expect(service.deletarRequerimento(''))
        .rejects.toThrow('ID é obrigatório');
    });
  });

  describe('enviarParaFaturamento', () => {
    it('deve enviar requerimento para faturamento', async () => {
      // Arrange
      const mockGetResponse = { 
        data: { 
          ...mockRequerimento,
          cliente: { id: mockRequerimento.cliente_id, nome_completo: 'Cliente Teste' }
        }, 
        error: null 
      };
      const mockUpdateResponse = { error: null };

      // Mock para obterRequerimentoPorId
      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockGetResponse)
          })
        })
      });

      // Mock para update
      mockSupabaseFrom.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockUpdateResponse)
        })
      });

      // Act
      await service.enviarParaFaturamento(mockRequerimento.id);

      // Assert
      expect(mockSupabaseFrom).toHaveBeenCalledWith('requerimentos');
    });

    it('deve lançar erro quando requerimento não existe', async () => {
      // Arrange
      const mockGetResponse = { data: null, error: { code: 'PGRST116' } };

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockGetResponse)
          })
        })
      });

      // Act & Assert
      await expect(service.enviarParaFaturamento('non-existent-id'))
        .rejects.toThrow('Requerimento não encontrado');
    });

    it('deve lançar erro quando requerimento já foi enviado', async () => {
      // Arrange
      const requerimentoEnviado = { 
        ...mockRequerimento, 
        enviado_faturamento: true,
        cliente: { id: mockRequerimento.cliente_id, nome_completo: 'Cliente Teste' }
      };
      const mockGetResponse = { data: requerimentoEnviado, error: null };

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockGetResponse)
          })
        })
      });

      // Act & Assert
      await expect(service.enviarParaFaturamento(mockRequerimento.id))
        .rejects.toThrow('Requerimento já foi enviado para faturamento');
    });

    it('deve lançar erro quando ID está vazio', async () => {
      // Act & Assert
      await expect(service.enviarParaFaturamento(''))
        .rejects.toThrow('ID é obrigatório');
    });
  });

  describe('buscarClientes', () => {
    it('deve retornar lista de clientes ativos', async () => {
      // Arrange
      const mockClientes = [
        { id: '1', nome_completo: 'Cliente 1' },
        { id: '2', nome_completo: 'Cliente 2' }
      ];
      const mockResponse = { data: mockClientes, error: null };

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue(mockResponse)
          })
        })
      });

      // Act
      const result = await service.buscarClientes();

      // Assert
      expect(result).toEqual(mockClientes);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('empresas_clientes');
    });

    it('deve retornar array vazio quando não há clientes', async () => {
      // Arrange
      const mockResponse = { data: null, error: null };

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue(mockResponse)
          })
        })
      });

      // Act
      const result = await service.buscarClientes();

      // Assert
      expect(result).toEqual([]);
    });

    it('deve lançar erro quando há erro no banco', async () => {
      // Arrange
      const mockResponse = { data: null, error: { message: 'Database error' } };

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue(mockResponse)
          })
        })
      });

      // Act & Assert
      await expect(service.buscarClientes())
        .rejects.toThrow('Erro ao buscar clientes: Database error');
    });
  });

  describe('gerarDadosFaturamento', () => {
    it('deve gerar dados de faturamento agrupados por tipo de cobrança', async () => {
      // Arrange
      const mockRequerimentos = [
        { ...mockRequerimento, tipo_cobranca: 'Faturado', horas_total: 10 },
        { ...mockRequerimento, tipo_cobranca: 'Faturado', horas_total: 15 },
        { ...mockRequerimento, tipo_cobranca: 'Banco de Horas', horas_total: 8 }
      ];

      // Mock para buscarRequerimentosParaFaturamento
      vi.spyOn(service, 'buscarRequerimentosParaFaturamento').mockResolvedValue(mockRequerimentos as any);

      // Act
      const result = await service.gerarDadosFaturamento(1);

      // Assert
      expect(result.requerimentos).toEqual(mockRequerimentos);
      expect(result.totais['Faturado'].quantidade).toBe(2);
      expect(result.totais['Faturado'].horas_total).toBe(25);
      expect(result.totais['Banco de Horas'].quantidade).toBe(1);
      expect(result.totais['Banco de Horas'].horas_total).toBe(8);
      expect(result.totais['Cobro Interno'].quantidade).toBe(0);
      expect(result.totais['Cobro Interno'].horas_total).toBe(0);
    });
  });

  describe('obterEstatisticas', () => {
    it('deve calcular estatísticas corretamente', async () => {
      // Arrange
      const mockRequerimentos = [
        { ...mockRequerimento, status: 'lancado', tipo_cobranca: 'Faturado', horas_total: 10 },
        { ...mockRequerimento, status: 'enviado_faturamento', tipo_cobranca: 'Faturado', horas_total: 15 },
        { ...mockRequerimento, status: 'lancado', tipo_cobranca: 'Banco de Horas', horas_total: 8 }
      ];

      // Mock para listarRequerimentos
      vi.spyOn(service, 'listarRequerimentos').mockResolvedValue(mockRequerimentos as any);

      // Act
      const result = await service.obterEstatisticas();

      // Assert
      expect(result.total_requerimentos).toBe(3);
      expect(result.total_horas).toBe(33);
      expect(result.requerimentos_por_status.lancado).toBe(2);
      expect(result.requerimentos_por_status.enviado_faturamento).toBe(1);
      expect(result.requerimentos_por_tipo_cobranca['Faturado']).toBe(2);
      expect(result.requerimentos_por_tipo_cobranca['Banco de Horas']).toBe(1);
      expect(result.horas_por_tipo_cobranca['Faturado']).toBe(25);
      expect(result.horas_por_tipo_cobranca['Banco de Horas']).toBe(8);
    });
  });
});