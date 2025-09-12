import { EmailTemplateError, TEMPORARY_ERROR_CODES } from '@/errors/EmailTemplateError';
import { auditLogger } from './auditLogger';

/**
 * Estratégias de recuperação de erro
 */
export type RecoveryStrategy = 
  | 'retry_with_backoff'
  | 'fallback_to_default'
  | 'use_cached_result'
  | 'skip_operation'
  | 'manual_intervention_required';

/**
 * Configuração para recuperação de erros
 */
export interface RecoveryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  enableAutoRecovery: boolean;
  retryableErrorCodes: string[];
}

/**
 * Resultado de uma tentativa de recuperação
 */
export interface RecoveryResult<T = any> {
  success: boolean;
  result?: T;
  error?: EmailTemplateError;
  strategy: RecoveryStrategy;
  attemptsUsed: number;
  totalDuration: number;
}

/**
 * Contexto para operações de recuperação
 */
export interface RecoveryContext {
  operation: string;
  originalParams: Record<string, any>;
  startTime: number;
  attempts: number;
}

/**
 * Serviço de recuperação automática de erros
 */
export class ErrorRecoveryService {
  private config: RecoveryConfig;
  private activeRecoveries = new Map<string, RecoveryContext>();

  constructor(config?: Partial<RecoveryConfig>) {
    this.config = {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      enableAutoRecovery: true,
      retryableErrorCodes: TEMPORARY_ERROR_CODES,
      ...config
    };
  }

  /**
   * Executa uma operação com recuperação automática
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    context: {
      operationName: string;
      params?: Record<string, any>;
      customStrategy?: RecoveryStrategy;
    }
  ): Promise<RecoveryResult<T>> {
    const operationId = this.generateOperationId();
    const recoveryContext: RecoveryContext = {
      operation: context.operationName,
      originalParams: context.params || {},
      startTime: Date.now(),
      attempts: 0
    };

    this.activeRecoveries.set(operationId, recoveryContext);

    try {
      const result = await this.attemptOperationWithRetry(
        operation,
        recoveryContext,
        context.customStrategy
      );

      this.activeRecoveries.delete(operationId);
      return result;
    } catch (error) {
      this.activeRecoveries.delete(operationId);
      
      const emailError = error instanceof EmailTemplateError 
        ? error 
        : new EmailTemplateError(
            'Erro inesperado durante recuperação',
            'SYSTEM_ERROR',
            error
          );

      return {
        success: false,
        error: emailError,
        strategy: 'manual_intervention_required',
        attemptsUsed: recoveryContext.attempts,
        totalDuration: Date.now() - recoveryContext.startTime
      };
    }
  }

  /**
   * Tenta executar operação com retry automático
   */
  private async attemptOperationWithRetry<T>(
    operation: () => Promise<T>,
    context: RecoveryContext,
    customStrategy?: RecoveryStrategy
  ): Promise<RecoveryResult<T>> {
    type SafeRecoveryResult = RecoveryResult<T>;
    type RecoveryHandler = () => Promise<SafeRecoveryResult>;
    let lastError: EmailTemplateError | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
      context.attempts = attempt;

      try {
        const result = await operation();
        
        // Sucesso - registrar se houve tentativas anteriores
        if (attempt > 1) {
          await auditLogger.logErrorRecovery(
            lastError!,
            attempt - 1,
            'retry_with_backoff',
            true,
            {
              totalAttempts: attempt,
              recoveryDuration: Date.now() - context.startTime
            }
          );
        }

        return {
          success: true,
          result,
          strategy: attempt > 1 ? 'retry_with_backoff' : 'retry_with_backoff',
          attemptsUsed: attempt,
          totalDuration: Date.now() - context.startTime
        };

      } catch (error) {
        const emailError = error instanceof EmailTemplateError 
          ? error 
          : new EmailTemplateError(
              'Erro durante execução da operação',
              'SYSTEM_ERROR',
              error
            );

        lastError = emailError;

        // Log da tentativa falhada
        await auditLogger.logErrorRecovery(
          emailError,
          attempt,
          customStrategy || 'retry_with_backoff',
          false,
          {
            operationName: context.operation,
            params: context.originalParams
          }
        );

        // Se não é um erro recuperável ou excedeu tentativas, falhar
        if (!this.isRecoverableError(emailError) || attempt > this.config.maxRetries) {
          // Tentar estratégias alternativas com tipo explícito
          const alternativeResult = await this.tryAlternativeStrategies<T>(
            emailError,
            context,
            customStrategy
          ) as RecoveryResult<T> | null;

          if (alternativeResult) {
            return alternativeResult;
          }

          // Nenhuma estratégia funcionou
          return {
            success: false,
            error: emailError,
            strategy: 'manual_intervention_required',
            attemptsUsed: attempt,
            totalDuration: Date.now() - context.startTime
          };
        }

        // Aguardar antes da próxima tentativa (backoff exponencial)
        if (attempt <= this.config.maxRetries) {
          const delay = this.calculateBackoffDelay(attempt);
          await this.sleep(delay);
        }
      }
    }

