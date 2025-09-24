import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { anexoMetricsService, AnexoMetrics, DashboardMetrics, AnexoAlert } from '@/services/anexoMetricsService';
import { toast } from 'sonner';

export const useAnexoMetrics = (startDate?: Date, endDate?: Date) => {
  const queryClient = useQueryClient();

  const {
    data: metrics,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['anexo-metrics', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: () => anexoMetricsService.getMetrics(startDate, endDate),
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 5 * 60 * 1000, // Atualizar a cada 5 minutos
  });

  const checkAlertsMutation = useMutation({
    mutationFn: () => anexoMetricsService.checkAndCreateAlerts(),
    onSuccess: (alerts) => {
      if (alerts.length > 0) {
        const criticalAlerts = alerts.filter(a => a.severity === 'critical');
        const highAlerts = alerts.filter(a => a.severity === 'high');
        
        if (criticalAlerts.length > 0) {
          toast.error(`${criticalAlerts.length} alerta(s) crítico(s) detectado(s)`);
        } else if (highAlerts.length > 0) {
          toast.warning(`${highAlerts.length} alerta(s) de alta prioridade detectado(s)`);
        }
      }
      
      // Invalidar cache das métricas para atualizar
      queryClient.invalidateQueries({ queryKey: ['anexo-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['anexo-dashboard-metrics'] });
    },
    onError: (error) => {
      console.error('Erro ao verificar alertas:', error);
      toast.error('Erro ao verificar alertas do sistema');
    }
  });

  const checkAlerts = useCallback(() => {
    checkAlertsMutation.mutate();
  }, [checkAlertsMutation]);

  return {
    metrics,
    isLoading,
    error,
    refetch,
    checkAlerts,
    isCheckingAlerts: checkAlertsMutation.isPending
  };
};

export const useAnexoDashboardMetrics = () => {
  const queryClient = useQueryClient();

  const {
    data: dashboardMetrics,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['anexo-dashboard-metrics'],
    queryFn: () => anexoMetricsService.getDashboardMetrics(),
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchInterval: 2 * 60 * 1000, // Atualizar a cada 2 minutos
  });

  const refreshMetrics = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['anexo-dashboard-metrics'] });
    queryClient.invalidateQueries({ queryKey: ['anexo-metrics'] });
  }, [queryClient]);

  return {
    dashboardMetrics,
    isLoading,
    error,
    refetch,
    refreshMetrics
  };
};

export const useAnexoAlerts = () => {
  const [alerts, setAlerts] = useState<AnexoAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);
    
    const checkAlerts = async () => {
      try {
        const newAlerts = await anexoMetricsService.checkAndCreateAlerts();
        setAlerts(prev => {
          // Mesclar novos alertas com os existentes, evitando duplicatas
          const existingIds = new Set(prev.map(a => a.id));
          const uniqueNewAlerts = newAlerts.filter(a => !existingIds.has(a.id));
          return [...prev, ...uniqueNewAlerts];
        });
      } catch (error) {
        console.error('Erro ao verificar alertas:', error);
      }
    };

    // Verificar alertas imediatamente
    checkAlerts();

    // Configurar verificação periódica (a cada 10 minutos)
    const interval = setInterval(checkAlerts, 10 * 60 * 1000);

    return () => {
      clearInterval(interval);
      setIsMonitoring(false);
    };
  }, [isMonitoring]);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const resolveAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
  }, []);

  useEffect(() => {
    const cleanup = startMonitoring();
    return cleanup;
  }, [startMonitoring]);

  return {
    alerts: alerts.filter(a => !a.resolved),
    allAlerts: alerts,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    clearAlerts,
    resolveAlert
  };
};

export const useAnexoPerformanceReport = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReport = useCallback(async (startDate: Date, endDate: Date) => {
    setIsGenerating(true);
    try {
      const metrics = await anexoMetricsService.getMetrics(startDate, endDate);
      
      // Gerar relatório em formato JSON para download
      const report = {
        periodo: {
          inicio: startDate.toISOString(),
          fim: endDate.toISOString()
        },
        resumo: {
          totalUploads: metrics.totalUploads,
          totalSize: metrics.totalSize,
          taxaSucesso: metrics.successRate,
          taxaFalha: metrics.failureRate,
          tempoMedioProcessamento: metrics.avgProcessingTime
        },
        tiposArquivo: metrics.topFileTypes,
        usoPorEmpresa: metrics.storageUsageByEmpresa,
        estatisticasDiarias: metrics.dailyStats,
        alertas: metrics.performanceAlerts,
        geradoEm: new Date().toISOString()
      };

      // Criar e baixar arquivo
      const blob = new Blob([JSON.stringify(report, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-anexos-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Relatório gerado com sucesso');
      return report;
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório de performance');
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    generateReport,
    isGenerating
  };
};