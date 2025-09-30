/**
 * Testes para as classes de erro do sistema de requerimentos
 */

import { describe, it, expect } from 'vitest';
import {
  RequerimentoError,
  RequerimentoErrorFactory,
  RequerimentoErrorHandler,
  RequerimentoValidator,
  type RequerimentoErrorCode
} from '../requerimentosErrors';

describe('RequerimentoError', () => {
  it('deve criar erro com propriedades corretas', () => {
    const error = new RequerimentoError(
      'Teste de erro',
      'CHAMADO_REQUIRED',
      { field: 'chamado' },
      { operation: 'create' }
    );

    expect(error.message).toBe('Teste de erro');
    expect(error.code).toBe('CHAMADO_REQUIRED');
    expect(error.details).toEqual({ field: 'chamado' });
    expect(error.context).toEqual({ operation: 'create' });
    expect(error.name).toBe('RequerimentoError');
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it('deve converter para objeto de log', () => {
    const error = new RequerimentoError('Teste', 'CHAMADO_REQUIRED');
    const logObject = error.toLogObject();

    expect(logObject).toHaveProperty('name', 'RequerimentoError');
    expect(logObject).toHaveProperty('message', 'Teste');
    expect(logObject).toHaveProperty('code', 'CHAMADO_REQUIRED');
    expect(logObject).toHaveProperty('timestamp');
    expect(logObject).toHaveProperty('stack');
  });

  it('deve identificar erros temporários', () => {
    const temporaryError = new RequerimentoError('Teste', 'DATABASE_CONNECTION_FAILED');
    const permanentError = new RequerimentoError('Teste', 'CHAMADO_REQUIRED');

    expect(temporaryError.isTemporary()).toBe(true);
    expect(permanentError.isTemporary()).toBe(false);
  });

  it('deve identificar erros que requerem notificação admin', () => {
    const adminError = new RequerimentoError('Teste', 'SYSTEM_ERROR');
    const userError = new RequerimentoError('Teste', 'CHAMADO_REQUIRED');

    expect(adminError.requiresAdminNotification()).toBe(true);
    expect(userError.requiresAdminNotification()).toBe(false);
  });

  it('deve retornar severidade correta', () => {
    const criticalError = new RequerimentoError('Teste', 'SYSTEM_ERROR');
    const warningError = new RequerimentoError('Teste', 'REQUERIMENTO_ALREADY_SENT');
    const normalError = new RequerimentoError('Teste', 'CHAMADO_REQUIRED');

    expect(criticalError.getSeverity()).toBe('critical');
    expect(warningError.getSeverity()).toBe('warning');
    expect(normalError.getSeverity()).toBe('error');
  });

  it('deve retornar estratégia de recuperação', () => {
    const retryError = new RequerimentoError('Teste', 'DATABASE_CONNECTION_FAILED');
    const manualError = new RequerimentoError('Teste', 'CHAMADO_REQUIRED');

    expect(retryError.getRecoveryStrategy()).toBe('retry');
    expect(manualError.getRecoveryStrategy()).toBe('manual');
  });
});

describe('RequerimentoErrorFactory', () => {
  it('deve criar erro de campo obrigatório', () => {
    const error = RequerimentoErrorFactory.chamadoRequired();
    
    expect(error.code).toBe('CHAMADO_REQUIRED');
    expect(error.message).toBe('Campo "Chamado" é obrigatório');
  });

  it('deve criar erro de formato inválido', () => {
    const error = RequerimentoErrorFactory.chamadoInvalidFormat('ABC123');
    
    expect(error.code).toBe('CHAMADO_INVALID_FORMAT');
    expect(error.details).toEqual({ chamado: 'ABC123' });
  });

  it('deve criar erro de descrição muito longa', () => {
    const error = RequerimentoErrorFactory.descricaoTooLong(600);
    
    expect(error.code).toBe('DESCRICAO_TOO_LONG');
    expect(error.details).toEqual({ currentLength: 600, maxLength: 500 });
  });

  it('deve criar erro de requerimento não encontrado', () => {
    const error = RequerimentoErrorFactory.requerimentoNotFound('123');
    
    expect(error.code).toBe('REQUERIMENTO_NOT_FOUND');
    expect(error.details).toEqual({ requerimentoId: '123' });
  });

  it('deve criar erro de faturamento sem requerimentos', () => {
    const error = RequerimentoErrorFactory.faturamentoNoRequerimentos(12, 2024);
    
    expect(error.code).toBe('FATURAMENTO_NO_REQUERIMENTOS');
    expect(error.details).toEqual({ mes: 12, ano: 2024 });
  });

  it('deve criar erro de emails inválidos', () => {
    const invalidEmails = ['invalid-email', 'another@'];
    const error = RequerimentoErrorFactory.faturamentoDestinatariosInvalid(invalidEmails);
    
    expect(error.code).toBe('FATURAMENTO_DESTINATARIOS_INVALID');
    expect(error.details).toEqual({ invalidEmails });
  });
});

describe('RequerimentoErrorHandler', () => {
  it('deve identificar RequerimentoError', () => {
    const requerimentoError = new RequerimentoError('Teste', 'CHAMADO_REQUIRED');
    const genericError = new Error('Teste');

    expect(RequerimentoErrorHandler.isRequerimentoError(requerimentoError)).toBe(true);
    expect(RequerimentoErrorHandler.isRequerimentoError(genericError)).toBe(false);
  });

  it('deve retornar mensagem amigável', () => {
    const error = new RequerimentoError('Teste', 'CHAMADO_REQUIRED');
    const message = RequerimentoErrorHandler.getUserFriendlyMessage(error);
    
    expect(message).toBe('Por favor, informe o número do chamado');
  });

  it('deve determinar se erro deve ser mostrado ao usuário', () => {
    const userError = new RequerimentoError('Teste', 'CHAMADO_REQUIRED');
    const systemError = new RequerimentoError('Teste', 'DATABASE_CONNECTION_FAILED');

    expect(RequerimentoErrorHandler.shouldShowToUser(userError)).toBe(true);
    expect(RequerimentoErrorHandler.shouldShowToUser(systemError)).toBe(false);
  });

  it('deve retornar ação recomendada', () => {
    const error = new RequerimentoError('Teste', 'CHAMADO_INVALID_FORMAT');
    const action = RequerimentoErrorHandler.getRecommendedAction(error);
    
    expect(action).toBe('Use o formato correto: letras, números e hífen (ex: RF-6017993)');
  });

  it('deve retornar tipo de toast correto', () => {
    const criticalError = new RequerimentoError('Teste', 'SYSTEM_ERROR');
    const warningError = new RequerimentoError('Teste', 'REQUERIMENTO_ALREADY_SENT');
    const normalError = new RequerimentoError('Teste', 'CHAMADO_REQUIRED');

    expect(RequerimentoErrorHandler.getToastType(criticalError)).toBe('error');
    expect(RequerimentoErrorHandler.getToastType(warningError)).toBe('warning');
    expect(RequerimentoErrorHandler.getToastType(normalError)).toBe('error');
  });

  it('deve criar notificação toast', () => {
    const error = new RequerimentoError('Teste', 'CHAMADO_REQUIRED');
    const notification = RequerimentoErrorHandler.createToastNotification(error);

    expect(notification).toHaveProperty('type', 'error');
    expect(notification).toHaveProperty('title', 'Erro de Validação');
    expect(notification).toHaveProperty('message', 'Por favor, informe o número do chamado');
    expect(notification).toHaveProperty('action');
  });
});

describe('RequerimentoValidator', () => {
  describe('validateFormData', () => {
    it('deve validar dados válidos sem erros', () => {
      const validData = {
        chamado: 'RF-123456',
        cliente_id: 'client-123',
        modulo: 'Comply',
        descricao: 'Descrição válida',
        data_envio: '2024-01-01',
        data_aprovacao: '2024-01-02',
        horas_funcional: 10,
        horas_tecnico: 5,
        linguagem: 'ABAP',
        tipo_cobranca: 'Faturado',
        mes_cobranca: 12
      };

      const errors = RequerimentoValidator.validateFormData(validData);
      expect(errors).toHaveLength(0);
    });

    it('deve detectar campos obrigatórios faltando', () => {
      const invalidData = {
        // Faltando campos obrigatórios
      };

      const errors = RequerimentoValidator.validateFormData(invalidData);
      expect(errors.length).toBeGreaterThan(0);
      
      const errorCodes = errors.map(e => e.code);
      expect(errorCodes).toContain('CHAMADO_REQUIRED');
      expect(errorCodes).toContain('CLIENTE_REQUIRED');
      expect(errorCodes).toContain('MODULO_REQUIRED');
    });

    it('deve validar formato do chamado', () => {
      const invalidData = {
        chamado: 'INVALID@CHAMADO!',
        cliente_id: 'client-123',
        modulo: 'Comply',
        descricao: 'Descrição',
        data_envio: '2024-01-01',
        data_aprovacao: '2024-01-02',
        horas_funcional: 10,
        linguagem: 'ABAP',
        tipo_cobranca: 'Faturado',
        mes_cobranca: 12
      };

      const errors = RequerimentoValidator.validateFormData(invalidData);
      const formatError = errors.find(e => e.code === 'CHAMADO_INVALID_FORMAT');
      expect(formatError).toBeDefined();
    });

    it('deve validar tamanho da descrição', () => {
      const invalidData = {
        chamado: 'RF-123456',
        cliente_id: 'client-123',
        modulo: 'Comply',
        descricao: 'a'.repeat(501), // Muito longa
        data_envio: '2024-01-01',
        data_aprovacao: '2024-01-02',
        horas_funcional: 10,
        linguagem: 'ABAP',
        tipo_cobranca: 'Faturado',
        mes_cobranca: 12
      };

      const errors = RequerimentoValidator.validateFormData(invalidData);
      const lengthError = errors.find(e => e.code === 'DESCRICAO_TOO_LONG');
      expect(lengthError).toBeDefined();
    });

    it('deve validar tamanho da observação', () => {
      const invalidData = {
        chamado: 'RF-123456',
        cliente_id: 'client-123',
        modulo: 'Comply',
        descricao: 'Descrição válida',
        observacao: 'a'.repeat(1001), // Muito longa
        data_envio: '2024-01-01',
        data_aprovacao: '2024-01-02',
        horas_funcional: 10,
        linguagem: 'ABAP',
        tipo_cobranca: 'Faturado',
        mes_cobranca: 12
      };

      const errors = RequerimentoValidator.validateFormData(invalidData);
      const lengthError = errors.find(e => e.code === 'OBSERVACAO_TOO_LONG');
      expect(lengthError).toBeDefined();
    });

    it('deve validar valores de horas', () => {
      const invalidData = {
        chamado: 'RF-123456',
        cliente_id: 'client-123',
        modulo: 'Comply',
        descricao: 'Descrição válida',
        data_envio: '2024-01-01',
        data_aprovacao: '2024-01-02',
        horas_funcional: -5, // Valor inválido
        linguagem: 'ABAP',
        tipo_cobranca: 'Faturado',
        mes_cobranca: 12
      };

      const errors = RequerimentoValidator.validateFormData(invalidData);
      const horasError = errors.find(e => e.code === 'HORAS_INVALID_VALUE');
      expect(horasError).toBeDefined();
    });

    it('deve validar range do mês de cobrança', () => {
      const invalidData = {
        chamado: 'RF-123456',
        cliente_id: 'client-123',
        modulo: 'Comply',
        descricao: 'Descrição válida',
        data_envio: '2024-01-01',
        data_aprovacao: '2024-01-02',
        horas_funcional: 10,
        linguagem: 'ABAP',
        tipo_cobranca: 'Faturado',
        mes_cobranca: 13 // Inválido
      };

      const errors = RequerimentoValidator.validateFormData(invalidData);
      const mesError = errors.find(e => e.code === 'MES_COBRANCA_INVALID_RANGE');
      expect(mesError).toBeDefined();
    });

    it('deve exigir pelo menos um tipo de horas', () => {
      const invalidData = {
        chamado: 'RF-123456',
        cliente_id: 'client-123',
        modulo: 'Comply',
        descricao: 'Descrição válida',
        data_envio: '2024-01-01',
        data_aprovacao: '2024-01-02',
        // Sem horas_funcional nem horas_tecnico
        linguagem: 'ABAP',
        tipo_cobranca: 'Faturado',
        mes_cobranca: 12
      };

      const errors = RequerimentoValidator.validateFormData(invalidData);
      const horasError = errors.find(e => e.code === 'HORAS_REQUIRED');
      expect(horasError).toBeDefined();
    });
  });

  describe('validateEmailList', () => {
    it('deve validar lista de emails válidos', () => {
      const validEmails = ['test@example.com', 'user@domain.org'];
      const errors = RequerimentoValidator.validateEmailList(validEmails);
      expect(errors).toHaveLength(0);
    });

    it('deve detectar lista vazia', () => {
      const errors = RequerimentoValidator.validateEmailList([]);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('FATURAMENTO_DESTINATARIOS_REQUIRED');
    });

    it('deve detectar emails inválidos', () => {
      const invalidEmails = ['invalid-email', 'another@', '@domain.com'];
      const errors = RequerimentoValidator.validateEmailList(invalidEmails);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('FATURAMENTO_DESTINATARIOS_INVALID');
    });

    it('deve validar emails mistos (válidos e inválidos)', () => {
      const mixedEmails = ['valid@example.com', 'invalid-email', 'another@domain.org'];
      const errors = RequerimentoValidator.validateEmailList(mixedEmails);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('FATURAMENTO_DESTINATARIOS_INVALID');
      expect(errors[0].details.invalidEmails).toEqual(['invalid-email']);
    });
  });
});