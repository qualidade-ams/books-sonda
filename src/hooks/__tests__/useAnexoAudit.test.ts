import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAnexoAudit } from '../useAnexoAudit';
import { anexoAuditService } from '@/services/anexoAuditService';

// Mock do anexoAuditService
vi.mock('@/services/anexoAuditService', () => ({
  anexoAuditService: {
    obterMetricasStorage: vi.fn(),
    obterMetricasPerformance: vi.fn(),
    obterLogsAnexos: vi.fn(),
    limparCacheMetricas: vi.fn()
  }
}));

const mockStorageMetrics = {
  totalArquivos: 10,
  tamanhoTotalBytes: 50 * 1024 * 1024,
  tamanhoTotalMB: 50,
  arquivosPorEmpresa: { 'empresa-1': 5, 'empresa-2': 5 },
  tamanhosPorEmpresa: { 'empresa-1': 25 * 1024 * 1024, 'empresa-2': 25 * 1024 * 1024 },
  arquivosPorTipo: { 'application/pdf': 6, 'application/msword': 4 },
  arquivosPorStatus: { 'pendente': 3, 'processado': 7 },
  mediaUploadTime: 2500,
  mediaProcessingTime: 1500,
  taxaSucesso: 95.5,
  taxaFalha: 4.5,
  arquivosExpirados: 2,
  arquivosProcessados: 7
};

const mockPerformanceMetrics = {
  operacoesPorMinuto: 15.5,
  tempoMedioUpload: 2500,
  tempoMedioDownload: 800,
  tempoMedioProcessamento: 1500,
  latenciaMediaStorage: 1200,
  picos: [
    { timestamp: '2024-01-01T10:00:00Z', operacao: 'anexo_upload_concluido', duracao: 5000 }
  ],
  gargalos: [
    { operacao: 'anexo_upload_concluido', frequencia: 10, tempoMedio: 3000 }
  ]
};

const mockAuditLogs = [
  {
    id: '1',
    operation: 'anexo_upload_concluido',
    entityType: 'anexo',
    result: 'success',
    timestamp: '2024-01-01T10:00:00Z',
    details: { empresaId: 'empresa-1', anexoId: 'anexo-1' }
  },
  {
    id: '2',
    operation: 'anexo_upload_falhou',
    entityType: 'anexo',
    result: 'failure',
    timestamp: '2024-01-01T11:00:00Z',
    details: { empresaId: 'empresa-2', anexoId: 'anexo-2' }
  },
  {
    id: '3',
    operation: 'anexo_removido',
    entityType: 'anexo',
    result: 'success',
    timestamp: '2024-01-01T12:00:00Z',
    details: { empresaId: 'empresa-1', anexoId: 'anexo-3' }
  }
] as any;

