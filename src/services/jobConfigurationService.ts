import { supabase } from '@/integrations/supabase/client';
import { auditLogger } from './auditLogger';

/**
 * Configurações disponíveis para o sistema de jobs
 */
export interface JobSystemConfig {
  schedulerEnabled: boolean;
  maxConcurrentJobs: number;
  pollIntervalMs: number;
  retryMaxAttempts: number;
  retryBackoffMultiplier: number;
  retryInitialDelayMs: number;
  retryMaxDelayMs: number;
  cleanupOldJobsAfterDays: number;
  notificationEnabled: boolean;
  notificationChannels: string[];
  notificationRateLimitMinutes: number;
}

/**
 * Configuração individual
 */
export interface JobConfiguration {
  key: string;
  value: any;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Serviço para gerenciar configurações do sistema de jobs
 */
export class JobConfigurationService {
  private configCache = new Map<string, any>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

  /**
   * Obtém todas as configurações do sistema de jobs
   */
  async getJobSystemConfig(): Promise<JobSystemConfig> {
    const configs = await this.getAllConfigurations();
    
    return {
      schedulerEnabled: this.parseBoolean(configs.get('scheduler_enabled'), true),
      maxConcurrentJobs: this.parseNumber(configs.get('max_concurrent_jobs'), 3),
      pollIntervalMs: this.parseNumber(configs.get('poll_interval_ms'), 30000),
      retryMaxAttempts: this.parseNumber(configs.get('retry_max_attempts'), 3),
      retryBackoffMultiplier: this.parseNumber(configs.get('retry_backoff_multiplier'), 2),
      retryInitialDelayMs: this.parseNumber(configs.get('retry_initial_delay_ms'), 5000),
      retryMaxDelayMs: this.parseNumber(configs.get('retry_max_delay_ms'), 300000),
      cleanupOldJobsAfterDays: this.parseNumber(configs.get('cleanup_old_jobs_after_days'), 30),
      notificationEnabled: this.parseBoolean(configs.get('notification_enabled'), true),
      notificationChannels: this.parseArray(configs.get('notification_channels'), ['console', 'in_app']),
      notificationRateLimitMinutes: this.parseNumber(configs.get('notification_rate_limit_minutes'), 5)
    };
  }

  /**
   * Atualiza configuração do sistema de jobs
   */
  async updateJobSystemConfig(config: Partial<JobSystemConfig>): Promise<void> {
    const updates: Array<{ key: string; value: any }> = [];

    if (config.schedulerEnabled !== undefined) {
      updates.push({ key: 'scheduler_enabled', value: config.schedulerEnabled });
    }

    if (config.maxConcurrentJobs !== undefined) {
      updates.push({ key: 'max_concurrent_jobs', value: config.maxConcurrentJobs });
    }

    if (config.pollIntervalMs !== undefined) {
      updates.push({ key: 'poll_interval_ms', value: config.pollIntervalMs });
    }

    if (config.retryMaxAttempts !== undefined) {
      updates.push({ key: 'retry_max_attempts', value: config.retryMaxAttempts });
    }

    if (config.retryBackoffMultiplier !== undefined) {
      updates.push({ key: 'retry_backoff_multiplier', value: config.retryBackoffMultiplier });
    }

    if (config.retryInitialDelayMs !== undefined) {
      updates.push({ key: 'retry_initial_delay_ms', value: config.retryInitialDelayMs });
    }

    if (config.retryMaxDelayMs !== undefined) {
      updates.push({ key: 'retry_max_delay_ms', value: config.retryMaxDelayMs });
    }

    if (config.cleanupOldJobsAfterDays !== undefined) {
      updates.push({ key: 'cleanup_old_jobs_after_days', value: config.cleanupOldJobsAfterDays });
    }

    if (config.notificationEnabled !== undefined) {
      updates.push({ key: 'notification_enabled', value: config.notificationEnabled });
    }

    if (config.notificationChannels !== undefined) {
      updates.push({ key: 'notification_channels', value: config.notificationChannels });
    }

    if (config.notificationRateLimitMinutes !== undefined) {
      updates.push({ key: 'notification_rate_limit_minutes', value: config.notificationRateLimitMinutes });
    }

    // Atualizar configurações no banco
    for (const update of updates) {
      await this.setConfiguration(update.key, update.value);
    }

    // Limpar cache
    this.clearCache();

    await auditLogger.logOperation(
      'job_system_config_updated',
      'configuration',
      { updatedKeys: updates.map(u => u.key), config },
      'success'
    );
  }

