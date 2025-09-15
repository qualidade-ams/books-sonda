import { describe, it, expect } from 'vitest';
import {
  ClientBooksError,
  ClientBooksErrorFactory,
  ClientBooksErrorHandler,
  TEMPORARY_ERROR_CODES,
  ADMIN_NOTIFICATION_ERROR_CODES,
  CRITICAL_ERROR_CODES,
  WARNING_ERROR_CODES
} from '../clientBooksErrors';

describe('clientBooksErrors', () => {
  describe('ClientBooksError', () => {
    it('deve criar erro com propriedades corretas', () => {
      const error = new ClientBooksError(
        'Teste de erro',
        'EMPRESA_NOT_FOUND',
        { empresaId: '123' },
        { operation: 'test' }
      );

      expect(error.message).toBe('Teste de erro');
      expect(error.code).toBe('EMPRESA_NOT_FOUND');
      expect(error.details).toEqual({ empresaId: '123' });
      expect(error.context).toEqual({ operation: 'test' });
      expect(error.name).toBe('ClientBooksError');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('deve converter para objeto de log', () => {
      const error = new ClientBooksError(
        'Teste de erro',
        'EMPRESA_NOT_FOUND',
        { empresaId: '123' }
      );

      const logObject = error.toLogObject();

      expect(logObject.name).toBe('ClientBooksError');
      expect(logObject.message).toBe('Teste de erro');
      expect(logObject.code).toBe('EMPRESA_NOT_FOUND');
      expect(logObject.details).toEqual({ empresaId: '123' });
      expect(logObject.timestamp).toBeDefined();
    });

    it('deve identificar erros temporários', () => {
      const temporaryError = new ClientBooksError(
        'Erro temporário',
        'DATABASE_CONNECTION_FAILED'
      );
      const permanentError = new ClientBooksError(
        'Erro permanente',
        'EMPRESA_NOT_FOUND'
      );

      expect(temporaryError.isTemporary()).toBe(true);
      expect(permanentError.isTemporary()).toBe(false);
    });

    it('deve identificar erros que requerem notificação admin', () => {
      const adminError = new ClientBooksError(
        'Erro crítico',
        'SYSTEM_ERROR'
      );
      const userError = new ClientBooksError(
        'Erro do usuário',
        'EMPRESA_NOT_FOUND'
      );

      expect(adminError.requiresAdminNotification()).toBe(true);
      expect(userError.requiresAdminNotification()).toBe(false);
    });

    it('deve retornar severidade correta', () => {
      const criticalError = new ClientBooksError('Crítico', 'SYSTEM_ERROR');
      const warningError = new ClientBooksError('Aviso', 'EMPRESA_HAS_ACTIVE_COLLABORATORS');
      const normalError = new ClientBooksError('Normal', 'EMPRESA_NOT_FOUND');

      expect(criticalError.getSeverity()).toBe('critical');
      expect(warningError.getSeverity()).toBe('warning');
      expect(normalError.getSeverity()).toBe('error');
    });

    it('deve retornar estratégia de recuperação', () => {
      const retryError = new ClientBooksError('Retry', 'DATABASE_CONNECTION_FAILED');
      const fallbackError = new ClientBooksError('Fallback', 'DISPARO_TEMPLATE_NOT_FOUND');
      const manualError = new ClientBooksError('Manual', 'EMPRESA_NOT_FOUND');

      expect(retryError.getRecoveryStrategy()).toBe('retry');
      expect(fallbackError.getRecoveryStrategy()).toBe('fallback');
      expect(manualError.getRecoveryStrategy()).toBe('manual');
    });
  });

  describe('ClientBooksErrorFactory', () => {
    it('deve criar erro de empresa não encontrada', () => {
      const error = ClientBooksErrorFactory.empresaNotFound('123');

      expect(error.code).toBe('EMPRESA_NOT_FOUND');
      expect(error.message).toContain('123');
      expect(error.details).toEqual({ empresaId: '123' });
    });

    it('deve criar erro de nome duplicado', () => {
      const error = ClientBooksErrorFactory.empresaDuplicateName('Empresa Teste');

      expect(error.code).toBe('EMPRESA_DUPLICATE_NAME');
      expect(error.message).toContain('Empresa Teste');
      expect(error.details).toEqual({ nome: 'Empresa Teste' });
    });

    it('deve criar erro de colaboradores ativos', () => {
      const error = ClientBooksErrorFactory.empresaHasActiveCollaborators('123', 5);

      expect(error.code).toBe('EMPRESA_HAS_ACTIVE_COLLABORATORS');
      expect(error.message).toContain('5');
      expect(error.details).toEqual({ empresaId: '123', activeCollaborators: 5 });
    });

    it('deve criar erro de colaborador não encontrado', () => {
      const error = ClientBooksErrorFactory.colaboradorNotFound('456');

      expect(error.code).toBe('COLABORADOR_NOT_FOUND');
      expect(error.message).toContain('456');
      expect(error.details).toEqual({ colaboradorId: '456' });
    });

    it('deve criar erro de email duplicado', () => {
      const error = ClientBooksErrorFactory.colaboradorDuplicateEmail('test@test.com', '123');

      expect(error.code).toBe('COLABORADOR_DUPLICATE_EMAIL');
      expect(error.message).toContain('test@test.com');
      expect(error.details).toEqual({ email: 'test@test.com', empresaId: '123' });
    });

    it('deve criar erro de conflito de principal contato', () => {
      const error = ClientBooksErrorFactory.colaboradorPrincipalContatoConflict('123', '456');

      expect(error.code).toBe('COLABORADOR_PRINCIPAL_CONTATO_CONFLICT');
      expect(error.details).toEqual({ 
        empresaId: '123', 
        existingPrincipalContatoId: '456' 
      });
    });

    it('deve criar erro de disparo falhou', () => {
      const originalError = new Error('Network error');
      const error = ClientBooksErrorFactory.disparoFailed('123', originalError);

      expect(error.code).toBe('DISPARO_FAILED');
      expect(error.details).toEqual({ originalError });
      expect(error.context).toEqual({ empresaId: '123' });
    });

    it('deve criar erro de validação', () => {
      const error = ClientBooksErrorFactory.validationError('email', 'invalid-email', 'formato inválido');

      expect(error.code).toBe('EMPRESA_VALIDATION_FAILED');
      expect(error.details).toEqual({ 
        field: 'email', 
        value: 'invalid-email', 
        reason: 'formato inválido' 
      });
    });
  });

  describe('ClientBooksErrorHandler', () => {
    it('deve identificar ClientBooksError', () => {
      const clientBooksError = new ClientBooksError('Teste', 'EMPRESA_NOT_FOUND');
      const regularError = new Error('Teste');

      expect(ClientBooksErrorHandler.isClientBooksError(clientBooksError)).toBe(true);
      expect(ClientBooksErrorHandler.isClientBooksError(regularError)).toBe(false);
    });

    it('deve retornar mensagem amigável', () => {
      const error = new ClientBooksError('Teste', 'EMPRESA_NOT_FOUND');
      const message = ClientBooksErrorHandler.getUserFriendlyMessage(error);

      expect(message).toBe('Empresa não encontrada');
    });

    it('deve determinar se erro deve ser mostrado ao usuário', () => {
      const userError = new ClientBooksError('Teste', 'EMPRESA_NOT_FOUND');
      const systemError = new ClientBooksError('Teste', 'SYSTEM_ERROR');

      expect(ClientBooksErrorHandler.shouldShowToUser(userError)).toBe(true);
      expect(ClientBooksErrorHandler.shouldShowToUser(systemError)).toBe(false);
    });

    it('deve retornar ação recomendada', () => {
      const error = new ClientBooksError('Teste', 'EMPRESA_DUPLICATE_NAME');
      const action = ClientBooksErrorHandler.getRecommendedAction(error);

      expect(action).toContain('Escolha um nome diferente');
    });

    it('deve retornar ação padrão para códigos não mapeados', () => {
      const error = new ClientBooksError('Teste', 'SYSTEM_ERROR');
      const action = ClientBooksErrorHandler.getRecommendedAction(error);

      expect(action).toContain('Entre em contato com o suporte');
    });
  });

  describe('Error Code Classifications', () => {
    it('deve classificar códigos temporários corretamente', () => {
      expect(TEMPORARY_ERROR_CODES).toContain('DATABASE_CONNECTION_FAILED');
      expect(TEMPORARY_ERROR_CODES).toContain('NETWORK_ERROR');
      expect(TEMPORARY_ERROR_CODES).not.toContain('EMPRESA_NOT_FOUND');
    });

    it('deve classificar códigos de notificação admin corretamente', () => {
      expect(ADMIN_NOTIFICATION_ERROR_CODES).toContain('SYSTEM_ERROR');
      expect(ADMIN_NOTIFICATION_ERROR_CODES).toContain('DATABASE_CONNECTION_FAILED');
      expect(ADMIN_NOTIFICATION_ERROR_CODES).not.toContain('EMPRESA_NOT_FOUND');
    });

    it('deve classificar códigos críticos corretamente', () => {
      expect(CRITICAL_ERROR_CODES).toContain('SYSTEM_ERROR');
      expect(CRITICAL_ERROR_CODES).toContain('DATABASE_CONNECTION_FAILED');
      expect(CRITICAL_ERROR_CODES).not.toContain('EMPRESA_NOT_FOUND');
    });

    it('deve classificar códigos de warning corretamente', () => {
      expect(WARNING_ERROR_CODES).toContain('EMPRESA_HAS_ACTIVE_COLLABORATORS');
      expect(WARNING_ERROR_CODES).toContain('DISPARO_ALREADY_SENT');
      expect(WARNING_ERROR_CODES).not.toContain('SYSTEM_ERROR');
    });
  });
});