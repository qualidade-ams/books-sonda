import { EmailTemplateError, type EmailTemplateErrorLog, type ErrorSeverity } from '@/errors/EmailTemplateError';

/**
 * Interface para logs de auditoria de operações de mapeamento
 */
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  operation: AuditOperation;
  entityType: 'template' | 'mapping' | 'configuration';
  entityId?: string;
  userId?: string;
  details: Record<string, any>;
  result: 'success' | 'failure' | 'warning';
  duration?: number;
  error?: EmailTemplateErrorLog;
}

/**
 * Tipos de operações auditáveis
 */
export type AuditOperation = 
  | 'template_search'
  | 'template_mapping_search'
  | 'template_fallback_used'
  | 'mapping_validation'
  | 'mapping_creation'
  | 'mapping_update'
  | 'mapping_deletion'
  | 'configuration_update'
  | 'admin_notification_sent'
  | 'error_recovery_attempted'
  | 'error_recovery_success'
  | 'error_recovery_failed';

/**
 * Configuração do sistema de auditoria
 */
export interface AuditConfig {
  enabled: boolean;
  logLevel: ErrorSeverity;
  maxLogEntries: number;
  retentionDays: number;
  enableConsoleOutput: boolean;
  enableFileOutput: boolean;
  enableDatabaseOutput: boolean;
  notificationThreshold: ErrorSeverity;
}

/**
 * Sistema de auditoria para operações de mapeamento de templates
 */
