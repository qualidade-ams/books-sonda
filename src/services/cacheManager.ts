import type { CacheManager, CacheEntry } from '@/types/configuration';
import { CacheError } from '@/types/configuration';

/**
 * Cache manager avançado com TTL, estatísticas e otimizações de performance
 * Fornece funcionalidades de cache para dados de configuração com monitoramento
 */
export class InMemoryCacheManager implements CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTtlSeconds: number;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    errors: 0
  };
  private maxSize: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(defaultTtlSeconds: number = 300, maxSize: number = 1000) { // 5 minutos padrão, máximo 1000 entradas
    this.defaultTtlSeconds = defaultTtlSeconds;
    this.maxSize = maxSize;
    this.startCleanupTimer();
  }

  /**
   * Obtém valor do cache por chave
   * Retorna null se a chave não existir ou tiver expirado
   */
  get<T>(key: string): T | null {
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.stats.misses++;
        return null;
      }

      // Verificar se a entrada expirou
      const now = Date.now();
      if (now > entry.timestamp + (entry.ttl * 1000)) {
        this.cache.delete(key);
        this.stats.misses++;
        this.stats.evictions++;
        return null;
      }

      // Atualizar timestamp de último acesso para LRU
      entry.lastAccessed = now;
      this.stats.hits++;
      
      return entry.data as T;
    } catch (error) {
      this.stats.errors++;
      console.error('❌ Erro ao obter do cache:', error);
      return null;
    }
  }

  /**
   * Define valor no cache com TTL opcional
   * @param key Chave do cache
   * @param value Valor a ser armazenado
   * @param ttlSeconds TTL em segundos (opcional, usa padrão se não fornecido)
   */
  set<T>(key: string, value: T, ttlSeconds?: number): void {
    try {
      // Verificar se precisa fazer limpeza por tamanho
      if (this.cache.size >= this.maxSize) {
        this.evictLeastRecentlyUsed();
      }

      const ttl = ttlSeconds ?? this.defaultTtlSeconds;
      const now = Date.now();
      const entry: CacheEntry<T> = {
        data: value,
        timestamp: now,
        lastAccessed: now,
        ttl: ttl
      };

      this.cache.set(key, entry);
      this.stats.sets++;
      
      console.debug(`📦 Cache SET: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.stats.errors++;
      console.error('❌ Erro ao definir no cache:', error);
      throw new CacheError(`Falha ao definir entrada no cache para chave: ${key}`, error);
    }
  }

  /**
   * Verifica se a chave existe e não expirou
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Verificar se a entrada expirou
    const now = Date.now();
    if (now > entry.timestamp + (entry.ttl * 1000)) {
      this.cache.delete(key);
      this.stats.evictions++;
      return false;
    }

    return true;
  }

  /**
   * Limpa entradas do cache
   * @param key Chave específica opcional para limpar. Se não fornecida, limpa todas as entradas
   */
  clear(key?: string): void {
    try {
      if (key) {
        const deleted = this.cache.delete(key);
        if (deleted) {
          this.stats.deletes++;
          console.debug(`🗑️ Cache DELETE: ${key}`);
        }
      } else {
        const size = this.cache.size;
        this.cache.clear();
        this.stats.deletes += size;
        console.debug(`🧹 Cache CLEAR ALL: ${size} entradas removidas`);
      }
    } catch (error) {
      this.stats.errors++;
      console.error('❌ Erro ao limpar cache:', error);
    }
  }

  /**
   * Obtém estatísticas do cache para monitoramento
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    let totalAge = 0;
    let oldestEntry = now;
    let newestEntry = 0;

    for (const [, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      totalAge += age;
      
      if (entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      if (entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }

      if (now > entry.timestamp + (entry.ttl * 1000)) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
      : 0;

    const averageAge = this.cache.size > 0 ? totalAge / this.cache.size : 0;

    return {
      // Estatísticas básicas
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      maxSize: this.maxSize,
      
      // Estatísticas de performance
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Number(hitRate.toFixed(2)),
      
      // Estatísticas de operações
      sets: this.stats.sets,
      deletes: this.stats.deletes,
      evictions: this.stats.evictions,
      errors: this.stats.errors,
      
      // Estatísticas de tempo
      averageAgeMs: Math.round(averageAge),
      oldestEntryAge: oldestEntry < now ? now - oldestEntry : 0,
      newestEntryAge: newestEntry > 0 ? now - newestEntry : 0,
      
      // Uso de memória
      memoryUsage: this.estimateMemoryUsage(),
      
      // Configuração
      defaultTtlSeconds: this.defaultTtlSeconds
    };
  }

  /**
   * Limpa entradas expiradas
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + (entry.ttl * 1000)) {
        keysToDelete.push(key);
      }
    }

    if (keysToDelete.length > 0) {
      keysToDelete.forEach(key => this.cache.delete(key));
      this.stats.evictions += keysToDelete.length;
      console.debug(`🧹 Cache CLEANUP: ${keysToDelete.length} entradas expiradas removidas`);
    }
  }

  /**
   * Remove a entrada menos recentemente usada (LRU)
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      const lastAccessed = entry.lastAccessed || entry.timestamp;
      if (lastAccessed < oldestTime) {
        oldestTime = lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      console.debug(`🗑️ Cache LRU EVICT: ${oldestKey}`);
    }
  }

  /**
   * Inicia timer de limpeza automática
   */
  private startCleanupTimer(): void {
    // Limpeza a cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Para o timer de limpeza automática
   */
  stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Invalida entradas baseadas em padrão de chave
   * @param pattern Padrão regex ou string para invalidar chaves
   */
  invalidatePattern(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    this.stats.deletes += keysToDelete.length;

    if (keysToDelete.length > 0) {
      console.debug(`🗑️ Cache INVALIDATE PATTERN: ${keysToDelete.length} entradas removidas`);
    }

    return keysToDelete.length;
  }

  /**
   * Pré-aquece o cache com dados
   * @param entries Mapa de chave-valor para pré-aquecer
   * @param ttlSeconds TTL opcional para as entradas
   */
  warmup<T>(entries: Map<string, T>, ttlSeconds?: number): void {
    console.info(`🔥 Cache WARMUP: Pré-aquecendo ${entries.size} entradas`);
    
    for (const [key, value] of entries.entries()) {
      this.set(key, value, ttlSeconds);
    }
    
    console.info(`✅ Cache WARMUP concluído: ${entries.size} entradas adicionadas`);
  }

  /**
   * Obtém múltiplas chaves de uma vez
   * @param keys Array de chaves para buscar
   * @returns Mapa com chaves encontradas e seus valores
   */
  getMultiple<T>(keys: string[]): Map<string, T> {
    const results = new Map<string, T>();
    
    for (const key of keys) {
      const value = this.get<T>(key);
      if (value !== null) {
        results.set(key, value);
      }
    }
    
    return results;
  }

  /**
   * Define múltiplas entradas de uma vez
   * @param entries Mapa de chave-valor para definir
   * @param ttlSeconds TTL opcional para todas as entradas
   */
  setMultiple<T>(entries: Map<string, T>, ttlSeconds?: number): void {
    for (const [key, value] of entries.entries()) {
      this.set(key, value, ttlSeconds);
    }
  }

  /**
   * Obtém informações detalhadas sobre uma chave específica
   * @param key Chave para inspecionar
   */
  inspect(key: string): {
    exists: boolean;
    expired: boolean;
    ttl: number;
    age: number;
    lastAccessed?: number;
    size: number;
  } | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;
    const remainingTtl = Math.max(0, (entry.timestamp + entry.ttl * 1000) - now);
    const expired = remainingTtl === 0;

    return {
      exists: true,
      expired,
      ttl: Math.round(remainingTtl / 1000),
      age: Math.round(age / 1000),
      lastAccessed: entry.lastAccessed,
      size: JSON.stringify(entry.data).length
    };
  }

  /**
   * Reseta todas as estatísticas
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      errors: 0
    };
    console.debug('📊 Cache STATS RESET: Estatísticas zeradas');
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  private estimateMemoryUsage(): number {
    let size = 0;
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2; // Rough estimate for string size
      size += JSON.stringify(entry).length * 2; // Rough estimate for entry size
    }
    return size;
  }
}

// Export singleton instance
export const cacheManager = new InMemoryCacheManager();