/**
 * Serviço de Administração de Configurações
 * Fornece utilitários para gerenciar configurações dinâmicas
 * Task 9: Create configuration management utilities
 */

import { DynamicConfigurationService } from './configurationService';
import { ConfigurationValidator } from '@/utils/validation';
import { FallbackManager, FallbackReason } from '@/utils/fallbackManager';
import { ConfigurationErrorHandler } from '@/utils/errorHandler';
import { configurationLogger, LogCategory } from '@/utils/configurationLogger';
import type { 
  ConfigurationRequest, 
  ColumnConfig, 
  LegacyColumnConfig,
  ValidationResult 
} from '@/types/configuration';

/**
 * Interface para estatísticas de configuração
 */
export interface ConfigurationStats {
  totalConfigurations: number;
  activeConfigurations: number;
  fallbackUsage: number;
  cacheHitRate: number;
  lastUpdated: Date;
  healthStatus: 'healthy' | 'warning' | 'critical';
}

/**
 * Interface para validação de configuração
 */
export interface ConfigurationValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  configurationCount: number;
  totalPercentage: number;
}

/**
 * Interface para debug de configuração
 */
export interface ConfigurationDebugInfo {
  request: ConfigurationRequest;
  cacheKey: string;
  cacheHit: boolean;
  databaseQuery: boolean;
  fallbackUsed: boolean;
  fallbackReason?: FallbackReason;
  executionTime: number;
  result: ColumnConfig[] | LegacyColumnConfig[];
  timestamp: Date;
}

/**
 * Serviço de Administração de Configurações
 * Fornece ferramentas para gerenciar e debugar configurações dinâmicas
 */
export class ConfigurationAdminService {
  private configurationService: DynamicConfigurationService;
  private validator: ConfigurationValidator;
  private errorHandler: ConfigurationErrorHandler;

  constructor() {
    this.configurationService = new DynamicConfigurationService();
    this.validator = new ConfigurationValidator();
    this.errorHandler = new ConfigurationErrorHandler();
  }

  /**
   * Valida uma configuração específica
   */
  async validateConfiguration(params: ConfigurationRequest): Promise<ConfigurationValidationReport> {
    try {
      configurationLogger.info(LogCategory.CONFIGURATION, 'Iniciando validação de configuração', { params });

      const startTime = Date.now();
      const configuration = await this.configurationService.getColumnConfiguration(params);
      const executionTime = Date.now() - startTime;

      configurationLogger.info(LogCategory.CONFIGURATION, `Configuração obtida em ${executionTime}ms`, { 
        configCount: configuration.length 
      });

      const validation = ConfigurationValidator.validateConfiguration(configuration);
      const totalPercentage = configuration.reduce((sum, col) => sum + col.porcentagem, 0);

      const report: ConfigurationValidationReport = {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: [],
        suggestions: [],
        configurationCount: configuration.length,
        totalPercentage
      };

      // Adicionar warnings e sugestões
      if (Math.abs(totalPercentage - 100) > 0.01) {
        report.warnings.push(`Total de percentuais (${totalPercentage.toFixed(2)}%) não soma 100%`);
        report.suggestions.push('Ajuste os percentuais para somar exatamente 100%');
      }

      if (configuration.length === 0) {
        report.warnings.push('Nenhuma configuração encontrada - usando fallback');
        report.suggestions.push('Verifique se existem configurações no banco para os parâmetros fornecidos');
      }

      if (configuration.length === 1) {
        report.warnings.push('Apenas uma configuração encontrada');
        report.suggestions.push('Considere adicionar mais colunas para maior flexibilidade');
      }

      configurationLogger.info(LogCategory.CONFIGURATION, 'Validação concluída', {
        isValid: report.isValid,
        errors: report.errors.length,
        warnings: report.warnings.length,
        suggestions: report.suggestions.length
      });

      return report;
    } catch (error) {
      configurationLogger.error(LogCategory.CONFIGURATION, 'Erro durante validação', { params }, error as Error);
      return {
        isValid: false,
        errors: [`Erro durante validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`],
        warnings: [],
        suggestions: ['Verifique a conectividade com o banco de dados'],
        configurationCount: 0,
        totalPercentage: 0
      };
    }
  }

