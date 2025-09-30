import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useRequerimentos,
  useRequerimentosNaoEnviados,
  useRequerimentosFaturamento,
  useRequerimento,
  useClientesRequerimentos,
  useEstatisticasRequerimentos,
  useCreateRequerimento,
  useUpdateRequerimento,
  useDeleteRequerimento,
  useEnviarParaFaturamento,
  useEnviarMultiplosParaFaturamento,
  REQUERIMENTOS_QUERY_KEYS
} from '../useRequerimentos';
import { requerimentosService } from '@/services/requerimentosService';
import { RequerimentoFormData, Requerimento } from '@/types/requerimentos';
import React, { ReactNode } from 'react';

// Mock do toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// Mock do serviço
vi.mock('@/services/requerimentosService', () => ({
  requerimentosService: {
    listarRequerimentos: vi.fn(),
    buscarRequerimentosNaoEnviados: vi.fn(),
    gerarDadosFaturamento: vi.fn(),
    obterRequerimentoPorId: vi.fn(),
    buscarClientes: vi.fn(),
    obterEstatisticas: vi.fn(),
    criarRequerimento: vi.fn(),
    atualizarRequerimento: vi.fn(),
    deletarRequerimento: vi.fn(),
    enviarParaFaturamento: vi.fn()
  }
}));

// Mock da função de erro
vi.mock('@/errors/requerimentosErrors', () => ({
  getRequerimentoErrorMessage: vi.fn((error) => error.message || 'Erro desconhecido')
}));

