import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { anexoMonitoringJobService, MonitoringJobConfig } from '@/services/anexoMonitoringJobService';
import { toast } from 'sonner';

export const useAnexoMonitoring = () => {
  const queryClient = useQueryClient();

  const {
    data: status,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['anexo-monitoring-status'],
    queryFn: () => anexoMonitoringJobService.getStatus(),
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  const startMonitoringMutation = useMutation({
    mutationFn: (config?: Partial<MonitoringJobConfig>) => 
      anexoMonitoringJobService.startMonitoring(config),
    onSuccess: () => {
      toast.success('Monitoramento de anexos iniciado');
      queryClient.invalidateQueries({ queryKey: ['anexo-monitoring-status'] });
    },
    onError: (error) => {
      console.error('Erro ao iniciar monitoramento:', error);
      toast.error('Erro ao iniciar monitoramento de anexos');
    }
  });

  const stopMonitoringMutation = useMutation({
    mutationFn: () => anexoMonitoringJobService.stopMonitoring(),
    onSuccess: () => {
      toast.success('Monitoramento de anexos parado');
      queryClient.invalidateQueries({ queryKey: ['anexo-monitoring-status'] });
    },
    onError: (error) => {
      console.error('Erro ao parar monitoramento:', error);
      toast.error('Erro ao parar monitoramento de anexos');
    }
  });

  const updateConfigMutation = useMutation({
    mutationFn: (config: Partial<MonitoringJobConfig>) => 
      anexoMonitoringJobService.updateConfig(config),
    onSuccess: () => {
      toast.success('Configuração de monitoramento atualizada');
      queryClient.invalidateQueries({ queryKey: ['anexo-monitoring-status'] });
    },
    onError: (error) => {
      console.error('Erro ao atualizar configuração:', error);
      toast.error('Erro ao atualizar configuração de monitoramento');
    }
  });

  const startMonitoring = useCallback((config?: Partial<MonitoringJobConfig>) => {
    startMonitoringMutation.mutate(config);
  }, [startMonitoringMutation]);

  const stopMonitoring = useCallback(() => {
    stopMonitoringMutation.mutate();
  }, [stopMonitoringMutation]);

  const updateConfig = useCallback((config: Partial<MonitoringJobConfig>) => {
    updateConfigMutation.mutate(config);
  }, [updateConfigMutation]);

  const toggleMonitoring = useCallback(() => {
    if (status?.isRunning) {
      stopMonitoring();
    } else {
      startMonitoring();
    }
  }, [status?.isRunning, startMonitoring, stopMonitoring]);

  return {
    status,
    isLoading,
    error,
    refetch,
    startMonitoring,
    stopMonitoring,
    updateConfig,
    toggleMonitoring,
    isStarting: startMonitoringMutation.isPending,
    isStopping: stopMonitoringMutation.isPending,
    isUpdatingConfig: updateConfigMutation.isPending
  };
};

export const useAnexoMonitoringConfig = () => {
  const [config, setConfig] = useState<MonitoringJobConfig>(() => 
    anexoMonitoringJobService.getConfig()
  );

  const updateLocalConfig = useCallback((updates: Partial<MonitoringJobConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const resetConfig = useCallback(() => {
    const defaultConfig = anexoMonitoringJobService.getConfig();
    setConfig(defaultConfig);
  }, []);

  return {
    config,
    updateLocalConfig,
    resetConfig,
    setConfig
  };
};