  /**
   * Obtém estatísticas gerais do sistema de configuração
   */
  async getConfigurationStats(): Promise<ConfigurationStats> {
    try {
      configurationLogger.info(LogCategory.CONFIGURATION, 'Coletando estatísticas de configuração');

      const serviceStats = this.configurationService.getServiceStats();
      const fallbackStats = FallbackManager.getFallbackStats();
      
      // Testar conectividade
      const isHealthy = await this.configurationService.testDatabaseConnection();
      
      const stats: ConfigurationStats = {
        totalConfigurations: serviceStats.cache?.totalEntries || 0,
        activeConfigurations: serviceStats.cache?.validEntries || 0,
        fallbackUsage: fallbackStats.totalFallbacks,
        cacheHitRate: serviceStats.cache?.hitRate || 0,
        lastUpdated: new Date(),
        healthStatus: this.determineHealthStatus(isHealthy, fallbackStats.totalFallbacks, serviceStats.cache?.hitRate || 0)
      };

      configurationLogger.info(LogCategory.CONFIGURATION, 'Estatísticas coletadas', stats);
      return stats;
    } catch (error) {
      configurationLogger.error(LogCategory.CONFIGURATION, 'Erro ao coletar estatísticas', {}, error as Error);
      return {
        totalConfigurations: 0,
        activeConfigurations: 0,
        fallbackUsage: 0,
        cacheHitRate: 0,
        lastUpdated: new Date(),
        healthStatus: 'critical'
      };
    }
  }

  /**
   * Executa debug detalhado de uma configuração
   */
  async debugConfiguration(params: ConfigurationRequest): Promise<ConfigurationDebugInfo> {
    configurationLogger.info(LogCategory.CONFIGURATION, 'Iniciando debug de configuração', { params });

    const startTime = Date.now();
    let cacheHit = false;
    let databaseQuery = false;
    let fallbackUsed = false;
    let fallbackReason: FallbackReason | undefined;

    try {
      // Gerar chave de cache para debug
      const cacheKey = this.generateDebugCacheKey(params);
      configurationLogger.debug(LogCategory.CONFIGURATION, 'Chave de cache gerada', { cacheKey });

      // Verificar cache primeiro
      const cacheManager = (this.configurationService as any).cacheManager;
      const cachedResult = cacheManager?.get(cacheKey);
      
      if (cachedResult) {
        cacheHit = true;
        configurationLogger.debug(LogCategory.CONFIGURATION, 'Resultado encontrado no cache');
      } else {
        configurationLogger.debug(LogCategory.CONFIGURATION, 'Cache miss - consultando banco de dados');
        databaseQuery = true;
      }

      // Obter configuração
      const result = await this.configurationService.getColumnConfiguration(params);
      const executionTime = Date.now() - startTime;

      // Verificar se fallback foi usado
      const fallbackStats = FallbackManager.getFallbackStats();
      const initialFallbacks = fallbackStats.totalFallbacks;
      
      // Fazer uma segunda chamada para detectar se houve fallback
      const testResult = await this.configurationService.getColumnConfiguration(params);
      const finalFallbacks = FallbackManager.getFallbackStats().totalFallbacks;
      
      if (finalFallbacks > initialFallbacks) {
        fallbackUsed = true;
        fallbackReason = FallbackReason.DATABASE_ERROR; // Assumir erro de banco como mais comum
        configurationLogger.debug(LogCategory.CONFIGURATION, 'Fallback foi utilizado');
      }

      const debugInfo: ConfigurationDebugInfo = {
        request: params,
        cacheKey,
        cacheHit,
        databaseQuery,
        fallbackUsed,
        fallbackReason,
        executionTime,
        result,
        timestamp: new Date()
      };

      configurationLogger.info(LogCategory.CONFIGURATION, 'Debug concluído', {
        executionTime: `${executionTime}ms`,
        cacheHit,
        databaseQuery,
        fallbackUsed,
        resultCount: result.length
      });

      return debugInfo;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      configurationLogger.error(LogCategory.CONFIGURATION, 'Erro durante debug', { params }, error as Error);
      
      return {
        request: params,
        cacheKey: 'error',
        cacheHit: false,
        databaseQuery: true,
        fallbackUsed: true,
        fallbackReason: FallbackReason.DATABASE_ERROR,
        executionTime,
        result: [],
        timestamp: new Date()
      };
    }
  }

