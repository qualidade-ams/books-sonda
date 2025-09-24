/**
 * Sistema de cache local para metadados de anexos
 * Implementa cache em memória e localStorage com TTL e invalidação inteligente
 */

import { AnexoData, AnexosSummary } from '@/services/anexoService';

// Constantes de cache
const CACHE_TTL_DEFAULT = 5 * 60 * 1000; // 5 minutos
const CACHE_TTL_SUMMARY = 2 * 60 * 1000; // 2 minutos para summaries
const CACHE_TTL_METADATA = 10 * 60 * 1000; // 10 minutos para metadados
const MAX_CACHE_SIZE = 100; // Máximo de entradas no cache
const STORAGE_KEY_PREFIX = 'anexo_cache_';
const STORAGE_KEY_METADATA = 'anexo_metadata_';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccess: number;
}

export interface CacheStats {
  totalEntries: number;
  memoryUsage: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  oldestEntry: number;
  newestEntry: number;
}

export interface CacheOptions {
  ttl?: number;
  useLocalStorage?: boolean;
  maxSize?: number;
  enableStats?: boolean;
}

class AnexoCacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0
  };

  /**
   * Gera chave de cache baseada nos parâmetros
   */
  private generateCacheKey(type: string, ...params: string[]): string {
    return `${type}_${params.join('_')}`;
  }

  /**
   * Verifica se uma entrada do cache ainda é válida
   */
  private isValid<T>(entry: CacheEntry<T>): boolean {
    const now = Date.now();
    return (now - entry.timestamp) < entry.ttl;
  }

  /**
   * Atualiza estatísticas de acesso
   */
  private updateAccessStats<T>(entry: CacheEntry<T>): void {
    entry.accessCount++;
    entry.lastAccess = Date.now();
  }

  /**
   * Remove entradas expiradas do cache
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.memoryCache.entries()) {
      if (!this.isValid(entry)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.memoryCache.delete(key);
      this.stats.evictions++;
    });
  }

  /**
   * Remove entradas menos usadas quando o cache está cheio
   */
  private evictLeastUsed(): void {
    if (this.memoryCache.size <= MAX_CACHE_SIZE) return;

    // Ordenar por frequência de acesso e tempo de último acesso
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => {
        // Priorizar por frequência de acesso
        if (a.accessCount !== b.accessCount) {
          return a.accessCount - b.accessCount;
        }
        // Em caso de empate, remover o mais antigo
        return a.lastAccess - b.lastAccess;
      });

    // Remover 20% das entradas menos usadas
    const toRemove = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      const [key] = entries[i];
      this.memoryCache.delete(key);
      this.stats.evictions++;
    }
  }

  /**
   * Salva dados no localStorage
   */
  private saveToLocalStorage<T>(key: string, entry: CacheEntry<T>): void {
    try {
      const storageKey = STORAGE_KEY_PREFIX + key;
      localStorage.setItem(storageKey, JSON.stringify(entry));
    } catch (error) {
      console.warn('Erro ao salvar no localStorage:', error);
    }
  }

  /**
   * Carrega dados do localStorage
   */
  private loadFromLocalStorage<T>(key: string): CacheEntry<T> | null {
    try {
      const storageKey = STORAGE_KEY_PREFIX + key;
      const stored = localStorage.getItem(storageKey);
      if (!stored) return null;

      const entry = JSON.parse(stored) as CacheEntry<T>;
      return this.isValid(entry) ? entry : null;
    } catch (error) {
      console.warn('Erro ao carregar do localStorage:', error);
      return null;
    }
  }

  /**
   * Define um valor no cache
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || CACHE_TTL_DEFAULT;
    const useStorage = options.useLocalStorage !== false;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccess: Date.now()
    };

    // Limpar cache expirado antes de adicionar
    this.cleanupExpired();

    // Verificar limite de tamanho
    this.evictLeastUsed();

    // Adicionar ao cache em memória
    this.memoryCache.set(key, entry);
    this.stats.sets++;

    // Salvar no localStorage se habilitado
    if (useStorage) {
      this.saveToLocalStorage(key, entry);
    }
  }

  /**
   * Obtém um valor do cache
   */
  get<T>(key: string): T | null {
    // Tentar cache em memória primeiro
    let entry = this.memoryCache.get(key) as CacheEntry<T> | undefined;

    // Se não encontrou em memória, tentar localStorage
    if (!entry) {
      entry = this.loadFromLocalStorage<T>(key);
      if (entry) {
        // Recarregar no cache em memória
        this.memoryCache.set(key, entry);
      }
    }

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Verificar se ainda é válido
    if (!this.isValid(entry)) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    // Atualizar estatísticas de acesso
    this.updateAccessStats(entry);
    this.stats.hits++;

    return entry.data;
  }

  /**
   * Remove um valor do cache
   */
  delete(key: string): boolean {
    const deleted = this.memoryCache.delete(key);
    
    // Remover do localStorage também
    try {
      const storageKey = STORAGE_KEY_PREFIX + key;
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Erro ao remover do localStorage:', error);
    }

    if (deleted) {
      this.stats.deletes++;
    }

    return deleted;
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.memoryCache.clear();
    
    // Limpar localStorage
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Erro ao limpar localStorage:', error);
    }

    // Reset das estatísticas
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
  }

  /**
   * Invalida cache por padrão de chave
   */
  invalidatePattern(pattern: string): number {
    let invalidated = 0;
    const regex = new RegExp(pattern);

    // Invalidar cache em memória
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
        invalidated++;
      }
    }

    // Invalidar localStorage
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          const cacheKey = key.replace(STORAGE_KEY_PREFIX, '');
          if (regex.test(cacheKey)) {
            localStorage.removeItem(key);
            invalidated++;
          }
        }
      });
    } catch (error) {
      console.warn('Erro ao invalidar localStorage:', error);
    }

    return invalidated;
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats(): CacheStats {
    const entries = Array.from(this.memoryCache.values());
    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      totalEntries: this.memoryCache.size,
      memoryUsage: this.estimateMemoryUsage(),
      hitRate: totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : 0
    };
  }

  /**
   * Estima uso de memória do cache
   */
  private estimateMemoryUsage(): number {
    let size = 0;
    for (const [key, entry] of this.memoryCache.entries()) {
      size += key.length * 2; // Aproximação para string UTF-16
      size += JSON.stringify(entry).length * 2;
    }
    return size;
  }

  // Métodos específicos para anexos

  /**
   * Cache de anexos por empresa
   */
  setAnexosEmpresa(empresaId: string, anexos: AnexoData[]): void {
    const key = this.generateCacheKey('anexos_empresa', empresaId);
    this.set(key, anexos, { ttl: CACHE_TTL_DEFAULT });
  }

  getAnexosEmpresa(empresaId: string): AnexoData[] | null {
    const key = this.generateCacheKey('anexos_empresa', empresaId);
    return this.get<AnexoData[]>(key);
  }

  /**
   * Cache de summary por empresa
   */
  setSummaryEmpresa(empresaId: string, summary: AnexosSummary): void {
    const key = this.generateCacheKey('summary_empresa', empresaId);
    this.set(key, summary, { ttl: CACHE_TTL_SUMMARY });
  }

  getSummaryEmpresa(empresaId: string): AnexosSummary | null {
    const key = this.generateCacheKey('summary_empresa', empresaId);
    return this.get<AnexosSummary>(key);
  }

  /**
   * Cache de metadados de anexo individual
   */
  setAnexoMetadata(anexoId: string, metadata: AnexoData): void {
    const key = this.generateCacheKey('anexo_metadata', anexoId);
    this.set(key, metadata, { ttl: CACHE_TTL_METADATA });
  }

  getAnexoMetadata(anexoId: string): AnexoData | null {
    const key = this.generateCacheKey('anexo_metadata', anexoId);
    return this.get<AnexoData>(key);
  }

  /**
   * Invalida cache de uma empresa específica
   */
  invalidateEmpresa(empresaId: string): void {
    this.invalidatePattern(`(anexos_empresa|summary_empresa)_${empresaId}`);
  }

  /**
   * Invalida cache de um anexo específico
   */
  invalidateAnexo(anexoId: string): void {
    this.invalidatePattern(`anexo_metadata_${anexoId}`);
  }

  /**
   * Cache inteligente com fallback
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Tentar obter do cache primeiro
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Se não encontrou, buscar dados
    try {
      const data = await fetcher();
      this.set(key, data, options);
      return data;
    } catch (error) {
      console.error('Erro ao buscar dados para cache:', error);
      throw error;
    }
  }

  /**
   * Pré-carrega dados no cache
   */
  async preload<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      const data = await fetcher();
      this.set(key, data, options);
    } catch (error) {
      console.warn('Erro no preload do cache:', error);
    }
  }
}

// Instância singleton do cache
export const anexoCache = new AnexoCacheManager();

// Utilitários de conveniência
export const cacheUtils = {
  /**
   * Formatar estatísticas para exibição
   */
  formatStats(stats: CacheStats): string {
    return `Cache: ${stats.totalEntries} entradas, ` +
           `${(stats.memoryUsage / 1024).toFixed(2)}KB, ` +
           `${stats.hitRate.toFixed(1)}% hit rate`;
  },

  /**
   * Limpar cache expirado manualmente
   */
  cleanup(): void {
    const before = anexoCache.getStats().totalEntries;
    anexoCache['cleanupExpired']();
    const after = anexoCache.getStats().totalEntries;
    console.log(`Cache cleanup: ${before - after} entradas removidas`);
  },

  /**
   * Configurar limpeza automática
   */
  setupAutoCleanup(intervalMs: number = 5 * 60 * 1000): () => void {
    const interval = setInterval(() => {
      this.cleanup();
    }, intervalMs);

    return () => clearInterval(interval);
  }
};

export default anexoCache;