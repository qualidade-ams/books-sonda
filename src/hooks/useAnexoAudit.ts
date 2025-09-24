import { useState, useEffect, useCallback } from 'react';
import { anexoAuditService, type StorageMetrics, type PerformanceMetrics, type AnexoAuditLogEntry } from '@/services/anexoAuditService';

export interface AnexoAuditFilters {
  anexoId?: string;
  empresaId?: string;
  operation?: string;
  result?: 'success' | 'failure' | 'warning';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface UseAnexoAuditReturn {
  // Estados
  storageMetrics: StorageMetrics | null;
  performanceMetrics: PerformanceMetrics | null;
  auditLogs: AnexoAuditLogEntry[];
  loading: boolean;
  error: string | null;
  
  // Ações
  carregarMetricas: (forceRefresh?: boolean) => Promise<void>;
  carregarPerformance: (periodoHoras?: number) => Promise<void>;
  carregarLogs: (filtros?: AnexoAuditFilters) => Promise<void>;
  limparCache: () => void;
  
  // Utilitários
  obterEstatisticasRapidas: () => {
    totalOperacoes: number;
    taxaSucesso: number;
    operacoesMaisFrequentes: Array<{ operacao: string; count: number }>;
    empresasMaisAtivas: Array<{ empresaId: string; count: number }>;
  };
}

export function useAnexoAudit(): UseAnexoAuditReturn {
  const [storageMetrics, setStorageMetrics] = useState<StorageMetrics | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AnexoAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregarMetricas = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const metrics = await anexoAuditService.obterMetricasStorage(forceRefresh);
      setStorageMetrics(metrics);
    } catch (err) {
      console.error('Erro ao carregar métricas de storage:', err);
      setError('Erro ao carregar métricas de storage');
    } finally {
      setLoading(false);
    }
  }, []);

  const carregarPerformance = useCallback(async (periodoHoras = 24) => {
    try {
      setLoading(true);
      setError(null);
      
      const metrics = await anexoAuditService.obterMetricasPerformance(periodoHoras);
      setPerformanceMetrics(metrics);
    } catch (err) {
      console.error('Erro ao carregar métricas de performance:', err);
      setError('Erro ao carregar métricas de performance');
    } finally {
      setLoading(false);
    }
  }, []);

  const carregarLogs = useCallback(async (filtros?: AnexoAuditFilters) => {
    try {
      setLoading(true);
      setError(null);
      
      const logs = anexoAuditService.obterLogsAnexos(filtros);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Erro ao carregar logs de auditoria:', err);
      setError('Erro ao carregar logs de auditoria');
    } finally {
      setLoading(false);
    }
  }, []);

  const limparCache = useCallback(() => {
    anexoAuditService.limparCacheMetricas();
    setStorageMetrics(null);
    setPerformanceMetrics(null);
  }, []);

  const obterEstatisticasRapidas = useCallback(() => {
    const totalOperacoes = auditLogs.length;
    const sucessos = auditLogs.filter(log => log.result === 'success').length;
    const taxaSucesso = totalOperacoes > 0 ? (sucessos / totalOperacoes) * 100 : 0;

    // Operações mais frequentes
    const operacoesCounts: Record<string, number> = {};
    auditLogs.forEach(log => {
      operacoesCounts[log.operation] = (operacoesCounts[log.operation] || 0) + 1;
    });

    const operacoesMaisFrequentes = Object.entries(operacoesCounts)
      .map(([operacao, count]) => ({ operacao, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Empresas mais ativas
    const empresasCounts: Record<string, number> = {};
    auditLogs.forEach(log => {
      const empresaId = log.details.empresaId || log.empresaId;
      if (empresaId) {
        empresasCounts[empresaId] = (empresasCounts[empresaId] || 0) + 1;
      }
    });

    const empresasMaisAtivas = Object.entries(empresasCounts)
      .map(([empresaId, count]) => ({ empresaId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalOperacoes,
      taxaSucesso,
      operacoesMaisFrequentes,
      empresasMaisAtivas
    };
  }, [auditLogs]);

  // Carregar dados iniciais
  useEffect(() => {
    const carregarDadosIniciais = async () => {
      await Promise.all([
        carregarMetricas(),
        carregarPerformance(),
        carregarLogs({ limit: 100 })
      ]);
    };

    carregarDadosIniciais();
  }, [carregarMetricas, carregarPerformance, carregarLogs]);

  return {
    storageMetrics,
    performanceMetrics,
    auditLogs,
    loading,
    error,
    carregarMetricas,
    carregarPerformance,
    carregarLogs,
    limparCache,
    obterEstatisticasRapidas
  };
}

export default useAnexoAudit;