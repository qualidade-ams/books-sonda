/**
 * Configuration Infrastructure - Core Components
 * 
 * This module provides the core infrastructure for dynamic configuration management,
 * replacing hardcoded configColunas arrays with database-driven configuration.
 */

// Export types
export type {
  ColumnConfig,
  LegacyColumnConfig,
  DatabaseColumn,
  DatabaseValue,
  ConfigurationRequest,
  CacheEntry,
  ValidationResult,
  ConfigurationRepository,
  CacheManager,
  ConfigurationService
} from '@/types/configuration';

// Export errors
export {
  ConfigurationError,
  CacheError
} from '@/types/configuration';

// Export cache manager
export {
  InMemoryCacheManager,
  cacheManager
} from '@/services/cacheManager';

// Export repository
export {
  SupabaseConfigurationRepository,
  configurationRepository
} from '@/services/configurationRepository';

// Export utilities
export {
  ConfigurationMapper
} from '@/utils/configurationMapper';

// Export main service
export {
  DynamicConfigurationService,
  configurationService
} from '@/services/configurationService';