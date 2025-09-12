/**
 * Sistema de logging estruturado para configuração dinâmica
 * Implementa logging abrangente para eventos, performance e monitoramento
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export enum LogCategory {
  CONFIGURATION = 'configuration',
  CACHE = 'cache',
  DATABASE = 'database',
  VALIDATION = 'validation',
  FALLBACK = 'fallback',
  PERFORMANCE = 'performance'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  context?: Record<string, any>;
  duration?: number;
  error?: Error;
}

export interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  cacheHit?: boolean;
  recordCount?: number;
  errorMessage?: string;
}

export class ConfigurationLogger {
  private static instance: ConfigurationLogger;
  private performanceMetrics: PerformanceMetrics[] = [];
  private logEntries: LogEntry[] = [];
  private maxLogEntries = 1000;
  private maxMetricsEntries = 500;

  private constructor() {}

  static getInstance(): ConfigurationLogger {
    if (!ConfigurationLogger.instance) {
      ConfigurationLogger.instance = new ConfigurationLogger();
    }
    return ConfigurationLogger.instance;
  }

  /**
   * Log estruturado para eventos de configuração
   */
  log(level: LogLevel, category: LogCategory, message: string, context?: Record<string, any>, error?: Error): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      context,
      error
    };

    this.addLogEntry(entry);
    this.outputLog(entry);
  }

  /**
   * Log de debug para troubleshooting
   */
  debug(category: LogCategory, message: string, context?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
      this.log(LogLevel.DEBUG, category, message, context);
    }
  }

  /**
   * Log de informação para eventos normais
   */
  info(category: LogCategory, message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, category, message, context);
  }

  /**
   * Log de warning para situações que precisam atenção
   */
  warn(category: LogCategory, message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, category, message, context);
  }

  /**
   * Log de erro para falhas e exceções
   */
  error(category: LogCategory, message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.ERROR, category, message, context, error);
  }

  /**
   * Inicia medição de performance
   */
  startPerformanceTimer(operation: string): string {
    const timerId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const metric: PerformanceMetrics = {
      operation,
      startTime: performance.now(),
      success: false
    };

    this.performanceMetrics.push(metric);
    
    this.debug(LogCategory.PERFORMANCE, `Iniciando medição de performance: ${operation}`, {
      timerId,
      operation
    });

    return timerId;
  }

  /**
   * Finaliza medição de performance
   */
  endPerformanceTimer(timerId: string, success: boolean, context?: Record<string, any>): void {
    const operation = timerId.split('_')[0];
    const metric = this.performanceMetrics.find(m => 
      m.operation === operation && !m.endTime
    );

    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.success = success;
      
      if (context) {
        Object.assign(metric, context);
      }

      this.info(LogCategory.PERFORMANCE, `Performance: ${operation}`, {
        timerId,
        duration: `${metric.duration.toFixed(2)}ms`,
        success,
        ...context
      });

      // Limpar métricas antigas
      this.cleanupMetrics();
    }
  }

  /**
   * Log específico para eventos de carregamento de configuração
   */
  logConfigurationLoad(params: Record<string, any>, success: boolean, recordCount?: number, fromCache?: boolean): void {
    const context = {
      params,
      recordCount,
      fromCache,
      success
    };

    if (success) {
      this.info(LogCategory.CONFIGURATION, 'Configuração carregada com sucesso', context);
    } else {
      this.warn(LogCategory.CONFIGURATION, 'Falha ao carregar configuração', context);
    }
  }

  /**
   * Log específico para operações de cache
   */
  logCacheOperation(operation: 'hit' | 'miss' | 'set' | 'clear', key: string, context?: Record<string, any>): void {
    const logContext = {
      operation,
      key,
      ...context
    };

    switch (operation) {
      case 'hit':
        this.debug(LogCategory.CACHE, `Cache HIT: ${key}`, logContext);
        break;
      case 'miss':
        this.debug(LogCategory.CACHE, `Cache MISS: ${key}`, logContext);
        break;
      case 'set':
        this.debug(LogCategory.CACHE, `Cache SET: ${key}`, logContext);
        break;
      case 'clear':
        this.info(LogCategory.CACHE, `Cache CLEAR: ${key}`, logContext);
        break;
    }
  }

  /**
   * Log específico para operações de banco de dados
   */
  logDatabaseOperation(operation: string, table: string, success: boolean, duration?: number, recordCount?: number, error?: Error): void {
    const context = {
      operation,
      table,
      duration: duration ? `${duration.toFixed(2)}ms` : undefined,
      recordCount,
      success
    };

    if (success) {
      this.info(LogCategory.DATABASE, `Database ${operation} bem-sucedido: ${table}`, context);
    } else {
      this.error(LogCategory.DATABASE, `Database ${operation} falhou: ${table}`, context, error);
    }
  }

  /**
   * Log específico para validação de dados
   */
  logValidationIssue(issue: string, data: any, severity: 'warning' | 'error' = 'warning'): void {
    const context = {
      issue,
      data: typeof data === 'object' ? JSON.stringify(data) : data
    };

    if (severity === 'error') {
      this.error(LogCategory.VALIDATION, `Erro de validação: ${issue}`, context);
    } else {
      this.warn(LogCategory.VALIDATION, `Aviso de validação: ${issue}`, context);
    }
  }

  /**
   * Log específico para uso de fallback
   */
  logFallbackUsage(reason: string, context?: Record<string, any>): void {
    this.warn(LogCategory.FALLBACK, `Fallback ativado: ${reason}`, {
      reason,
      timestamp: new Date().toISOString(),
      ...context
    });
  }

  /**
   * Obtém estatísticas de performance
   */
  getPerformanceStats(): {
    totalOperations: number;
    averageDuration: number;
    successRate: number;
    operationStats: Record<string, {
      count: number;
      averageDuration: number;
      successRate: number;
    }>;
  } {
    const completedMetrics = this.performanceMetrics.filter(m => m.duration !== undefined);
    
    if (completedMetrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        successRate: 0,
        operationStats: {}
      };
    }

    const totalDuration = completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    const successCount = completedMetrics.filter(m => m.success).length;
    
    // Estatísticas por operação
    const operationStats: Record<string, any> = {};
    const operationGroups = completedMetrics.reduce((groups, metric) => {
      if (!groups[metric.operation]) {
        groups[metric.operation] = [];
      }
      groups[metric.operation].push(metric);
      return groups;
    }, {} as Record<string, PerformanceMetrics[]>);

    Object.entries(operationGroups).forEach(([operation, metrics]) => {
      const opDuration = metrics.reduce((sum, m) => sum + (m.duration || 0), 0);
      const opSuccess = metrics.filter(m => m.success).length;
      
      operationStats[operation] = {
        count: metrics.length,
        averageDuration: opDuration / metrics.length,
        successRate: opSuccess / metrics.length
      };
    });

    return {
      totalOperations: completedMetrics.length,
      averageDuration: totalDuration / completedMetrics.length,
      successRate: successCount / completedMetrics.length,
      operationStats
    };
  }

  /**
   * Obtém logs recentes por categoria
   */
  getRecentLogs(category?: LogCategory, limit: number = 50): LogEntry[] {
    let logs = this.logEntries;
    
    if (category) {
      logs = logs.filter(entry => entry.category === category);
    }
    
    return logs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Obtém estatísticas de logs
   */
  getLogStats(): Record<LogLevel, number> {
    return this.logEntries.reduce((stats, entry) => {
      stats[entry.level] = (stats[entry.level] || 0) + 1;
      return stats;
    }, {} as Record<LogLevel, number>);
  }

  /**
   * Limpa logs antigos
   */
  clearOldLogs(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 horas
    this.logEntries = this.logEntries.filter(entry => 
      new Date(entry.timestamp) > cutoffTime
    );
    
    this.info(LogCategory.CONFIGURATION, 'Logs antigos limpos', {
      remainingEntries: this.logEntries.length
    });
  }

  /**
   * Exporta logs para análise
   */
  exportLogs(): {
    logs: LogEntry[];
    metrics: PerformanceMetrics[];
    stats: {
      logStats: Record<LogLevel, number>;
      performanceStats: ReturnType<ConfigurationLogger['getPerformanceStats']>;
    };
  } {
    return {
      logs: this.logEntries,
      metrics: this.performanceMetrics,
      stats: {
        logStats: this.getLogStats(),
        performanceStats: this.getPerformanceStats()
      }
    };
  }

  private addLogEntry(entry: LogEntry): void {
    this.logEntries.push(entry);
    
    // Limitar número de entradas
    if (this.logEntries.length > this.maxLogEntries) {
      this.logEntries = this.logEntries.slice(-this.maxLogEntries);
    }
  }

  private outputLog(entry: LogEntry): void {
    const logMessage = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.category}] ${entry.message}`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, entry.context);
        break;
      case LogLevel.INFO:
        console.info(logMessage, entry.context);
        break;
      case LogLevel.WARN:
        console.warn(logMessage, entry.context);
        break;
      case LogLevel.ERROR:
        console.error(logMessage, entry.context, entry.error);
        break;
    }
  }

  private cleanupMetrics(): void {
    if (this.performanceMetrics.length > this.maxMetricsEntries) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.maxMetricsEntries);
    }
  }
}

// Instância singleton
export const configurationLogger = ConfigurationLogger.getInstance();