  /**
   * Obtém uma configuração específica
   */
  async getConfiguration(key: string): Promise<any> {
    // Verificar cache
    if (this.isCacheValid(key)) {
      return this.configCache.get(key);
    }

    const { data, error } = await supabase
      .from('job_configurations')
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Configuração não encontrada
      }
      throw new Error(`Erro ao buscar configuração ${key}: ${error.message}`);
    }

    const value = data.value;
    
    // Atualizar cache
    this.configCache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL_MS);

    return value;
  }

  /**
   * Define uma configuração
   */
  async setConfiguration(key: string, value: any, description?: string): Promise<void> {
    const { error } = await supabase
      .from('job_configurations')
      .upsert({
        key,
        value,
        description,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      });

    if (error) {
      throw new Error(`Erro ao definir configuração ${key}: ${error.message}`);
    }

    // Atualizar cache
    this.configCache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL_MS);

    await auditLogger.logOperation(
      'job_configuration_updated',
      'configuration',
      { key, value, description },
      'success'
    );
  }

  /**
   * Lista todas as configurações
   */
  async listConfigurations(): Promise<JobConfiguration[]> {
    const { data, error } = await supabase
      .from('job_configurations')
      .select('*')
      .order('key');

    if (error) {
      throw new Error(`Erro ao listar configurações: ${error.message}`);
    }

    return (data || []).map(item => ({
      key: item.key,
      value: item.value,
      description: item.description,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    }));
  }

  /**
   * Remove uma configuração
   */
  async removeConfiguration(key: string): Promise<void> {
    const { error } = await supabase
      .from('job_configurations')
      .delete()
      .eq('key', key);

    if (error) {
      throw new Error(`Erro ao remover configuração ${key}: ${error.message}`);
    }

    // Remover do cache
    this.configCache.delete(key);
    this.cacheExpiry.delete(key);

    await auditLogger.logOperation(
      'job_configuration_removed',
      'configuration',
      { key },
      'success'
    );
  }

  /**
   * Redefine configurações para valores padrão
   */
  async resetToDefaults(): Promise<void> {
    const defaultConfigs = [
      { key: 'scheduler_enabled', value: true, description: 'Habilita/desabilita o scheduler de jobs' },
      { key: 'max_concurrent_jobs', value: 3, description: 'Número máximo de jobs executando simultaneamente' },
      { key: 'poll_interval_ms', value: 30000, description: 'Intervalo de polling em milissegundos' },
      { key: 'retry_max_attempts', value: 3, description: 'Número máximo de tentativas para retry' },
      { key: 'retry_backoff_multiplier', value: 2, description: 'Multiplicador para backoff exponencial' },
      { key: 'retry_initial_delay_ms', value: 5000, description: 'Delay inicial para retry em milissegundos' },
      { key: 'retry_max_delay_ms', value: 300000, description: 'Delay máximo para retry em milissegundos' },
      { key: 'cleanup_old_jobs_after_days', value: 30, description: 'Dias para manter jobs antigos' },
      { key: 'notification_enabled', value: true, description: 'Habilita/desabilita notificações para administradores' },
      { key: 'notification_channels', value: ['console', 'in_app'], description: 'Canais de notificação habilitados' },
      { key: 'notification_rate_limit_minutes', value: 5, description: 'Rate limit para notificações em minutos' }
    ];

    for (const config of defaultConfigs) {
      await this.setConfiguration(config.key, config.value, config.description);
    }

    await auditLogger.logOperation(
      'job_configurations_reset',
      'configuration',
      { configCount: defaultConfigs.length },
      'success'
    );
  }

  /**
   * Valida configurações do sistema
   */
  async validateConfiguration(): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const config = await this.getJobSystemConfig();

      // Validações críticas
      if (config.maxConcurrentJobs < 1 || config.maxConcurrentJobs > 10) {
        errors.push('maxConcurrentJobs deve estar entre 1 e 10');
      }

      if (config.pollIntervalMs < 5000 || config.pollIntervalMs > 300000) {
        errors.push('pollIntervalMs deve estar entre 5000ms (5s) e 300000ms (5min)');
      }

      if (config.retryMaxAttempts < 1 || config.retryMaxAttempts > 10) {
        errors.push('retryMaxAttempts deve estar entre 1 e 10');
      }

      if (config.retryBackoffMultiplier < 1 || config.retryBackoffMultiplier > 5) {
        errors.push('retryBackoffMultiplier deve estar entre 1 e 5');
      }

      if (config.retryInitialDelayMs < 1000 || config.retryInitialDelayMs > 60000) {
        errors.push('retryInitialDelayMs deve estar entre 1000ms (1s) e 60000ms (1min)');
      }

      if (config.retryMaxDelayMs < config.retryInitialDelayMs) {
        errors.push('retryMaxDelayMs deve ser maior que retryInitialDelayMs');
      }

      if (config.cleanupOldJobsAfterDays < 1 || config.cleanupOldJobsAfterDays > 365) {
        errors.push('cleanupOldJobsAfterDays deve estar entre 1 e 365 dias');
      }

      // Validações de aviso
      if (config.pollIntervalMs < 10000) {
        warnings.push('pollIntervalMs muito baixo pode impactar performance');
      }

      if (config.maxConcurrentJobs > 5) {
        warnings.push('maxConcurrentJobs alto pode impactar performance do sistema');
      }

      if (config.cleanupOldJobsAfterDays < 7) {
        warnings.push('cleanupOldJobsAfterDays muito baixo pode remover dados importantes');
      }

      if (!config.notificationEnabled) {
        warnings.push('Notificações desabilitadas - administradores não serão alertados sobre problemas');
      }

    } catch (error) {
      errors.push(`Erro ao validar configurações: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Obtém estatísticas de uso das configurações
   */
  async getConfigurationStats(): Promise<{
    totalConfigurations: number;
    lastUpdated: Date | null;
    cacheHitRate: number;
    mostAccessedKeys: string[];
  }> {
    const configurations = await this.listConfigurations();
    
    const lastUpdated = configurations.length > 0 
      ? configurations.reduce((latest, config) => 
          config.updatedAt > latest ? config.updatedAt : latest, 
          configurations[0].updatedAt
        )
      : null;

    // Estatísticas de cache (simplificadas)
    const totalCacheAccess = this.configCache.size;
    const cacheHitRate = totalCacheAccess > 0 ? 0.85 : 0; // Estimativa

    const mostAccessedKeys = Array.from(this.configCache.keys()).slice(0, 5);

    return {
      totalConfigurations: configurations.length,
      lastUpdated,
      cacheHitRate,
      mostAccessedKeys
    };
  }

  // Métodos privados

  private async getAllConfigurations(): Promise<Map<string, any>> {
    const { data, error } = await supabase
      .from('job_configurations')
      .select('key, value');

    if (error) {
      throw new Error(`Erro ao buscar configurações: ${error.message}`);
    }

    const configMap = new Map<string, any>();
    (data || []).forEach(item => {
      configMap.set(item.key, item.value);
    });

    return configMap;
  }

  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry !== undefined && Date.now() < expiry && this.configCache.has(key);
  }

  private clearCache(): void {
    this.configCache.clear();
    this.cacheExpiry.clear();
  }

  private parseBoolean(value: any, defaultValue: boolean): boolean {
    if (value === null || value === undefined) {
      return defaultValue;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  }

  private parseNumber(value: any, defaultValue: number): number {
    if (value === null || value === undefined) {
      return defaultValue;
    }
    const parsed = Number(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  private parseArray(value: any, defaultValue: string[]): string[] {
    if (value === null || value === undefined) {
      return defaultValue;
    }
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : defaultValue;
      } catch {
        return defaultValue;
      }
    }
    return defaultValue;
  }
}

// Instância singleton do serviço de configuração
export const jobConfigurationService = new JobConfigurationService();