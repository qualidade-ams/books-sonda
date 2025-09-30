/**
 * Testes de integração para hooks do Sistema de Requerimentos
 * Testa a integração entre hooks, React Query e serviços
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  useRequerimentos,
  useRequerimentosNaoEnviados,
  useRequerimentosFaturamento,
  useCreateRequerimento,
  useEnviarParaFaturamento,
  useClientesRequerimentos,
  useEstatisticasRequerimentos
} from '@/hooks/useRequerimentos';
import { supabase } from '@/integrations/supabase/client';
import type { RequerimentoFormData, Requerimento } from '@/types/requerimentos';

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
            order: vi.fn()
          })),
          single: vi.fn(),
          order: vi.fn(),
          gte: vi.fn(() => ({
            lt: vi.fn(() => ({
              order: vi.fn(() => ({
                order: vi.fn()
              }))
            }))
          }))
        })),
        order: vi.fn()
      })),
      update: vi.fn(() => ({
        eq: vi.fn()
      }))
    }))
  }
}));

// Mock do toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// Wrapper para testes com React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Sistema de Requerimentos - Integração de Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useRequerimentos', () => {
    it('deve buscar requerimentos com filtros', async () => {
      const requerimentosMock: Requerimento[] = [
        {
          id: 'req-1',
          chamado: 'RF-001',
          cliente_id: 'cliente-1',
          cliente_nome: 'Cliente A',
          modulo: 'Comply',
          descricao: 'Descrição 1',
          data_envio: '2024-01-15',
          data_aprovacao: '2024-01-20',
          horas_funcional: 4.0,
          horas_tecnico: 2.0,
          horas_total: 6.0,
          linguagem: 'ABAP',
          tipo_cobranca: 'Faturado',
          mes_cobranca: 1,
          observacao: null,
          status: 'lancado',
          enviado_faturamento: false,
          data_envio_faturamento: null,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z'
        }
      ];

      // Mock para buscar requerimentos
      const mockRequerimentosQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: requerimentosMock.map(req => ({
            ...req,
            cliente: { id: req.cliente_id, nome_completo: req.cliente_nome }
          })),
          error: null
        })
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(mockRequerimentosQuery)
      });

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useRequerimentos({ status: 'lancado' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(requerimentosMock);
      expect(mockRequerimentosQuery.eq).toHaveBeenCalledWith('status', 'lancado');
    });

    it('deve tratar erro na busca de requerimentos', async () => {
      // Mock para erro na busca
      const mockRequerimentosError = {
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' }
        })
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(mockRequerimentosError)
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useRequerimentos(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useRequerimentosNaoEnviados', () => {
    it('deve buscar apenas requerimentos não enviados para faturamento', async () => {
      const requerimentosNaoEnviados: Requerimento[] = [
        {
          id: 'req-1',
          chamado: 'RF-001',
          cliente_id: 'cliente-1',
          cliente_nome: 'Cliente A',
          modulo: 'Comply',
          descricao: 'Descrição 1',
          data_envio: '2024-01-15',
          data_aprovacao: '2024-01-20',
          horas_funcional: 4.0,
          horas_tecnico: 2.0,
          horas_total: 6.0,
          linguagem: 'ABAP',
          tipo_cobranca: 'Faturado',
          mes_cobranca: 1,
          observacao: null,
          status: 'lancado',
          enviado_faturamento: false,
          data_envio_faturamento: null,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z'
        }
      ];

      // Mock para buscar requerimentos não enviados
      const mockNaoEnviadosQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: requerimentosNaoEnviados.map(req => ({
            ...req,
            cliente: { id: req.cliente_id, nome_completo: req.cliente_nome }
          })),
          error: null
        })
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(mockNaoEnviadosQuery)
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useRequerimentosNaoEnviados(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(requerimentosNaoEnviados);
      expect(mockNaoEnviadosQuery.eq).toHaveBeenCalledWith('status', 'lancado');
    });
  });

  describe('useRequerimentosFaturamento', () => {
    it('deve buscar dados de faturamento agrupados por tipo', async () => {
      const requerimentosFaturamento = [
        {
          id: 'req-1',
          chamado: 'RF-001',
          cliente_id: 'cliente-1',
          modulo: 'Comply',
          descricao: 'Descrição 1',
          data_envio: '2024-01-15',
          data_aprovacao: '2024-01-20',
          horas_funcional: 4.0,
          horas_tecnico: 2.0,
          horas_total: 6.0,
          linguagem: 'ABAP',
          tipo_cobranca: 'Faturado',
          mes_cobranca: 1,
          observacao: null,
          status: 'enviado_faturamento',
          enviado_faturamento: true,
          data_envio_faturamento: '2024-01-25T10:00:00Z',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-25T10:00:00Z',
          empresas_clientes: { nome_completo: 'Cliente A' }
        }
      ];

      // Mock para buscar requerimentos para faturamento
      const mockFaturamentoQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: requerimentosFaturamento,
            error: null
          })
        })
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(mockFaturamentoQuery)
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useRequerimentosFaturamento(1), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      // Verificar que o hook retorna dados estruturados corretamente
      expect(result.current.data?.totais).toBeDefined();
      expect(typeof result.current.data?.totais['Faturado'].quantidade).toBe('number');
      expect(typeof result.current.data?.totais['Faturado'].horas_total).toBe('number');
    });
  });

  describe('useClientesRequerimentos', () => {
    it('deve buscar lista de clientes ativos', async () => {
      const clientesMock = [
        { id: 'cliente-1', nome_completo: 'Cliente A' },
        { id: 'cliente-2', nome_completo: 'Cliente B' }
      ];

      // Mock para buscar clientes
      const mockClientesQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: clientesMock,
          error: null
        })
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(mockClientesQuery)
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useClientesRequerimentos(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(clientesMock);
      expect(mockClientesQuery.eq).toHaveBeenCalledWith('status', 'ativo');
    });
  });

  describe('useEstatisticasRequerimentos', () => {
    it('deve calcular estatísticas dos requerimentos', async () => {
      const requerimentosMock: Requerimento[] = [
        {
          id: 'req-1',
          chamado: 'RF-001',
          cliente_id: 'cliente-1',
          cliente_nome: 'Cliente A',
          modulo: 'Comply',
          descricao: 'Descrição 1',
          data_envio: '2024-01-15',
          data_aprovacao: '2024-01-20',
          horas_funcional: 4.0,
          horas_tecnico: 2.0,
          horas_total: 6.0,
          linguagem: 'ABAP',
          tipo_cobranca: 'Faturado',
          mes_cobranca: 1,
          observacao: null,
          status: 'lancado',
          enviado_faturamento: false,
          data_envio_faturamento: null,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 'req-2',
          chamado: 'RF-002',
          cliente_id: 'cliente-2',
          cliente_nome: 'Cliente B',
          modulo: 'pw.SATI',
          descricao: 'Descrição 2',
          data_envio: '2024-01-16',
          data_aprovacao: '2024-01-21',
          horas_funcional: 3.0,
          horas_tecnico: 5.0,
          horas_total: 8.0,
          linguagem: 'PL/SQL',
          tipo_cobranca: 'Hora Extra',
          mes_cobranca: 1,
          observacao: 'Urgente',
          status: 'enviado_faturamento',
          enviado_faturamento: true,
          data_envio_faturamento: '2024-01-25T11:00:00Z',
          created_at: '2024-01-16T10:00:00Z',
          updated_at: '2024-01-25T11:00:00Z'
        }
      ];

      // Mock para buscar requerimentos para estatísticas
      const mockEstatisticasQuery = {
        order: vi.fn().mockResolvedValue({
          data: requerimentosMock.map(req => ({
            ...req,
            cliente: { id: req.cliente_id, nome_completo: req.cliente_nome }
          })),
          error: null
        })
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(mockEstatisticasQuery)
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useEstatisticasRequerimentos(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toMatchObject({
        total_requerimentos: 2,
        total_horas: 14.0,
        requerimentos_por_status: {
          lancado: 1,
          enviado_faturamento: 1,
          faturado: 0
        },
        requerimentos_por_tipo_cobranca: {
          'Faturado': 1,
          'Hora Extra': 1
        },
        horas_por_tipo_cobranca: {
          'Faturado': 6.0,
          'Hora Extra': 8.0
        }
      });
    });
  });

  describe('useCreateRequerimento', () => {
    it('deve criar requerimento e invalidar cache', async () => {
      const requerimentoData: RequerimentoFormData = {
        chamado: 'RF-123456',
        cliente_id: 'cliente-id',
        modulo: 'Comply',
        descricao: 'Teste de criação',
        data_envio: '2024-01-15',
        data_aprovacao: '2024-01-20',
        horas_funcional: 5.0,
        horas_tecnico: 3.0,
        linguagem: 'ABAP',
        tipo_cobranca: 'Faturado',
        mes_cobranca: 1,
        observacao: 'Teste'
      };

      const requerimentoCriado: Requerimento = {
        id: 'novo-requerimento-id',
        ...requerimentoData,
        horas_total: 8.0,
        cliente_nome: 'Cliente Teste',
        status: 'lancado',
        enviado_faturamento: false,
        data_envio_faturamento: null,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      };

      // Mock para verificar cliente existe
      const mockClienteExiste = {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'cliente-id', status: 'ativo' },
              error: null
            })
          })
        })
      };

      // Mock para inserção do requerimento
      const mockRequerimentoInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              ...requerimentoCriado,
              cliente: { id: 'cliente-id', nome_completo: 'Cliente Teste' }
            },
            error: null
          })
        })
      });

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockClienteExiste) })
        .mockReturnValueOnce({ insert: mockRequerimentoInsert });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateRequerimento(), { wrapper });

      await waitFor(() => {
        expect(result.current.mutate).toBeDefined();
      });

      // Executar mutation
      result.current.mutate(requerimentoData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(requerimentoCriado);
      expect(mockRequerimentoInsert).toHaveBeenCalled();
    });

    it('deve tratar erro na criação de requerimento', async () => {
      const requerimentoData: RequerimentoFormData = {
        chamado: 'RF-123456',
        cliente_id: 'cliente-inexistente',
        modulo: 'Comply',
        descricao: 'Teste de erro',
        data_envio: '2024-01-15',
        data_aprovacao: '2024-01-20',
        horas_funcional: 5.0,
        horas_tecnico: 3.0,
        linguagem: 'ABAP',
        tipo_cobranca: 'Faturado',
        mes_cobranca: 1
      };

      // Mock para cliente não encontrado
      const mockClienteInexistente = {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' }
            })
          })
        })
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(mockClienteInexistente)
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateRequerimento(), { wrapper });

      await waitFor(() => {
        expect(result.current.mutate).toBeDefined();
      });

      // Executar mutation
      result.current.mutate(requerimentoData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useEnviarParaFaturamento', () => {
    it('deve enviar requerimento para faturamento e invalidar cache', async () => {
      const requerimentoId = 'requerimento-test-id';

      // Mock para buscar requerimento por ID
      const mockRequerimentoById = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: requerimentoId,
              status: 'lancado',
              enviado_faturamento: false,
              cliente: { id: 'cliente-id', nome_completo: 'Cliente Teste' }
            },
            error: null
          })
        })
      };

      // Mock para atualização do status
      const mockUpdateStatus = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockRequerimentoById) })
        .mockReturnValueOnce({ update: mockUpdateStatus });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useEnviarParaFaturamento(), { wrapper });

      await waitFor(() => {
        expect(result.current.mutate).toBeDefined();
      });

      // Executar mutation
      result.current.mutate(requerimentoId);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUpdateStatus).toHaveBeenCalledWith({
        status: 'enviado_faturamento',
        enviado_faturamento: true,
        data_envio_faturamento: expect.any(String),
        updated_at: expect.any(String)
      });
    });

    it('deve falhar ao tentar enviar requerimento já enviado', async () => {
      const requerimentoId = 'requerimento-ja-enviado';

      // Mock para requerimento já enviado
      const mockRequerimentoJaEnviado = {
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: requerimentoId,
              status: 'enviado_faturamento',
              enviado_faturamento: true,
              cliente: { nome_completo: 'Cliente Teste' }
            },
            error: null
          })
        })
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(mockRequerimentoJaEnviado)
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useEnviarParaFaturamento(), { wrapper });

      await waitFor(() => {
        expect(result.current.mutate).toBeDefined();
      });

      // Executar mutation
      result.current.mutate(requerimentoId);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('Cache e Invalidação', () => {
    it('deve ter funcionalidades de invalidação de cache disponíveis', async () => {
      // Este teste verifica se os hooks têm as funcionalidades de cache necessárias
      const wrapper = createWrapper();
      
      // Hook para criar requerimento
      const { result: createResult } = renderHook(() => useCreateRequerimento(), { wrapper });

      await waitFor(() => {
        expect(createResult.current.mutate).toBeDefined();
      });

      // Verificar que as funções de mutation estão disponíveis
      expect(typeof createResult.current.mutate).toBe('function');
      expect(typeof createResult.current.mutateAsync).toBe('function');
      
      // Verificar estados iniciais
      expect(createResult.current.isIdle).toBe(true);
      expect(createResult.current.isError).toBe(false);
      expect(createResult.current.isSuccess).toBe(false);
    });
  });
});