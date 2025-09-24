import { anexoService } from './anexoService';
import { auditLogger } from './auditLogger';
import { anexoAuditService } from './anexoAuditService';

export interface CleanupResult {
  arquivosRemovidos: number;
  erros: string[];
  tempoExecucao: number;
  dataExecucao: string;
}

export interface CleanupStats {
  totalExecucoes: number;
  ultimaExecucao?: string;
  proximaExecucao?: string;
  totalArquivosLimpos: number;
  mediaArquivosPorExecucao: number;
}

class AnexoCleanupJobService {
  private readonly JOB_NAME = 'anexo_cleanup';
  private readonly EXECUTION_INTERVAL = 24 * 60 * 60 * 1000; // 24 horas em ms
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private stats: CleanupStats = {
    totalExecucoes: 0,
    totalArquivosLimpos: 0,
    mediaArquivosPorExecucao: 0
  };

  /**
   * Inicia o job de limpeza automática
   */
  start(): void {
    if (this.intervalId) {
      console.log('Job de limpeza de anexos já está em execução');
      return;
    }

    console.log('Iniciando job de limpeza automática de anexos...');
    
    // Executar imediatamente na inicialização
    this.executeCleanup();
    
    // Agendar execuções periódicas
    this.intervalId = setInterval(() => {
      this.executeCleanup();
    }, this.EXECUTION_INTERVAL);

    console.log(`Job de limpeza agendado para executar a cada ${this.EXECUTION_INTERVAL / (60 * 60 * 1000)} horas`);
  }

  /**
   * Para o job de limpeza automática
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Job de limpeza de anexos parado');
    }
  }

  /**
   * Executa a limpeza de anexos expirados
   */
  private async executeCleanup(): Promise<CleanupResult> {
    if (this.isRunning) {
      console.log('Job de limpeza já está em execução, pulando...');
      return {
        arquivosRemovidos: 0,
        erros: ['Job já em execução'],
        tempoExecucao: 0,
        dataExecucao: new Date().toISOString()
      };
    }

    this.isRunning = true;
    const startTime = Date.now();
    const dataExecucao = new Date().toISOString();
    const erros: string[] = [];
    let arquivosRemovidos = 0;

    try {
      console.log('Iniciando limpeza de anexos expirados...');
      
      // Executar limpeza
      arquivosRemovidos = await anexoService.limparAnexosExpirados();
      
      // Atualizar estatísticas
      this.updateStats(arquivosRemovidos);
      
      // Log de auditoria
      await this.logCleanupExecution(arquivosRemovidos, erros, Date.now() - startTime);
      
      console.log(`Limpeza concluída: ${arquivosRemovidos} arquivos removidos`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      erros.push(errorMessage);
      console.error('Erro durante limpeza de anexos:', error);
      
      // Log de erro
      await this.logCleanupError(errorMessage);
    } finally {
      this.isRunning = false;
    }

    const result: CleanupResult = {
      arquivosRemovidos,
      erros,
      tempoExecucao: Date.now() - startTime,
      dataExecucao
    };

    return result;
  }

  /**
   * Executa limpeza manual (para testes ou execução sob demanda)
   */
  async executeManualCleanup(): Promise<CleanupResult> {
    console.log('Executando limpeza manual de anexos...');
    return await this.executeCleanup();
  }

  /**
   * Atualiza estatísticas do job
   */
  private updateStats(arquivosRemovidos: number): void {
    this.stats.totalExecucoes++;
    this.stats.totalArquivosLimpos += arquivosRemovidos;
    this.stats.ultimaExecucao = new Date().toISOString();
    this.stats.proximaExecucao = new Date(Date.now() + this.EXECUTION_INTERVAL).toISOString();
    this.stats.mediaArquivosPorExecucao = this.stats.totalArquivosLimpos / this.stats.totalExecucoes;
  }

  /**
   * Registra execução da limpeza no log de auditoria
   */
  private async logCleanupExecution(arquivosRemovidos: number, erros: string[], tempoExecucao: number): Promise<void> {
    try {
      // Log no sistema de auditoria geral
      await auditLogger.logOperation(
        'anexo_limpeza_expirados' as any,
        'anexo',
        {
          arquivosRemovidos,
          erros: erros.length > 0 ? erros : undefined,
          tempoExecucaoMs: tempoExecucao,
          status: erros.length > 0 ? 'parcial' : 'sucesso',
          jobName: this.JOB_NAME,
          executionType: 'automatic'
        },
        erros.length > 0 ? 'warning' : 'success',
        undefined,
        'system',
        tempoExecucao
      );

      // Log específico de anexos (já é feito pelo anexoService.limparAnexosExpirados)
      // Não precisamos duplicar aqui
    } catch (error) {
      console.error('Erro ao registrar log de auditoria da limpeza:', error);
    }
  }

  /**
   * Registra erro da limpeza no log de auditoria
   */
  private async logCleanupError(errorMessage: string): Promise<void> {
    try {
      // Log no sistema de auditoria geral
      await auditLogger.logOperation(
        'anexo_limpeza_expirados' as any,
        'anexo',
        {
          error: errorMessage,
          status: 'erro',
          jobName: this.JOB_NAME,
          executionType: 'automatic'
        },
        'failure',
        undefined,
        'system'
      );
    } catch (error) {
      console.error('Erro ao registrar log de erro da limpeza:', error);
    }
  }

  /**
   * Obtém estatísticas do job
   */
  getStats(): CleanupStats {
    return { ...this.stats };
  }

  /**
   * Verifica se o job está em execução
   */
  isJobRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Verifica se o job está agendado
   */
  isJobScheduled(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Obtém informações sobre o próximo agendamento
   */
  getNextExecution(): string | null {
    return this.stats.proximaExecucao || null;
  }

  /**
   * Redefine estatísticas (para testes)
   */
  resetStats(): void {
    this.stats = {
      totalExecucoes: 0,
      totalArquivosLimpos: 0,
      mediaArquivosPorExecucao: 0
    };
  }

  /**
   * Configura intervalo personalizado (para testes)
   */
  setCustomInterval(intervalMs: number): void {
    if (this.intervalId) {
      this.stop();
    }
    
    // Atualizar intervalo
    (this as any).EXECUTION_INTERVAL = intervalMs;
    
    // Reiniciar com novo intervalo
    this.start();
  }

  /**
   * Obtém configuração atual do job
   */
  getJobConfig(): {
    name: string;
    interval: number;
    isRunning: boolean;
    isScheduled: boolean;
    nextExecution: string | null;
  } {
    return {
      name: this.JOB_NAME,
      interval: this.EXECUTION_INTERVAL,
      isRunning: this.isRunning,
      isScheduled: this.isJobScheduled(),
      nextExecution: this.getNextExecution()
    };
  }
}

// Instância singleton do serviço
export const anexoCleanupJobService = new AnexoCleanupJobService();
export default anexoCleanupJobService;