/**
 * Classes de erro customizadas para o sistema de Client Books
 * Fornece códigos de erro específicos e estratégias de recuperação
 */

/**
 * Classe base para erros do sistema de Client Books
 */
export class ClientBooksError extends Error {
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    public readonly code: ClientBooksErrorCode,
    public readonly details?: any,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ClientBooksError';
    this.timestamp = new Date();
    this.context = context;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ClientBooksError);
    }
  }

  /**
   * Converte o erro para um objeto serializável para logs
   */
  toLogObject(): ClientBooksErrorLog {
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

  /**
   * Obtém estratégia de recuperação recomendada
   */
  getRecoveryStrategy(): RecoveryStrategy {
    return ERROR_RECOVERY_STRATEGIES[this.code] || 'manual';
  }
}

/**
 * Códigos específicos de erro para Client Books
 */
export type ClientBooksErrorCode = 
  // Erros de empresa
  | 'EMPRESA_NOT_FOUND'
  | 'EMPRESA_DUPLICATE_NAME'
  | 'EMPRESA_INVALID_STATUS'
  | 'EMPRESA_HAS_ACTIVE_COLLABORATORS'
  | 'EMPRESA_VALIDATION_FAILED'
  
  // Erros de colaborador
  | 'COLABORADOR_NOT_FOUND'
  | 'COLABORADOR_DUPLICATE_EMAIL'
  | 'COLABORADOR_INVALID_STATUS'
  | 'COLABORADOR_VALIDATION_FAILED'
  | 'COLABORADOR_PRINCIPAL_CONTATO_CONFLICT'
  
  // Erros de grupo
  | 'GRUPO_NOT_FOUND'
  | 'GRUPO_DUPLICATE_NAME'
  | 'GRUPO_HAS_ASSOCIATED_COMPANIES'
  | 'GRUPO_EMAIL_DUPLICATE'
  | 'GRUPO_VALIDATION_FAILED'
  
  // Erros de disparo
  | 'DISPARO_FAILED'
  | 'DISPARO_TEMPLATE_NOT_FOUND'
  | 'DISPARO_NO_ACTIVE_COLLABORATORS'
  | 'DISPARO_ALREADY_SENT'
  | 'DISPARO_SCHEDULING_FAILED'
  | 'DISPARO_EMAIL_SERVICE_ERROR'
  
  // Erros de importação
  | 'IMPORT_FILE_INVALID'
  | 'IMPORT_FILE_TOO_LARGE'
  | 'IMPORT_PARSING_FAILED'
  | 'IMPORT_VALIDATION_FAILED'
  | 'IMPORT_DUPLICATE_DATA'
  
  // Erros de banco de dados
  | 'DATABASE_CONNECTION_FAILED'
  | 'DATABASE_TIMEOUT'
  | 'DATABASE_CONSTRAINT_VIOLATION'
  | 'DATABASE_TRANSACTION_FAILED'
  
  // Erros de sistema
  | 'SYSTEM_ERROR'
  | 'NETWORK_ERROR'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SERVICE_UNAVAILABLE'
  
  // Erros de configuração
  | 'CONFIGURATION_ERROR'
  | 'TEMPLATE_CONFIGURATION_ERROR'
  | 'EMAIL_CONFIGURATION_ERROR';

/**
 * Níveis de severidade para erros
 */
export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';

/**
 * Estratégias de recuperação
 */
export type RecoveryStrategy = 'retry' | 'fallback' | 'manual' | 'ignore';

/**
 * Interface para logs de erro estruturados
 */
export interface ClientBooksErrorLog {
  name: string;
  message: string;
  code: ClientBooksErrorCode;
  timestamp: string;
  details?: any;
  context?: Record<string, any>;
  stack?: string;
}

/**
 * Códigos de erro temporários que podem ser recuperados automaticamente
 */
