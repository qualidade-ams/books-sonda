import { toast } from 'sonner';
import { ClientBooksError, ClientBooksErrorHandler } from '@/errors/clientBooksErrors';
import { errorRecoveryManager, OPERATION_RETRY_CONFIGS } from '@/utils/errorRecovery';

/**
 * Manipulador centralizado de erros para o sistema de Client Books
 */
export class ClientBooksErrorManager {
  /**
   * Trata erro e exibe notificação apropriada ao usuário
   */
  static handleError(error: any, context?: string): void {
    console.error('ClientBooks Error:', error, { context });

    if (ClientBooksErrorHandler.isClientBooksError(error)) {
      const userMessage = ClientBooksErrorHandler.getUserFriendlyMessage(error);
      const action = ClientBooksErrorHandler.getRecommendedAction(error);
      
      if (ClientBooksErrorHandler.shouldShowToUser(error)) {
        if (error.getSeverity() === 'warning') {
          toast.warning(userMessage, {
            description: action,
            duration: 5000
          });
        } else {
          toast.error(userMessage, {
            description: action,
            duration: 7000
          });
        }
      } else {
        // Erro interno - mostrar mensagem genérica
        toast.error('Ocorreu um erro interno', {
          description: 'Nossa equipe foi notificada. Tente novamente em alguns minutos.',
          duration: 5000
        });
      }

      // Notificar administradores se necessário
      if (error.requiresAdminNotification()) {
        this.notifyAdministrators(error, context);
      }
    } else {
      // Erro não tratado
      toast.error('Erro inesperado', {
        description: 'Tente novamente. Se o problema persistir, entre em contato com o suporte.',
        duration: 5000
      });
    }
  }

  /**
   * Executa operação com tratamento de erro automático
   */
  static async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    options: {
      operationName: string;
      context?: string;
      showSuccessMessage?: boolean;
      successMessage?: string;
      useRetry?: boolean;
      useFallback?: boolean;
      fallbacks?: Array<() => Promise<T>>;
    }
  ): Promise<T | null> {
    const {
      operationName,
      context,
      showSuccessMessage = false,
      successMessage,
      useRetry = true,
      useFallback = false,
      fallbacks = []
    } = options;

    try {
      let result: T;

      if (useRetry || useFallback) {
        const retryConfig = OPERATION_RETRY_CONFIGS[operationName] || OPERATION_RETRY_CONFIGS.database;
        
        result = await errorRecoveryManager.executeWithRecovery(
          operationName,
          operation,
          {
            retryConfig: useRetry ? retryConfig : { ...retryConfig, maxRetries: 0 },
            fallbacks: useFallback ? fallbacks : [],
            useCircuitBreaker: true
          }
        );
      } else {
        result = await operation();
      }

      if (showSuccessMessage) {
        toast.success(successMessage || 'Operação realizada com sucesso');
      }

      return result;
    } catch (error) {
      this.handleError(error, context);
      return null;
    }
  }

  /**
   * Notifica administradores sobre erros críticos
   */
  private static async notifyAdministrators(error: ClientBooksError, context?: string): Promise<void> {
    try {
      // Implementar notificação para administradores
      // Pode ser via e-mail, webhook, sistema de notificações, etc.
      console.error('Admin notification:', {
        error: error.toLogObject(),
        context,
        timestamp: new Date().toISOString()
      });

      // TODO: Implementar envio real de notificação
      // await adminNotificationService.sendErrorNotification(error, context);
    } catch (notificationError) {
      console.error('Failed to notify administrators:', notificationError);
    }
  }

  /**
   * Valida dados antes de operação para prevenir erros
   */
  static validateBeforeOperation<T>(
    data: T,
    validator: (data: T) => string[]
  ): { isValid: boolean; errors: string[] } {
    const errors = validator(data);
    
    if (errors.length > 0) {
      toast.error('Dados inválidos', {
        description: errors.join(', '),
        duration: 5000
      });
      return { isValid: false, errors };
    }

    return { isValid: true, errors: [] };
  }
}

/**
 * Decorador para tratamento automático de erros em métodos de serviço
 */
export function withErrorHandling(
  operationName: string,
  options: {
    showSuccessMessage?: boolean;
    successMessage?: string;
    useRetry?: boolean;
    useFallback?: boolean;
  } = {}
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return ClientBooksErrorManager.executeWithErrorHandling(
        () => originalMethod.apply(this, args),
        {
          operationName,
          context: `${target.constructor.name}.${propertyKey}`,
          ...options
        }
      );
    };

    return descriptor;
  };
}

/**
 * Utilitários específicos para validação de operações
 */
