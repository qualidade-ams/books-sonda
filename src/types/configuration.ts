/**
 * Configuration types for dynamic column configuration system
 * Replaces hardcoded configColunas arrays with database-driven configuration
 */

// Core configuration interfaces
export interface ColumnConfig {
  nome_coluna: string;
  porcentagem: number;
}

// Legacy format support (for line 721 usage)
export interface LegacyColumnConfig {
  nome: string;
  percentual: number;
}

// Database entity interfaces
export interface DatabaseColumn {
  id: string;
  regra_id: string;
  nome: string;
  tipo: string;
  aba: string;
  created_at?: string;
  updated_at?: string;
}

export interface DatabaseValue {
  id: string;
  coluna_id: string;
  segmento: string;
  valor: number;
  created_at?: string;
  updated_at?: string;
}

// Configuration request parameters
export interface ConfigurationRequest {
  regraId?: string;
  aba?: string;
  segmento?: string;
  tipo?: string;
}

// Cache-related interfaces
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  lastAccessed?: number;
  ttl: number;
}

// Validation interfaces
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedConfig: ColumnConfig[];
}

// Service interfaces
export interface ConfigurationRepository {
  fetchColumns(params: ConfigurationRequest): Promise<DatabaseColumn[]>;
  fetchValues(columnIds: string[], segmento?: string): Promise<DatabaseValue[]>;
}

export interface CacheManager {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttlSeconds?: number): void;
  clear(key?: string): void;
  has(key: string): boolean;
}

export interface ConfigurationService {
  getColumnConfiguration(params: ConfigurationRequest): Promise<ColumnConfig[]>;
  getLegacyColumnConfiguration(params: ConfigurationRequest): Promise<LegacyColumnConfig[]>;
  clearCache(): void;
  refreshConfiguration(params: ConfigurationRequest): Promise<void>;
}

// Error types
export class ConfigurationError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class CacheError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'CacheError';
  }
}