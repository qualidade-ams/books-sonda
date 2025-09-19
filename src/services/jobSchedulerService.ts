/**
 * Serviço de agendamento de jobs automáticos
 * Responsável por executar tarefas periódicas como verificação de vigências
 */

import { vigenciaService } from './vigenciaService';

export interface JobConfig {
  id: string;
  name: string;
  description: string;
  interval: number; // em milissegundos
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  errorCount: number;
}

export interface JobResult {
  jobId: string;
  success: boolean;
  startTime: Date;
  endTime: Date;
  duration: number;
  result?: any;
  error?: string;
}

class JobSchedulerService {
  private jobs: Map<string, JobConfig> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  constructor() {
    this.initializeDefaultJobs();
  }

  /**
   * Inicializa os jobs padrão do sistema
   */
  private initializeDefaultJobs() {
    // Job de verificação de vigências - executa a cada 6 horas
    this.registerJob({
      id: 'vigencia-check',
      name: 'Verificação de Vigências',
      description: 'Verifica e inativa empresas com vigência vencida',
      interval: 6 * 60 * 60 * 1000, // 6 horas
      enabled: true,
      runCount: 0,
      errorCount: 0
    });

    // Job de limpeza de logs - executa diariamente
    this.registerJob({
      id: 'log-cleanup',
      name: 'Limpeza de Logs',
      description: 'Remove logs antigos do sistema',
      interval: 24 * 60 * 60 * 1000, // 24 horas
      enabled: true,
      runCount: 0,
      errorCount: 0
    });
  }

  /**
   * Registra um novo job
   */
  registerJob(config: JobConfig): void {
    this.jobs.set(config.id, {
      ...config,
      nextRun: new Date(Date.now() + config.interval)
    });

    if (config.enabled && this.isRunning) {
      this.scheduleJob(config.id);
    }
  }

  /**
   * Agenda a execução de um job
   */
  private scheduleJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job || !job.enabled) return;

    // Limpar timer anterior se existir
    const existingTimer = this.timers.get(jobId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Agendar próxima execução
    const timer = setTimeout(async () => {
      await this.executeJob(jobId);
      
      // Reagendar se o job ainda estiver ativo
      if (this.jobs.get(jobId)?.enabled) {
        this.scheduleJob(jobId);
      }
    }, job.interval);

    this.timers.set(jobId, timer);
  }

  /**
   * Executa um job específico
   */
  async executeJob(jobId: string): Promise<JobResult> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} não encontrado`);
    }

    const startTime = new Date();
    let result: JobResult;

    try {
      console.log(`Executando job: ${job.name} (${jobId})`);
      
      let jobResult: any;

      // Executar job baseado no ID
      switch (jobId) {
        case 'vigencia-check':
          jobResult = await this.executeVigenciaCheck();
          break;
        case 'log-cleanup':
          jobResult = await this.executeLogCleanup();
          break;
        default:
          throw new Error(`Executor não implementado para job: ${jobId}`);
      }

      const endTime = new Date();
      
      result = {
        jobId,
        success: true,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        result: jobResult
      };

      // Atualizar estatísticas do job
      job.lastRun = startTime;
      job.nextRun = new Date(Date.now() + job.interval);
      job.runCount++;

      console.log(`Job ${job.name} executado com sucesso:`, result);

    } catch (error) {
      const endTime = new Date();
      
      result = {
        jobId,
        success: false,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };

      // Atualizar estatísticas de erro
      job.errorCount++;
      job.lastRun = startTime;
      job.nextRun = new Date(Date.now() + job.interval);

      console.error(`Erro ao executar job ${job.name}:`, error);
    }

    return result;
  }

  /**
   * Executa verificação de vigências
   */
  private async executeVigenciaCheck(): Promise<any> {
    try {
      const empresasInativadas = await vigenciaService.executarInativacaoAutomatica();
      
      return {
        empresasInativadas,
        timestamp: new Date().toISOString(),
        message: `Verificação concluída: ${empresasInativadas} empresas inativadas`
      };
    } catch (error) {
      console.error('Erro na verificação de vigências:', error);
      throw error;
    }
  }

  /**
   * Executa limpeza de logs antigos
   */
  private async executeLogCleanup(): Promise<any> {
    try {
      // Implementar limpeza de logs se necessário
      // Por enquanto, apenas retorna sucesso
      return {
        logsRemovidos: 0,
        timestamp: new Date().toISOString(),
        message: 'Limpeza de logs executada (não implementada)'
      };
    } catch (error) {
      console.error('Erro na limpeza de logs:', error);
      throw error;
    }
  }

  /**
   * Inicia o scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.log('Job scheduler já está em execução');
      return;
    }

    this.isRunning = true;
    console.log('Iniciando job scheduler...');

    // Agendar todos os jobs habilitados
    for (const [jobId, job] of this.jobs) {
      if (job.enabled) {
        this.scheduleJob(jobId);
        console.log(`Job agendado: ${job.name} - próxima execução em ${job.interval}ms`);
      }
    }

    console.log('Job scheduler iniciado com sucesso');
  }

  /**
   * Para o scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('Job scheduler já está parado');
      return;
    }

    this.isRunning = false;
    console.log('Parando job scheduler...');

    // Limpar todos os timers
    for (const [jobId, timer] of this.timers) {
      clearTimeout(timer);
      console.log(`Timer do job ${jobId} cancelado`);
    }
    
    this.timers.clear();
    console.log('Job scheduler parado');
  }

  /**
   * Habilita ou desabilita um job
   */
  toggleJob(jobId: string, enabled: boolean): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} não encontrado`);
    }

    job.enabled = enabled;

    if (enabled && this.isRunning) {
      this.scheduleJob(jobId);
      console.log(`Job ${job.name} habilitado`);
    } else {
      const timer = this.timers.get(jobId);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(jobId);
        console.log(`Job ${job.name} desabilitado`);
      }
    }
  }

  /**
   * Executa um job manualmente
   */
  async runJobNow(jobId: string): Promise<JobResult> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} não encontrado`);
    }

    console.log(`Executando job manualmente: ${job.name}`);
    return await this.executeJob(jobId);
  }

  /**
   * Obtém informações de todos os jobs
   */
  getJobs(): JobConfig[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Obtém informações de um job específico
   */
  getJob(jobId: string): JobConfig | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Atualiza configuração de um job
   */
  updateJobConfig(jobId: string, updates: Partial<JobConfig>): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} não encontrado`);
    }

    // Atualizar configuração
    Object.assign(job, updates);

    // Se mudou o intervalo e o job está ativo, reagendar
    if (updates.interval && job.enabled && this.isRunning) {
      this.scheduleJob(jobId);
    }
  }

  /**
   * Remove um job
   */
  removeJob(jobId: string): void {
    const timer = this.timers.get(jobId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(jobId);
    }
    
    this.jobs.delete(jobId);
    console.log(`Job ${jobId} removido`);
  }

  /**
   * Obtém status do scheduler
   */
  getStatus(): { isRunning: boolean; jobCount: number; activeJobs: number } {
    const activeJobs = Array.from(this.jobs.values()).filter(job => job.enabled).length;
    
    return {
      isRunning: this.isRunning,
      jobCount: this.jobs.size,
      activeJobs
    };
  }
}

// Instância singleton
export const jobSchedulerService = new JobSchedulerService();

// Auto-iniciar o scheduler em produção
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  // Aguardar um pouco antes de iniciar para garantir que a aplicação carregou
  setTimeout(() => {
    jobSchedulerService.start();
  }, 5000);
}