export const OperationValidators = {
  /**
   * Valida operação de empresa
   */
  empresa: {
    create: (data: any): string[] => {
      const errors: string[] = [];
      
      if (!data.nomeCompleto?.trim()) {
        errors.push('Nome completo é obrigatório');
      }
      
      if (!data.nomeAbreviado?.trim()) {
        errors.push('Nome abreviado é obrigatório');
      }
      
      if (!data.produtos || data.produtos.length === 0) {
        errors.push('Pelo menos um produto deve ser selecionado');
      }
      
      return errors;
    },
    
    update: (data: any): string[] => {
      const errors: string[] = [];
      
      if (data.nomeCompleto !== undefined && !data.nomeCompleto?.trim()) {
        errors.push('Nome completo não pode ser vazio');
      }
      
      if (data.nomeAbreviado !== undefined && !data.nomeAbreviado?.trim()) {
        errors.push('Nome abreviado não pode ser vazio');
      }
      
      return errors;
    },
    
    delete: (empresa: any): string[] => {
      const errors: string[] = [];
      
      if (empresa.colaboradores && empresa.colaboradores.length > 0) {
        const ativos = empresa.colaboradores.filter((c: any) => c.status === 'ativo');
        if (ativos.length > 0) {
          errors.push(`Empresa possui ${ativos.length} colaboradores ativos`);
        }
      }
      
      return errors;
    }
  },

  /**
   * Valida operação de colaborador
   */
  colaborador: {
    create: (data: any): string[] => {
      const errors: string[] = [];
      
      if (!data.nomeCompleto?.trim()) {
        errors.push('Nome completo é obrigatório');
      }
      
      if (!data.email?.trim()) {
        errors.push('E-mail é obrigatório');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push('E-mail deve ter um formato válido');
      }
      
      if (!data.empresaId) {
        errors.push('Empresa é obrigatória');
      }
      
      return errors;
    },
    
    update: (data: any): string[] => {
      const errors: string[] = [];
      
      if (data.nomeCompleto !== undefined && !data.nomeCompleto?.trim()) {
        errors.push('Nome completo não pode ser vazio');
      }
      
      if (data.email !== undefined) {
        if (!data.email?.trim()) {
          errors.push('E-mail não pode ser vazio');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          errors.push('E-mail deve ter um formato válido');
        }
      }
      
      return errors;
    }
  },

  /**
   * Valida operação de grupo
   */
  grupo: {
    create: (data: any): string[] => {
      const errors: string[] = [];
      
      if (!data.nome?.trim()) {
        errors.push('Nome do grupo é obrigatório');
      }
      
      if (!data.emails || data.emails.length === 0) {
        errors.push('Pelo menos um e-mail deve ser adicionado');
      } else {
        const emailsInvalidos = data.emails.filter((e: any) => 
          !e.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email)
        );
        
        if (emailsInvalidos.length > 0) {
          errors.push('Todos os e-mails devem ter formato válido');
        }
        
        // Verificar duplicatas
        const emails = data.emails.map((e: any) => e.email.toLowerCase());
        const uniqueEmails = new Set(emails);
        if (emails.length !== uniqueEmails.size) {
          errors.push('Não é possível adicionar e-mails duplicados');
        }
      }
      
      return errors;
    },
    
    delete: (grupo: any): string[] => {
      const errors: string[] = [];
      
      if (grupo.empresas && grupo.empresas.length > 0) {
        errors.push(`Grupo está associado a ${grupo.empresas.length} empresas`);
      }
      
      return errors;
    }
  },

  /**
   * Valida operação de disparo
   */
  disparo: {
    send: (empresa: any): string[] => {
      const errors: string[] = [];
      
      if (empresa.status !== 'ativo') {
        errors.push('Empresa deve estar ativa para receber books');
      }
      
      const colaboradoresAtivos = empresa.colaboradores?.filter((c: any) => c.status === 'ativo') || [];
      if (colaboradoresAtivos.length === 0) {
        errors.push('Empresa não possui colaboradores ativos');
      }
      
      return errors;
    },
    
    schedule: (data: any): string[] => {
      const errors: string[] = [];
      
      if (!data.dataAgendamento) {
        errors.push('Data de agendamento é obrigatória');
      } else if (new Date(data.dataAgendamento) <= new Date()) {
        errors.push('Data de agendamento deve ser no futuro');
      }
      
      if (!data.colaboradorIds || data.colaboradorIds.length === 0) {
        errors.push('Pelo menos um colaborador deve ser selecionado');
      }
      
      return errors;
    }
  }
};

/**
 * Middleware para captura de erros em hooks
 */
export function useErrorHandler() {
  const handleError = (error: any, context?: string) => {
    ClientBooksErrorManager.handleError(error, context);
  };

  const executeWithErrorHandling = async <T>(
    operation: () => Promise<T>,
    options: {
      operationName: string;
      context?: string;
      showSuccessMessage?: boolean;
      successMessage?: string;
    }
  ): Promise<T | null> => {
    return ClientBooksErrorManager.executeWithErrorHandling(operation, options);
  };

  const validateBeforeOperation = <T>(
    data: T,
    validator: (data: T) => string[]
  ) => {
    return ClientBooksErrorManager.validateBeforeOperation(data, validator);
  };

  return {
    handleError,
    executeWithErrorHandling,
    validateBeforeOperation
  };
}

/**
 * Constantes para mensagens de erro comuns
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet e tente novamente.',
  PERMISSION_DENIED: 'Você não tem permissão para realizar esta ação.',
  VALIDATION_FAILED: 'Dados inválidos. Verifique os campos e tente novamente.',
  OPERATION_FAILED: 'Operação falhou. Tente novamente em alguns minutos.',
  DATA_NOT_FOUND: 'Dados não encontrados.',
  DUPLICATE_DATA: 'Dados duplicados. Verifique se já existe um registro similar.',
  SYSTEM_ERROR: 'Erro interno do sistema. Nossa equipe foi notificada.'
} as const;