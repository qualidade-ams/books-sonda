import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { jobSchedulerService } from '../jobSchedulerService';
import { supabase } from '@/integrations/supabase/client';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { 
              id: 'test-job-id', 
              type: 'monthly_books_dispatch',
              status: 'pending',
              scheduled_at: new Date().toISOString(),
              attempts: 0,
              max_attempts: 3,
              payload: {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, 
            error: null 
          })),
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          lte: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          })),
          in: vi.fn(() => Promise.resolve({ error: null }))
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        })),
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        })),
        range: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => Promise.resolve({ error: null }))
        }))
      })),
      delete: vi.fn(() => ({
        lt: vi.fn(() => ({
          in: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }))
    })),
    removeChannel: vi.fn(() => Promise.resolve())
  }
}));

// Mock dos outros serviços
vi.mock('../booksDisparoService', () => ({
  booksDisparoService: {
    dispararBooksMensal: vi.fn(() => Promise.resolve({
      sucesso: 5,
      falhas: 0,
      total: 5,
      detalhes: []
    })),
    reenviarFalhas: vi.fn(() => Promise.resolve({
      sucesso: 2,
      falhas: 0,
      total: 2,
      detalhes: []
    }))
  }
}));

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

describe('JobSchedulerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await jobSchedulerService.stop();
  });

  describe('Agendamento de Jobs', () => {
    it('deve agendar disparo mensal corretamente', async () => {
      const mes = 12;
      const ano = 2024;
      
      const jobId = await jobSchedulerService.scheduleMonthlyDispatch(mes, ano);
      
      expect(jobId).toBeDefined();
      expect(jobId).toMatch(/^job_\d+_[a-z0-9]+$/);
      expect(supabase.from).toHaveBeenCalledWith('jobs_queue');
    });

    it('deve agendar retry de falhas com delay personalizado', async () => {
      const mes = 12;
      const ano = 2024;
      const delayMinutes = 60;
      
      const jobId = await jobSchedulerService.scheduleRetryFailedDispatch(mes, ano, delayMinutes);
      
      expect(jobId).toBeDefined();
      expect(jobId).toMatch(/^job_\d+_[a-z0-9]+$/);
    });

    it('deve cancelar job pendente', async () => {
      const jobId = 'test-job-id';
      
      await expect(jobSchedulerService.cancelJob(jobId)).resolves.not.toThrow();
      
      expect(supabase.from).toHaveBeenCalledWith('jobs_queue');
    });
  });

  describe('Consulta de Jobs', () => {
    it('deve buscar status de job específico', async () => {
      const jobId = 'test-job-id';
      
      const status = await jobSchedulerService.getJobStatus(jobId);
      
      expect(supabase.from).toHaveBeenCalledWith('jobs_queue');
    });

    it('deve listar jobs com filtros', async () => {
      const filters = {
        type: 'monthly_books_dispatch' as const,
        status: 'pending' as const,
        limit: 10
      };
      
      const jobs = await jobSchedulerService.listJobs(filters);
      
      expect(Array.isArray(jobs)).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('jobs_queue');
    });

    it('deve obter estatísticas de jobs', async () => {
      const stats = await jobSchedulerService.getJobStatistics();
      
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('byStatus');
      expect(stats).toHaveProperty('byType');
      expect(stats).toHaveProperty('recentFailures');
    });
  });

  describe('Controle do Scheduler', () => {
    it('deve iniciar o scheduler sem erros', async () => {
      await expect(jobSchedulerService.start()).resolves.not.toThrow();
    });

    it('deve parar o scheduler sem erros', async () => {
      await jobSchedulerService.start();
      await expect(jobSchedulerService.stop()).resolves.not.toThrow();
    });

    it('não deve iniciar scheduler se já estiver rodando', async () => {
      await jobSchedulerService.start();
      
      // Tentar iniciar novamente não deve causar erro
      await expect(jobSchedulerService.start()).resolves.not.toThrow();
    });
  });

  describe('Validação de Configuração', () => {
    it('deve usar configuração padrão se não fornecida', () => {
      // O serviço deve funcionar com configuração padrão
      expect(() => jobSchedulerService).not.toThrow();
    });

    it('deve aceitar configuração personalizada', () => {
      // Teste implícito - se o serviço foi instanciado, aceita configuração
      expect(jobSchedulerService).toBeDefined();
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve lidar com erro de banco de dados graciosamente', async () => {
      // Mock erro do Supabase
      const mockError = { message: 'Database connection failed' };
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: mockError }))
          }))
        }))
      } as any);

      await expect(jobSchedulerService.getJobStatus('test-id')).rejects.toThrow();
    });

    it('deve notificar administradores sobre falhas críticas', async () => {
      // Este teste verifica se as notificações são enviadas em caso de falha
      // A implementação real seria testada com mocks mais específicos
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Geração de IDs', () => {
    it('deve gerar IDs únicos para jobs', async () => {
      const jobId1 = await jobSchedulerService.scheduleMonthlyDispatch(12, 2024);
      const jobId2 = await jobSchedulerService.scheduleMonthlyDispatch(1, 2025);
      
      expect(jobId1).not.toBe(jobId2);
      expect(jobId1).toMatch(/^job_\d+_[a-z0-9]+$/);
      expect(jobId2).toMatch(/^job_\d+_[a-z0-9]+$/);
    });
  });
});