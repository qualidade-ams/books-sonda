import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React, { ReactNode } from 'react';
import { toast } from 'sonner';
import {
  useRelatorioFaturamento,
  useRequerimentosFaturamento,
  useEstatisticasFaturamento,
  useDispararFaturamento,
  useTemplateEmailFaturamento,
  useFaturamento,
  FATURAMENTO_QUERY_KEYS
} from '../useFaturamento';
import { faturamentoService } from '@/services/faturamentoService';
import type { RelatorioFaturamento } from '@/services/faturamentoService';
import type { EmailFaturamento } from '@/types/requerimentos';
import type { Requerimento } from '@/types/requerimentos';

// Mock do serviço
vi.mock('@/services/faturamentoService', () => ({
  faturamentoService: {
    gerarRelatorioFaturamento: vi.fn(),
    buscarRequerimentosParaFaturamento: vi.fn(),
    buscarEstatisticasFaturamento: vi.fn(),
    dispararFaturamento: vi.fn(),
    criarTemplateEmailFaturamento: vi.fn(),
  }
}));

// Mock do toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

describe('useFaturamento hooks', () => {
  let queryClient: QueryClient;

  const mockRequerimento: Requerimento = {
    id: '1',
    chamado: 'RF-001',
    cliente_id: 'cliente-1',
    cliente_nome: 'Cliente Teste',
    modulo: 'Comply',
    descricao: 'Teste',
    data_envio: '2024-01-15',
    data_aprovacao: '2024-01-16',
    horas_funcional: 10,
    horas_tecnico: 5,
    horas_total: 15,
    linguagem: 'ABAP',
    tipo_cobranca: 'Faturado',
    mes_cobranca: '01/2024',
    status: 'enviado_faturamento',
    enviado_faturamento: true,
    data_envio_faturamento: '2024-01-20T10:00:00Z',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-20T10:00:00Z'
  };

  const mockRelatorio: RelatorioFaturamento = {
    periodo: 'Janeiro de 2024',
    mes_cobranca: '01/2024',
    ano_cobranca: 2024,
    requerimentos_por_tipo: {
      'Banco de Horas': { quantidade: 0, horas_total: 0, requerimentos: [] },
      'Cobro Interno': { quantidade: 0, horas_total: 0, requerimentos: [] },
      'Contrato': { quantidade: 0, horas_total: 0, requerimentos: [] },
      'Faturado': { quantidade: 1, horas_total: 15, requerimentos: [mockRequerimento] },
      'Hora Extra': { quantidade: 0, horas_total: 0, requerimentos: [] },
      'Sobreaviso': { quantidade: 0, horas_total: 0, requerimentos: [] },
      'Reprovado': { quantidade: 0, horas_total: 0, requerimentos: [] },
      'Bolsão Enel': { quantidade: 0, horas_total: 0, requerimentos: [] }
    },
    totais_gerais: {
      total_requerimentos: 1,
      total_horas: 15,
      total_faturado: 0
    }
  };

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return ({ children }: { children: ReactNode }) => (
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('FATURAMENTO_QUERY_KEYS', () => {
    it('deve gerar chaves de query corretas', () => {
      expect(FATURAMENTO_QUERY_KEYS.all).toEqual(['faturamento']);
      expect(FATURAMENTO_QUERY_KEYS.relatorio(1, 2024)).toEqual(['faturamento', 'relatorio', 1, 2024]);
      expect(FATURAMENTO_QUERY_KEYS.estatisticas(1, 2024, 12, 2024)).toEqual(['faturamento', 'estatisticas', 1, 2024, 12, 2024]);
      expect(FATURAMENTO_QUERY_KEYS.requerimentos(1, 2024)).toEqual(['faturamento', 'requerimentos', 1, 2024]);
    });
  });

  describe('useRelatorioFaturamento', () => {
    it('deve buscar relatório de faturamento', async () => {
      vi.mocked(faturamentoService.gerarRelatorioFaturamento).mockResolvedValue(mockRelatorio);

      const { result } = renderHook(() => useRelatorioFaturamento(1, 2024), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRelatorio);
      expect(faturamentoService.gerarRelatorioFaturamento).toHaveBeenCalledWith(1, 2024);
    });

    it('deve usar ano atual como padrão', async () => {
      const anoAtual = new Date().getFullYear();
      vi.mocked(faturamentoService.gerarRelatorioFaturamento).mockResolvedValue(mockRelatorio);

      renderHook(() => useRelatorioFaturamento(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(faturamentoService.gerarRelatorioFaturamento).toHaveBeenCalledWith(1, anoAtual);
      });
    });

    it('deve desabilitar query com parâmetros inválidos', () => {
      const { result } = renderHook(() => useRelatorioFaturamento(0, 2024), {
        wrapper: createWrapper(),
      });

      expect(result.current.status).toBe('pending');
      expect(result.current.fetchStatus).toBe('idle');
      expect(faturamentoService.gerarRelatorioFaturamento).not.toHaveBeenCalled();
    });
  });

  describe('useRequerimentosFaturamento', () => {
    it('deve buscar requerimentos para faturamento', async () => {
      const mockRequerimentos = [mockRequerimento];
      vi.mocked(faturamentoService.buscarRequerimentosParaFaturamento).mockResolvedValue(mockRequerimentos);

      const { result } = renderHook(() => useRequerimentosFaturamento(1, 2024), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRequerimentos);
      expect(faturamentoService.buscarRequerimentosParaFaturamento).toHaveBeenCalledWith(1, 2024);
    });
  });

  describe('useEstatisticasFaturamento', () => {
    it('deve buscar estatísticas de faturamento', async () => {
      const mockEstatisticas = {
        total_requerimentos: 1,
        total_horas: 15,
        tipos_cobranca: {
          'Banco de Horas': { quantidade: 0, horas: 0, percentual: 0 },
          'Cobro Interno': { quantidade: 0, horas: 0, percentual: 0 },
          'Contrato': { quantidade: 0, horas: 0, percentual: 0 },
          'Faturado': { quantidade: 1, horas: 15, percentual: 100 },
          'Hora Extra': { quantidade: 0, horas: 0, percentual: 0 },
          'Sobreaviso': { quantidade: 0, horas: 0, percentual: 0 },
          'Reprovado': { quantidade: 0, horas: 0, percentual: 0 },
          'Bolsão Enel': { quantidade: 0, horas: 0, percentual: 0 }
        }
      };

      vi.mocked(faturamentoService.buscarEstatisticasFaturamento).mockResolvedValue(mockEstatisticas);

      const { result } = renderHook(() => useEstatisticasFaturamento(1, 2024, 12, 2024), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockEstatisticas);
      expect(faturamentoService.buscarEstatisticasFaturamento).toHaveBeenCalledWith(1, 2024, 12, 2024);
    });
  });

  describe('useDispararFaturamento', () => {
    it('deve disparar faturamento com sucesso', async () => {
      const mockResultado = {
        success: true,
        message: 'Faturamento enviado com sucesso'
      };

      vi.mocked(faturamentoService.dispararFaturamento).mockResolvedValue(mockResultado);

      const { result } = renderHook(() => useDispararFaturamento(), {
        wrapper: createWrapper(),
      });

      const emailFaturamento: EmailFaturamento = {
        destinatarios: ['teste@exemplo.com'],
        assunto: 'Relatório de Faturamento',
        corpo: '<html><body>Teste</body></html>'
      };

      await result.current.mutateAsync(emailFaturamento);

      expect(faturamentoService.dispararFaturamento).toHaveBeenCalledWith(emailFaturamento);
      expect(toast.success).toHaveBeenCalledWith(
        'Faturamento enviado com sucesso',
        expect.objectContaining({
          description: 'Enviado para: teste@exemplo.com'
        })
      );
    });

    it('deve tratar erro no disparo de faturamento', async () => {
      const mockResultado = {
        success: false,
        error: 'Erro no envio'
      };

      vi.mocked(faturamentoService.dispararFaturamento).mockResolvedValue(mockResultado);

      const { result } = renderHook(() => useDispararFaturamento(), {
        wrapper: createWrapper(),
      });

      const emailFaturamento: EmailFaturamento = {
        destinatarios: ['teste@exemplo.com'],
        assunto: 'Teste',
        corpo: 'Teste'
      };

      await result.current.mutateAsync(emailFaturamento);

      expect(toast.error).toHaveBeenCalledWith(
        'Erro no envio',
        expect.objectContaining({
          description: 'Verifique os dados e tente novamente'
        })
      );
    });
  });



  describe('useTemplateEmailFaturamento', () => {
    it('deve gerar template HTML', () => {
      const mockTemplate = '<html><body>Template de teste</body></html>';
      vi.mocked(faturamentoService.criarTemplateEmailFaturamento).mockReturnValue(mockTemplate);

      const { result } = renderHook(() => useTemplateEmailFaturamento());

      const template = result.current.gerarTemplate(mockRelatorio);

      expect(template).toBe(mockTemplate);
      expect(faturamentoService.criarTemplateEmailFaturamento).toHaveBeenCalledWith(mockRelatorio);
    });

    it('deve tratar erro na geração de template', () => {
      const error = new Error('Erro na geração');
      vi.mocked(faturamentoService.criarTemplateEmailFaturamento).mockImplementation(() => {
        throw error;
      });

      const { result } = renderHook(() => useTemplateEmailFaturamento());

      const template = result.current.gerarTemplate(mockRelatorio);

      expect(template).toBe('');
      expect(toast.error).toHaveBeenCalledWith(
        'Erro ao gerar template de email',
        expect.objectContaining({
          description: 'Erro na geração'
        })
      );
    });
  });

  describe('useFaturamento', () => {
    it('deve combinar múltiplos hooks', async () => {
      vi.mocked(faturamentoService.gerarRelatorioFaturamento).mockResolvedValue(mockRelatorio);
      vi.mocked(faturamentoService.buscarRequerimentosParaFaturamento).mockResolvedValue([mockRequerimento]);

      const { result } = renderHook(() => useFaturamento(1, 2024), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.relatorio.isSuccess).toBe(true);
        expect(result.current.requerimentos.isSuccess).toBe(true);
      });

      expect(result.current.data.relatorio).toEqual(mockRelatorio);
      expect(result.current.data.requerimentos).toEqual([mockRequerimento]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it('deve usar mês e ano atuais como padrão', () => {
      const mesAtual = new Date().getMonth() + 1;
      const anoAtual = new Date().getFullYear();

      renderHook(() => useFaturamento(), {
        wrapper: createWrapper(),
      });

      expect(faturamentoService.gerarRelatorioFaturamento).toHaveBeenCalledWith(mesAtual, anoAtual);
      expect(faturamentoService.buscarRequerimentosParaFaturamento).toHaveBeenCalledWith(mesAtual, anoAtual);
    });

    it('deve ter métodos de refetch', () => {
      const { result } = renderHook(() => useFaturamento(1, 2024), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.refetch).toBe('function');
      expect(typeof result.current.dispararFaturamento.mutate).toBe('function');
      expect(typeof result.current.templateEmail.gerarTemplate).toBe('function');
    });
  });
});