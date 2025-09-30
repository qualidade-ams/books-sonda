/**
 * Utilitário para tratamento de erros do sistema de requerimentos
 * Integra as classes de erro customizadas com o sistema de toast notifications
 */

import { toast } from 'sonner';
import { 
  RequerimentoError, 
  RequerimentoErrorHandler,
  RequerimentoValidator,
  RequerimentoErrorFactory
} from '@/errors/requerimentosErrors';

/**
 * Manipula erros do sistema de requerimentos e exibe notificações apropriadas
 */
export class RequerimentosErrorManager {
  /**
   * Processa um erro e exibe toast notification apropriada
   */
  static handleError(error: any, context?: string): void {
    if (RequerimentoErrorHandler.isRequerimentoError(error)) {
      this.handleRequerimentoError(error, context);
    } else {
      this.handleGenericError(error, context);
    }
  }

  /**
   * Manipula erros específicos do sistema de requerimentos
   */
  private static handleRequerimentoError(error: RequerimentoError, context?: string): void {
    const shouldShow = RequerimentoErrorHandler.shouldShowToUser(error);
    
    if (shouldShow) {
      const userMessage = RequerimentoErrorHandler.getUserFriendlyMessage(error);
      const action = RequerimentoErrorHandler.getRecommendedAction(error);
      const toastType = RequerimentoErrorHandler.getToastType(error);

      const toastOptions = {
        description: action,
        duration: this.getToastDuration(error.getSeverity()),
        action: error.getSeverity() === 'critical' ? {
          label: 'Reportar',
          onClick: () => this.reportError(error, context)
        } : undefined
      };

      switch (toastType) {
        case 'error':
          toast.error(userMessage, toastOptions);
          break;
        case 'warning':
          toast.warning(userMessage, toastOptions);
          break;
        case 'info':
          toast.info(userMessage, toastOptions);
          break;
      }
    } else {
      // Erro interno - mostrar mensagem genérica
      toast.error('Erro interno do sistema', {
        description: 'Nossa equipe foi notificada. Tente novamente em alguns minutos.',
        duration: 5000
      });
    }

    // Log do erro para debugging
    console.error('RequerimentoError:', error.toLogObject());

    // Notificar administradores se necessário
    if (error.requiresAdminNotification()) {
      this.notifyAdministrators(error, context);
    }
  }

  /**
   * Manipula erros genéricos
   */
  private static handleGenericError(error: any, context?: string): void {
    console.error('Erro não tratado no sistema de requerimentos:', error);
    
    toast.error('Erro inesperado', {
      description: 'Tente novamente. Se o problema persistir, entre em contato com o suporte.',
      duration: 5000
    });
  }

  /**
   * Valida dados do formulário e exibe erros de validação
   */
  static validateAndShowErrors(data: any): boolean {
    const errors = RequerimentoValidator.validateFormData(data);
    
    if (errors.length > 0) {
      // Mostrar primeiro erro como toast principal
      const firstError = errors[0];
      this.handleRequerimentoError(firstError, 'Validação de formulário');

      // Se houver múltiplos erros, mostrar resumo
      if (errors.length > 1) {
        const errorMessages = errors.map(err => 
          RequerimentoErrorHandler.getUserFriendlyMessage(err)
        );
        
        toast.error('Múltiplos erros de validação', {
          description: `${errors.length} campos precisam ser corrigidos`,
          duration: 7000,
          action: {
            label: 'Ver detalhes',
            onClick: () => {
              // Mostrar todos os erros em sequência
              errors.forEach((error, index) => {
                setTimeout(() => {
                  this.handleRequerimentoError(error, 'Validação detalhada');
                }, index * 500);
              });
            }
          }
        });
      }

      return false;
    }

    return true;
  }

  /**
   * Valida lista de emails para faturamento
   */
  static validateEmailsAndShowErrors(emails: string[]): boolean {
    const errors = RequerimentoValidator.validateEmailList(emails);
    
    if (errors.length > 0) {
      errors.forEach(error => {
        this.handleRequerimentoError(error, 'Validação de emails');
      });
      return false;
    }

    return true;
  }

  /**
   * Exibe mensagem de sucesso para operações
   */
  static showSuccess(message: string, description?: string): void {
    toast.success(message, {
      description,
      duration: 4000
    });
  }

  /**
   * Exibe mensagem de sucesso com ação
   */
  static showSuccessWithAction(
    message: string, 
    description: string, 
    actionLabel: string, 
    actionCallback: () => void
  ): void {
    toast.success(message, {
      description,
      duration: 6000,
      action: {
        label: actionLabel,
        onClick: actionCallback
      }
    });
  }

  /**
   * Exibe confirmação antes de executar ação perigosa
   */
  static showConfirmation(
    message: string,
    description: string,
    onConfirm: () => void,
    onCancel?: () => void
  ): void {
    toast.warning(message, {
      description,
      duration: 10000,
      action: {
        label: 'Confirmar',
        onClick: onConfirm
      },
      cancel: {
        label: 'Cancelar',
        onClick: onCancel
      }
    });
  }

  /**
   * Exibe progresso de operação longa
   */
  static showProgress(message: string, description?: string): string {
    return toast.loading(message, {
      description,
      duration: Infinity
    });
  }

