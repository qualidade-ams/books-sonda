import { ClientBooksError, ClientBooksErrorCode } from '@/errors/clientBooksErrors';

/**
 * Utilitários para recuperação de erros e estratégias de fallback
 */

/**
 * Configuração para retry com backoff exponencial
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: any) => boolean;
}

/**
 * Configuração padrão para retry
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 segundo
  maxDelay: 10000, // 10 segundos
  backoffFactor: 2
};

/**
 * Configurações específicas por tipo de operação
 */
export const OPERATION_RETRY_CONFIGS: Record<string, RetryConfig> = {
  database: {
    maxRetries: 3,
    baseDelay: 500,
    maxDelay: 5000,
    backoffFactor: 2,
    retryCondition: (error) => {
      if (error instanceof ClientBooksError) {
        return ['DATABASE_CONNECTION_FAILED', 'DATABASE_TIMEOUT'].includes(error.code);
      }
      return false;
    }
  },
  email: {
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    backoffFactor: 1.5,
    retryCondition: (error) => {
      if (error instanceof ClientBooksError) {
        return ['DISPARO_EMAIL_SERVICE_ERROR', 'NETWORK_ERROR', 'RATE_LIMIT_EXCEEDED'].includes(error.code);
      }
      return false;
    }
  },
  import: {
    maxRetries: 2,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffFactor: 2,
    retryCondition: (error) => {
      if (error instanceof ClientBooksError) {
        return ['NETWORK_ERROR', 'SERVICE_UNAVAILABLE'].includes(error.code);
      }
      return false;
    }
  }
};

/**
 * Executa uma operação com retry automático
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Verifica se deve tentar novamente
      if (attempt === config.maxRetries) {
        break;
      }
      
      // Verifica condição de retry se definida
      if (config.retryCondition && !config.retryCondition(error)) {
        break;
      }
      
      // Calcula delay com backoff exponencial
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt),
        config.maxDelay
      );
      
      // Adiciona jitter para evitar thundering herd
      const jitter = Math.random() * 0.1 * delay;
      const finalDelay = delay + jitter;
      
      await new Promise(resolve => setTimeout(resolve, finalDelay));
    }
  }
  
  throw lastError;
}

/**
 * Configuração de fallback
 */
export interface FallbackConfig<T> {
  fallbacks: Array<() => Promise<T>>;
  shouldUseFallback?: (error: any) => boolean;
  onFallbackUsed?: (fallbackIndex: number, error: any) => void;
}

/**
 * Executa uma operação com fallbacks
 */
export async function withFallback<T>(
  primaryOperation: () => Promise<T>,
  config: FallbackConfig<T>
): Promise<T> {
  try {
    return await primaryOperation();
  } catch (error) {
    // Verifica se deve usar fallback
    if (config.shouldUseFallback && !config.shouldUseFallback(error)) {
      throw error;
    }
    
    // Tenta cada fallback em sequência
    for (let i = 0; i < config.fallbacks.length; i++) {
      try {
        config.onFallbackUsed?.(i, error);
        return await config.fallbacks[i]();
      } catch (fallbackError) {
        // Se é o último fallback, lança o erro
        if (i === config.fallbacks.length - 1) {
          throw fallbackError;
        }
        // Caso contrário, continua para o próximo fallback
      }
    }
    
    // Se chegou aqui, todos os fallbacks falharam
    throw error;
  }
}

/**
 * Circuit breaker para prevenir cascata de falhas
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000 // 1 minuto
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new ClientBooksError(
          'Circuit breaker is open',
          'SERVICE_UNAVAILABLE'
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.state = 'closed';
  }
}

/**
 * Gerenciador de recuperação de erros
 */
export class ErrorRecoveryManager {
  private circuitBreakers = new Map<string, CircuitBreaker>();

  /**
   * Executa operação com estratégia de recuperação completa
   */
  async executeWithRecovery<T>(
    operationName: string,
    operation: () => Promise<T>,
    options: {
      retryConfig?: RetryConfig;
      fallbacks?: Array<() => Promise<T>>;
      useCircuitBreaker?: boolean;
    } = {}
  ): Promise<T> {
    const {
      retryConfig = DEFAULT_RETRY_CONFIG,
      fallbacks = [],
      useCircuitBreaker = false
    } = options;

    let finalOperation = operation;

    // Aplica circuit breaker se solicitado
    if (useCircuitBreaker) {
      if (!this.circuitBreakers.has(operationName)) {
        this.circuitBreakers.set(operationName, new CircuitBreaker());
      }
      const circuitBreaker = this.circuitBreakers.get(operationName)!;
      finalOperation = () => circuitBreaker.execute(operation);
    }

    // Aplica retry
    const operationWithRetry = () => withRetry(finalOperation, retryConfig);

    // Aplica fallbacks se definidos
    if (fallbacks.length > 0) {
      return withFallback(operationWithRetry, {
        fallbacks,
        shouldUseFallback: (error) => {
          if (error instanceof ClientBooksError) {
            return error.getRecoveryStrategy() === 'fallback';
          }
          return true;
        },
        onFallbackUsed: (index, error) => {
          console.warn(`Using fallback ${index} for operation ${operationName}`, error);
        }
      });
    }

    return operationWithRetry();
  }

