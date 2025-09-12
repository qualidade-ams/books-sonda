/**
 * Tratamento de erros para o sistema de configuração dinâmica
 * Implementa estratégias de recuperação e logging estruturado
 */

import { ConfigurationError, CacheError } from '@/types/configuration';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  operation: string;
  params?: any;
  timestamp: Date;
  severity: ErrorSeverity;
  recoverable: boolean;
}

/**
 * Classe principal para tratamento de erros de configuração
 */
export class ConfigurationErrorHandler {
  
  /**
   * Trata erros de conexão com banco de dados
   * @param error Erro original
   * @param context Contexto da operação
   * @returns Erro tratado com informações adicionais
   */
  static handleDatabaseError(error: any, context: ErrorContext): ConfigurationError {
    const errorInfo = this.extractErrorInfo(error);
    
    // Log do erro
    this.logError(error, context, errorInfo);
    
    // Criar erro de configuração com contexto
    const configError = new ConfigurationError(
      `Falha na conexão com banco de dados: ${errorInfo.message}`,
      error
    );
    
    // Adicionar propriedades de contexto
    (configError as any).context = context;
    (configError as any).recoverable = errorInfo.isRecoverable;
    (configError as any).severity = this.determineSeverity(error, context);
    
    return configError;
  }

  /**
   * Trata erros de cache
   * @param error Erro original
   * @param context Contexto da operação
   * @returns Erro de cache tratado
   */
  static handleCacheError(error: any, context: ErrorContext): CacheError {
    const errorInfo = this.extractErrorInfo(error);
    
    // Log do erro (cache errors são geralmente menos críticos)
    this.logError(error, { ...context, severity: ErrorSeverity.LOW }, errorInfo);
    
    const cacheError = new CacheError(
      `Falha no cache: ${errorInfo.message}`,
      error
    );
    
    (cacheError as any).context = context;
    (cacheError as any).recoverable = true; // Cache errors são sempre recuperáveis
    (cacheError as any).severity = ErrorSeverity.LOW;
    
    return cacheError;
  }

  /**
   * Trata erros de validação
   * @param validationErrors Array de erros de validação
   * @param context Contexto da operação
   * @returns Erro de configuração com detalhes de validação
   */
  static handleValidationError(validationErrors: string[], context: ErrorContext): ConfigurationError {
    const message = `Erros de validação: ${validationErrors.join('; ')}`;
    
    // Log dos erros de validação
    console.warn('⚠️ Erros de validação encontrados:', {
      errors: validationErrors,
      context,
      timestamp: new Date().toISOString()
    });
    
    const configError = new ConfigurationError(message);
    (configError as any).context = context;
    (configError as any).validationErrors = validationErrors;
    (configError as any).recoverable = false; // Validation errors não são recuperáveis automaticamente
    (configError as any).severity = ErrorSeverity.MEDIUM;
    
    return configError;
  }

  /**
   * Implementa estratégia de retry para operações recuperáveis
   * @param operation Função a ser executada
   * @param maxRetries Número máximo de tentativas
   * @param delayMs Delay entre tentativas em millisegundos
   * @returns Resultado da operação ou erro final
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Verificar se o erro é recuperável
        const isRecoverable = this.isRecoverableError(error);
        
        if (!isRecoverable || attempt === maxRetries) {
          throw error;
        }
        
        // Log da tentativa
        console.warn(`⚠️ Tentativa ${attempt} falhou, tentando novamente em ${delayMs}ms:`, {
          error: error?.message || error,
          attempt,
          maxRetries
        });
        
        // Aguardar antes da próxima tentativa
        await this.delay(delayMs);
        
        // Aumentar o delay para a próxima tentativa (exponential backoff)
        delayMs *= 2;
      }
    }
    
    throw lastError;
  }

  /**
   * Cria um contexto de erro padrão
   * @param operation Nome da operação
   * @param params Parâmetros da operação
   * @param severity Severidade do erro
   * @returns Contexto de erro
   */
  static createContext(
    operation: string,
    params?: any,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): ErrorContext {
    return {
      operation,
      params,
      timestamp: new Date(),
      severity,
      recoverable: false
    };
  }

