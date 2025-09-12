import type { 
  DatabaseColumn, 
  DatabaseValue, 
  ColumnConfig, 
  LegacyColumnConfig,
  ValidationResult 
} from '@/types/configuration';
import { ConfigurationValidator } from './validation';
import { FallbackManager, FallbackReason } from './fallbackManager';
import { CacheKeyGenerator } from './cacheKeyGenerator';

/**
 * Utility functions for mapping and validating configuration data
 */
export class ConfigurationMapper {
  
  /**
   * Map database columns and values to ColumnConfig format
   * @param columns Database columns
   * @param values Database values
   * @returns Array of ColumnConfig objects
   */
  static mapToColumnConfig(columns: DatabaseColumn[], values: DatabaseValue[]): ColumnConfig[] {
    const result: ColumnConfig[] = [];
    
    // Create a map of column_id to values for efficient lookup
    const valueMap = new Map<string, DatabaseValue[]>();
    values.forEach(value => {
      const existing = valueMap.get(value.coluna_id) || [];
      existing.push(value);
      valueMap.set(value.coluna_id, existing);
    });

    // Map each column to configuration
    columns.forEach(column => {
      const columnValues = valueMap.get(column.id) || [];
      
      if (columnValues.length > 0) {
        // Use the first value if multiple exist (with warning logged)
        if (columnValues.length > 1) {
          console.warn(`⚠️ Multiple values found for column ${column.nome}, using first value`);
        }
        
        const value = columnValues[0];
        result.push({
          nome_coluna: column.nome,
          porcentagem: value.valor
        });
      } else {
        console.warn(`⚠️ No values found for column ${column.nome}`);
      }
    });

    return result;
  }

  /**
   * Map database columns and values to LegacyColumnConfig format (for line 721 usage)
   * @param columns Database columns
   * @param values Database values
   * @returns Array of LegacyColumnConfig objects
   */
  static mapToLegacyColumnConfig(columns: DatabaseColumn[], values: DatabaseValue[]): LegacyColumnConfig[] {
    const columnConfigs = this.mapToColumnConfig(columns, values);
    
    return columnConfigs.map(config => ({
      nome: config.nome_coluna,
      percentual: config.porcentagem
    }));
  }

  /**
   * Validate configuration data using the dedicated validator
   * @param config Array of ColumnConfig objects
   * @returns ValidationResult with validation status and sanitized data
   */
  static validateConfiguration(config: ColumnConfig[]): ValidationResult {
    return ConfigurationValidator.validateConfiguration(config);
  }

  /**
   * Gera chave de cache para requisição de configuração
   * @deprecated Use CacheKeyGenerator.generateKey() instead
   * @param params Parâmetros da requisição de configuração
   * @returns String da chave de cache
   */
  static generateCacheKey(params: {
    regraId?: string;
    aba?: string;
    segmento?: string;
    tipo?: string;
  }): string {
    console.warn('⚠️ Método generateCacheKey está deprecated. Use CacheKeyGenerator.generateKey()');
    return CacheKeyGenerator.generateKey(params);
  }

  /**
   * Create fallback configuration with hardcoded values
   * @deprecated Use FallbackManager.getFallbackConfiguration() instead
   * @returns Default ColumnConfig array
   */
  static createFallbackConfiguration(): ColumnConfig[] {
    console.warn('⚠️ Método createFallbackConfiguration está deprecated. Use FallbackManager.getFallbackConfiguration()');
    
    const fallbackContext = FallbackManager.createFallbackContext(
      FallbackReason.UNKNOWN,
      new Error('Legacy fallback method called'),
      undefined,
      ['legacy-method']
    );
    
    return FallbackManager.getFallbackConfiguration(fallbackContext);
  }

  /**
   * Create fallback configuration in legacy format
   * @deprecated Use FallbackManager.getLegacyFallbackConfiguration() instead
   * @returns Default LegacyColumnConfig array
   */
  static createLegacyFallbackConfiguration(): LegacyColumnConfig[] {
    console.warn('⚠️ Método createLegacyFallbackConfiguration está deprecated. Use FallbackManager.getLegacyFallbackConfiguration()');
    
    const fallbackContext = FallbackManager.createFallbackContext(
      FallbackReason.UNKNOWN,
      new Error('Legacy fallback method called'),
      undefined,
      ['legacy-method']
    );
    
    return FallbackManager.getLegacyFallbackConfiguration(fallbackContext);
  }
}