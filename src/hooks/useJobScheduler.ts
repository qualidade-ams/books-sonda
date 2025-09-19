/**
 * Hook para gerenciamento do job scheduler
 * Fornece interface para controlar jobs automáticos
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobSchedulerService, JobConfig, JobResult } from '@/services/jobSchedulerService';
import { toast } from 'sonner';

export function useJobScheduler() {
  const [schedulerStatus, setSchedulerStatus] = useState(jobSchedulerService.getStatus());
  const queryClient = useQueryClient();

  // Query para obter lista de jobs
  const {
    data: jobs,
    isLoading: carregandoJobs,
    refetch: recarregarJobs
  } = useQuery({
    queryKey: ['jobs-scheduler'],
    queryFn: () => jobSchedulerService.getJobs(),
    refetchInterval: 30000, // Atualizar a cada 30 segundos
    staleTime: 10000, // 10 segundos
  });

  // Mutation para executar job manualmente
  const executarJob = useMutation({
    mutationFn: (jobId: string) => jobSchedulerService.runJobNow(jobId),
    onSuccess: (result: JobResult) => {
      if (result.success) {
        toast.success(`Job executado com sucesso: ${result.jobId}`);
      } else {
        toast.error(`Erro ao executar job: ${result.error}`);
      }
      recarregarJobs();
    },
    onError: (error) => {
      console.error('Erro ao executar job:', error);
      toast.error('Erro ao executar job');
    }
  });

  // Mutation para alternar status do job
  const alternarJob = useMutation({
    mutationFn: ({ jobId, enabled }: { jobId: string; enabled: boolean }) => {
      jobSchedulerService.toggleJob(jobId, enabled);
      return Promise.resolve();
    },
    onSuccess: (_, { jobId, enabled }) => {
      toast.success(`Job ${enabled ? 'habilitado' : 'desabilitado'}: ${jobId}`);
      recarregarJobs();
      atualizarStatus();
    },
    onError: (error) => {
      console.error('Erro ao alterar status do job:', error);
      toast.error('Erro ao alterar status do job');
    }
  });

  // Mutation para atualizar configuração do job
  const atualizarConfiguracao = useMutation({
    mutationFn: ({ jobId, updates }: { jobId: string; updates: Partial<JobConfig> }) => {
      jobSchedulerService.updateJobConfig(jobId, updates);
      return Promise.resolve();
    },
    onSuccess: () => {
      toast.success('Configuração do job atualizada');
      recarregarJobs();
    },
    onError: (error) => {
      console.error('Erro ao atualizar configuração:', error);
      toast.error('Erro ao atualizar configuração do job');
    }
  });

  // Função para iniciar o scheduler
  const iniciarScheduler = useCallback(() => {
    try {
      jobSchedulerService.start();
      atualizarStatus();
      toast.success('Job scheduler iniciado');
    } catch (error) {
      console.error('Erro ao iniciar scheduler:', error);
      toast.error('Erro ao iniciar job scheduler');
    }
  }, []);

  // Função para parar o scheduler
  const pararScheduler = useCallback(() => {
    try {
      jobSchedulerService.stop();
      atualizarStatus();
      toast.success('Job scheduler parado');
    } catch (error) {
      console.error('Erro ao parar scheduler:', error);
      toast.error('Erro ao parar job scheduler');
    }
  }, []);

  // Função para atualizar status do scheduler
  const atualizarStatus = useCallback(() => {
    setSchedulerStatus(jobSchedulerService.getStatus());
  }, []);

  // Função para executar job específico
  const executarJobEspecifico = useCallback(async (jobId: string) => {
    try {
      await executarJob.mutateAsync(jobId);
    } catch (error) {
      console.error('Erro ao executar job específico:', error);
    }
  }, [executarJob]);

  // Função para alternar status de um job
  const alternarStatusJob = useCallback(async (jobId: string, enabled: boolean) => {
    try {
      await alternarJob.mutateAsync({ jobId, enabled });
    } catch (error) {
      console.error('Erro ao alternar status do job:', error);
    }
  }, [alternarJob]);

  // Função para atualizar configuração de um job
  const atualizarConfiguracaoJob = useCallback(async (jobId: string, updates: Partial<JobConfig>) => {
    try {
      await atualizarConfiguracao.mutateAsync({ jobId, updates });
    } catch (error) {
      console.error('Erro ao atualizar configuração do job:', error);
    }
  }, [atualizarConfiguracao]);

  // Função para obter job específico
  const obterJob = useCallback((jobId: string): JobConfig | undefined => {
    return jobSchedulerService.getJob(jobId);
  }, []);

  // Função para formatar próxima execução
  const formatarProximaExecucao = useCallback((job: JobConfig): string => {
    if (!job.nextRun) return 'Não agendado';
    
    const agora = new Date();
    const proxima = new Date(job.nextRun);
    const diff = proxima.getTime() - agora.getTime();
    
    if (diff <= 0) return 'Executando...';
    
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (horas > 0) {
      return `${horas}h ${minutos}m`;
    } else {
      return `${minutos}m`;
    }
  }, []);

  // Função para formatar intervalo
  const formatarIntervalo = useCallback((intervalMs: number): string => {
    const horas = Math.floor(intervalMs / (1000 * 60 * 60));
    const minutos = Math.floor((intervalMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (horas > 0) {
      return `${horas}h`;
    } else {
      return `${minutos}m`;
    }
  }, []);

  // Atualizar status periodicamente
  useEffect(() => {
    const interval = setInterval(atualizarStatus, 5000); // A cada 5 segundos
    return () => clearInterval(interval);
  }, [atualizarStatus]);

  // Calcular estatísticas dos jobs
  const estatisticas = React.useMemo(() => {
    if (!jobs) return null;

    const total = jobs.length;
    const ativos = jobs.filter(job => job.enabled).length;
    const inativos = total - ativos;
    const totalExecucoes = jobs.reduce((sum, job) => sum + job.runCount, 0);
    const totalErros = jobs.reduce((sum, job) => sum + job.errorCount, 0);

    return {
      total,
      ativos,
      inativos,
      totalExecucoes,
      totalErros,
      taxaSucesso: totalExecucoes > 0 ? ((totalExecucoes - totalErros) / totalExecucoes * 100).toFixed(1) : '100'
    };
  }, [jobs]);

  return {
    // Dados
    jobs,
    schedulerStatus,
    estatisticas,

    // Estados de carregamento
    carregandoJobs,
    executandoJob: executarJob.isPending,
    alterandoJob: alternarJob.isPending,
    atualizandoConfig: atualizarConfiguracao.isPending,

    // Ações do scheduler
    iniciarScheduler,
    pararScheduler,
    atualizarStatus,

    // Ações dos jobs
    executarJobEspecifico,
    alternarStatusJob,
    atualizarConfiguracaoJob,
    recarregarJobs,

    // Utilitários
    obterJob,
    formatarProximaExecucao,
    formatarIntervalo
  };
}

// Hook simplificado para monitoramento básico
export function useJobStatus() {
  const { schedulerStatus, estatisticas, jobs } = useJobScheduler();

  return {
    isRunning: schedulerStatus.isRunning,
    jobCount: schedulerStatus.jobCount,
    activeJobs: schedulerStatus.activeJobs,
    estatisticas,
    jobs: jobs?.filter(job => job.enabled) || []
  };
}