describe('useAnexoAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mocks padrão
    (anexoAuditService.obterMetricasStorage as any).mockResolvedValue(mockStorageMetrics);
    (anexoAuditService.obterMetricasPerformance as any).mockResolvedValue(mockPerformanceMetrics);
    (anexoAuditService.obterLogsAnexos as any).mockReturnValue(mockAuditLogs);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('inicialização', () => {
    it('deve carregar dados iniciais automaticamente', async () => {
      const { result } = renderHook(() => useAnexoAudit());

      // Aguardar carregamento completo
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      // Verificar que os serviços foram chamados
      expect(anexoAuditService.obterMetricasStorage).toHaveBeenCalledWith(false);
      expect(anexoAuditService.obterMetricasPerformance).toHaveBeenCalledWith(24);
      expect(anexoAuditService.obterLogsAnexos).toHaveBeenCalledWith({ limit: 100 });

      // Verificar dados carregados
      expect(result.current.storageMetrics).toEqual(mockStorageMetrics);
      expect(result.current.performanceMetrics).toEqual(mockPerformanceMetrics);
      expect(result.current.auditLogs).toEqual(mockAuditLogs);
      expect(result.current.error).toBeNull();
    });

    it('deve lidar com erro no carregamento inicial', async () => {
      const errorMessage = 'Erro de conexão';
      (anexoAuditService.obterMetricasStorage as any).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAnexoAudit());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Erro ao carregar métricas de storage');
      expect(result.current.storageMetrics).toBeNull();
    });
  });

  describe('carregarMetricas', () => {
    it('deve carregar métricas de storage', async () => {
      const { result } = renderHook(() => useAnexoAudit());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Limpar chamadas iniciais
      vi.clearAllMocks();

      await act(async () => {
        await result.current.carregarMetricas(true);
      });

      expect(anexoAuditService.obterMetricasStorage).toHaveBeenCalledWith(true);
      expect(result.current.storageMetrics).toEqual(mockStorageMetrics);
    });

    it('deve lidar com erro ao carregar métricas', async () => {
      const { result } = renderHook(() => useAnexoAudit());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const errorMessage = 'Erro ao buscar métricas';
      (anexoAuditService.obterMetricasStorage as any).mockRejectedValue(new Error(errorMessage));

      await act(async () => {
        await result.current.carregarMetricas();
      });

      expect(result.current.error).toBe('Erro ao carregar métricas de storage');
    });
  });

  describe('carregarPerformance', () => {
    it('deve carregar métricas de performance com período personalizado', async () => {
      const { result } = renderHook(() => useAnexoAudit());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Limpar chamadas iniciais
      vi.clearAllMocks();

      await act(async () => {
        await result.current.carregarPerformance(48);
      });

      expect(anexoAuditService.obterMetricasPerformance).toHaveBeenCalledWith(48);
      expect(result.current.performanceMetrics).toEqual(mockPerformanceMetrics);
    });

    it('deve usar período padrão quando não especificado', async () => {
      const { result } = renderHook(() => useAnexoAudit());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Limpar chamadas iniciais
      vi.clearAllMocks();

      await act(async () => {
        await result.current.carregarPerformance();
      });

      expect(anexoAuditService.obterMetricasPerformance).toHaveBeenCalledWith(24);
    });
  });

  describe('carregarLogs', () => {
    it('deve carregar logs com filtros', async () => {
      const { result } = renderHook(() => useAnexoAudit());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Limpar chamadas iniciais
      vi.clearAllMocks();

      const filtros = {
        empresaId: 'empresa-1',
        operation: 'anexo_upload_concluido',
        limit: 50
      };

      await act(async () => {
        await result.current.carregarLogs(filtros);
      });

      expect(anexoAuditService.obterLogsAnexos).toHaveBeenCalledWith(filtros);
      expect(result.current.auditLogs).toEqual(mockAuditLogs);
    });
  });

  describe('limparCache', () => {
    it('deve limpar cache e resetar métricas', async () => {
      const { result } = renderHook(() => useAnexoAudit());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verificar que há dados
      expect(result.current.storageMetrics).not.toBeNull();
      expect(result.current.performanceMetrics).not.toBeNull();

      act(() => {
        result.current.limparCache();
      });

      expect(anexoAuditService.limparCacheMetricas).toHaveBeenCalled();
      expect(result.current.storageMetrics).toBeNull();
      expect(result.current.performanceMetrics).toBeNull();
    });
  });

  describe('obterEstatisticasRapidas', () => {
    it('deve calcular estatísticas corretamente', async () => {
      const { result } = renderHook(() => useAnexoAudit());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const stats = result.current.obterEstatisticasRapidas();

      expect(stats.totalOperacoes).toBe(3);
      expect(Math.round(stats.taxaSucesso * 100) / 100).toBe(66.67); // 2 sucessos de 3 total (arredondado)
      
      expect(stats.operacoesMaisFrequentes).toEqual([
        { operacao: 'anexo_upload_concluido', count: 1 },
        { operacao: 'anexo_upload_falhou', count: 1 },
        { operacao: 'anexo_removido', count: 1 }
      ]);

      expect(stats.empresasMaisAtivas).toEqual([
        { empresaId: 'empresa-1', count: 2 },
        { empresaId: 'empresa-2', count: 1 }
      ]);
    });

    it('deve lidar com logs vazios', async () => {
      (anexoAuditService.obterLogsAnexos as any).mockReturnValue([]);

      const { result } = renderHook(() => useAnexoAudit());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const stats = result.current.obterEstatisticasRapidas();

      expect(stats.totalOperacoes).toBe(0);
      expect(stats.taxaSucesso).toBe(0);
      expect(stats.operacoesMaisFrequentes).toEqual([]);
      expect(stats.empresasMaisAtivas).toEqual([]);
    });

    it('deve limitar resultados a top 5', async () => {
      const logsExtendidos = Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        operation: `operacao_${i}`,
        entityType: 'anexo',
        result: 'success',
        timestamp: '2024-01-01T10:00:00Z',
        details: { empresaId: `empresa-${i}` }
      }));

      (anexoAuditService.obterLogsAnexos as any).mockReturnValue(logsExtendidos);

      const { result } = renderHook(() => useAnexoAudit());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const stats = result.current.obterEstatisticasRapidas();

      expect(stats.operacoesMaisFrequentes).toHaveLength(5);
      expect(stats.empresasMaisAtivas).toHaveLength(5);
    });
  });

  describe('estados de loading e error', () => {
    it('deve gerenciar estado de loading corretamente', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      (anexoAuditService.obterMetricasStorage as any).mockReturnValue(promise);
      (anexoAuditService.obterMetricasPerformance as any).mockReturnValue(promise);
      (anexoAuditService.obterLogsAnexos as any).mockReturnValue([]);

      const { result } = renderHook(() => useAnexoAudit());

      // Aguardar um pouco para o hook inicializar
      await new Promise(resolve => setTimeout(resolve, 10));

      act(() => {
        resolvePromise!(mockStorageMetrics);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('deve limpar erro ao carregar dados com sucesso', async () => {
      // Primeiro, simular um erro
      (anexoAuditService.obterMetricasStorage as any).mockRejectedValue(new Error('Erro'));

      const { result } = renderHook(() => useAnexoAudit());

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Depois, simular sucesso
      (anexoAuditService.obterMetricasStorage as any).mockResolvedValue(mockStorageMetrics);

      await act(async () => {
        await result.current.carregarMetricas();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.storageMetrics).toEqual(mockStorageMetrics);
    });
  });
});