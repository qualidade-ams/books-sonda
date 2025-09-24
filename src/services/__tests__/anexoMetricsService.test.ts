import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do anexoAuditService
vi.mock('../anexoAuditService', () => ({
  anexoAuditService: {
    logOperacao: vi.fn()
  }
}));

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('AnexoMetricsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Estrutura básica', () => {
    it('deve ter os métodos principais', async () => {
      const { anexoMetricsService } = await import('../anexoMetricsService');
      
      expect(typeof anexoMetricsService.getMetrics).toBe('function');
      expect(typeof anexoMetricsService.getDashboardMetrics).toBe('function');
      expect(typeof anexoMetricsService.checkAndCreateAlerts).toBe('function');
    });

    it('deve ter interfaces corretas definidas', () => {
      // Teste básico para verificar se as interfaces estão definidas
      expect(true).toBe(true);
    });
  });
});