export class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private config: AuditConfig;

  constructor(config?: Partial<AuditConfig>) {
    this.config = {
      enabled: true,
      logLevel: 'info',
      maxLogEntries: 1000,
      retentionDays: 30,
      enableConsoleOutput: true,
      enableFileOutput: false,
      enableDatabaseOutput: false,
      notificationThreshold: 'error',
      ...config
    };
  }

  /**
   * Registra uma operação de auditoria
   */
  async logOperation(
    operation: AuditOperation,
    entityType: 'template' | 'mapping' | 'configuration',
    details: Record<string, any>,
    result: 'success' | 'failure' | 'warning' = 'success',
    entityId?: string,
    userId?: string,
    duration?: number,
    error?: EmailTemplateError
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const entry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      operation,
      entityType,
      entityId,
      userId,
      details,
      result,
      duration,
      error: error?.toLogObject()
    };

    // Adicionar à lista de logs em memória
    this.logs.push(entry);
    this.cleanupOldLogs();

    // Output para console se habilitado
    if (this.config.enableConsoleOutput) {
      this.logToConsole(entry);
    }

    // Output para arquivo se habilitado
    if (this.config.enableFileOutput) {
      await this.logToFile(entry);
    }

    // Output para banco de dados se habilitado
    if (this.config.enableDatabaseOutput) {
      await this.logToDatabase(entry);
    }

    // Verificar se precisa notificar administradores
    if (this.shouldNotifyAdmins(entry)) {
      await this.notifyAdministrators(entry);
    }
  }

  /**
   * Registra uma operação de busca de template
   */
  async logTemplateSearch(
    formulario: string,
    modalidade: string,
    templateFound: boolean,
    templateId?: string,
    fallbackUsed?: boolean,
    fallbackType?: string,
    duration?: number
  ): Promise<void> {
    await this.logOperation(
      'template_search',
      'template',
      {
        formulario,
        modalidade,
        templateFound,
        templateId,
        fallbackUsed,
        fallbackType
      },
      templateFound ? 'success' : 'warning',
      templateId,
      undefined,
      duration
    );
  }

  /**
   * Registra uso de fallback
   */
  async logFallbackUsage(
    formulario: string,
    modalidade: string,
    fallbackType: string,
    templateId: string,
    templateName: string,
    reason: string
  ): Promise<void> {
    await this.logOperation(
      'template_fallback_used',
      'template',
      {
        formulario,
        modalidade,
        fallbackType,
        templateId,
        templateName,
        reason
      },
      'warning',
      templateId
    );
  }

  /**
   * Registra erro com contexto completo
   */
  async logError(
    operation: AuditOperation,
    error: EmailTemplateError,
    additionalContext?: Record<string, any>
  ): Promise<void> {
    await this.logOperation(
      operation,
      'template',
      {
        errorCode: error.code,
        errorMessage: error.message,
        ...error.context,
        ...additionalContext
      },
      'failure',
      undefined,
      undefined,
      undefined,
      error
    );
  }

  /**
   * Registra tentativa de recuperação de erro
   */
  async logErrorRecovery(
    originalError: EmailTemplateError,
    recoveryAttempt: number,
    recoveryStrategy: string,
    success: boolean,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logOperation(
      success ? 'error_recovery_success' : 'error_recovery_failed',
      'template',
      {
        originalErrorCode: originalError.code,
        recoveryAttempt,
        recoveryStrategy,
        ...details
      },
      success ? 'success' : 'failure'
    );
  }

  /**
   * Obtém logs filtrados por critérios
   */
  getLogs(filter?: {
    operation?: AuditOperation;
    entityType?: 'template' | 'mapping' | 'configuration';
    result?: 'success' | 'failure' | 'warning';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): AuditLogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.operation) {
        filteredLogs = filteredLogs.filter(log => log.operation === filter.operation);
      }
      if (filter.entityType) {
        filteredLogs = filteredLogs.filter(log => log.entityType === filter.entityType);
      }
      if (filter.result) {
        filteredLogs = filteredLogs.filter(log => log.result === filter.result);
      }
      if (filter.startDate) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) >= filter.startDate!
        );
      }
      if (filter.endDate) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) <= filter.endDate!
        );
      }
    }

    // Ordenar por timestamp (mais recente primeiro)
    filteredLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Aplicar limite se especificado
    if (filter?.limit) {
      filteredLogs = filteredLogs.slice(0, filter.limit);
    }

    return filteredLogs;
  }

  /**
   * Obtém estatísticas de auditoria
   */
  getStatistics(timeframe?: { startDate: Date; endDate: Date }): {
    totalOperations: number;
    successRate: number;
    errorRate: number;
    warningRate: number;
    operationCounts: Record<AuditOperation, number>;
    errorCounts: Record<string, number>;
    averageResponseTime?: number;
  } {
    let logs = this.logs;

    if (timeframe) {
      logs = logs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= timeframe.startDate && logDate <= timeframe.endDate;
      });
    }

    const totalOperations = logs.length;
    const successCount = logs.filter(log => log.result === 'success').length;
    const errorCount = logs.filter(log => log.result === 'failure').length;
    const warningCount = logs.filter(log => log.result === 'warning').length;

    const operationCounts = logs.reduce((acc, log) => {
      acc[log.operation] = (acc[log.operation] || 0) + 1;
      return acc;
    }, {} as Record<AuditOperation, number>);

    const errorCounts = logs
      .filter(log => log.error)
      .reduce((acc, log) => {
        const errorCode = log.error!.code;
        acc[errorCode] = (acc[errorCode] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const logsWithDuration = logs.filter(log => log.duration !== undefined);
    const averageResponseTime = logsWithDuration.length > 0
      ? logsWithDuration.reduce((sum, log) => sum + log.duration!, 0) / logsWithDuration.length
      : undefined;

    return {
      totalOperations,
      successRate: totalOperations > 0 ? (successCount / totalOperations) * 100 : 0,
      errorRate: totalOperations > 0 ? (errorCount / totalOperations) * 100 : 0,
      warningRate: totalOperations > 0 ? (warningCount / totalOperations) * 100 : 0,
      operationCounts,
      errorCounts,
      averageResponseTime
    };
  }

  /**
   * Limpa logs antigos baseado na configuração de retenção
   */
  private cleanupOldLogs(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    this.logs = this.logs.filter(log => 
      new Date(log.timestamp) > cutoffDate
    );

    // Manter apenas o número máximo de logs
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs = this.logs
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, this.config.maxLogEntries);
    }
  }

  /**
   * Log para console com formatação apropriada
   */
  private logToConsole(entry: AuditLogEntry): void {
    const prefix = `[EmailTemplateAudit]`;
    const timestamp = new Date(entry.timestamp).toLocaleString();
    const message = `${prefix} ${timestamp} - ${entry.operation} (${entry.result})`;

    switch (entry.result) {
      case 'failure':
        console.error(message, entry);
        break;
      case 'warning':
        console.warn(message, entry);
        break;
      default:
        console.log(message, entry);
    }
  }

  /**
   * Log para arquivo (implementação placeholder)
   */
  private async logToFile(entry: AuditLogEntry): Promise<void> {
    // Implementação futura: escrever para arquivo de log
    // Por enquanto, apenas um placeholder
    console.log(`[FileLog] ${JSON.stringify(entry)}`);
  }

  /**
   * Log para banco de dados (implementação placeholder)
   */
  private async logToDatabase(entry: AuditLogEntry): Promise<void> {
    // Implementação futura: salvar no banco de dados
    // Por enquanto, apenas um placeholder
    console.log(`[DatabaseLog] ${JSON.stringify(entry)}`);
  }

  /**
   * Verifica se deve notificar administradores
   */
  private shouldNotifyAdmins(entry: AuditLogEntry): boolean {
    if (entry.result === 'failure') {
      return true;
    }

    if (entry.error && entry.error.code) {
      const error = new EmailTemplateError(entry.error.message, entry.error.code as any);
      return error.requiresAdminNotification();
    }

    return false;
  }

  /**
   * Notifica administradores sobre problemas críticos
   */
  private async notifyAdministrators(entry: AuditLogEntry): Promise<void> {
    // Implementação placeholder para notificação de administradores
    console.warn(`[AdminNotification] Problema crítico detectado:`, entry);
    
    // Registrar que a notificação foi enviada
    await this.logOperation(
      'admin_notification_sent',
      'configuration',
      {
        originalOperation: entry.operation,
        originalError: entry.error?.code,
        notificationReason: 'critical_error_detected'
      },
      'success'
    );
  }

  /**
   * Gera ID único para entrada de log
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Atualiza configuração do logger
   */
  updateConfig(newConfig: Partial<AuditConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Obtém configuração atual
   */
  getConfig(): AuditConfig {
    return { ...this.config };
  }
}

// Instância singleton do audit logger
export const auditLogger = new AuditLogger();