  /**
   * Extrai informações úteis de um erro
   * @param error Erro a ser analisado
   * @returns Informações estruturadas do erro
   */
  private static extractErrorInfo(error: any): {
    message: string;
    code?: string;
    isRecoverable: boolean;
  } {
    const message = error?.message || error?.toString() || 'Erro desconhecido';
    const code = error?.code || error?.status;
    const isRecoverable = this.isRecoverableError(error);
    
    return { message, code, isRecoverable };
  }

  /**
   * Verifica se um erro é recuperável
   * @param error Erro a ser verificado
   * @returns true se o erro é recuperável
   */
  private static isRecoverableError(error: any): boolean {
    if (!error) return false;
    
    const message = error?.message || error?.toString() || '';
    const recoverablePatterns = [
      /connection/i,
      /timeout/i,
      /network/i,
      /temporary/i,
      /retry/i,
      /ECONNRESET/i,
      /ENOTFOUND/i,
      /ETIMEDOUT/i
    ];
    
    return recoverablePatterns.some(pattern => pattern.test(message));
  }

  /**
   * Determina a severidade de um erro baseado no contexto
   * @param error Erro original
   * @param context Contexto da operação
   * @returns Severidade determinada
   */
  private static determineSeverity(error: any, context: ErrorContext): ErrorSeverity {
    // Se já foi especificada no contexto, usar essa
    if (context.severity) {
      return context.severity;
    }
    
    // Determinar baseado no tipo de erro
    if (error instanceof ConfigurationError) {
      return ErrorSeverity.HIGH;
    }
    
    if (error instanceof CacheError) {
      return ErrorSeverity.LOW;
    }
    
    // Verificar se é erro de conexão
    if (this.isRecoverableError(error)) {
      return ErrorSeverity.MEDIUM;
    }
    
    return ErrorSeverity.HIGH;
  }

  /**
   * Faz log estruturado do erro
   * @param error Erro original
   * @param context Contexto da operação
   * @param errorInfo Informações extraídas do erro
   */
  private static logError(error: any, context: ErrorContext, errorInfo: any): void {
    const logData = {
      message: errorInfo.message,
      operation: context.operation,
      params: context.params,
      severity: context.severity,
      recoverable: errorInfo.isRecoverable,
      timestamp: context.timestamp.toISOString(),
      stack: error?.stack
    };
    
    switch (context.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        console.error('❌ Erro crítico no sistema de configuração:', logData);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('⚠️ Erro no sistema de configuração:', logData);
        break;
      case ErrorSeverity.LOW:
        console.info('ℹ️ Aviso no sistema de configuração:', logData);
        break;
    }
  }

  /**
   * Utilitário para delay assíncrono
   * @param ms Millisegundos para aguardar
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Classe para monitoramento de saúde do sistema
 */
export class HealthMonitor {
  private static errorCounts = new Map<string, number>();
  private static lastErrors = new Map<string, Date>();
  
  /**
   * Registra um erro para monitoramento
   * @param operation Nome da operação
   * @param error Erro ocorrido
   */
  static recordError(operation: string, error: any): void {
    const count = this.errorCounts.get(operation) || 0;
    this.errorCounts.set(operation, count + 1);
    this.lastErrors.set(operation, new Date());
  }

  /**
   * Obtém estatísticas de erros
   * @returns Estatísticas de saúde do sistema
   */
  static getHealthStats(): {
    totalErrors: number;
    errorsByOperation: Record<string, number>;
    lastErrorTimes: Record<string, string>;
  } {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    
    const errorsByOperation: Record<string, number> = {};
    this.errorCounts.forEach((count, operation) => {
      errorsByOperation[operation] = count;
    });
    
    const lastErrorTimes: Record<string, string> = {};
    this.lastErrors.forEach((date, operation) => {
      lastErrorTimes[operation] = date.toISOString();
    });
    
    return {
      totalErrors,
      errorsByOperation,
      lastErrorTimes
    };
  }

  /**
   * Limpa as estatísticas de erro
   */
  static clearStats(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }
}