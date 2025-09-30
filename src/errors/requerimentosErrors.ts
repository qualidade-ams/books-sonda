/**
 * Classes de erro customizadas para o Sistema de Requerimentos
 * Fornece códigos de erro específicos e mensagens user-friendly
 */

import type { ModuloType, LinguagemType, TipoCobrancaType, StatusRequerimento } from '@/types/requerimentos';

/**
 * Classe base para erros do sistema de requerimentos
 */
export class RequerimentoError extends Error {
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    public readonly code: RequerimentoErrorCode,
    public readonly details?: any,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'RequerimentoError';
    this.timestamp = new Date();
    this.context = context;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RequerimentoError);
    }
  }

  /**
   * Converte o erro para um objeto serializável para logs
   */
  toLogObject(): RequerimentoErrorLog {
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
 * Códigos específicos de erro para requerimentos
 */
export type RequerimentoErrorCode = 
  // Erros de validação de campos obrigatórios (Requirements 9.1-9.9)
  | 'CHAMADO_REQUIRED'
  | 'CLIENTE_REQUIRED'
  | 'MODULO_REQUIRED'
  | 'DESCRICAO_REQUIRED'
  | 'DATA_ENVIO_REQUIRED'
  | 'DATA_APROVACAO_REQUIRED'
  | 'HORAS_REQUIRED'
  | 'LINGUAGEM_REQUIRED'
  | 'TIPO_COBRANCA_REQUIRED'
  | 'MES_COBRANCA_REQUIRED'
  
  // Erros de validação de formato
  | 'CHAMADO_INVALID_FORMAT'
  | 'DESCRICAO_TOO_LONG'
  | 'OBSERVACAO_TOO_LONG'
  | 'HORAS_INVALID_VALUE'
  | 'DATA_INVALID_FORMAT'
  | 'MES_COBRANCA_INVALID_RANGE'
  
  // Erros de validação de valores
  | 'MODULO_INVALID_VALUE'
  | 'LINGUAGEM_INVALID_VALUE'
  | 'TIPO_COBRANCA_INVALID_VALUE'
  | 'STATUS_INVALID_VALUE'
  
  // Erros de requerimento
  | 'REQUERIMENTO_NOT_FOUND'
  | 'REQUERIMENTO_ALREADY_SENT'
  | 'REQUERIMENTO_ALREADY_BILLED'
  | 'REQUERIMENTO_INVALID_STATUS'
  | 'REQUERIMENTO_DUPLICATE_CHAMADO'
  
  // Erros de cliente
  | 'CLIENTE_NOT_FOUND'
  | 'CLIENTE_INACTIVE'
  
  // Erros de faturamento
  | 'FATURAMENTO_NO_REQUERIMENTOS'
  | 'FATURAMENTO_INVALID_PERIOD'
  | 'FATURAMENTO_EMAIL_FAILED'
  | 'FATURAMENTO_REPORT_GENERATION_FAILED'
  | 'FATURAMENTO_DESTINATARIOS_REQUIRED'
  | 'FATURAMENTO_DESTINATARIOS_INVALID'
  
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
export interface RequerimentoErrorLog {
  name: string;
  message: string;
  code: RequerimentoErrorCode;
  timestamp: string;
  details?: any;
  context?: Record<string, any>;
  stack?: string;
}

/**
 * Códigos de erro temporários que podem ser recuperados automaticamente
 */
export const TEMPORARY_ERROR_CODES: RequerimentoErrorCode[] = [
  'DATABASE_CONNECTION_FAILED',
  'DATABASE_TIMEOUT',
  'NETWORK_ERROR',
  'RATE_LIMIT_EXCEEDED',
  'SERVICE_UNAVAILABLE',
  'FATURAMENTO_EMAIL_FAILED'
];

/**
 * Códigos de erro que requerem notificação para administradores
 */
export const ADMIN_NOTIFICATION_ERROR_CODES: RequerimentoErrorCode[] = [
  'DATABASE_CONNECTION_FAILED',
  'DATABASE_CONSTRAINT_VIOLATION',
  'DATABASE_TRANSACTION_FAILED',
  'SYSTEM_ERROR',
  'SERVICE_UNAVAILABLE',
  'CONFIGURATION_ERROR',
  'EMAIL_CONFIGURATION_ERROR',
  'FATURAMENTO_REPORT_GENERATION_FAILED'
];

/**
 * Códigos de erro críticos que requerem atenção imediata
 */
export const CRITICAL_ERROR_CODES: RequerimentoErrorCode[] = [
  'DATABASE_CONNECTION_FAILED',
  'SYSTEM_ERROR',
  'SERVICE_UNAVAILABLE',
  'CONFIGURATION_ERROR'
];

/**
 * Códigos de erro que são warnings (não críticos)
 */
export const WARNING_ERROR_CODES: RequerimentoErrorCode[] = [
  'REQUERIMENTO_ALREADY_SENT',
  'REQUERIMENTO_ALREADY_BILLED',
  'CLIENTE_INACTIVE',
  'FATURAMENTO_NO_REQUERIMENTOS'
];

/**
 * Estratégias de recuperação por código de erro
 */
export const ERROR_RECOVERY_STRATEGIES: Record<RequerimentoErrorCode, RecoveryStrategy> = {
  // Erros que podem ser recuperados com retry
  'DATABASE_CONNECTION_FAILED': 'retry',
  'DATABASE_TIMEOUT': 'retry',
  'NETWORK_ERROR': 'retry',
  'RATE_LIMIT_EXCEEDED': 'retry',
  'SERVICE_UNAVAILABLE': 'retry',
  'FATURAMENTO_EMAIL_FAILED': 'retry',
  
  // Erros que podem ser ignorados
  'REQUERIMENTO_ALREADY_SENT': 'ignore',
  'REQUERIMENTO_ALREADY_BILLED': 'ignore',
  
  // Erros que requerem intervenção manual
  'CHAMADO_REQUIRED': 'manual',
  'CLIENTE_REQUIRED': 'manual',
  'MODULO_REQUIRED': 'manual',
  'DESCRICAO_REQUIRED': 'manual',
  'DATA_ENVIO_REQUIRED': 'manual',
  'DATA_APROVACAO_REQUIRED': 'manual',
  'HORAS_REQUIRED': 'manual',
  'LINGUAGEM_REQUIRED': 'manual',
  'TIPO_COBRANCA_REQUIRED': 'manual',
  'MES_COBRANCA_REQUIRED': 'manual',
  'CHAMADO_INVALID_FORMAT': 'manual',
  'DESCRICAO_TOO_LONG': 'manual',
  'OBSERVACAO_TOO_LONG': 'manual',
  'HORAS_INVALID_VALUE': 'manual',
  'DATA_INVALID_FORMAT': 'manual',
  'MES_COBRANCA_INVALID_RANGE': 'manual',
  'MODULO_INVALID_VALUE': 'manual',
  'LINGUAGEM_INVALID_VALUE': 'manual',
  'TIPO_COBRANCA_INVALID_VALUE': 'manual',
  'STATUS_INVALID_VALUE': 'manual',
  'REQUERIMENTO_NOT_FOUND': 'manual',
  'REQUERIMENTO_INVALID_STATUS': 'manual',
  'REQUERIMENTO_DUPLICATE_CHAMADO': 'manual',
  'CLIENTE_NOT_FOUND': 'manual',
  'CLIENTE_INACTIVE': 'manual',
  'FATURAMENTO_NO_REQUERIMENTOS': 'manual',
  'FATURAMENTO_INVALID_PERIOD': 'manual',
  'FATURAMENTO_REPORT_GENERATION_FAILED': 'manual',
  'FATURAMENTO_DESTINATARIOS_REQUIRED': 'manual',
  'FATURAMENTO_DESTINATARIOS_INVALID': 'manual',
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
export class RequerimentoErrorFactory {
  // Erros de validação de campos obrigatórios
  static chamadoRequired(): RequerimentoError {
    return new RequerimentoError(
      'Campo "Chamado" é obrigatório',
      'CHAMADO_REQUIRED'
    );
  }

  static clienteRequired(): RequerimentoError {
    return new RequerimentoError(
      'Campo "Cliente" é obrigatório',
      'CLIENTE_REQUIRED'
    );
  }

  static moduloRequired(): RequerimentoError {
    return new RequerimentoError(
      'Campo "Módulo" é obrigatório',
      'MODULO_REQUIRED'
    );
  }

  static descricaoRequired(): RequerimentoError {
    return new RequerimentoError(
      'Campo "Descrição" é obrigatório',
      'DESCRICAO_REQUIRED'
    );
  }

  static dataEnvioRequired(): RequerimentoError {
    return new RequerimentoError(
      'Campo "Data de Envio" é obrigatório',
      'DATA_ENVIO_REQUIRED'
    );
  }

  static dataAprovacaoRequired(): RequerimentoError {
    return new RequerimentoError(
      'Campo "Data de Aprovação" é obrigatório',
      'DATA_APROVACAO_REQUIRED'
    );
  }

  static horasRequired(): RequerimentoError {
    return new RequerimentoError(
      'Pelo menos um dos campos de horas (Funcional ou Técnico) é obrigatório',
      'HORAS_REQUIRED'
    );
  }

  static linguagemRequired(): RequerimentoError {
    return new RequerimentoError(
      'Campo "Linguagem" é obrigatório',
      'LINGUAGEM_REQUIRED'
    );
  }

  static tipoCobrancaRequired(): RequerimentoError {
    return new RequerimentoError(
      'Campo "Tipo de Cobrança" é obrigatório',
      'TIPO_COBRANCA_REQUIRED'
    );
  }

  static mesCobrancaRequired(): RequerimentoError {
    return new RequerimentoError(
      'Campo "Mês de Cobrança" é obrigatório',
      'MES_COBRANCA_REQUIRED'
    );
  }

  // Erros de validação de formato
  static chamadoInvalidFormat(chamado: string): RequerimentoError {
    return new RequerimentoError(
      'Formato do chamado inválido. Use apenas letras, números e hífen (ex: RF-6017993)',
      'CHAMADO_INVALID_FORMAT',
      { chamado }
    );
  }

  static descricaoTooLong(length: number): RequerimentoError {
    return new RequerimentoError(
      `Descrição muito longa. Máximo de 500 caracteres (atual: ${length})`,
      'DESCRICAO_TOO_LONG',
      { currentLength: length, maxLength: 500 }
    );
  }

  static observacaoTooLong(length: number): RequerimentoError {
    return new RequerimentoError(
      `Observação muito longa. Máximo de 1000 caracteres (atual: ${length})`,
      'OBSERVACAO_TOO_LONG',
      { currentLength: length, maxLength: 1000 }
    );
  }

  static horasInvalidValue(field: string, value: number): RequerimentoError {
    return new RequerimentoError(
      `Valor inválido para ${field}. Deve ser um número positivo`,
      'HORAS_INVALID_VALUE',
      { field, value }
    );
  }

  static dataInvalidFormat(field: string, value: string): RequerimentoError {
    return new RequerimentoError(
      `Formato de data inválido para ${field}`,
      'DATA_INVALID_FORMAT',
      { field, value }
    );
  }

  static mesCobrancaInvalidRange(value: number): RequerimentoError {
    return new RequerimentoError(
      'Mês de cobrança deve estar entre 1 e 12',
      'MES_COBRANCA_INVALID_RANGE',
      { value }
    );
  }

  // Erros de validação de valores
  static moduloInvalidValue(value: string): RequerimentoError {
    return new RequerimentoError(
      `Módulo inválido: ${value}`,
      'MODULO_INVALID_VALUE',
      { value }
    );
  }

  static linguagemInvalidValue(value: string): RequerimentoError {
    return new RequerimentoError(
      `Linguagem inválida: ${value}`,
      'LINGUAGEM_INVALID_VALUE',
      { value }
    );
  }

  static tipoCobrancaInvalidValue(value: string): RequerimentoError {
    return new RequerimentoError(
      `Tipo de cobrança inválido: ${value}`,
      'TIPO_COBRANCA_INVALID_VALUE',
      { value }
    );
  }

  static statusInvalidValue(value: string): RequerimentoError {
    return new RequerimentoError(
      `Status inválido: ${value}`,
      'STATUS_INVALID_VALUE',
      { value }
    );
  }

  // Erros de requerimento
  static requerimentoNotFound(id: string): RequerimentoError {
    return new RequerimentoError(
      `Requerimento com ID ${id} não encontrado`,
      'REQUERIMENTO_NOT_FOUND',
      { requerimentoId: id }
    );
  }

  static requerimentoAlreadySent(id: string): RequerimentoError {
    return new RequerimentoError(
      'Requerimento já foi enviado para faturamento',
      'REQUERIMENTO_ALREADY_SENT',
      { requerimentoId: id }
    );
  }

  static requerimentoAlreadyBilled(id: string): RequerimentoError {
    return new RequerimentoError(
      'Requerimento já foi faturado',
      'REQUERIMENTO_ALREADY_BILLED',
      { requerimentoId: id }
    );
  }

  static requerimentoInvalidStatus(id: string, currentStatus: StatusRequerimento, expectedStatus: StatusRequerimento): RequerimentoError {
    return new RequerimentoError(
      `Status do requerimento inválido. Esperado: ${expectedStatus}, Atual: ${currentStatus}`,
      'REQUERIMENTO_INVALID_STATUS',
      { requerimentoId: id, currentStatus, expectedStatus }
    );
  }

  static requerimentoDuplicateChamado(chamado: string): RequerimentoError {
    return new RequerimentoError(
      `Já existe um requerimento com o chamado ${chamado}`,
      'REQUERIMENTO_DUPLICATE_CHAMADO',
      { chamado }
    );
  }

  // Erros de cliente
  static clienteNotFound(clienteId: string): RequerimentoError {
    return new RequerimentoError(
      `Cliente com ID ${clienteId} não encontrado`,
      'CLIENTE_NOT_FOUND',
      { clienteId }
    );
  }

  static clienteInactive(clienteId: string): RequerimentoError {
    return new RequerimentoError(
      'Cliente está inativo',
      'CLIENTE_INACTIVE',
      { clienteId }
    );
  }

  // Erros de faturamento
  static faturamentoNoRequerimentos(mes: number, ano: number): RequerimentoError {
    return new RequerimentoError(
      `Nenhum requerimento encontrado para faturamento em ${mes}/${ano}`,
      'FATURAMENTO_NO_REQUERIMENTOS',
      { mes, ano }
    );
  }

  static faturamentoInvalidPeriod(mes: number, ano: number): RequerimentoError {
    return new RequerimentoError(
      `Período de faturamento inválido: ${mes}/${ano}`,
      'FATURAMENTO_INVALID_PERIOD',
      { mes, ano }
    );
  }

  static faturamentoEmailFailed(error: any): RequerimentoError {
    return new RequerimentoError(
      'Falha no envio do email de faturamento',
      'FATURAMENTO_EMAIL_FAILED',
      { originalError: error }
    );
  }

  static faturamentoReportGenerationFailed(error: any): RequerimentoError {
    return new RequerimentoError(
      'Falha na geração do relatório de faturamento',
      'FATURAMENTO_REPORT_GENERATION_FAILED',
      { originalError: error }
    );
  }

  static faturamentoDestinatariosRequired(): RequerimentoError {
    return new RequerimentoError(
      'Lista de destinatários é obrigatória para envio de faturamento',
      'FATURAMENTO_DESTINATARIOS_REQUIRED'
    );
  }

  static faturamentoDestinatariosInvalid(invalidEmails: string[]): RequerimentoError {
    return new RequerimentoError(
      `Emails inválidos na lista de destinatários: ${invalidEmails.join(', ')}`,
      'FATURAMENTO_DESTINATARIOS_INVALID',
      { invalidEmails }
    );
  }

  // Erros de banco de dados
  static databaseError(operation: string, originalError: any): RequerimentoError {
    return new RequerimentoError(
      `Erro de banco de dados durante ${operation}`,
      'DATABASE_CONNECTION_FAILED',
      { originalError },
      { operation }
    );
  }

  static constraintViolation(constraint: string, details: any): RequerimentoError {
    return new RequerimentoError(
      `Violação de restrição: ${constraint}`,
      'DATABASE_CONSTRAINT_VIOLATION',
      { constraint, details }
    );
  }

  // Erros de validação genérica
  static validationError(field: string, value: any, reason: string): RequerimentoError {
    return new RequerimentoError(
      `Validação falhou para ${field}: ${reason}`,
      'CHAMADO_REQUIRED', // Usar um código genérico de validação
      { field, value, reason }
    );
  }
}

/**
 * Utilitários para tratamento de erros
 */
export class RequerimentoErrorHandler {
  /**
   * Verifica se um erro é do tipo RequerimentoError
   */
  static isRequerimentoError(error: any): error is RequerimentoError {
    return error instanceof RequerimentoError;
  }

  /**
   * Obtém mensagem amigável para o usuário
   */
  static getUserFriendlyMessage(error: RequerimentoError): string {
    const messages: Record<RequerimentoErrorCode, string> = {
      // Campos obrigatórios
      'CHAMADO_REQUIRED': 'Por favor, informe o número do chamado',
      'CLIENTE_REQUIRED': 'Por favor, selecione um cliente',
      'MODULO_REQUIRED': 'Por favor, selecione um módulo',
      'DESCRICAO_REQUIRED': 'Por favor, informe a descrição do requerimento',
      'DATA_ENVIO_REQUIRED': 'Por favor, informe a data de envio',
      'DATA_APROVACAO_REQUIRED': 'Por favor, informe a data de aprovação',
      'HORAS_REQUIRED': 'Por favor, informe as horas funcionais ou técnicas',
      'LINGUAGEM_REQUIRED': 'Por favor, selecione uma linguagem',
      'TIPO_COBRANCA_REQUIRED': 'Por favor, selecione o tipo de cobrança',
      'MES_COBRANCA_REQUIRED': 'Por favor, selecione o mês de cobrança',
      
      // Validações de formato
      'CHAMADO_INVALID_FORMAT': 'Formato do chamado inválido. Use apenas letras, números e hífen',
      'DESCRICAO_TOO_LONG': 'Descrição muito longa. Máximo de 500 caracteres',
      'OBSERVACAO_TOO_LONG': 'Observação muito longa. Máximo de 1000 caracteres',
      'HORAS_INVALID_VALUE': 'Valor de horas inválido',
      'DATA_INVALID_FORMAT': 'Formato de data inválido',
      'MES_COBRANCA_INVALID_RANGE': 'Mês de cobrança deve estar entre 1 e 12',
      
      // Validações de valores
      'MODULO_INVALID_VALUE': 'Módulo selecionado é inválido',
      'LINGUAGEM_INVALID_VALUE': 'Linguagem selecionada é inválida',
      'TIPO_COBRANCA_INVALID_VALUE': 'Tipo de cobrança selecionado é inválido',
      'STATUS_INVALID_VALUE': 'Status do requerimento é inválido',
      
      // Requerimentos
      'REQUERIMENTO_NOT_FOUND': 'Requerimento não encontrado',
      'REQUERIMENTO_ALREADY_SENT': 'Requerimento já foi enviado para faturamento',
      'REQUERIMENTO_ALREADY_BILLED': 'Requerimento já foi faturado',
      'REQUERIMENTO_INVALID_STATUS': 'Status do requerimento não permite esta operação',
      'REQUERIMENTO_DUPLICATE_CHAMADO': 'Já existe um requerimento com este número de chamado',
      
      // Clientes
      'CLIENTE_NOT_FOUND': 'Cliente não encontrado',
      'CLIENTE_INACTIVE': 'Cliente está inativo',
      
      // Faturamento
      'FATURAMENTO_NO_REQUERIMENTOS': 'Nenhum requerimento encontrado para faturamento',
      'FATURAMENTO_INVALID_PERIOD': 'Período de faturamento inválido',
      'FATURAMENTO_EMAIL_FAILED': 'Falha no envio do email de faturamento',
      'FATURAMENTO_REPORT_GENERATION_FAILED': 'Falha na geração do relatório',
      'FATURAMENTO_DESTINATARIOS_REQUIRED': 'Lista de destinatários é obrigatória',
      'FATURAMENTO_DESTINATARIOS_INVALID': 'Alguns emails são inválidos',
      
      // Sistema
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
      'EMAIL_CONFIGURATION_ERROR': 'Erro na configuração de email'
    };

    return messages[error.code] || 'Erro inesperado';
  }

  /**
   * Determina se o erro deve ser mostrado ao usuário
   */
  static shouldShowToUser(error: RequerimentoError): boolean {
    const userVisibleCodes: RequerimentoErrorCode[] = [
      // Todos os erros de validação devem ser mostrados ao usuário
      'CHAMADO_REQUIRED',
      'CLIENTE_REQUIRED',
      'MODULO_REQUIRED',
      'DESCRICAO_REQUIRED',
      'DATA_ENVIO_REQUIRED',
      'DATA_APROVACAO_REQUIRED',
      'HORAS_REQUIRED',
      'LINGUAGEM_REQUIRED',
      'TIPO_COBRANCA_REQUIRED',
      'MES_COBRANCA_REQUIRED',
      'CHAMADO_INVALID_FORMAT',
      'DESCRICAO_TOO_LONG',
      'OBSERVACAO_TOO_LONG',
      'HORAS_INVALID_VALUE',
      'DATA_INVALID_FORMAT',
      'MES_COBRANCA_INVALID_RANGE',
      'MODULO_INVALID_VALUE',
      'LINGUAGEM_INVALID_VALUE',
      'TIPO_COBRANCA_INVALID_VALUE',
      'STATUS_INVALID_VALUE',
      'REQUERIMENTO_NOT_FOUND',
      'REQUERIMENTO_ALREADY_SENT',
      'REQUERIMENTO_ALREADY_BILLED',
      'REQUERIMENTO_INVALID_STATUS',
      'REQUERIMENTO_DUPLICATE_CHAMADO',
      'CLIENTE_NOT_FOUND',
      'CLIENTE_INACTIVE',
      'FATURAMENTO_NO_REQUERIMENTOS',
      'FATURAMENTO_INVALID_PERIOD',
      'FATURAMENTO_DESTINATARIOS_REQUIRED',
      'FATURAMENTO_DESTINATARIOS_INVALID',
      'PERMISSION_DENIED'
    ];

    return userVisibleCodes.includes(error.code);
  }

  /**
   * Obtém ação recomendada para o usuário
   */
  static getRecommendedAction(error: RequerimentoError): string {
    const actions: Partial<Record<RequerimentoErrorCode, string>> = {
      'CHAMADO_INVALID_FORMAT': 'Use o formato correto: letras, números e hífen (ex: RF-6017993)',
      'DESCRICAO_TOO_LONG': 'Reduza o texto da descrição para no máximo 500 caracteres',
      'OBSERVACAO_TOO_LONG': 'Reduza o texto da observação para no máximo 1000 caracteres',
      'REQUERIMENTO_DUPLICATE_CHAMADO': 'Use um número de chamado diferente ou edite o requerimento existente',
      'REQUERIMENTO_ALREADY_SENT': 'Este requerimento já foi processado para faturamento',
      'CLIENTE_INACTIVE': 'Selecione um cliente ativo ou ative o cliente atual',
      'FATURAMENTO_NO_REQUERIMENTOS': 'Verifique se existem requerimentos enviados para faturamento no período',
      'FATURAMENTO_DESTINATARIOS_INVALID': 'Corrija os emails inválidos na lista de destinatários'
    };

    return actions[error.code] || 'Entre em contato com o suporte se o problema persistir';
  }

  /**
   * Obtém tipo de toast notification baseado na severidade
   */
  static getToastType(error: RequerimentoError): 'error' | 'warning' | 'info' {
    const severity = error.getSeverity();
    
    switch (severity) {
      case 'critical':
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'error';
    }
  }

  /**
   * Cria objeto para toast notification
   */
  static createToastNotification(error: RequerimentoError): {
    type: 'error' | 'warning' | 'info';
    title: string;
    message: string;
    action?: string;
  } {
    return {
      type: this.getToastType(error),
      title: error.getSeverity() === 'critical' ? 'Erro Crítico' : 'Erro de Validação',
      message: this.getUserFriendlyMessage(error),
      action: this.getRecommendedAction(error)
    };
  }
}

/**
 * Função utilitária para obter mensagem de erro amigável
 * Compatibilidade com hooks existentes
 */
export function getRequerimentoErrorMessage(error: any): string {
  if (RequerimentoErrorHandler.isRequerimentoError(error)) {
    return RequerimentoErrorHandler.getUserFriendlyMessage(error);
  }
  
  // Fallback para erros genéricos
  if (error?.message) {
    return error.message;
  }
  
  return 'Erro inesperado no sistema de requerimentos';
}

/**
 * Classe para validação de requerimentos
 */
export class RequerimentoValidator {
  /**
   * Valida dados do formulário de requerimento
   */
  static validateFormData(data: any): RequerimentoError[] {
    const errors: RequerimentoError[] = [];

    // Validações de campos obrigatórios (Requirements 9.1-9.9)
    if (!data.chamado?.trim()) {
      errors.push(RequerimentoErrorFactory.chamadoRequired());
    }

    if (!data.cliente_id) {
      errors.push(RequerimentoErrorFactory.clienteRequired());
    }

    if (!data.modulo) {
      errors.push(RequerimentoErrorFactory.moduloRequired());
    }

    if (!data.descricao?.trim()) {
      errors.push(RequerimentoErrorFactory.descricaoRequired());
    }

    if (!data.data_envio) {
      errors.push(RequerimentoErrorFactory.dataEnvioRequired());
    }

    if (!data.data_aprovacao) {
      errors.push(RequerimentoErrorFactory.dataAprovacaoRequired());
    }

    if (!data.horas_funcional && !data.horas_tecnico) {
      errors.push(RequerimentoErrorFactory.horasRequired());
    }

    if (!data.linguagem) {
      errors.push(RequerimentoErrorFactory.linguagemRequired());
    }

    if (!data.tipo_cobranca) {
      errors.push(RequerimentoErrorFactory.tipoCobrancaRequired());
    }

    if (!data.mes_cobranca) {
      errors.push(RequerimentoErrorFactory.mesCobrancaRequired());
    }

    // Validações de formato
    if (data.chamado && !/^[A-Za-z0-9\-]+$/.test(data.chamado)) {
      errors.push(RequerimentoErrorFactory.chamadoInvalidFormat(data.chamado));
    }

    if (data.descricao && data.descricao.length > 500) {
      errors.push(RequerimentoErrorFactory.descricaoTooLong(data.descricao.length));
    }

    if (data.observacao && data.observacao.length > 1000) {
      errors.push(RequerimentoErrorFactory.observacaoTooLong(data.observacao.length));
    }

    if (data.horas_funcional && (isNaN(data.horas_funcional) || data.horas_funcional < 0)) {
      errors.push(RequerimentoErrorFactory.horasInvalidValue('Horas Funcionais', data.horas_funcional));
    }

    if (data.horas_tecnico && (isNaN(data.horas_tecnico) || data.horas_tecnico < 0)) {
      errors.push(RequerimentoErrorFactory.horasInvalidValue('Horas Técnicas', data.horas_tecnico));
    }

    if (data.mes_cobranca && (data.mes_cobranca < 1 || data.mes_cobranca > 12)) {
      errors.push(RequerimentoErrorFactory.mesCobrancaInvalidRange(data.mes_cobranca));
    }

    return errors;
  }

  /**
   * Valida lista de emails para faturamento
   */
  static validateEmailList(emails: string[]): RequerimentoError[] {
    const errors: RequerimentoError[] = [];

    if (!emails || emails.length === 0) {
      errors.push(RequerimentoErrorFactory.faturamentoDestinatariosRequired());
      return errors;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter(email => !emailRegex.test(email.trim()));

    if (invalidEmails.length > 0) {
      errors.push(RequerimentoErrorFactory.faturamentoDestinatariosInvalid(invalidEmails));
    }

    return errors;
  }
}