export const TEMPORARY_ERROR_CODES: ClientBooksErrorCode[] = [
  'DATABASE_CONNECTION_FAILED',
  'DATABASE_TIMEOUT',
  'NETWORK_ERROR',
  'RATE_LIMIT_EXCEEDED',
  'SERVICE_UNAVAILABLE',
  'DISPARO_EMAIL_SERVICE_ERROR'
];

/**
 * Códigos de erro que requerem notificação para administradores
 */
export const ADMIN_NOTIFICATION_ERROR_CODES: ClientBooksErrorCode[] = [
  'DATABASE_CONNECTION_FAILED',
  'DATABASE_CONSTRAINT_VIOLATION',
  'DATABASE_TRANSACTION_FAILED',
  'SYSTEM_ERROR',
  'SERVICE_UNAVAILABLE',
  'CONFIGURATION_ERROR',
  'TEMPLATE_CONFIGURATION_ERROR',
  'EMAIL_CONFIGURATION_ERROR'
];

/**
 * Códigos de erro críticos que requerem atenção imediata
 */
export const CRITICAL_ERROR_CODES: ClientBooksErrorCode[] = [
  'DATABASE_CONNECTION_FAILED',
  'SYSTEM_ERROR',
  'SERVICE_UNAVAILABLE',
  'CONFIGURATION_ERROR'
];

/**
 * Códigos de erro que são warnings (não críticos)
 */
export const WARNING_ERROR_CODES: ClientBooksErrorCode[] = [
  'EMPRESA_HAS_ACTIVE_COLLABORATORS',
  'GRUPO_HAS_ASSOCIATED_COMPANIES',
  'DISPARO_ALREADY_SENT',
  'IMPORT_DUPLICATE_DATA'
];

/**
 * Estratégias de recuperação por código de erro
 */
export const ERROR_RECOVERY_STRATEGIES: Record<ClientBooksErrorCode, RecoveryStrategy> = {
  // Erros que podem ser recuperados com retry
  'DATABASE_CONNECTION_FAILED': 'retry',
  'DATABASE_TIMEOUT': 'retry',
  'NETWORK_ERROR': 'retry',
  'RATE_LIMIT_EXCEEDED': 'retry',
  'SERVICE_UNAVAILABLE': 'retry',
  'DISPARO_EMAIL_SERVICE_ERROR': 'retry',
  
  // Erros que podem usar fallback
  'DISPARO_TEMPLATE_NOT_FOUND': 'fallback',
  'TEMPLATE_CONFIGURATION_ERROR': 'fallback',
  
  // Erros que podem ser ignorados
  'DISPARO_ALREADY_SENT': 'ignore',
  'IMPORT_DUPLICATE_DATA': 'ignore',
  
  // Erros que requerem intervenção manual
  'EMPRESA_NOT_FOUND': 'manual',
  'EMPRESA_DUPLICATE_NAME': 'manual',
  'EMPRESA_INVALID_STATUS': 'manual',
  'EMPRESA_HAS_ACTIVE_COLLABORATORS': 'manual',
  'EMPRESA_VALIDATION_FAILED': 'manual',
  'COLABORADOR_NOT_FOUND': 'manual',
  'COLABORADOR_DUPLICATE_EMAIL': 'manual',
  'COLABORADOR_INVALID_STATUS': 'manual',
  'COLABORADOR_VALIDATION_FAILED': 'manual',
  'COLABORADOR_PRINCIPAL_CONTATO_CONFLICT': 'manual',
  'GRUPO_NOT_FOUND': 'manual',
  'GRUPO_DUPLICATE_NAME': 'manual',
  'GRUPO_HAS_ASSOCIATED_COMPANIES': 'manual',
  'GRUPO_EMAIL_DUPLICATE': 'manual',
  'GRUPO_VALIDATION_FAILED': 'manual',
  'DISPARO_FAILED': 'manual',
  'DISPARO_NO_ACTIVE_COLLABORATORS': 'manual',
  'DISPARO_SCHEDULING_FAILED': 'manual',
  'IMPORT_FILE_INVALID': 'manual',
  'IMPORT_FILE_TOO_LARGE': 'manual',
  'IMPORT_PARSING_FAILED': 'manual',
  'IMPORT_VALIDATION_FAILED': 'manual',
  'DATABASE_CONSTRAINT_VIOLATION': 'manual',
  'DATABASE_TRANSACTION_FAILED': 'manual',
  'SYSTEM_ERROR': 'manual',
  'PERMISSION_DENIED': 'manual',
  'CONFIGURATION_ERROR': 'manual',
  'EMAIL_CONFIGURATION_ERROR': 'manual'
};

