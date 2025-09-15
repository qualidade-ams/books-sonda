import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobSchedulerService, type JobData, type JobStatus, type JobType } from '@/services/jobSchedulerService';
import { jobConfigurationService, type JobSystemConfig } from '@/services/jobConfigurationService';
import { useToast } from '@/hooks/use-toast';

/**
 * Filtros para listagem de jobs
 */
export interface JobFilters {
  type?: JobType;
  status?: JobStatus;
  limit?: number;
  offset?: number;
}

/**
 * Hook para gerenciar o sistema de jobs
 */
export function useJobScheduler() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSchedulerRunning, setIsSchedulerRunning] = useState(false);

  // Query para listar jobs
  const {
    data: jobs = [],
    isLoading: isLoadingJobs,
    error: jobsError,
    refetch: refetchJobs
  } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobSchedulerService.listJobs({ limit: 50 }),
    refetchInterval: 30000, // Atualizar a cada 30 segundos
    staleTime: 10000 // Considerar dados obsoletos após 10 segundos
  });

  // Query para estatísticas de jobs
  const {
    data: jobStats,
    isLoading: isLoadingStats,
    error: statsError
  } = useQuery({
    queryKey: ['job-statistics'],
    queryFn: () => jobSchedulerService.getJobStatistics(),
    refetchInterval: 60000, // Atualizar a cada minuto
    staleTime: 30000
  });

  // Query para configurações do sistema
  const {
    data: systemConfig,
    isLoading: isLoadingConfig,
    error: configError
  } = useQuery({
    queryKey: ['job-system-config'],
    queryFn: () => jobConfigurationService.getJobSystemConfig(),
    staleTime: 300000 // 5 minutos
  });

  // Mutation para agendar disparo mensal
  const scheduleMonthlyDispatchMutation = useMutation({
    mutationFn: ({ mes, ano, scheduledAt }: { mes: number; ano: number; scheduledAt?: Date }) =>
      jobSchedulerService.scheduleMonthlyDispatch(mes, ano, scheduledAt),
    onSuccess: (jobId, variables) => {
      toast({
        title: 'Disparo agendado',
        description: `Disparo mensal de ${variables.mes}/${variables.ano} agendado com sucesso`,
      });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job-statistics'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao agendar disparo',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  });

  // Mutation para agendar retry de falhas
  const scheduleRetryMutation = useMutation({
    mutationFn: ({ mes, ano, delayMinutes }: { mes: number; ano: number; delayMinutes?: number }) =>
      jobSchedulerService.scheduleRetryFailedDispatch(mes, ano, delayMinutes),
    onSuccess: (jobId, variables) => {
      toast({
        title: 'Retry agendado',
        description: `Retry de falhas para ${variables.mes}/${variables.ano} agendado com sucesso`,
      });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job-statistics'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao agendar retry',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  });

  // Mutation para cancelar job
  const cancelJobMutation = useMutation({
    mutationFn: (jobId: string) => jobSchedulerService.cancelJob(jobId),
    onSuccess: () => {
      toast({
        title: 'Job cancelado',
        description: 'Job cancelado com sucesso',
      });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job-statistics'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao cancelar job',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  });

  // Mutation para atualizar configurações
  const updateConfigMutation = useMutation({
    mutationFn: (config: Partial<JobSystemConfig>) =>
      jobConfigurationService.updateJobSystemConfig(config),
    onSuccess: () => {
      toast({
        title: 'Configurações atualizadas',
        description: 'Configurações do sistema de jobs atualizadas com sucesso',
      });
      queryClient.invalidateQueries({ queryKey: ['job-system-config'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar configurações',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  });

  // Iniciar/parar scheduler
  const toggleScheduler = useCallback(async () => {
    try {
      if (isSchedulerRunning) {
        await jobSchedulerService.stop();
        setIsSchedulerRunning(false);
        toast({
          title: 'Scheduler parado',
          description: 'O scheduler de jobs foi parado',
        });
      } else {
        await jobSchedulerService.start();
        setIsSchedulerRunning(true);
        toast({
          title: 'Scheduler iniciado',
          description: 'O scheduler de jobs foi iniciado',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro ao alterar scheduler',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  }, [isSchedulerRunning, toast]);

  // Buscar job específico
  const getJobStatus = useCallback(async (jobId: string): Promise<JobData | null> => {
    try {
      return await jobSchedulerService.getJobStatus(jobId);
    } catch (error) {
      toast({
        title: 'Erro ao buscar job',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  // Listar jobs com filtros
  const listJobsWithFilters = useCallback(async (filters: JobFilters): Promise<JobData[]> => {
    try {
      return await jobSchedulerService.listJobs(filters);
    } catch (error) {
      toast({
        title: 'Erro ao listar jobs',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return [];
    }
  }, [toast]);

  // Validar configurações
  const validateConfiguration = useCallback(async () => {
    try {
      const validation = await jobConfigurationService.validateConfiguration();
      
      if (!validation.valid) {
        toast({
          title: 'Configurações inválidas',
          description: validation.errors.join(', '),
          variant: 'destructive',
        });
      } else if (validation.warnings.length > 0) {
        toast({
          title: 'Avisos de configuração',
          description: validation.warnings.join(', '),
        });
      } else {
        toast({
          title: 'Configurações válidas',
          description: 'Todas as configurações estão corretas',
        });
      }
      
      return validation;
    } catch (error) {
      toast({
        title: 'Erro ao validar configurações',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return { valid: false, errors: ['Erro na validação'], warnings: [] };
    }
  }, [toast]);

  // Resetar configurações para padrão
  const resetConfigToDefaults = useCallback(async () => {
    try {
      await jobConfigurationService.resetToDefaults();
      toast({
        title: 'Configurações resetadas',
        description: 'Configurações foram resetadas para os valores padrão',
      });
      queryClient.invalidateQueries({ queryKey: ['job-system-config'] });
    } catch (error) {
      toast({
        title: 'Erro ao resetar configurações',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  }, [toast, queryClient]);

  // Verificar status do scheduler na inicialização
  useEffect(() => {
    const checkSchedulerStatus = async () => {
      try {
        const config = await jobConfigurationService.getJobSystemConfig();
        setIsSchedulerRunning(config.schedulerEnabled);
      } catch (error) {
        console.error('Erro ao verificar status do scheduler:', error);
      }
    };

    checkSchedulerStatus();
  }, []);

  // Funções de conveniência
  const scheduleMonthlyDispatch = useCallback(
    (mes: number, ano: number, scheduledAt?: Date) => {
      return scheduleMonthlyDispatchMutation.mutateAsync({ mes, ano, scheduledAt });
    },
    [scheduleMonthlyDispatchMutation]
  );

  const scheduleRetry = useCallback(
    (mes: number, ano: number, delayMinutes?: number) => {
      return scheduleRetryMutation.mutateAsync({ mes, ano, delayMinutes });
    },
    [scheduleRetryMutation]
  );

  const cancelJob = useCallback(
    (jobId: string) => {
      return cancelJobMutation.mutateAsync(jobId);
    },
    [cancelJobMutation]
  );

  const updateConfig = useCallback(
    (config: Partial<JobSystemConfig>) => {
      return updateConfigMutation.mutateAsync(config);
    },
    [updateConfigMutation]
  );

  return {
    // Dados
    jobs,
    jobStats,
    systemConfig,
    isSchedulerRunning,

    // Estados de loading
    isLoadingJobs,
    isLoadingStats,
    isLoadingConfig,
    isSchedulingDispatch: scheduleMonthlyDispatchMutation.isPending,
    isSchedulingRetry: scheduleRetryMutation.isPending,
    isCancellingJob: cancelJobMutation.isPending,
    isUpdatingConfig: updateConfigMutation.isPending,

    // Erros
    jobsError,
    statsError,
    configError,

    // Ações
    scheduleMonthlyDispatch,
    scheduleRetry,
    cancelJob,
    updateConfig,
    toggleScheduler,
    getJobStatus,
    listJobsWithFilters,
    validateConfiguration,
    resetConfigToDefaults,
    refetchJobs,

    // Utilitários
    getJobsByStatus: (status: JobStatus) => jobs.filter(job => job.status === status),
    getJobsByType: (type: JobType) => jobs.filter(job => job.type === type),
    getPendingJobs: () => jobs.filter(job => job.status === 'pending'),
    getRunningJobs: () => jobs.filter(job => job.status === 'running'),
    getFailedJobs: () => jobs.filter(job => job.status === 'failed'),
    getRecentJobs: (hours = 24) => {
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
      return jobs.filter(job => job.createdAt > cutoff);
    }
  };
}