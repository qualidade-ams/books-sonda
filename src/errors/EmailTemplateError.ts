/**
 * Classe de erro específica para operações de mapeamento de templates de e-mail
 * Fornece códigos de erro específicos e detalhes para auditoria
 */
export class EmailTemplateError extends Error {
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    public readonly code: EmailTemplateErrorCode,
    public readonly details?: any,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'EmailTemplateError';
    this.timestamp = new Date();
    this.context = context;

    // Manter stack trace correto
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EmailTemplateError);
    }
  }

  /**
   * Converte o erro para um objeto serializável para logs
   */
  toLogObject(): EmailTemplateErrorLog {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp.toISOString(),
      details: this.details,
      context: this.context,
      stack: this.stack
    };
  }

  /**
   * Verifica se o erro é temporário e pode ser recuperado automaticamente
   */
  isTemporary(): boolean {
    return TEMPORARY_ERROR_CODES.includes(this.code);
  }

  /**
   * Verifica se o erro requer notificação para administradores
   */
  requiresAdminNotification(): boolean {
    return ADMIN_NOTIFICATION_ERROR_CODES.includes(this.code);
  }

  /**
   * Obtém a severidade do erro para logging
   */
  getSeverity(): ErrorSeverity {
    if (CRITICAL_ERROR_CODES.includes(this.code)) {
      return 'critical';
    }
    if (WARNING_ERROR_CODES.includes(this.code)) {
      return 'warning';
    }
    return 'error';
  }
}

/**
 * Códigos específicos de erro para mapeamento de templates
 */
export type EmailTemplateErrorCode = 
  // Erros de mapeamento
  | 'DUPLICATE_MAPPING'
  | 'TEMPLATE_NOT_FOUND'
  | 'INVALID_MAPPING'
  | 'MAPPING_VALIDATION_FAILED'
  
  // Erros de banco de dados
  | 'DATABASE_ERROR'
  | 'DATABASE_CONNECTION_FAILED'
  | 'DATABASE_TIMEOUT'
  | 'DATABASE_CONSTRAINT_VIOLATION'
  
  // Erros de configuração
  | 'INVALID_CONFIGURATION'
  | 'MISSING_CONFIGURATION'
  | 'CONFIGURATION_LOAD_FAILED'
  
  // Erros de template
  | 'TEMPLATE_RENDER_ERROR'
  | 'TEMPLATE_VALIDATION_ERROR'
  | 'TEMPLATE_PARSING_ERROR'
  
  // Erros de sistema
  | 'SYSTEM_ERROR'
  | 'NETWORK_ERROR'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMIT_EXCEEDED'
  
  // Erros de fallback
  | 'FALLBACK_CHAIN_EXHAUSTED'
  | 'FALLBACK_CONFIGURATION_ERROR'
  | 'FALLBACK_TEMPLATE_INVALID';

/**
 * Níveis de severidade para erros
 */
export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';

/**
 * Interface para logs de erro estruturados
 */
export interface EmailTemplateErrorLog {
  name: string;
  message: string;
  code: EmailTemplateErrorCode;
  timestamp: string;
  details?: any;
  context?: Record<string, any>;
  stack?: string;
}

/**
 * Códigos de erro que são considerados temporários e podem ser recuperados
 */
export const TEMPORARY_ERROR_CODES: EmailTemplateErrorCode[] = [
  'DATABASE_CONNECTION_FAILED',
  'DATABASE_TIMEOUT',
  'NETWORK_ERROR',
  'RATE_LIMIT_EXCEEDED'
];

/**
 * Códigos de erro que requerem notificação para administradores
 */
export const ADMIN_NOTIFICATION_ERROR_CODES: EmailTemplateErrorCode[] = [
  'DATABASE_ERROR',
  'DATABASE_CONNECTION_FAILED',
  'SYSTEM_ERROR',
  'FALLBACK_CHAIN_EXHAUSTED',
  'CONFIGURATION_LOAD_FAILED',
  'DATABASE_CONSTRAINT_VIOLATION'
];

/**
 * Códigos de erro críticos que requerem atenção imediata
 */
export const CRITICAL_ERROR_CODES: EmailTemplateErrorCode[] = [
  'DATABASE_CONNECTION_FAILED',
  'SYSTEM_ERROR',
  'FALLBACK_CHAIN_EXHAUSTED',
  'CONFIGURATION_LOAD_FAILED'
];

/**
 * Códigos de erro que são warnings (não críticos)
 */
export const WARNING_ERROR_CODES: EmailTemplateErrorCode[] = [
  'TEMPLATE_NOT_FOUND',
  'MAPPING_VALIDATION_FAILED',
  'FALLBACK_TEMPLATE_INVALID'
];

/**
 * Factory para criar erros específicos com contexto apropriado
 */
export class EmailTemplateErrorFactory {
  static createDuplicateMappingError(
    formulario: string,
    modalidade: string,
    existingTemplateId?: string
  ): EmailTemplateError {
    return new EmailTemplateError(
      `Já existe um mapeamento para ${formulario} + ${modalidade}`,
      'DUPLICATE_MAPPING',
      { existingTemplateId },
      { formulario, modalidade }
    );
  }

  static createTemplateNotFoundError(
    templateId?: string,
    formulario?: string,
    modalidade?: string
  ): EmailTemplateError {
    const message = templateId 
      ? `Template com ID ${templateId} não encontrado`
      : `Nenhum template encontrado para ${formulario} + ${modalidade}`;
    
    return new EmailTemplateError(
      message,
      'TEMPLATE_NOT_FOUND',
      { templateId },
      { formulario, modalidade }
    );
  }

  static createDatabaseError(
    operation: string,
    originalError: any
  ): EmailTemplateError {
    return new EmailTemplateError(
      `Erro de banco de dados durante ${operation}`,
      'DATABASE_ERROR',
      originalError,
      { operation }
    );
  }

  static createFallbackChainExhaustedError(
    formulario: string,
    modalidade: string,
    attemptedFallbacks: string[]
  ): EmailTemplateError {
    return new EmailTemplateError(
      `Cadeia de fallback esgotada para ${formulario} + ${modalidade}`,
      'FALLBACK_CHAIN_EXHAUSTED',
      { attemptedFallbacks },
      { formulario, modalidade }
    );
  }

  static createValidationError(
    field: string,
    value: any,
    reason: string
  ): EmailTemplateError {
    return new EmailTemplateError(
      `Validação falhou para ${field}: ${reason}`,
      'MAPPING_VALIDATION_FAILED',
      { field, value, reason }
    );
  }
}