/**
 * Factory para criar erros específicos com contexto apropriado
 */
export class ClientBooksErrorFactory {
  // Erros de empresa
  static empresaNotFound(empresaId: string): ClientBooksError {
    return new ClientBooksError(
      `Empresa com ID ${empresaId} não encontrada`,
      'EMPRESA_NOT_FOUND',
      { empresaId }
    );
  }

  static empresaDuplicateName(nome: string): ClientBooksError {
    return new ClientBooksError(
      `Já existe uma empresa com o nome "${nome}"`,
      'EMPRESA_DUPLICATE_NAME',
      { nome }
    );
  }

  static empresaHasActiveCollaborators(empresaId: string, count: number): ClientBooksError {
    return new ClientBooksError(
      `Não é possível inativar empresa com ${count} colaboradores ativos`,
      'EMPRESA_HAS_ACTIVE_COLLABORATORS',
      { empresaId, activeCollaborators: count }
    );
  }

  // Erros de colaborador
  static colaboradorNotFound(colaboradorId: string): ClientBooksError {
    return new ClientBooksError(
      `Colaborador com ID ${colaboradorId} não encontrado`,
      'COLABORADOR_NOT_FOUND',
      { colaboradorId }
    );
  }

  static colaboradorDuplicateEmail(email: string, empresaId: string): ClientBooksError {
    return new ClientBooksError(
      `Já existe um colaborador com o e-mail "${email}" nesta empresa`,
      'COLABORADOR_DUPLICATE_EMAIL',
      { email, empresaId }
    );
  }

  static colaboradorPrincipalContatoConflict(empresaId: string, existingId: string): ClientBooksError {
    return new ClientBooksError(
      'Já existe um principal contato definido para esta empresa',
      'COLABORADOR_PRINCIPAL_CONTATO_CONFLICT',
      { empresaId, existingPrincipalContatoId: existingId }
    );
  }

  // Erros de grupo
  static grupoNotFound(grupoId: string): ClientBooksError {
    return new ClientBooksError(
      `Grupo com ID ${grupoId} não encontrado`,
      'GRUPO_NOT_FOUND',
      { grupoId }
    );
  }

  static grupoDuplicateName(nome: string): ClientBooksError {
    return new ClientBooksError(
      `Já existe um grupo com o nome "${nome}"`,
      'GRUPO_DUPLICATE_NAME',
      { nome }
    );
  }

  static grupoHasAssociatedCompanies(grupoId: string, count: number): ClientBooksError {
    return new ClientBooksError(
      `Não é possível excluir grupo associado a ${count} empresas`,
      'GRUPO_HAS_ASSOCIATED_COMPANIES',
      { grupoId, associatedCompanies: count }
    );
  }

  // Erros de disparo
  static disparoFailed(empresaId: string, error: any): ClientBooksError {
    return new ClientBooksError(
      'Falha no disparo de e-mail',
      'DISPARO_FAILED',
      { originalError: error },
      { empresaId }
    );
  }

  static disparoNoActiveCollaborators(empresaId: string): ClientBooksError {
    return new ClientBooksError(
      'Empresa não possui colaboradores ativos para receber o book',
      'DISPARO_NO_ACTIVE_COLLABORATORS',
      { empresaId }
    );
  }

  static disparoAlreadySent(empresaId: string, mes: number, ano: number): ClientBooksError {
    return new ClientBooksError(
      `Book já foi enviado para esta empresa em ${mes}/${ano}`,
      'DISPARO_ALREADY_SENT',
      { empresaId, mes, ano }
    );
  }

