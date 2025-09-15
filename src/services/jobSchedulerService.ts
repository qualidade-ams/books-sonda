import { supabase } from '@/integrations/supabase/client';
import { booksDisparoService } from './booksDisparoService';
import { adminNotificationService } from './adminNotificationService';
import { auditLogger } from './auditLogger';

/**
 * Status de um job
 */
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Tipo de job
 */
export type JobType = 'monthly_books_dispatch' | 'retry_failed_dispatch' | 'cleanup_old_data';

/**
 * Configuração de retry
 */
export interface RetryConfig {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

/**
 * Dados de um job
 */
export interface JobData {
  id: string;
  type: JobType;
  status: JobStatus;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  payload: Record<string, any>;
  result?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Resultado da execução de um job
 */
export interface JobResult {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
  shouldRetry?: boolean;
}

/**
 * Configuração do scheduler
 */
export interface SchedulerConfig {
  enabled: boolean;
  maxConcurrentJobs: number;
  pollIntervalMs: number;
  retryConfig: RetryConfig;
  cleanupOldJobsAfterDays: number;
}

/**
 * Serviço de agendamento e execução de jobs
 */
export class JobSchedulerService {
  private config: SchedulerConfig;
  private runningJobs = new Map<string, Promise<void>>();
  private isRunning = false;
  private pollTimer?: NodeJS.Timeout;

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = {
      enabled: true,
      maxConcurrentJobs: 3,
      pollIntervalMs: 30000, // 30 segundos
      retryConfig: {
        maxAttempts: 3,
        backoffMultiplier: 2,
        initialDelayMs: 5000, // 5 segundos
        maxDelayMs: 300000 // 5 minutos
      },
      cleanupOldJobsAfterDays: 30,
      ...config
    };
  }

  /**
   * Inicia o scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[JobScheduler] Scheduler já está rodando');
      return;
    }

    this.isRunning = true;
    console.log('[JobScheduler] Iniciando scheduler de jobs');

    // Criar tabela de jobs se não existir
    await this.ensureJobsTable();

    // Iniciar polling
    this.startPolling();

    // Agendar job de limpeza
    await this.scheduleCleanupJob();

    await auditLogger.logOperation(
      'job_scheduler_started',
      'system',
      { config: this.config },
      'success'
    );
  }

  /**
   * Para o scheduler
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('[JobScheduler] Parando scheduler de jobs');
    this.isRunning = false;

    // Parar polling
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = undefined;
    }

    // Aguardar jobs em execução
    await Promise.all(this.runningJobs.values());

    await auditLogger.logOperation(
      'job_scheduler_stopped',
      'system',
      { runningJobsCount: this.runningJobs.size },
      'success'
    );
  }

  /**
   * Agenda disparo mensal de books
   */
  async scheduleMonthlyDispatch(mes: number, ano: number, scheduledAt?: Date): Promise<string> {
    const jobId = this.generateJobId();
    const scheduledDate = scheduledAt || this.getNextMonthlyDispatchDate();

    const jobData: Omit<JobData, 'createdAt' | 'updatedAt'> = {
      id: jobId,
      type: 'monthly_books_dispatch',
      status: 'pending',
      scheduledAt: scheduledDate,
      attempts: 0,
      maxAttempts: this.config.retryConfig.maxAttempts,
      payload: { mes, ano }
    };

    await this.saveJob(jobData);

    console.log(`[JobScheduler] Agendado disparo mensal para ${mes}/${ano} em ${scheduledDate.toISOString()}`);

    await auditLogger.logOperation(
      'monthly_dispatch_scheduled',
      'books_dispatch',
      { mes, ano, scheduledAt: scheduledDate.toISOString(), jobId },
      'success'
    );

    return jobId;
  }

  /**
   * Agenda retry de disparos falhados
   */
  async scheduleRetryFailedDispatch(mes: number, ano: number, delayMinutes = 30): Promise<string> {
    const jobId = this.generateJobId();
    const scheduledAt = new Date(Date.now() + delayMinutes * 60 * 1000);

    const jobData: Omit<JobData, 'createdAt' | 'updatedAt'> = {
      id: jobId,
      type: 'retry_failed_dispatch',
      status: 'pending',
      scheduledAt,
      attempts: 0,
      maxAttempts: this.config.retryConfig.maxAttempts,
      payload: { mes, ano }
    };

    await this.saveJob(jobData);

    console.log(`[JobScheduler] Agendado retry de falhas para ${mes}/${ano} em ${scheduledAt.toISOString()}`);

    await auditLogger.logOperation(
      'retry_dispatch_scheduled',
      'books_dispatch',
      { mes, ano, scheduledAt: scheduledAt.toISOString(), jobId },
      'success'
    );

    return jobId;
  }