  /**
   * Obtém status dos circuit breakers
   */
  getCircuitBreakerStatus(): Record<string, string> {
    const status: Record<string, string> = {};
    for (const [name, breaker] of this.circuitBreakers) {
      status[name] = breaker.getState();
    }
    return status;
  }

  /**
   * Reseta um circuit breaker específico
   */
  resetCircuitBreaker(operationName: string): void {
    const breaker = this.circuitBreakers.get(operationName);
    if (breaker) {
      breaker.reset();
    }
  }

  /**
   * Reseta todos os circuit breakers
   */
  resetAllCircuitBreakers(): void {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.reset();
    }
  }
}

/**
 * Instância global do gerenciador de recuperação
 */
export const errorRecoveryManager = new ErrorRecoveryManager();

/**
 * Estratégias de fallback específicas para Client Books
 */
export const ClientBooksFallbacks = {
  /**
   * Fallback para busca de template de e-mail
   */
  getEmailTemplate: (defaultTemplateId: string) => async () => {
    // Implementar busca de template padrão
    console.warn('Using default template fallback');
    return { id: defaultTemplateId, content: 'Template padrão' };
  },

  /**
   * Fallback para envio de e-mail
   */
  sendEmail: (notificationEmail: string) => async (data: any) => {
    // Implementar notificação de falha por e-mail alternativo
    console.warn('Email sending failed, sending notification to admin');
    return { success: false, fallbackUsed: true };
  },

  /**
   * Fallback para busca de dados
   */
  getData: (cacheKey: string) => async () => {
    // Implementar busca em cache local
    console.warn('Database unavailable, using cached data');
    return null;
  }
};

/**
 * Utilitários para validação e sanitização de dados
 */
export const DataSanitizer = {
  /**
   * Sanitiza dados de entrada para prevenir erros
   */
  sanitizeEmpresaData: (data: any) => {
    return {
      ...data,
      nomeCompleto: data.nomeCompleto?.trim() || '',
      nomeAbreviado: data.nomeAbreviado?.trim() || '',
      emailGestor: data.emailGestor?.toLowerCase().trim() || null,
      linkSharepoint: data.linkSharepoint?.trim() || null
    };
  },

  /**
   * Sanitiza dados de cliente
   */
  sanitizeClienteData: (data: any) => {
    return {
      ...data,
      nomeCompleto: data.nomeCompleto?.trim() || '',
      email: data.email?.toLowerCase().trim() || '',
      funcao: data.funcao?.trim() || null
    };
  },

  /**
   * Sanitiza dados de grupo
   */
  sanitizeGrupoData: (data: any) => {
    return {
      ...data,
      nome: data.nome?.trim() || '',
      descricao: data.descricao?.trim() || null,
      emails: data.emails?.map((email: any) => ({
        ...email,
        email: email.email?.toLowerCase().trim() || '',
        nome: email.nome?.trim() || null
      })) || []
    };
  }
};

/**
 * Validador de integridade de dados
 */
export const DataIntegrityValidator = {
  /**
   * Valida integridade de empresa antes de salvar
   */
  validateEmpresaIntegrity: async (data: any): Promise<string[]> => {
    const errors: string[] = [];
    
    if (!data.nomeCompleto?.trim()) {
      errors.push('Nome completo é obrigatório');
    }
    
    if (!data.nomeAbreviado?.trim()) {
      errors.push('Nome abreviado é obrigatório');
    }
    
    if (data.emailGestor && !isValidEmail(data.emailGestor)) {
      errors.push('E-mail do gestor é inválido');
    }
    
    if (!data.produtos || data.produtos.length === 0) {
      errors.push('Pelo menos um produto deve ser selecionado');
    }
    
    return errors;
  },

  /**
   * Valida integridade de cliente
   */
  validateClienteIntegrity: async (data: any): Promise<string[]> => {
    const errors: string[] = [];
    
    if (!data.nomeCompleto?.trim()) {
      errors.push('Nome completo é obrigatório');
    }
    
    if (!data.email?.trim()) {
      errors.push('E-mail é obrigatório');
    } else if (!isValidEmail(data.email)) {
      errors.push('E-mail é inválido');
    }
    
    if (!data.empresaId) {
      errors.push('Empresa é obrigatória');
    }
    
    return errors;
  }
};

/**
 * Utilitário para validação de e-mail
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}