  // Erros de importação
  static importFileInvalid(fileName: string, reason: string): ClientBooksError {
    return new ClientBooksError(
      `Arquivo "${fileName}" é inválido: ${reason}`,
      'IMPORT_FILE_INVALID',
      { fileName, reason }
    );
  }

  static importValidationFailed(errors: any[]): ClientBooksError {
    return new ClientBooksError(
      `Validação falhou para ${errors.length} registros`,
      'IMPORT_VALIDATION_FAILED',
      { validationErrors: errors }
    );
  }

  // Erros de banco de dados
  static databaseError(operation: string, originalError: any): ClientBooksError {
    return new ClientBooksError(
      `Erro de banco de dados durante ${operation}`,
      'DATABASE_CONNECTION_FAILED',
      { originalError },
      { operation }
    );
  }

  static constraintViolation(constraint: string, details: any): ClientBooksError {
    return new ClientBooksError(
      `Violação de restrição: ${constraint}`,
      'DATABASE_CONSTRAINT_VIOLATION',
      { constraint, details }
    );
  }

  // Erros de validação
  static validationError(field: string, value: any, reason: string): ClientBooksError {
    return new ClientBooksError(
      `Validação falhou para ${field}: ${reason}`,
      'EMPRESA_VALIDATION_FAILED',
      { field, value, reason }
    );
  }
}

/**
 * Utilitários para tratamento de erros
 */
export class ClientBooksErrorHandler {
  /**
   * Verifica se um erro é do tipo ClientBooksError
   */
  static isClientBooksError(error: any): error is ClientBooksError {
    return error instanceof ClientBooksError;
  }

  /**
   * Obtém mensagem amigável para o usuário
   */
  static getUserFriendlyMessage(error: ClientBooksError): string {
    const messages: Record<ClientBooksErrorCode, string> = {
      'EMPRESA_NOT_FOUND': 'Empresa não encontrada',
      'EMPRESA_DUPLICATE_NAME': 'Já existe uma empresa com este nome',
      'EMPRESA_INVALID_STATUS': 'Status da empresa é inválido',
      'EMPRESA_HAS_ACTIVE_COLLABORATORS': 'Não é possível inativar empresa com colaboradores ativos',
      'EMPRESA_VALIDATION_FAILED': 'Dados da empresa são inválidos',
      
      'COLABORADOR_NOT_FOUND': 'Colaborador não encontrado',
      'COLABORADOR_DUPLICATE_EMAIL': 'Já existe um colaborador com este e-mail',
      'COLABORADOR_INVALID_STATUS': 'Status do colaborador é inválido',
      'COLABORADOR_VALIDATION_FAILED': 'Dados do colaborador são inválidos',
      'COLABORADOR_PRINCIPAL_CONTATO_CONFLICT': 'Já existe um principal contato para esta empresa',
      
      'GRUPO_NOT_FOUND': 'Grupo não encontrado',
      'GRUPO_DUPLICATE_NAME': 'Já existe um grupo com este nome',
      'GRUPO_HAS_ASSOCIATED_COMPANIES': 'Não é possível excluir grupo associado a empresas',
      'GRUPO_EMAIL_DUPLICATE': 'E-mail duplicado no grupo',
      'GRUPO_VALIDATION_FAILED': 'Dados do grupo são inválidos',
      
      'DISPARO_FAILED': 'Falha no envio do e-mail',
      'DISPARO_TEMPLATE_NOT_FOUND': 'Template de e-mail não encontrado',
      'DISPARO_NO_ACTIVE_COLLABORATORS': 'Empresa não possui colaboradores ativos',
      'DISPARO_ALREADY_SENT': 'Book já foi enviado neste período',
      'DISPARO_SCHEDULING_FAILED': 'Falha no agendamento do disparo',
      'DISPARO_EMAIL_SERVICE_ERROR': 'Erro no serviço de e-mail',
      
      'IMPORT_FILE_INVALID': 'Arquivo de importação inválido',
      'IMPORT_FILE_TOO_LARGE': 'Arquivo muito grande',
      'IMPORT_PARSING_FAILED': 'Falha ao processar arquivo',
      'IMPORT_VALIDATION_FAILED': 'Dados do arquivo são inválidos',
      'IMPORT_DUPLICATE_DATA': 'Dados duplicados no arquivo',
      
      'DATABASE_CONNECTION_FAILED': 'Erro de conexão com banco de dados',
      'DATABASE_TIMEOUT': 'Timeout na operação de banco',
      'DATABASE_CONSTRAINT_VIOLATION': 'Violação de regra de negócio',
      'DATABASE_TRANSACTION_FAILED': 'Falha na transação',
      
      'SYSTEM_ERROR': 'Erro interno do sistema',
      'NETWORK_ERROR': 'Erro de rede',
      'PERMISSION_DENIED': 'Permissão negada',
      'RATE_LIMIT_EXCEEDED': 'Limite de requisições excedido',
      'SERVICE_UNAVAILABLE': 'Serviço temporariamente indisponível',
      
      'CONFIGURATION_ERROR': 'Erro de configuração',
      'TEMPLATE_CONFIGURATION_ERROR': 'Erro na configuração de template',
      'EMAIL_CONFIGURATION_ERROR': 'Erro na configuração de e-mail'
    };

    return messages[error.code] || 'Erro inesperado';
  }

