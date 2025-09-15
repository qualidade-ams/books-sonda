import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { realTimeNotificationService } from '../realTimeNotificationService';
import type { RealTimeEvent } from '../realTimeNotificationService';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(() => Promise.resolve())
      }))
    })),
    removeChannel: vi.fn(() => Promise.resolve())
  }
}));

// Mock dos outros serviços
vi.mock('../adminNotificationService', () => ({
  adminNotificationService: {
    notifySystemIssue: vi.fn(() => Promise.resolve([]))
  }
}));

vi.mock('../auditLogger', () => ({
  auditLogger: {
    logOperation: vi.fn(() => Promise.resolve())
  }
}));

describe('RealTimeNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await realTimeNotificationService.shutdown();
  });

  describe('Inicialização e Finalização', () => {
    it('deve inicializar o serviço corretamente', async () => {
      await expect(realTimeNotificationService.initialize()).resolves.not.toThrow();
      expect(realTimeNotificationService.isServiceConnected()).toBe(true);
    });

    it('deve finalizar o serviço corretamente', async () => {
      await realTimeNotificationService.initialize();
      await expect(realTimeNotificationService.shutdown()).resolves.not.toThrow();
      expect(realTimeNotificationService.isServiceConnected()).toBe(false);
    });
  });

  describe('Subscriptions de Eventos', () => {
    it('deve permitir subscrever a eventos', async () => {
      const callback = vi.fn();
      const unsubscribe = realTimeNotificationService.subscribe('job_status_changed', callback);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Cleanup
      unsubscribe();
    });

    it('deve permitir cancelar subscription', async () => {
      const callback = vi.fn();
      const unsubscribe = realTimeNotificationService.subscribe('job_status_changed', callback);
      
      // Cancelar subscription não deve causar erro
      expect(() => unsubscribe()).not.toThrow();
    });

    it('deve permitir múltiplas subscriptions para o mesmo evento', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      const unsubscribe1 = realTimeNotificationService.subscribe('job_status_changed', callback1);
      const unsubscribe2 = realTimeNotificationService.subscribe('job_status_changed', callback2);
      
      expect(typeof unsubscribe1).toBe('function');
      expect(typeof unsubscribe2).toBe('function');
      
      // Cleanup
      unsubscribe1();
      unsubscribe2();
    });
  });

  describe('Emissão de Eventos', () => {
    it('deve emitir evento corretamente', async () => {
      const callback = vi.fn();
      realTimeNotificationService.subscribe('user_action', callback);
      
      const event = {
        type: 'user_action' as const,
        title: 'Teste',
        message: 'Mensagem de teste',
        severity: 'info' as const,
        source: 'test'
      };
      
      await realTimeNotificationService.emitEvent(event);
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          ...event,
          id: expect.any(String),
          timestamp: expect.any(String)
        })
      );
    });

    it('deve gerar ID e timestamp automaticamente', async () => {
      const callback = vi.fn();
      realTimeNotificationService.subscribe('system_alert', callback);
      
      await realTimeNotificationService.emitEvent({
        type: 'system_alert',
        title: 'Teste',
        message: 'Teste',
        severity: 'warning',
        source: 'test'
      });
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringMatching(/^event_\d+_[a-z0-9]+$/),
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('Tracking de Progresso', () => {
    it('deve iniciar tracking de progresso', () => {
      const operationId = 'test-operation';
      const operationName = 'Operação de Teste';
      
      expect(() => {
        realTimeNotificationService.startProgress(operationId, operationName);
      }).not.toThrow();
      
      const status = realTimeNotificationService.getProgressStatus(operationId);
      expect(status).toBeDefined();
      expect(status?.operation).toBe(operationName);
      expect(status?.progress).toBe(0);
    });

    it('deve atualizar progresso corretamente', async () => {
      const operationId = 'test-operation';
      const callback = vi.fn();
      
      realTimeNotificationService.startProgress(operationId, 'Teste');
      realTimeNotificationService.subscribeToProgress(operationId, callback);
      
      await realTimeNotificationService.updateProgress(operationId, 50, 'Meio caminho');
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: 50,
          message: 'Meio caminho'
        })
      );
    });

    it('deve completar progresso e limpar após delay', async () => {
      const operationId = 'test-operation';
      
      realTimeNotificationService.startProgress(operationId, 'Teste');
      realTimeNotificationService.completeProgress(operationId);
      
      const status = realTimeNotificationService.getProgressStatus(operationId);
      expect(status?.progress).toBe(100);
    });

    it('deve listar operações ativas', () => {
      const operationId1 = 'test-operation-1';
      const operationId2 = 'test-operation-2';
      
      realTimeNotificationService.startProgress(operationId1, 'Teste 1');
      realTimeNotificationService.startProgress(operationId2, 'Teste 2');
      
      const activeOperations = realTimeNotificationService.getActiveOperations();
      expect(activeOperations).toHaveLength(2);
    });

    it('deve falhar progresso corretamente', () => {
      const operationId = 'test-operation';
      
      realTimeNotificationService.startProgress(operationId, 'Teste');
      realTimeNotificationService.failProgress(operationId, 'Erro de teste');
      
      const status = realTimeNotificationService.getProgressStatus(operationId);
      expect(status).toBeUndefined(); // Deve ser removido após falha
    });
  });

  describe('Subscriptions de Progresso', () => {
    it('deve permitir subscrever a progresso de operação', () => {
      const operationId = 'test-operation';
      const callback = vi.fn();
      
      const unsubscribe = realTimeNotificationService.subscribeToProgress(operationId, callback);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Cleanup
      unsubscribe();
    });

    it('deve chamar callback imediatamente se operação já existe', () => {
      const operationId = 'test-operation';
      const callback = vi.fn();
      
      realTimeNotificationService.startProgress(operationId, 'Teste');
      realTimeNotificationService.subscribeToProgress(operationId, callback);
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          id: operationId,
          operation: 'Teste'
        })
      );
    });
  });

  describe('Estatísticas do Serviço', () => {
    it('deve retornar estatísticas corretas', async () => {
      await realTimeNotificationService.initialize();
      
      const callback = vi.fn();
      realTimeNotificationService.subscribe('job_status_changed', callback);
      realTimeNotificationService.startProgress('test-op', 'Teste');
      
      const stats = realTimeNotificationService.getServiceStats();
      
      expect(stats).toHaveProperty('channelsCount');
      expect(stats).toHaveProperty('eventCallbacksCount');
      expect(stats).toHaveProperty('progressCallbacksCount');
      expect(stats).toHaveProperty('activeOperationsCount');
      expect(stats).toHaveProperty('isConnected');
      
      expect(stats.isConnected).toBe(true);
      expect(stats.activeOperationsCount).toBe(1);
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve lidar com erros em callbacks graciosamente', async () => {
      const faultyCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      
      realTimeNotificationService.subscribe('user_action', faultyCallback);
      
      // Emitir evento não deve causar erro mesmo com callback falhando
      await expect(realTimeNotificationService.emitEvent({
        type: 'user_action',
        title: 'Teste',
        message: 'Teste',
        severity: 'info',
        source: 'test'
      })).resolves.not.toThrow();
    });

    it('deve lidar com erro na inicialização', async () => {
      // Mock erro no Supabase
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.channel).mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });

      await expect(realTimeNotificationService.initialize()).rejects.toThrow();
    });
  });
});