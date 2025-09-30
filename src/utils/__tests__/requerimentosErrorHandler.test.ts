/**
 * Testes para o utilitário de tratamento de erros do sistema de requerimentos
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import {
  RequerimentosErrorManager,
  handleRequerimentoError,
  validateRequerimentoForm,
  validateFaturamentoEmails,
  showRequerimentoSuccess,
  RequerimentoErrors
} from '../requerimentosErrorHandler';
import { RequerimentoErrorFactory } from '@/errors/requerimentosErrors';

// Mock do toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn()
  }
}));

describe('RequerimentosErrorManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleError', () => {
    it('deve manipular RequerimentoError corretamente', () => {
      const error = RequerimentoErrorFactory.chamadoRequired();
      
      RequerimentosErrorManager.handleError(error, 'teste');
      
      expect(toast.error).toHaveBeenCalledWith(
        'Por favor, informe o número do chamado',
        expect.objectContaining({
          description: expect.any(String),
          duration: expect.any(Number)
        })
      );
    });

    it('deve manipular erro genérico', () => {
      const error = new Error('Erro genérico');
      
      RequerimentosErrorManager.handleError(error, 'teste');
      
      expect(toast.error).toHaveBeenCalledWith(
        'Erro inesperado',
        expect.objectContaining({
          description: 'Tente novamente. Se o problema persistir, entre em contato com o suporte.',
          duration: 5000
        })
      );
    });

    it('deve usar toast.warning para erros de warning', () => {
      const error = RequerimentoErrorFactory.requerimentoAlreadySent('123');
      
      RequerimentosErrorManager.handleError(error);
      
      expect(toast.warning).toHaveBeenCalled();
    });

    it('deve mostrar mensagem genérica para erros internos', () => {
      const error = RequerimentoErrorFactory.databaseError('select', new Error('DB Error'));
      
      RequerimentosErrorManager.handleError(error);
      
      expect(toast.error).toHaveBeenCalledWith(
        'Erro interno do sistema',
        expect.objectContaining({
          description: 'Nossa equipe foi notificada. Tente novamente em alguns minutos.'
        })
      );
    });
  });

  describe('validateAndShowErrors', () => {
    it('deve retornar true para dados válidos', () => {
      const validData = {
        chamado: 'RF-123456',
        cliente_id: 'client-123',
        modulo: 'Comply',
        descricao: 'Descrição válida',
        data_envio: '2024-01-01',
        data_aprovacao: '2024-01-02',
        horas_funcional: 10,
        linguagem: 'ABAP',
        tipo_cobranca: 'Faturado',
        mes_cobranca: 12
      };

      const result = RequerimentosErrorManager.validateAndShowErrors(validData);
      
      expect(result).toBe(true);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('deve retornar false e mostrar erro para dados inválidos', () => {
      const invalidData = {
        // Dados incompletos
      };

      const result = RequerimentosErrorManager.validateAndShowErrors(invalidData);
      
      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalled();
    });

    it('deve mostrar resumo para múltiplos erros', () => {
      const invalidData = {
        // Múltiplos campos faltando
        chamado: '',
        cliente_id: '',
        modulo: ''
      };

      const result = RequerimentosErrorManager.validateAndShowErrors(invalidData);
      
      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledTimes(2); // Primeiro erro + resumo
    });
  });

  describe('validateEmailsAndShowErrors', () => {
    it('deve retornar true para emails válidos', () => {
      const validEmails = ['test@example.com', 'user@domain.org'];
      
      const result = RequerimentosErrorManager.validateEmailsAndShowErrors(validEmails);
      
      expect(result).toBe(true);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('deve retornar false e mostrar erro para emails inválidos', () => {
      const invalidEmails = ['invalid-email'];
      
      const result = RequerimentosErrorManager.validateEmailsAndShowErrors(invalidEmails);
      
      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('showSuccess', () => {
    it('deve mostrar toast de sucesso', () => {
      RequerimentosErrorManager.showSuccess('Operação realizada', 'Detalhes da operação');
      
      expect(toast.success).toHaveBeenCalledWith(
        'Operação realizada',
        expect.objectContaining({
          description: 'Detalhes da operação',
          duration: 4000
        })
      );
    });
  });

  describe('showSuccessWithAction', () => {
    it('deve mostrar toast de sucesso com ação', () => {
      const callback = vi.fn();
      
      RequerimentosErrorManager.showSuccessWithAction(
        'Sucesso',
        'Descrição',
        'Ação',
        callback
      );
      
      expect(toast.success).toHaveBeenCalledWith(
        'Sucesso',
        expect.objectContaining({
          description: 'Descrição',
          duration: 6000,
          action: expect.objectContaining({
            label: 'Ação',
            onClick: callback
          })
        })
      );
    });
  });

  describe('showConfirmation', () => {
    it('deve mostrar toast de confirmação', () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      
      RequerimentosErrorManager.showConfirmation(
        'Confirmar ação',
        'Descrição da ação',
        onConfirm,
        onCancel
      );
      
      expect(toast.warning).toHaveBeenCalledWith(
        'Confirmar ação',
        expect.objectContaining({
          description: 'Descrição da ação',
          duration: 10000,
          action: expect.objectContaining({
            label: 'Confirmar',
            onClick: onConfirm
          }),
          cancel: expect.objectContaining({
            label: 'Cancelar',
            onClick: onCancel
          })
        })
      );
    });
  });

  describe('showProgress', () => {
    it('deve mostrar toast de progresso', () => {
      const toastId = 'progress-123';
      vi.mocked(toast.loading).mockReturnValue(toastId);
      
      const result = RequerimentosErrorManager.showProgress('Processando...', 'Aguarde');
      
      expect(result).toBe(toastId);
      expect(toast.loading).toHaveBeenCalledWith(
        'Processando...',
        expect.objectContaining({
          description: 'Aguarde',
          duration: Infinity
        })
      );
    });
  });

  describe('updateProgressToSuccess', () => {
    it('deve atualizar toast de progresso para sucesso', () => {
      const toastId = 'progress-123';
      
      RequerimentosErrorManager.updateProgressToSuccess(
        toastId,
        'Concluído',
        'Operação finalizada'
      );
      
      expect(toast.success).toHaveBeenCalledWith(
        'Concluído',
        expect.objectContaining({
          id: toastId,
          description: 'Operação finalizada',
          duration: 4000
        })
      );
    });
  });

  describe('updateProgressToError', () => {
    it('deve atualizar toast de progresso para erro', () => {
      const toastId = 'progress-123';
      const error = RequerimentoErrorFactory.chamadoRequired();
      
      RequerimentosErrorManager.updateProgressToError(toastId, error, 'contexto');
      
      expect(toast.dismiss).toHaveBeenCalledWith(toastId);
      expect(toast.error).toHaveBeenCalled();
    });
  });
});

describe('Funções de conveniência', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handleRequerimentoError deve chamar RequerimentosErrorManager', () => {
    const error = RequerimentoErrorFactory.chamadoRequired();
    
    handleRequerimentoError(error, 'teste');
    
    expect(toast.error).toHaveBeenCalled();
  });

  it('validateRequerimentoForm deve validar formulário', () => {
    const data = { chamado: 'RF-123' };
    
    const result = validateRequerimentoForm(data);
    
    expect(typeof result).toBe('boolean');
  });

  it('validateFaturamentoEmails deve validar emails', () => {
    const emails = ['test@example.com'];
    
    const result = validateFaturamentoEmails(emails);
    
    expect(typeof result).toBe('boolean');
  });

  it('showRequerimentoSuccess deve mostrar sucesso', () => {
    showRequerimentoSuccess('Sucesso', 'Descrição');
    
    expect(toast.success).toHaveBeenCalled();
  });
});

describe('RequerimentoErrors factory', () => {
  it('deve ter todos os métodos de factory', () => {
    expect(typeof RequerimentoErrors.chamadoRequired).toBe('function');
    expect(typeof RequerimentoErrors.clienteRequired).toBe('function');
    expect(typeof RequerimentoErrors.requerimentoNotFound).toBe('function');
    expect(typeof RequerimentoErrors.faturamentoNoRequerimentos).toBe('function');
  });

  it('deve criar erros corretamente', () => {
    const error = RequerimentoErrors.chamadoRequired();
    expect(error.code).toBe('CHAMADO_REQUIRED');
    
    const notFoundError = RequerimentoErrors.requerimentoNotFound('123');
    expect(notFoundError.code).toBe('REQUERIMENTO_NOT_FOUND');
    expect(notFoundError.details).toEqual({ requerimentoId: '123' });
  });
});