    // Não deveria chegar aqui, mas por segurança
    return {
      success: false,
      error: lastError || new EmailTemplateError('Erro desconhecido', 'SYSTEM_ERROR'),
      strategy: 'manual_intervention_required',
      attemptsUsed: this.config.maxRetries + 1,
      totalDuration: Date.now() - context.startTime
    };
  }

  /**
   * Tenta estratégias alternativas de recuperação
   */
  private async tryAlternativeStrategies<T>(
    error: EmailTemplateError,
    context: RecoveryContext,
    customStrategy?: RecoveryStrategy
  ): Promise<RecoveryResult<T> | null> {
    const strategies = customStrategy 
      ? [customStrategy]
      : this.getApplicableStrategies(error);

    for (const strategy of strategies) {
      try {
        const result = await this.executeRecoveryStrategy<T>(strategy, error, context);
        if (result) {
          await auditLogger.logErrorRecovery(
            error,
            context.attempts,
            strategy,
            true,
            {
              alternativeStrategy: strategy,
              recoveryDuration: Date.now() - context.startTime
            }
          );
          return result;
        }
      } catch (strategyError) {
        await auditLogger.logErrorRecovery(
          error,
          context.attempts,
          strategy,
          false,
          {
            alternativeStrategy: strategy,
            strategyError: strategyError instanceof Error ? strategyError.message : strategyError
          }
        );
      }
    }

    return null;
  }

  /**
   * Executa uma estratégia específica de recuperação
   */
  private async executeRecoveryStrategy<T = unknown>(
    strategy: RecoveryStrategy,
    error: EmailTemplateError,
    context: RecoveryContext
  ): Promise<RecoveryResult<T> | null> {
    switch (strategy) {
      case 'fallback_to_default':
        return await this.executeFallbackToDefault(error, context);
      
      case 'use_cached_result':
        return await this.useCachedResult(error, context);
      
      case 'skip_operation':
        return {
          success: true,
          result: undefined as unknown as T,
          strategy: 'skip_operation',
          attemptsUsed: context.attempts,
          totalDuration: Date.now() - context.startTime
        };
      
      default:
        return null;
    }
  }

  /**
   * Estratégia: usar template padrão como fallback
   */
  private async executeFallbackToDefault<T>(
    error: EmailTemplateError,
    context: RecoveryContext
  ): Promise<RecoveryResult<T> | null> {
    // Esta implementação seria específica para o contexto de templates
    // Por enquanto, retorna null indicando que a estratégia não foi aplicável
    return null;
  }

  /**
   * Estratégia: usar resultado em cache
   */
  private async useCachedResult<T>(
    error: EmailTemplateError,
    context: RecoveryContext
  ): Promise<RecoveryResult<T> | null> {
    // Implementação futura: verificar cache de resultados
    // Por enquanto, retorna null
    return null;
  }

  /**
   * Determina estratégias aplicáveis baseado no tipo de erro
   */
  private getApplicableStrategies(error: EmailTemplateError): RecoveryStrategy[] {
    const strategies: RecoveryStrategy[] = [];

    switch (error.code) {
      case 'TEMPLATE_NOT_FOUND':
        strategies.push('fallback_to_default', 'use_cached_result');
        break;
      
      case 'DATABASE_CONNECTION_FAILED':
      case 'DATABASE_TIMEOUT':
        strategies.push('use_cached_result', 'skip_operation');
        break;
      
      case 'NETWORK_ERROR':
        strategies.push('use_cached_result');
        break;
      
      default:
        strategies.push('skip_operation');
    }

    return strategies;
  }

  /**
   * Verifica se um erro é recuperável automaticamente
   */
  private isRecoverableError(error: EmailTemplateError): boolean {
    if (!this.config.enableAutoRecovery) {
      return false;
    }

    return error.isTemporary() || this.config.retryableErrorCodes.includes(error.code);
  }

  /**
   * Calcula delay para backoff exponencial
   */
  private calculateBackoffDelay(attempt: number): number {
    const delay = this.config.baseDelayMs * Math.pow(this.config.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.config.maxDelayMs);
  }

  /**
   * Utilitário para aguardar
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gera ID único para operação
   */
  private generateOperationId(): string {
    return `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtém estatísticas de recuperação
   */
  getRecoveryStatistics(): {
    activeRecoveries: number;
    totalRecoveries: number;
    successRate: number;
    averageAttempts: number;
    averageDuration: number;
  } {
    // Implementação futura: manter estatísticas históricas
    return {
      activeRecoveries: this.activeRecoveries.size,
      totalRecoveries: 0,
      successRate: 0,
      averageAttempts: 0,
      averageDuration: 0
    };
  }

  /**
   * Atualiza configuração do serviço
   */
  updateConfig(newConfig: Partial<RecoveryConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Obtém configuração atual
   */
  getConfig(): RecoveryConfig {
    return { ...this.config };
  }
}

// Instância singleton do serviço de recuperação
export const errorRecoveryService = new ErrorRecoveryService();