  /**
   * Cancela um job
   */
  async cancelJob(jobId: string): Promise<void> {
    const { error } = await supabase
      .from('jobs_queue')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .in('status', ['pending', 'failed']);

    if (error) {
      throw new Error(`Erro ao cancelar job: ${error.message}`);
    }

    console.log(`[JobScheduler] Job ${jobId} cancelado`);

    await auditLogger.logOperation(
      'job_cancelled',
      'system',
      { jobId },
      'success'
    );
  }

  /**
   * Obtém status de um job
   */
  async getJobStatus(jobId: string): Promise<JobData | null> {
    const { data, error } = await supabase
      .from('jobs_queue')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Job não encontrado
      }
      throw new Error(`Erro ao buscar job: ${error.message}`);
    }

    return this.mapJobFromDatabase(data);
  }

  /**
   * Lista jobs com filtros
   */
  async listJobs(
    filters?: {
      type?: JobType;
      status?: JobStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<JobData[]> {
    let query = supabase
      .from('jobs_queue')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao listar jobs: ${error.message}`);
    }

    return (data || []).map(this.mapJobFromDatabase);
  }

  /**
   * Obtém estatísticas dos jobs
   */
  async getJobStatistics(): Promise<{
    total: number;
    byStatus: Record<JobStatus, number>;
    byType: Record<JobType, number>;
    recentFailures: number;
  }> {
    const { data, error } = await supabase
      .from('jobs_queue')
      .select('type, status, created_at');

    if (error) {
      throw new Error(`Erro ao obter estatísticas: ${error.message}`);
    }

    const jobs = data || [];
    const total = jobs.length;

    const byStatus = jobs.reduce((acc, job) => {
      acc[job.status as JobStatus] = (acc[job.status as JobStatus] || 0) + 1;
      return acc;
    }, {} as Record<JobStatus, number>);

    const byType = jobs.reduce((acc, job) => {
      acc[job.type as JobType] = (acc[job.type as JobType] || 0) + 1;
      return acc;
    }, {} as Record<JobType, number>);

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentFailures = jobs.filter(
      job => job.status === 'failed' && new Date(job.created_at) > oneDayAgo
    ).length;

    return { total, byStatus, byType, recentFailures };
  }

  // Métodos privados

  private async startPolling(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      await this.processJobs();
    } catch (error) {
      console.error('[JobScheduler] Erro no processamento de jobs:', error);
      
      await adminNotificationService.notifySystemIssue(
        'system_failure',
        'Erro no scheduler de jobs',
        error instanceof Error ? error.message : 'Erro desconhecido',
        'error',
        { error: String(error) }
      );
    }

    // Agendar próximo poll
    this.pollTimer = setTimeout(() => {
      this.startPolling();
    }, this.config.pollIntervalMs);
  }

  private async processJobs(): Promise<void> {
    if (this.runningJobs.size >= this.config.maxConcurrentJobs) {
      return; // Limite de jobs concorrentes atingido
    }

    // Buscar jobs pendentes
    const { data: pendingJobs, error } = await supabase
      .from('jobs_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(this.config.maxConcurrentJobs - this.runningJobs.size);

    if (error) {
      throw new Error(`Erro ao buscar jobs pendentes: ${error.message}`);
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      return;
    }

    // Processar cada job
    for (const jobData of pendingJobs) {
      const job = this.mapJobFromDatabase(jobData);
      
      if (!this.runningJobs.has(job.id)) {
        const jobPromise = this.executeJob(job);
        this.runningJobs.set(job.id, jobPromise);
        
        // Remover da lista quando completar
        jobPromise.finally(() => {
          this.runningJobs.delete(job.id);
        });
      }
    }
  }

  private async executeJob(job: JobData): Promise<void> {
    console.log(`[JobScheduler] Executando job ${job.id} (${job.type})`);

    // Marcar como em execução
    await this.updateJobStatus(job.id, 'running', { startedAt: new Date() });

    try {
      const result = await this.runJobByType(job);

      if (result.success) {
        await this.updateJobStatus(job.id, 'completed', {
          completedAt: new Date(),
          result: result.data
        });

        console.log(`[JobScheduler] Job ${job.id} completado com sucesso`);

        await auditLogger.logOperation(
          'job_completed',
          'system',
          { jobId: job.id, type: job.type, result: result.data },
          'success'
        );
      } else {
        await this.handleJobFailure(job, result.error || 'Erro desconhecido', result.shouldRetry);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      await this.handleJobFailure(job, errorMessage, true);
    }
  }

  private async runJobByType(job: JobData): Promise<JobResult> {
    switch (job.type) {
      case 'monthly_books_dispatch':
        return await this.executeMonthlyDispatch(job);
      
      case 'retry_failed_dispatch':
        return await this.executeRetryFailedDispatch(job);
      
      case 'cleanup_old_data':
        return await this.executeCleanupOldData(job);
      
      default:
        return {
          success: false,
          error: `Tipo de job não suportado: ${job.type}`,
          shouldRetry: false
        };
    }
  }

  private async executeMonthlyDispatch(job: JobData): Promise<JobResult> {
    const { mes, ano } = job.payload;

    try {
      const resultado = await booksDisparoService.dispararBooksMensal(mes, ano);

      // Notificar administradores sobre o resultado
      if (resultado.falhas > 0) {
        await adminNotificationService.notifySystemIssue(
          'system_failure',
          'Falhas no disparo mensal de books',
          `${resultado.falhas} de ${resultado.total} empresas falharam no disparo de ${mes}/${ano}`,
          'warning',
          {
            mes,
            ano,
            sucessos: resultado.sucesso,
            falhas: resultado.falhas,
            total: resultado.total
          }
        );

        // Agendar retry automático para falhas
        if (resultado.falhas > 0) {
          await this.scheduleRetryFailedDispatch(mes, ano, 60); // Retry em 1 hora
        }
      }

      return {
        success: true,
        data: {
          sucessos: resultado.sucesso,
          falhas: resultado.falhas,
          total: resultado.total,
          detalhesCount: resultado.detalhes.length
        }
      };

    } catch (error) {
      await adminNotificationService.notifySystemIssue(
        'critical_error',
        'Falha crítica no disparo mensal',
        `Erro ao executar disparo mensal de ${mes}/${ano}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        'critical',
        { mes, ano, error: String(error) }
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        shouldRetry: true
      };
    }
  }

  private async executeRetryFailedDispatch(job: JobData): Promise<JobResult> {
    const { mes, ano } = job.payload;

    try {
      const resultado = await booksDisparoService.reenviarFalhas(mes, ano);

      if (resultado.total === 0) {
        return {
          success: true,
          data: { message: 'Nenhuma falha encontrada para reenvio' }
        };
      }

      // Notificar sobre resultado do retry
      if (resultado.falhas > 0) {
        await adminNotificationService.notifySystemIssue(
          'system_failure',
          'Falhas persistem após retry',
          `${resultado.falhas} empresas ainda falharam após retry de ${mes}/${ano}`,
          'error',
          {
            mes,
            ano,
            sucessos: resultado.sucesso,
            falhas: resultado.falhas,
            total: resultado.total
          }
        );
      }

      return {
        success: true,
        data: {
          sucessos: resultado.sucesso,
          falhas: resultado.falhas,
          total: resultado.total
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        shouldRetry: true
      };
    }
  }

  private async executeCleanupOldData(job: JobData): Promise<JobResult> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.cleanupOldJobsAfterDays);

      // Limpar jobs antigos
      const { error: jobsError } = await supabase
        .from('jobs_queue')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .in('status', ['completed', 'failed', 'cancelled']);

      if (jobsError) {
        throw new Error(`Erro ao limpar jobs antigos: ${jobsError.message}`);
      }

      return {
        success: true,
        data: { cleanupDate: cutoffDate.toISOString() }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        shouldRetry: true
      };
    }
  }

  private async handleJobFailure(job: JobData, error: string, shouldRetry?: boolean): Promise<void> {
    const newAttempts = job.attempts + 1;
    const canRetry = shouldRetry !== false && newAttempts < job.maxAttempts;

    if (canRetry) {
      // Calcular delay para retry
      const delay = Math.min(
        this.config.retryConfig.initialDelayMs * Math.pow(this.config.retryConfig.backoffMultiplier, newAttempts - 1),
        this.config.retryConfig.maxDelayMs
      );

      const nextAttemptAt = new Date(Date.now() + delay);

      await this.updateJobStatus(job.id, 'pending', {
        attempts: newAttempts,
        lastError: error,
        scheduledAt: nextAttemptAt
      });

      console.log(`[JobScheduler] Job ${job.id} falhado, reagendado para ${nextAttemptAt.toISOString()} (tentativa ${newAttempts}/${job.maxAttempts})`);

    } else {
      await this.updateJobStatus(job.id, 'failed', {
        attempts: newAttempts,
        lastError: error,
        completedAt: new Date()
      });

      console.error(`[JobScheduler] Job ${job.id} falhado definitivamente após ${newAttempts} tentativas: ${error}`);

      // Notificar administradores sobre falha definitiva
      await adminNotificationService.notifySystemIssue(
        'critical_error',
        'Job falhado definitivamente',
        `Job ${job.id} (${job.type}) falhado após ${newAttempts} tentativas: ${error}`,
        'critical',
        {
          jobId: job.id,
          jobType: job.type,
          attempts: newAttempts,
          error,
          payload: job.payload
        }
      );

      await auditLogger.logOperation(
        'job_failed_permanently',
        'system',
        { jobId: job.id, type: job.type, attempts: newAttempts, error },
        'failure'
      );
    }
  }

  private async updateJobStatus(
    jobId: string,
    status: JobStatus,
    updates: Partial<{
      startedAt: Date;
      completedAt: Date;
      attempts: number;
      lastError: string;
      result: Record<string, any>;
      scheduledAt: Date;
    }>
  ): Promise<void> {
    const updateData: Record<string, any> = {
      status,
      updated_at: new Date().toISOString()
    };

    if (updates.startedAt) {
      updateData.started_at = updates.startedAt.toISOString();
    }

    if (updates.completedAt) {
      updateData.completed_at = updates.completedAt.toISOString();
    }

    if (updates.attempts !== undefined) {
      updateData.attempts = updates.attempts;
    }

    if (updates.lastError) {
      updateData.last_error = updates.lastError;
    }

    if (updates.result) {
      updateData.result = updates.result;
    }

    if (updates.scheduledAt) {
      updateData.scheduled_at = updates.scheduledAt.toISOString();
    }

    const { error } = await supabase
      .from('jobs_queue')
      .update(updateData)
      .eq('id', jobId);

    if (error) {
      console.error(`Erro ao atualizar status do job ${jobId}:`, error);
    }
  }

  private async saveJob(jobData: Omit<JobData, 'createdAt' | 'updatedAt'>): Promise<void> {
    const { error } = await supabase
      .from('jobs_queue')
      .insert({
        id: jobData.id,
        type: jobData.type,
        status: jobData.status,
        scheduled_at: jobData.scheduledAt.toISOString(),
        started_at: jobData.startedAt?.toISOString(),
        completed_at: jobData.completedAt?.toISOString(),
        attempts: jobData.attempts,
        max_attempts: jobData.maxAttempts,
        last_error: jobData.lastError,
        payload: jobData.payload,
        result: jobData.result,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Erro ao salvar job: ${error.message}`);
    }
  }

  private mapJobFromDatabase(data: any): JobData {
    return {
      id: data.id,
      type: data.type,
      status: data.status,
      scheduledAt: new Date(data.scheduled_at),
      startedAt: data.started_at ? new Date(data.started_at) : undefined,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      attempts: data.attempts,
      maxAttempts: data.max_attempts,
      lastError: data.last_error,
      payload: data.payload || {},
      result: data.result,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private async ensureJobsTable(): Promise<void> {
    // A tabela será criada via migration SQL
    // Este método pode ser usado para verificações futuras
  }

  private async scheduleCleanupJob(): Promise<void> {
    // Agendar limpeza diária às 2:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);

    const jobId = this.generateJobId();
    const jobData: Omit<JobData, 'createdAt' | 'updatedAt'> = {
      id: jobId,
      type: 'cleanup_old_data',
      status: 'pending',
      scheduledAt: tomorrow,
      attempts: 0,
      maxAttempts: 1,
      payload: {}
    };

    await this.saveJob(jobData);
  }

  private getNextMonthlyDispatchDate(): Date {
    // Por padrão, agendar para o primeiro dia do próximo mês às 9:00 AM
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(9, 0, 0, 0);
    return nextMonth;
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Instância singleton do serviço de jobs
export const jobSchedulerService = new JobSchedulerService();