  /**
   * Limpa o cache de configurações
   */
  async clearConfigurationCache(): Promise<{ success: boolean; message: string }> {
    try {
      configurationLogger.info(LogCategory.CONFIGURATION, 'Limpando cache de configurações');
      
      const cacheManager = (this.configurationService as any).cacheManager;
      if (cacheManager && typeof cacheManager.clear === 'function') {
        cacheManager.clear();
        configurationLogger.info(LogCategory.CONFIGURATION, 'Cache limpo com sucesso');
        return {
          success: true,
          message: 'Cache de configurações limpo com sucesso'
        };
      } else {
        configurationLogger.warn(LogCategory.CONFIGURATION, 'Cache manager não encontrado ou não suporta limpeza');
        return {
          success: false,
          message: 'Cache manager não disponível'
        };
      }
    } catch (error) {
      configurationLogger.error(LogCategory.CONFIGURATION, 'Erro ao limpar cache', {}, error as Error);
      return {
        success: false,
        message: `Erro ao limpar cache: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  /**
   * Recarrega uma configuração específica
   */
  async reloadConfiguration(params: ConfigurationRequest): Promise<{ success: boolean; message: string; configuration?: ColumnConfig[] }> {
    try {
      configurationLogger.info(LogCategory.CONFIGURATION, 'Recarregando configuração', { params });

      // Limpar cache específico (se possível)
      const cacheKey = this.generateDebugCacheKey(params);
      const cacheManager = (this.configurationService as any).cacheManager;
      
      if (cacheManager && typeof cacheManager.delete === 'function') {
        cacheManager.delete(cacheKey);
        configurationLogger.debug(LogCategory.CONFIGURATION, 'Cache específico removido');
      }

      // Recarregar configuração
      const configuration = await this.configurationService.getColumnConfiguration(params);
      
      configurationLogger.info(LogCategory.CONFIGURATION, `Configuração recarregada: ${configuration.length} itens`);
      
      return {
        success: true,
        message: `Configuração recarregada com sucesso (${configuration.length} itens)`,
        configuration
      };
    } catch (error) {
      configurationLogger.error(LogCategory.CONFIGURATION, 'Erro ao recarregar configuração', { params }, error as Error);
      return {
        success: false,
        message: `Erro ao recarregar configuração: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  /**
   * Valida o sistema de fallback
   */
  async validateFallbackSystem(): Promise<ValidationResult & { availableConfigurations: string[] }> {
    configurationLogger.info(LogCategory.CONFIGURATION, 'Validando sistema de fallback');
    const result = await this.configurationService.validateFallbackSystem();
    
    // Adaptar o resultado para incluir as propriedades obrigatórias do ValidationResult
    return {
      isValid: result.isValid,
      errors: result.errors,
      warnings: [], // Sistema de fallback não gera warnings
      sanitizedConfig: [], // Sistema de fallback não retorna configuração sanitizada
      availableConfigurations: result.availableConfigurations
    };
  }

  /**
   * Gera relatório de saúde do sistema
   */
  async generateHealthReport(): Promise<{
    overall: 'healthy' | 'warning' | 'critical';
    database: boolean;
    cache: { status: string; hitRate: number };
    fallback: { status: string; usage: number };
    recommendations: string[];
    timestamp: Date;
  }> {
    try {
      configurationLogger.info(LogCategory.CONFIGURATION, 'Gerando relatório de saúde');

      const stats = await this.getConfigurationStats();
      const dbHealth = await this.configurationService.testDatabaseConnection();
      const fallbackValidation = await this.validateFallbackSystem();
      
      const recommendations: string[] = [];
      
      if (!dbHealth) {
        recommendations.push('Verificar conectividade com banco de dados');
      }
      
      if (stats.cacheHitRate < 0.7) {
        recommendations.push('Taxa de hit do cache baixa - considerar ajustar TTL');
      }
      
      if (stats.fallbackUsage > 10) {
        recommendations.push('Alto uso de fallback - investigar problemas de configuração');
      }
      
      if (!fallbackValidation.isValid) {
        recommendations.push('Sistema de fallback com problemas - verificar configurações padrão');
      }

      const report = {
        overall: stats.healthStatus,
        database: dbHealth,
        cache: {
          status: stats.cacheHitRate > 0.7 ? 'good' : 'needs_attention',
          hitRate: stats.cacheHitRate
        },
        fallback: {
          status: stats.fallbackUsage < 10 ? 'good' : 'high_usage',
          usage: stats.fallbackUsage
        },
        recommendations,
        timestamp: new Date()
      };

      configurationLogger.info(LogCategory.CONFIGURATION, 'Relatório de saúde gerado', report);
      return report;
    } catch (error) {
      configurationLogger.error(LogCategory.CONFIGURATION, 'Erro ao gerar relatório de saúde', {}, error as Error);
      return {
        overall: 'critical',
        database: false,
        cache: { status: 'error', hitRate: 0 },
        fallback: { status: 'error', usage: 0 },
        recommendations: ['Sistema com falha crítica - verificar logs'],
        timestamp: new Date()
      };
    }
  }

  /**
   * Executa manutenção completa do sistema
   */
  async performSystemMaintenance(): Promise<{
    cacheCleared: boolean;
    fallbackStatsCleared: boolean;
    healthCheck: boolean;
    recommendations: string[];
    timestamp: Date;
  }> {
    try {
      configurationLogger.info(LogCategory.CONFIGURATION, 'Iniciando manutenção do sistema');

      // Limpar cache
      const cacheResult = await this.clearConfigurationCache();
      
      // Limpar estatísticas de fallback
      this.configurationService.clearFallbackStats();
      
      // Executar verificação de saúde
      const healthCheck = await this.configurationService.testDatabaseConnection();
      
      // Gerar recomendações
      const recommendations: string[] = [];
      if (!cacheResult.success) {
        recommendations.push('Falha ao limpar cache - verificar configuração');
      }
      if (!healthCheck) {
        recommendations.push('Problemas de conectividade detectados');
      }
      
      const result = {
        cacheCleared: cacheResult.success,
        fallbackStatsCleared: true,
        healthCheck,
        recommendations,
        timestamp: new Date()
      };

      configurationLogger.info(LogCategory.CONFIGURATION, 'Manutenção do sistema concluída', result);
      return result;
    } catch (error) {
      configurationLogger.error(LogCategory.CONFIGURATION, 'Erro durante manutenção do sistema', {}, error as Error);
      return {
        cacheCleared: false,
        fallbackStatsCleared: false,
        healthCheck: false,
        recommendations: ['Falha crítica durante manutenção - verificar logs'],
        timestamp: new Date()
      };
    }
  }

  /**
   * Métodos auxiliares privados
   */
  private determineHealthStatus(dbHealthy: boolean, fallbackUsage: number, cacheHitRate: number): 'healthy' | 'warning' | 'critical' {
    if (!dbHealthy) return 'critical';
    if (fallbackUsage > 20 || cacheHitRate < 0.5) return 'critical';
    if (fallbackUsage > 10 || cacheHitRate < 0.7) return 'warning';
    return 'healthy';
  }

  private generateDebugCacheKey(params: ConfigurationRequest): string {
    return `debug:${params.regraId || 'no-regra'}:${params.aba || 'no-aba'}:${params.segmento || 'no-segmento'}:${params.tipo || 'percentual'}`;
  }
}

// Exportar instância singleton
export const configurationAdminService = new ConfigurationAdminService();