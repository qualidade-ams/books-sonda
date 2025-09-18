import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  withRetry,
  withFallback,
  CircuitBreaker,
  ErrorRecoveryManager,
  DataSanitizer,
  DataIntegrityValidator,
  DEFAULT_RETRY_CONFIG,
  OPERATION_RETRY_CONFIGS
} from '../errorRecovery';
import { ClientBooksError } from '@/errors/clientBooksErrors';

describe('errorRecovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('withRetry', () => {
    it('deve executar operação com sucesso na primeira tentativa', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await withRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('deve tentar novamente em caso de erro temporário', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('temporary error'))
        .mockResolvedValue('success');
      
      const result = await withRetry(operation, {
        ...DEFAULT_RETRY_CONFIG,
        maxRetries: 1,
        baseDelay: 10
      });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('deve respeitar o número máximo de tentativas', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('persistent error'));
      
      await expect(withRetry(operation, {
        ...DEFAULT_RETRY_CONFIG,
        maxRetries: 2,
        baseDelay: 10
      })).rejects.toThrow('persistent error');
      
      expect(operation).toHaveBeenCalledTimes(3); // 1 inicial + 2 retries
    });

    it('deve respeitar condição de retry', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('non-retryable error'));
      
      await expect(withRetry(operation, {
        ...DEFAULT_RETRY_CONFIG,
        maxRetries: 2,
        baseDelay: 10,
        retryCondition: () => false
      })).rejects.toThrow('non-retryable error');
      
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('deve usar configuração específica para operações de banco', () => {
      const dbConfig = OPERATION_RETRY_CONFIGS.database;
      
      expect(dbConfig.maxRetries).toBe(3);
      expect(dbConfig.baseDelay).toBe(500);
      expect(dbConfig.retryCondition).toBeDefined();
    });

    it('deve usar configuração específica para operações de email', () => {
      const emailConfig = OPERATION_RETRY_CONFIGS.email;
      
      expect(emailConfig.maxRetries).toBe(5);
      expect(emailConfig.baseDelay).toBe(2000);
      expect(emailConfig.retryCondition).toBeDefined();
    });
  });

  describe('withFallback', () => {
    it('deve executar operação principal com sucesso', async () => {
      const primaryOperation = vi.fn().mockResolvedValue('primary success');
      const fallback1 = vi.fn().mockResolvedValue('fallback1 success');
      
      const result = await withFallback(primaryOperation, {
        fallbacks: [fallback1]
      });
      
      expect(result).toBe('primary success');
      expect(primaryOperation).toHaveBeenCalledTimes(1);
      expect(fallback1).not.toHaveBeenCalled();
    });

    it('deve usar fallback quando operação principal falha', async () => {
      const primaryOperation = vi.fn().mockRejectedValue(new Error('primary error'));
      const fallback1 = vi.fn().mockResolvedValue('fallback1 success');
      
      const result = await withFallback(primaryOperation, {
        fallbacks: [fallback1]
      });
      
      expect(result).toBe('fallback1 success');
      expect(primaryOperation).toHaveBeenCalledTimes(1);
      expect(fallback1).toHaveBeenCalledTimes(1);
    });

    it('deve tentar múltiplos fallbacks em sequência', async () => {
      const primaryOperation = vi.fn().mockRejectedValue(new Error('primary error'));
      const fallback1 = vi.fn().mockRejectedValue(new Error('fallback1 error'));
      const fallback2 = vi.fn().mockResolvedValue('fallback2 success');
      
      const result = await withFallback(primaryOperation, {
        fallbacks: [fallback1, fallback2]
      });
      
      expect(result).toBe('fallback2 success');
      expect(fallback1).toHaveBeenCalledTimes(1);
      expect(fallback2).toHaveBeenCalledTimes(1);
    });

    it('deve respeitar condição de fallback', async () => {
      const primaryOperation = vi.fn().mockRejectedValue(new Error('non-fallback error'));
      const fallback1 = vi.fn().mockResolvedValue('fallback1 success');
      
      await expect(withFallback(primaryOperation, {
        fallbacks: [fallback1],
        shouldUseFallback: () => false
      })).rejects.toThrow('non-fallback error');
      
      expect(fallback1).not.toHaveBeenCalled();
    });

    it('deve chamar callback quando fallback é usado', async () => {
      const primaryOperation = vi.fn().mockRejectedValue(new Error('primary error'));
      const fallback1 = vi.fn().mockResolvedValue('fallback1 success');
      const onFallbackUsed = vi.fn();
      
      await withFallback(primaryOperation, {
        fallbacks: [fallback1],
        onFallbackUsed
      });
      
      expect(onFallbackUsed).toHaveBeenCalledWith(0, expect.any(Error));
    });
  });

  describe('CircuitBreaker', () => {
    it('deve permitir execução quando circuito está fechado', async () => {
      const circuitBreaker = new CircuitBreaker(3, 1000);
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await circuitBreaker.execute(operation);
      
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe('closed');
    });

    it('deve abrir circuito após threshold de falhas', async () => {
      const circuitBreaker = new CircuitBreaker(2, 1000);
      const operation = vi.fn().mockRejectedValue(new Error('operation error'));
      
      // Primeira falha
      await expect(circuitBreaker.execute(operation)).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe('closed');
      
      // Segunda falha - deve abrir o circuito
      await expect(circuitBreaker.execute(operation)).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe('open');
      
      // Terceira tentativa - deve falhar imediatamente
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker is open');
    });

    it('deve transicionar para half-open após timeout', async () => {
      const circuitBreaker = new CircuitBreaker(1, 100); // 100ms timeout
      const operation = vi.fn().mockRejectedValue(new Error('operation error'));
      
      // Causar falha para abrir circuito
      await expect(circuitBreaker.execute(operation)).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe('open');
      
      // Aguardar timeout
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Próxima execução deve transicionar para half-open
      operation.mockResolvedValueOnce('success');
      const result = await circuitBreaker.execute(operation);
      
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe('closed');
    });

    it('deve resetar contador de falhas', () => {
      const circuitBreaker = new CircuitBreaker(3, 1000);
      
      circuitBreaker.reset();
      
      expect(circuitBreaker.getState()).toBe('closed');
    });
  });

  describe('ErrorRecoveryManager', () => {
    let manager: ErrorRecoveryManager;

    beforeEach(() => {
      manager = new ErrorRecoveryManager();
    });

    it('deve executar operação com estratégia completa de recuperação', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await manager.executeWithRecovery('test-operation', operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('deve usar retry quando configurado', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('temporary error'))
        .mockResolvedValue('success');
      
      const result = await manager.executeWithRecovery('test-operation', operation, {
        retryConfig: { ...DEFAULT_RETRY_CONFIG, maxRetries: 1, baseDelay: 10 }
      });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('deve usar fallbacks quando configurado', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('primary error'));
      const fallback = vi.fn().mockResolvedValue('fallback success');
      
      const result = await manager.executeWithRecovery('test-operation', operation, {
        fallbacks: [fallback],
        retryConfig: { ...DEFAULT_RETRY_CONFIG, maxRetries: 0 }
      });
      
      expect(result).toBe('fallback success');
      expect(fallback).toHaveBeenCalledTimes(1);
    });

    it('deve obter status dos circuit breakers', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      await manager.executeWithRecovery('test-operation', operation, {
        useCircuitBreaker: true
      });
      
      const status = manager.getCircuitBreakerStatus();
      expect(status['test-operation']).toBe('closed');
    });

    it('deve resetar circuit breaker específico', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      await manager.executeWithRecovery('test-operation', operation, {
        useCircuitBreaker: true
      });
      
      manager.resetCircuitBreaker('test-operation');
      
      const status = manager.getCircuitBreakerStatus();
      expect(status['test-operation']).toBe('closed');
    });
  });

  describe('DataSanitizer', () => {
    describe('sanitizeEmpresaData', () => {
      it('deve sanitizar dados de empresa', () => {
        const input = {
          nomeCompleto: '  Empresa Teste  ',
          nomeAbreviado: '  Teste  ',
          emailGestor: '  GESTOR@TESTE.COM  ',
          linkSharepoint: '  https://sharepoint.com  '
        };

        const result = DataSanitizer.sanitizeEmpresaData(input);

        expect(result.nomeCompleto).toBe('Empresa Teste');
        expect(result.nomeAbreviado).toBe('Teste');
        expect(result.emailGestor).toBe('gestor@teste.com');
        expect(result.linkSharepoint).toBe('https://sharepoint.com');
      });

      it('deve tratar valores nulos e undefined', () => {
        const input = {
          nomeCompleto: null,
          emailGestor: undefined,
          linkSharepoint: ''
        };

        const result = DataSanitizer.sanitizeEmpresaData(input);

        expect(result.nomeCompleto).toBe('');
        expect(result.emailGestor).toBe(null);
        expect(result.linkSharepoint).toBe(null);
      });
    });

    describe('sanitizeClienteData', () => {
      it('deve sanitizar dados de cliente', () => {
        const input = {
          nomeCompleto: '  João Silva  ',
          email: '  JOAO@TESTE.COM  ',
          funcao: '  Gerente  '
        };

        const result = DataSanitizer.sanitizeClienteData(input);

        expect(result.nomeCompleto).toBe('João Silva');
        expect(result.email).toBe('joao@teste.com');
        expect(result.funcao).toBe('Gerente');
      });
    });

    describe('sanitizeGrupoData', () => {
      it('deve sanitizar dados de grupo', () => {
        const input = {
          nome: '  Grupo Teste  ',
          descricao: '  Descrição do grupo  ',
          emails: [
            { email: '  EMAIL1@TESTE.COM  ', nome: '  Pessoa 1  ' },
            { email: '  EMAIL2@TESTE.COM  ', nome: '  Pessoa 2  ' }
          ]
        };

        const result = DataSanitizer.sanitizeGrupoData(input);

        expect(result.nome).toBe('Grupo Teste');
        expect(result.descricao).toBe('Descrição do grupo');
        expect(result.emails[0].email).toBe('email1@teste.com');
        expect(result.emails[0].nome).toBe('Pessoa 1');
      });
    });
  });

  describe('DataIntegrityValidator', () => {
    describe('validateEmpresaIntegrity', () => {
      it('deve validar empresa válida', async () => {
        const validData = {
          nomeCompleto: 'Empresa Teste',
          nomeAbreviado: 'Teste',
          emailGestor: 'gestor@teste.com',
          produtos: ['CE_PLUS']
        };

        const errors = await DataIntegrityValidator.validateEmpresaIntegrity(validData);

        expect(errors).toHaveLength(0);
      });

      it('deve detectar nome completo ausente', async () => {
        const invalidData = {
          nomeAbreviado: 'Teste',
          produtos: ['CE_PLUS']
        };

        const errors = await DataIntegrityValidator.validateEmpresaIntegrity(invalidData);

        expect(errors).toContain('Nome completo é obrigatório');
      });

      it('deve detectar email inválido', async () => {
        const invalidData = {
          nomeCompleto: 'Empresa Teste',
          nomeAbreviado: 'Teste',
          emailGestor: 'email-invalido',
          produtos: ['CE_PLUS']
        };

        const errors = await DataIntegrityValidator.validateEmpresaIntegrity(invalidData);

        expect(errors).toContain('E-mail do gestor é inválido');
      });

      it('deve detectar produtos ausentes', async () => {
        const invalidData = {
          nomeCompleto: 'Empresa Teste',
          nomeAbreviado: 'Teste',
          produtos: []
        };

        const errors = await DataIntegrityValidator.validateEmpresaIntegrity(invalidData);

        expect(errors).toContain('Pelo menos um produto deve ser selecionado');
      });
    });

    describe('validateClienteIntegrity', () => {
      it('deve validar cliente válido', async () => {
        const validData = {
          nomeCompleto: 'João Silva',
          email: 'joao@teste.com',
          empresaId: '123e4567-e89b-12d3-a456-426614174000'
        };

        const errors = await DataIntegrityValidator.validateClienteIntegrity(validData);

        expect(errors).toHaveLength(0);
      });

      it('deve detectar dados obrigatórios ausentes', async () => {
        const invalidData = {
          email: 'joao@teste.com'
        };

        const errors = await DataIntegrityValidator.validateClienteIntegrity(invalidData);

        expect(errors).toContain('Nome completo é obrigatório');
        expect(errors).toContain('Empresa é obrigatória');
      });

      it('deve detectar email inválido', async () => {
        const invalidData = {
          nomeCompleto: 'João Silva',
          email: 'email-invalido',
          empresaId: '123e4567-e89b-12d3-a456-426614174000'
        };

        const errors = await DataIntegrityValidator.validateClienteIntegrity(invalidData);

        expect(errors).toContain('E-mail é inválido');
      });
    });
  });
});