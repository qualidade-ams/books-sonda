/**
 * Testes para o sistema de cache local de anexos
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { anexoCache, cacheUtils } from '../anexoCache';
import type { AnexoData, AnexosSummary } from '@/services/anexoService';

// Mock do localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Sistema de Cache de Anexos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    anexoCache.clear();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    anexoCache.clear();
  });

  describe('Operações Básicas de Cache', () => {
    it('deve armazenar e recuperar dados do cache', () => {
      const testData = { test: 'data' };
      
      anexoCache.set('test-key', testData);
      const retrieved = anexoCache.get('test-key');
      
      expect(retrieved).toEqual(testData);
    });

    it('deve retornar null para chaves inexistentes', () => {
      const result = anexoCache.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('deve remover dados do cache', () => {
      anexoCache.set('test-key', { test: 'data' });
      
      const deleted = anexoCache.delete('test-key');
      const retrieved = anexoCache.get('test-key');
      
      expect(deleted).toBe(true);
      expect(retrieved).toBeNull();
    });

    it('deve limpar todo o cache', () => {
      anexoCache.set('key1', { data: 1 });
      anexoCache.set('key2', { data: 2 });
      
      anexoCache.clear();
      
      expect(anexoCache.get('key1')).toBeNull();
      expect(anexoCache.get('key2')).toBeNull();
    });
  });

  describe('TTL (Time To Live)', () => {
    it('deve expirar dados após o TTL', async () => {
      const shortTTL = 100; // 100ms
      anexoCache.set('test-key', { test: 'data' }, { ttl: shortTTL });
      
      // Deve estar disponível imediatamente
      expect(anexoCache.get('test-key')).toEqual({ test: 'data' });
      
      // Aguardar expiração
      await new Promise(resolve => setTimeout(resolve, shortTTL + 50));
      
      // Deve ter expirado
      expect(anexoCache.get('test-key')).toBeNull();
    });

    it('deve atualizar timestamp de acesso', () => {
      anexoCache.set('test-key', { test: 'data' });
      
      const stats1 = anexoCache.getStats();
      anexoCache.get('test-key'); // Primeiro acesso
      anexoCache.get('test-key'); // Segundo acesso
      const stats2 = anexoCache.getStats();
      
      expect(stats2.totalHits).toBe(stats1.totalHits + 2);
    });
  });

  describe('Operações Específicas de Anexos', () => {
    const mockAnexos: AnexoData[] = [
      {
        id: '1',
        nome: 'arquivo1.pdf',
        tipo: 'application/pdf',
        tamanho: 1024,
        url: 'http://example.com/1',
        status: 'pendente',
        empresaId: 'empresa1'
      },
      {
        id: '2',
        nome: 'arquivo2.pdf',
        tipo: 'application/pdf',
        tamanho: 2048,
        url: 'http://example.com/2',
        status: 'processado',
        empresaId: 'empresa1'
      }
    ];

    const mockSummary: AnexosSummary = {
      totalArquivos: 2,
      tamanhoTotal: 3072,
      tamanhoLimite: 25 * 1024 * 1024,
      podeAdicionar: true
    };

    it('deve armazenar e recuperar anexos por empresa', () => {
      anexoCache.setAnexosEmpresa('empresa1', mockAnexos);
      const retrieved = anexoCache.getAnexosEmpresa('empresa1');
      
      expect(retrieved).toEqual(mockAnexos);
    });

    it('deve armazenar e recuperar summary por empresa', () => {
      anexoCache.setSummaryEmpresa('empresa1', mockSummary);
      const retrieved = anexoCache.getSummaryEmpresa('empresa1');
      
      expect(retrieved).toEqual(mockSummary);
    });

    it('deve armazenar e recuperar metadados de anexo individual', () => {
      const anexo = mockAnexos[0];
      anexoCache.setAnexoMetadata(anexo.id, anexo);
      const retrieved = anexoCache.getAnexoMetadata(anexo.id);
      
      expect(retrieved).toEqual(anexo);
    });

    it('deve invalidar cache de empresa específica', () => {
      anexoCache.setAnexosEmpresa('empresa1', mockAnexos);
      anexoCache.setSummaryEmpresa('empresa1', mockSummary);
      
      anexoCache.invalidateEmpresa('empresa1');
      
      expect(anexoCache.getAnexosEmpresa('empresa1')).toBeNull();
      expect(anexoCache.getSummaryEmpresa('empresa1')).toBeNull();
    });

    it('deve invalidar cache de anexo específico', () => {
      const anexo = mockAnexos[0];
      anexoCache.setAnexoMetadata(anexo.id, anexo);
      
      anexoCache.invalidateAnexo(anexo.id);
      
      expect(anexoCache.getAnexoMetadata(anexo.id)).toBeNull();
    });
  });

  describe('Invalidação por Padrão', () => {
    it('deve invalidar entradas que correspondem ao padrão', () => {
      anexoCache.set('empresa_123_anexos', []);
      anexoCache.set('empresa_123_summary', {});
      anexoCache.set('empresa_456_anexos', []);
      anexoCache.set('other_data', {});
      
      const invalidated = anexoCache.invalidatePattern('empresa_123_.*');
      
      expect(invalidated).toBe(2);
      expect(anexoCache.get('empresa_123_anexos')).toBeNull();
      expect(anexoCache.get('empresa_123_summary')).toBeNull();
      expect(anexoCache.get('empresa_456_anexos')).not.toBeNull();
      expect(anexoCache.get('other_data')).not.toBeNull();
    });
  });

  describe('Estatísticas do Cache', () => {
    it('deve calcular estatísticas corretamente', () => {
      anexoCache.set('key1', { data: 1 });
      anexoCache.set('key2', { data: 2 });
      
      anexoCache.get('key1'); // Hit
      anexoCache.get('key1'); // Hit
      anexoCache.get('nonexistent'); // Miss
      
      const stats = anexoCache.getStats();
      
      expect(stats.totalEntries).toBe(2);
      expect(stats.totalHits).toBe(2);
      expect(stats.totalMisses).toBe(1);
      expect(stats.hitRate).toBe((2 / 3) * 100);
    });

    it('deve estimar uso de memória', () => {
      anexoCache.set('test', { large: 'data'.repeat(1000) });
      
      const stats = anexoCache.getStats();
      
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('Cache com Fallback', () => {
    it('deve usar fetcher quando dados não estão em cache', async () => {
      const fetcher = vi.fn().mockResolvedValue({ fetched: 'data' });
      
      const result = await anexoCache.getOrSet('test-key', fetcher);
      
      expect(fetcher).toHaveBeenCalledOnce();
      expect(result).toEqual({ fetched: 'data' });
      
      // Segunda chamada deve usar cache
      const result2 = await anexoCache.getOrSet('test-key', fetcher);
      
      expect(fetcher).toHaveBeenCalledOnce(); // Não deve chamar novamente
      expect(result2).toEqual({ fetched: 'data' });
    });

    it('deve propagar erros do fetcher', async () => {
      const fetcher = vi.fn().mockRejectedValue(new Error('Fetch error'));
      
      await expect(anexoCache.getOrSet('test-key', fetcher)).rejects.toThrow('Fetch error');
    });
  });

  describe('Preload de Dados', () => {
    it('deve pré-carregar dados no cache', async () => {
      const fetcher = vi.fn().mockResolvedValue({ preloaded: 'data' });
      
      await anexoCache.preload('preload-key', fetcher);
      
      expect(fetcher).toHaveBeenCalledOnce();
      expect(anexoCache.get('preload-key')).toEqual({ preloaded: 'data' });
    });

    it('deve lidar com erros de preload graciosamente', async () => {
      const fetcher = vi.fn().mockRejectedValue(new Error('Preload error'));
      
      // Não deve lançar erro
      await expect(anexoCache.preload('preload-key', fetcher)).resolves.toBeUndefined();
      
      expect(anexoCache.get('preload-key')).toBeNull();
    });
  });

  describe('Integração com localStorage', () => {
    it('deve salvar no localStorage quando habilitado', () => {
      anexoCache.set('test-key', { test: 'data' }, { useLocalStorage: true });
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'anexo_cache_test-key',
        expect.stringContaining('"test":"data"')
      );
    });

    it('deve carregar do localStorage quando não está em memória', () => {
      const mockEntry = {
        data: { test: 'data' },
        timestamp: Date.now(),
        ttl: 300000,
        accessCount: 0,
        lastAccess: Date.now()
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockEntry));
      
      const result = anexoCache.get('test-key');
      
      expect(result).toEqual({ test: 'data' });
      expect(localStorageMock.getItem).toHaveBeenCalledWith('anexo_cache_test-key');
    });

    it('deve lidar com dados corrompidos no localStorage', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      const result = anexoCache.get('test-key');
      
      expect(result).toBeNull();
    });
  });

  describe('Utilitários de Cache', () => {
    it('deve formatar estatísticas corretamente', () => {
      anexoCache.set('key1', { data: 1 });
      anexoCache.get('key1');
      
      const stats = anexoCache.getStats();
      const formatted = cacheUtils.formatStats(stats);
      
      expect(formatted).toContain('Cache:');
      expect(formatted).toContain('entradas');
      expect(formatted).toContain('hit rate');
    });

    it('deve configurar limpeza automática', () => {
      const cleanup = cacheUtils.setupAutoCleanup(100);
      
      expect(typeof cleanup).toBe('function');
      
      // Limpar o intervalo
      cleanup();
    });
  });
});