  /**
   * Determina se o erro deve ser mostrado ao usuário
   */
  static shouldShowToUser(error: ClientBooksError): boolean {
    const userVisibleCodes: ClientBooksErrorCode[] = [
      'EMPRESA_NOT_FOUND',
      'EMPRESA_DUPLICATE_NAME',
      'EMPRESA_HAS_ACTIVE_COLLABORATORS',
      'EMPRESA_VALIDATION_FAILED',
      'COLABORADOR_NOT_FOUND',
      'COLABORADOR_DUPLICATE_EMAIL',
      'COLABORADOR_VALIDATION_FAILED',
      'COLABORADOR_PRINCIPAL_CONTATO_CONFLICT',
      'GRUPO_NOT_FOUND',
      'GRUPO_DUPLICATE_NAME',
      'GRUPO_HAS_ASSOCIATED_COMPANIES',
      'GRUPO_EMAIL_DUPLICATE',
      'GRUPO_VALIDATION_FAILED',
      'DISPARO_NO_ACTIVE_COLLABORATORS',
      'DISPARO_ALREADY_SENT',
      'IMPORT_FILE_INVALID',
      'IMPORT_VALIDATION_FAILED',
      'IMPORT_DUPLICATE_DATA',
      'PERMISSION_DENIED'
    ];

    return userVisibleCodes.includes(error.code);
  }

  /**
   * Obtém ação recomendada para o usuário
   */
  static getRecommendedAction(error: ClientBooksError): string {
    const actions: Partial<Record<ClientBooksErrorCode, string>> = {
      'EMPRESA_DUPLICATE_NAME': 'Escolha um nome diferente para a empresa',
      'EMPRESA_HAS_ACTIVE_COLLABORATORS': 'Inative os colaboradores antes de inativar a empresa',
      'COLABORADOR_DUPLICATE_EMAIL': 'Use um e-mail diferente ou atualize o colaborador existente',
      'COLABORADOR_PRINCIPAL_CONTATO_CONFLICT': 'Remova o principal contato atual antes de definir um novo',
      'GRUPO_HAS_ASSOCIATED_COMPANIES': 'Remova as associações com empresas antes de excluir o grupo',
      'DISPARO_NO_ACTIVE_COLLABORATORS': 'Adicione colaboradores ativos à empresa',
      'IMPORT_FILE_INVALID': 'Verifique o formato do arquivo e tente novamente',
      'IMPORT_VALIDATION_FAILED': 'Corrija os dados inválidos e importe novamente'
    };

    return actions[error.code] || 'Entre em contato com o suporte se o problema persistir';
  }
}