describe('useRequerimentos hooks', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => JSX.Element;

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

  const mockRequerimentoFormData: RequerimentoFormData = {
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

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });

    wrapper = ({ children }: { children: ReactNode }) => 
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
    vi.resetAllMocks();
  });

  describe('useRequerimentos', () => {
    it('deve buscar requerimentos sem filtros', async () => {
      // Arrange
      const mockRequerimentos = [mockRequerimento];
      vi.mocked(requerimentosService.listarRequerimentos).mockResolvedValue(mockRequerimentos);

      // Act
      const { result } = renderHook(() => useRequerimentos(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRequerimentos);
      expect(requerimentosService.listarRequerimentos).toHaveBeenCalledWith(undefined);
    });

    it('deve buscar requerimentos com filtros', async () => {
      // Arrange
      const mockRequerimentos = [mockRequerimento];
      const filtros = { status: 'lancado' as const };
      vi.mocked(requerimentosService.listarRequerimentos).mockResolvedValue(mockRequerimentos);

      // Act
      const { result } = renderHook(() => useRequerimentos(filtros), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRequerimentos);
      expect(requerimentosService.listarRequerimentos).toHaveBeenCalledWith(filtros);
    });

    it('deve lidar com erro na busca', async () => {
      // Arrange
      const error = new Error('Erro de rede');
      vi.mocked(requerimentosService.listarRequerimentos).mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useRequerimentos(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useRequerimentosNaoEnviados', () => {
    it('deve buscar requerimentos não enviados', async () => {
      // Arrange
      const mockRequerimentos = [mockRequerimento];
      vi.mocked(requerimentosService.buscarRequerimentosNaoEnviados).mockResolvedValue(mockRequerimentos);

      // Act
      const { result } = renderHook(() => useRequerimentosNaoEnviados(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRequerimentos);
      expect(requerimentosService.buscarRequerimentosNaoEnviados).toHaveBeenCalled();
    });
  });

  describe('useRequerimentosFaturamento', () => {
    it('deve buscar dados de faturamento', async () => {
      // Arrange
      const mockFaturamentoData = {
        requerimentos: [mockRequerimento],
        totais: {
          'Faturado': { quantidade: 1, horas_total: 15.5 }
        } as any
      };
      vi.mocked(requerimentosService.gerarDadosFaturamento).mockResolvedValue(mockFaturamentoData);

      // Act
      const { result } = renderHook(() => useRequerimentosFaturamento(1), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockFaturamentoData);
      expect(requerimentosService.gerarDadosFaturamento).toHaveBeenCalledWith(1);
    });
  });

  describe('useRequerimento', () => {
    it('deve buscar requerimento por ID', async () => {
      // Arrange
      const id = mockRequerimento.id;
      vi.mocked(requerimentosService.obterRequerimentoPorId).mockResolvedValue(mockRequerimento);

      // Act
      const { result } = renderHook(() => useRequerimento(id), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRequerimento);
      expect(requerimentosService.obterRequerimentoPorId).toHaveBeenCalledWith(id);
    });

    it('não deve buscar quando ID está vazio', () => {
      // Act
      const { result } = renderHook(() => useRequerimento(''), { wrapper });

      // Assert
      expect(result.current.fetchStatus).toBe('idle');
      expect(requerimentosService.obterRequerimentoPorId).not.toHaveBeenCalled();
    });
  });

  describe('useClientesRequerimentos', () => {
    it('deve buscar clientes', async () => {
      // Arrange
      const mockClientes = [
        { id: '1', nome_completo: 'Cliente 1' },
        { id: '2', nome_completo: 'Cliente 2' }
      ];
      vi.mocked(requerimentosService.buscarClientes).mockResolvedValue(mockClientes);

      // Act
      const { result } = renderHook(() => useClientesRequerimentos(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockClientes);
      expect(requerimentosService.buscarClientes).toHaveBeenCalled();
    });
  });

  describe('useEstatisticasRequerimentos', () => {
    it('deve buscar estatísticas', async () => {
      // Arrange
      const mockEstatisticas = {
        total_requerimentos: 5,
        total_horas: 50,
        requerimentos_por_status: {
          lancado: 3,
          enviado_faturamento: 2,
          faturado: 0
        },
        requerimentos_por_tipo_cobranca: {} as any,
        horas_por_tipo_cobranca: {} as any
      };
      vi.mocked(requerimentosService.obterEstatisticas).mockResolvedValue(mockEstatisticas);

      // Act
      const { result } = renderHook(() => useEstatisticasRequerimentos(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockEstatisticas);
      expect(requerimentosService.obterEstatisticas).toHaveBeenCalledWith(undefined);
    });
  });

  describe('useCreateRequerimento', () => {
    it('deve criar requerimento com sucesso', async () => {
      // Arrange
      vi.mocked(requerimentosService.criarRequerimento).mockResolvedValue(mockRequerimento);

      // Act
      const { result } = renderHook(() => useCreateRequerimento(), { wrapper });

      await waitFor(() => {
        result.current.mutate(mockRequerimentoFormData);
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(requerimentosService.criarRequerimento).toHaveBeenCalledWith(mockRequerimentoFormData);
      expect(toast.success).toHaveBeenCalledWith('Requerimento criado com sucesso!');
    });

    it('deve lidar com erro na criação', async () => {
      // Arrange
      const error = new Error('Erro de validação');
      vi.mocked(requerimentosService.criarRequerimento).mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useCreateRequerimento(), { wrapper });

      await waitFor(() => {
        result.current.mutate(mockRequerimentoFormData);
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Erro ao criar requerimento: Erro de validação');
    });
  });

  describe('useUpdateRequerimento', () => {
    it('deve atualizar requerimento com sucesso', async () => {
      // Arrange
      const updateData = { descricao: 'Nova descrição' };
      vi.mocked(requerimentosService.atualizarRequerimento).mockResolvedValue();

      // Act
      const { result } = renderHook(() => useUpdateRequerimento(), { wrapper });

      await waitFor(() => {
        result.current.mutate({ id: mockRequerimento.id, data: updateData });
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(requerimentosService.atualizarRequerimento).toHaveBeenCalledWith(mockRequerimento.id, updateData);
      expect(toast.success).toHaveBeenCalledWith('Requerimento atualizado com sucesso!');
    });

    it('deve lidar com erro na atualização', async () => {
      // Arrange
      const error = new Error('Erro de validação');
      const updateData = { descricao: 'Nova descrição' };
      vi.mocked(requerimentosService.atualizarRequerimento).mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useUpdateRequerimento(), { wrapper });

      await waitFor(() => {
        result.current.mutate({ id: mockRequerimento.id, data: updateData });
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Erro ao atualizar requerimento: Erro de validação');
    });
  });

  describe('useDeleteRequerimento', () => {
    it('deve deletar requerimento com sucesso', async () => {
      // Arrange
      vi.mocked(requerimentosService.deletarRequerimento).mockResolvedValue();

      // Act
      const { result } = renderHook(() => useDeleteRequerimento(), { wrapper });

      await waitFor(() => {
        result.current.mutate(mockRequerimento.id);
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(requerimentosService.deletarRequerimento).toHaveBeenCalledWith(mockRequerimento.id);
      expect(toast.success).toHaveBeenCalledWith('Requerimento deletado com sucesso!');
    });

    it('deve lidar com erro na exclusão', async () => {
      // Arrange
      const error = new Error('Requerimento já enviado para faturamento');
      vi.mocked(requerimentosService.deletarRequerimento).mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useDeleteRequerimento(), { wrapper });

      await waitFor(() => {
        result.current.mutate(mockRequerimento.id);
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Erro ao deletar requerimento: Requerimento já enviado para faturamento');
    });
  });

  describe('useEnviarParaFaturamento', () => {
    it('deve enviar requerimento para faturamento com sucesso', async () => {
      // Arrange
      vi.mocked(requerimentosService.enviarParaFaturamento).mockResolvedValue();

      // Act
      const { result } = renderHook(() => useEnviarParaFaturamento(), { wrapper });

      await waitFor(() => {
        result.current.mutate(mockRequerimento.id);
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(requerimentosService.enviarParaFaturamento).toHaveBeenCalledWith(mockRequerimento.id);
      expect(toast.success).toHaveBeenCalledWith('Requerimento enviado para faturamento com sucesso!');
    });

    it('deve lidar com erro no envio', async () => {
      // Arrange
      const error = new Error('Requerimento já foi enviado');
      vi.mocked(requerimentosService.enviarParaFaturamento).mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useEnviarParaFaturamento(), { wrapper });

      await waitFor(() => {
        result.current.mutate(mockRequerimento.id);
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Erro ao enviar para faturamento: Requerimento já foi enviado');
    });
  });

  describe('useEnviarMultiplosParaFaturamento', () => {
    it('deve enviar múltiplos requerimentos para faturamento com sucesso', async () => {
      // Arrange
      const ids = [mockRequerimento.id, 'outro-id'];
      vi.mocked(requerimentosService.enviarParaFaturamento)
        .mockResolvedValueOnce()
        .mockResolvedValueOnce();

      // Act
      const { result } = renderHook(() => useEnviarMultiplosParaFaturamento(), { wrapper });

      await waitFor(() => {
        result.current.mutate(ids);
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(requerimentosService.enviarParaFaturamento).toHaveBeenCalledTimes(2);
      expect(toast.success).toHaveBeenCalledWith('2 requerimento(s) enviado(s) para faturamento com sucesso!');
    });

    it('deve lidar com erro no envio múltiplo', async () => {
      // Arrange
      const ids = [mockRequerimento.id, 'outro-id'];
      const error = new Error('Erro no envio');
      vi.mocked(requerimentosService.enviarParaFaturamento).mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useEnviarMultiplosParaFaturamento(), { wrapper });

      await waitFor(() => {
        result.current.mutate(ids);
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Erro ao enviar requerimentos para faturamento: Erro no envio');
    });
  });

  describe('REQUERIMENTOS_QUERY_KEYS', () => {
    it('deve gerar chaves de cache corretas', () => {
      expect(REQUERIMENTOS_QUERY_KEYS.all).toEqual(['requerimentos']);
      expect(REQUERIMENTOS_QUERY_KEYS.lists()).toEqual(['requerimentos', 'list']);
      expect(REQUERIMENTOS_QUERY_KEYS.list({ status: 'lancado' })).toEqual(['requerimentos', 'list', { status: 'lancado' }]);
      expect(REQUERIMENTOS_QUERY_KEYS.details()).toEqual(['requerimentos', 'detail']);
      expect(REQUERIMENTOS_QUERY_KEYS.detail('123')).toEqual(['requerimentos', 'detail', '123']);
      expect(REQUERIMENTOS_QUERY_KEYS.naoEnviados()).toEqual(['requerimentos', 'nao-enviados']);
      expect(REQUERIMENTOS_QUERY_KEYS.faturamento(1)).toEqual(['requerimentos', 'faturamento', 1]);
      expect(REQUERIMENTOS_QUERY_KEYS.clientes()).toEqual(['clientes-requerimentos']);
      expect(REQUERIMENTOS_QUERY_KEYS.estatisticas({ status: 'lancado' })).toEqual(['requerimentos', 'estatisticas', { status: 'lancado' }]);
    });
  });
});