  /**
   * Atualiza toast de progresso para sucesso
   */
  static updateProgressToSuccess(toastId: string, message: string, description?: string): void {
    toast.success(message, {
      id: toastId,
      description,
      duration: 4000
    });
  }

  /**
   * Atualiza toast de progresso para erro
   */
  static updateProgressToError(toastId: string, error: any, context?: string): void {
    toast.dismiss(toastId);
    this.handleError(error, context);
  }

  /**
   * Obtém duração do toast baseada na severidade
   */
  private static getToastDuration(severity: 'critical' | 'error' | 'warning' | 'info'): number {
    switch (severity) {
      case 'critical':
        return 10000; // 10 segundos
      case 'error':
        return 7000;  // 7 segundos
      case 'warning':
        return 5000;  // 5 segundos
      case 'info':
        return 4000;  // 4 segundos
      default:
        return 5000;
    }
  }

  /**
   * Reporta erro crítico (placeholder para integração futura)
   */
  private static reportError(error: RequerimentoError, context?: string): void {
    console.log('Reportando erro crítico:', {
      error: error.toLogObject(),
      context,
      timestamp: new Date().toISOString()
    });
    
    toast.info('Erro reportado', {
      description: 'Obrigado por reportar o problema. Nossa equipe foi notificada.',
      duration: 3000
    });
  }

  /**
   * Notifica administradores sobre erro crítico (placeholder para integração futura)
   */
  private static notifyAdministrators(error: RequerimentoError, context?: string): void {
    console.log('Notificando administradores sobre erro:', {
      error: error.toLogObject(),
      context,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Funções de conveniência para uso direto nos componentes
 */

/**
 * Manipula erro de requerimento e exibe toast
 */
export function handleRequerimentoError(error: any, context?: string): void {
  RequerimentosErrorManager.handleError(error, context);
}

/**
 * Valida dados do formulário e exibe erros
 */
export function validateRequerimentoForm(data: any): boolean {
  return RequerimentosErrorManager.validateAndShowErrors(data);
}

/**
 * Valida emails para faturamento
 */
export function validateFaturamentoEmails(emails: string[]): boolean {
  return RequerimentosErrorManager.validateEmailsAndShowErrors(emails);
}

/**
 * Exibe sucesso de operação
 */
export function showRequerimentoSuccess(message: string, description?: string): void {
  RequerimentosErrorManager.showSuccess(message, description);
}

/**
 * Exibe confirmação de ação
 */
export function showRequerimentoConfirmation(
  message: string,
  description: string,
  onConfirm: () => void,
  onCancel?: () => void
): void {
  RequerimentosErrorManager.showConfirmation(message, description, onConfirm, onCancel);
}

/**
 * Gerencia progresso de operação
 */
export function manageRequerimentoProgress() {
  return {
    start: (message: string, description?: string) => 
      RequerimentosErrorManager.showProgress(message, description),
    
    success: (toastId: string, message: string, description?: string) => 
      RequerimentosErrorManager.updateProgressToSuccess(toastId, message, description),
    
    error: (toastId: string, error: any, context?: string) => 
      RequerimentosErrorManager.updateProgressToError(toastId, error, context)
  };
}

/**
 * Factory de erros específicos para uso nos componentes
 */
export const RequerimentoErrors = {
  // Campos obrigatórios
  chamadoRequired: () => RequerimentoErrorFactory.chamadoRequired(),
  clienteRequired: () => RequerimentoErrorFactory.clienteRequired(),
  moduloRequired: () => RequerimentoErrorFactory.moduloRequired(),
  descricaoRequired: () => RequerimentoErrorFactory.descricaoRequired(),
  dataEnvioRequired: () => RequerimentoErrorFactory.dataEnvioRequired(),
  dataAprovacaoRequired: () => RequerimentoErrorFactory.dataAprovacaoRequired(),
  horasRequired: () => RequerimentoErrorFactory.horasRequired(),
  linguagemRequired: () => RequerimentoErrorFactory.linguagemRequired(),
  tipoCobrancaRequired: () => RequerimentoErrorFactory.tipoCobrancaRequired(),
  mesCobrancaRequired: () => RequerimentoErrorFactory.mesCobrancaRequired(),

  // Validações de formato
  chamadoInvalidFormat: (chamado: string) => RequerimentoErrorFactory.chamadoInvalidFormat(chamado),
  descricaoTooLong: (length: number) => RequerimentoErrorFactory.descricaoTooLong(length),
  observacaoTooLong: (length: number) => RequerimentoErrorFactory.observacaoTooLong(length),

  // Erros de requerimento
  requerimentoNotFound: (id: string) => RequerimentoErrorFactory.requerimentoNotFound(id),
  requerimentoAlreadySent: (id: string) => RequerimentoErrorFactory.requerimentoAlreadySent(id),
  requerimentoDuplicateChamado: (chamado: string) => RequerimentoErrorFactory.requerimentoDuplicateChamado(chamado),

  // Erros de faturamento
  faturamentoNoRequerimentos: (mes: number, ano: number) => RequerimentoErrorFactory.faturamentoNoRequerimentos(mes, ano),
  faturamentoDestinatariosRequired: () => RequerimentoErrorFactory.faturamentoDestinatariosRequired(),
  faturamentoDestinatariosInvalid: (emails: string[]) => RequerimentoErrorFactory.faturamentoDestinatariosInvalid(emails)
};