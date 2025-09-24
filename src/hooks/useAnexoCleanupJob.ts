import { useState, useEffect, useCallback } from 'react';
import { anexoCleanupJobService, CleanupResult, CleanupStats } from '@/services/anexoCleanupJobService';
import { jobSchedulerService } from '@/services/jobSchedulerService';

export interface UseAnexoCleanupJobReturn {
  // Estado do job
  isRunning: boolean;
  isScheduled: boolean;
  stats: CleanupStats;
  
  // Controles
  startJob: () => void;
  stopJob: () => void;
  executeManualCleanup: () => Promise<CleanupResult>;
  
  // Informações
  getJobConfig: () => any;
  getNextExecution: () => string | null;
  
  // Estado de loading
  isExecuting: boolean;
  lastResult: CleanupResult | null;
  error: string | null;
}

export const useAnexoCleanupJob = (): UseAnexoCleanupJobReturn => {
  const [isRunning, setIsRunning] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [stats, setStats] = useState<CleanupStats>({
    totalExecucoes: 0,
    totalArquivosLimpos: 0,
    mediaArquivosPorExecucao: 0
  });
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<CleanupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Atualiza o estado do job
   */
  const updateJobState = useCallback(() => {
    setIsRunning(anexoCleanupJobService.isJobRunning());
    setIsScheduled(anexoCleanupJobService.isJobScheduled());
    setStats(anexoCleanupJobService.getStats());
  }, []);

  /**
   * Inicia o job de limpeza
   */
  const startJob = useCallback(() => {
    try {
      anexoCleanupJobService.start();
      updateJobState();
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao iniciar job';
      setError(errorMessage);
      console.error('Erro ao iniciar job de limpeza:', err);
    }
  }, [updateJobState]);

  /**
   * Para o job de limpeza
   */
  const stopJob = useCallback(() => {
    try {
      anexoCleanupJobService.stop();
      updateJobState();
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao parar job';
      setError(errorMessage);
      console.error('Erro ao parar job de limpeza:', err);
    }
  }, [updateJobState]);

  /**
   * Executa limpeza manual
   */
  const executeManualCleanup = useCallback(async (): Promise<CleanupResult> => {
    setIsExecuting(true);
    setError(null);
    
    try {
      const result = await anexoCleanupJobService.executeManualCleanup();
      setLastResult(result);
      updateJobState();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro na limpeza manual';
      setError(errorMessage);
      console.error('Erro na limpeza manual:', err);
      throw err;
    } finally {
      setIsExecuting(false);
    }
  }, [updateJobState]);

  /**
   * Obtém configuração do job
   */
  const getJobConfig = useCallback(() => {
    return anexoCleanupJobService.getJobConfig();
  }, []);

  /**
   * Obtém próxima execução
   */
  const getNextExecution = useCallback(() => {
    return anexoCleanupJobService.getNextExecution();
  }, []);

  /**
   * Monitora mudanças no job scheduler principal
   */
  const checkSchedulerJob = useCallback(() => {
    const schedulerJob = jobSchedulerService.getJob('anexo-cleanup');
    if (schedulerJob) {
      setIsScheduled(schedulerJob.enabled);
    }
  }, []);

  // Atualizar estado inicial e configurar polling
  useEffect(() => {
    updateJobState();
    checkSchedulerJob();

    // Polling para atualizar estado periodicamente
    const interval = setInterval(() => {
      updateJobState();
      checkSchedulerJob();
    }, 30000); // A cada 30 segundos

    return () => clearInterval(interval);
  }, [updateJobState, checkSchedulerJob]);

  return {
    // Estado do job
    isRunning,
    isScheduled,
    stats,
    
    // Controles
    startJob,
    stopJob,
    executeManualCleanup,
    
    // Informações
    getJobConfig,
    getNextExecution,
    
    // Estado de loading
    isExecuting,
    lastResult,
    error
  };
};