/**
 * Gerenciador de mecanismos de fallback para o sistema de configuração dinâmica
 * Implementa estratégias de fallback com valores padrão hardcoded
 */

import type { ColumnConfig, LegacyColumnConfig, ConfigurationRequest } from '@/types/configuration';

export enum FallbackReason {
  DATABASE_ERROR = 'database_error',
  EMPTY_RESULT = 'empty_result',
  VALIDATION_ERROR = 'validation_error',
  CACHE_ERROR = 'cache_error',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

export interface FallbackContext {
  reason: FallbackReason;
  originalError?: Error;
  params?: ConfigurationRequest;
  timestamp: Date;
  attemptedSources: string[];
}

/**
 * Classe principal para gerenciamento de fallback
 */
export class FallbackManager {
  
  /**
   * Configurações padrão para diferentes contextos de uso
   */
  private static readonly DEFAULT_CONFIGURATIONS = {
    // Configuração padrão para uso geral (formato ColumnConfig)
    standard: [
      { nome_coluna: 'MERCADORIAS', porcentagem: 70.00 },
      { nome_coluna: 'SERVIÇOS', porcentagem: 30.00 }
    ] as ColumnConfig[],
    
    // Configuração padrão para formato legado (linha 721)
    legacy: [
      { nome: 'MERCADORIAS', percentual: 70 },
      { nome: 'SERVIÇOS', percentual: 30 }
    ] as LegacyColumnConfig[],
    
    // Configurações específicas por contexto de negócio
    'base-manutencao': [
      { nome_coluna: 'MERCADORIAS', porcentagem: 75.00 },
      { nome_coluna: 'SERVIÇOS', porcentagem: 25.00 }
    ] as ColumnConfig[],
    
    'licenca-uso': [
      { nome_coluna: 'MERCADORIAS', porcentagem: 65.00 },
      { nome_coluna: 'SERVIÇOS', porcentagem: 35.00 }
    ] as ColumnConfig[],
    
    // Configuração para segmento industrial
    industrial: [
      { nome_coluna: 'MERCADORIAS', porcentagem: 80.00 },
      { nome_coluna: 'SERVIÇOS', porcentagem: 20.00 }
    ] as ColumnConfig[],
    
    // Configuração para segmento comercial
    comercial: [
      { nome_coluna: 'MERCADORIAS', porcentagem: 60.00 },
      { nome_coluna: 'SERVIÇOS', porcentagem: 40.00 }
    ] as ColumnConfig[]
  };

  /**
   * Obtém configuração de fallback baseada no contexto
   * @param context Contexto do fallback
   * @returns Configuração padrão apropriada
   */
  static getFallbackConfiguration(context: FallbackContext): ColumnConfig[] {
    // Log do uso de fallback para monitoramento
    this.logFallbackUsage(context);
    
    // Determinar qual configuração usar baseada nos parâmetros
    const configKey = this.determineFallbackKey(context.params);
    const fallbackConfig = this.DEFAULT_CONFIGURATIONS[configKey] || this.DEFAULT_CONFIGURATIONS.standard;
    
    console.warn(`🔄 Usando configuração de fallback: ${configKey}`, {
      reason: context.reason,
      params: context.params,
      configCount: fallbackConfig.length
    });
    
    // Retornar cópia da configuração para evitar mutações
    return JSON.parse(JSON.stringify(fallbackConfig));
  }

  /**
   * Obtém configuração de fallback no formato legado
   * @param context Contexto do fallback
   * @returns Configuração padrão no formato legado
   */
  static getLegacyFallbackConfiguration(context: FallbackContext): LegacyColumnConfig[] {
    // Log do uso de fallback
    this.logFallbackUsage(context);
    
    console.warn(`🔄 Usando configuração legada de fallback`, {
      reason: context.reason,
      params: context.params,
      configCount: this.DEFAULT_CONFIGURATIONS.legacy.length
    });
    
    // Retornar cópia da configuração legada
    return JSON.parse(JSON.stringify(this.DEFAULT_CONFIGURATIONS.legacy));
  }

  /**
   * Cria contexto de fallback
   * @param reason Motivo do fallback
   * @param originalError Erro original (opcional)
   * @param params Parâmetros da requisição (opcional)
   * @param attemptedSources Fontes tentadas antes do fallback
   * @returns Contexto estruturado
   */
  static createFallbackContext(
    reason: FallbackReason,
    originalError?: Error,
    params?: ConfigurationRequest,
    attemptedSources: string[] = []
  ): FallbackContext {
    return {
      reason,
      originalError,
      params,
      timestamp: new Date(),
      attemptedSources
    };
  }

  /**
   * Verifica se deve usar fallback baseado no erro
   * @param error Erro a ser analisado
   * @returns true se deve usar fallback
   */
  static shouldUseFallback(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString();
    
    // Padrões que indicam necessidade de fallback
    const fallbackPatterns = [
      /connection/i,
      /timeout/i,
      /network/i,
      /database/i,
      /not found/i,
      /empty/i,
      /invalid/i,
      /failed/i
    ];
    
    return fallbackPatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * Determina a chave de configuração baseada nos parâmetros
   * @param params Parâmetros da requisição
   * @returns Chave da configuração a ser usada
   */
  private static determineFallbackKey(params?: ConfigurationRequest): string {
    if (!params) return 'standard';
    
    // Priorizar por aba específica
    if (params.aba) {
      const abaKey = params.aba.toLowerCase();
      if (this.DEFAULT_CONFIGURATIONS[abaKey]) {
        return abaKey;
      }
    }
    
    // Priorizar por segmento
    if (params.segmento) {
      const segmentoKey = params.segmento.toLowerCase();
      if (this.DEFAULT_CONFIGURATIONS[segmentoKey]) {
        return segmentoKey;
      }
    }
    
    return 'standard';
  }

  /**
   * Registra o uso de fallback para monitoramento
   * @param context Contexto do fallback
   */
  private static logFallbackUsage(context: FallbackContext): void {
    const logData = {
      reason: context.reason,
      timestamp: context.timestamp.toISOString(),
      params: context.params,
      attemptedSources: context.attemptedSources,
      errorMessage: context.originalError?.message
    };
    
    // Log estruturado para monitoramento
    console.warn('⚠️ Sistema usando configuração de fallback:', logData);
    
    // Incrementar métricas de fallback (se sistema de métricas estiver disponível)
    this.incrementFallbackMetrics(context.reason);
  }

  /**
   * Incrementa métricas de uso de fallback
   * @param reason Motivo do fallback
   */
  private static incrementFallbackMetrics(reason: FallbackReason): void {
    // Implementação simples de contadores em memória
    if (typeof globalThis !== 'undefined') {
      if (!globalThis.fallbackMetrics) {
        globalThis.fallbackMetrics = {};
      }
      
      const current = globalThis.fallbackMetrics[reason] || 0;
      globalThis.fallbackMetrics[reason] = current + 1;
    }
  }

  /**
   * Obtém estatísticas de uso de fallback
   * @returns Estatísticas de fallback
   */
  static getFallbackStats(): Record<string, number> {
    if (typeof globalThis !== 'undefined' && globalThis.fallbackMetrics) {
      return { ...globalThis.fallbackMetrics };
    }
    return {};
  }

  /**
   * Limpa estatísticas de fallback
   */
  static clearFallbackStats(): void {
    if (typeof globalThis !== 'undefined') {
      globalThis.fallbackMetrics = {};
    }
  }

  /**
   * Valida se uma configuração de fallback é válida
   * @param config Configuração a ser validada
   * @returns true se válida
   */
  static validateFallbackConfiguration(config: ColumnConfig[]): boolean {
    if (!config || !Array.isArray(config) || config.length === 0) {
      return false;
    }
    
    return config.every(item => 
      item.nome_coluna && 
      typeof item.nome_coluna === 'string' &&
      typeof item.porcentagem === 'number' &&
      item.porcentagem >= 0 &&
      item.porcentagem <= 100
    );
  }

  /**
   * Cria configuração de fallback personalizada
   * @param customConfig Configuração personalizada
   * @param fallbackKey Chave para armazenar a configuração
   */
  static setCustomFallbackConfiguration(customConfig: ColumnConfig[], fallbackKey: string): void {
    if (!this.validateFallbackConfiguration(customConfig)) {
      throw new Error(`Configuração de fallback inválida para chave: ${fallbackKey}`);
    }
    
    // Armazenar configuração personalizada
    (this.DEFAULT_CONFIGURATIONS as any)[fallbackKey] = JSON.parse(JSON.stringify(customConfig));
    
    console.info(`✅ Configuração de fallback personalizada definida para: ${fallbackKey}`, {
      configCount: customConfig.length,
      totalPercentage: customConfig.reduce((sum, item) => sum + item.porcentagem, 0)
    });
  }

  /**
   * Remove configuração de fallback personalizada
   * @param fallbackKey Chave da configuração a ser removida
   */
  static removeCustomFallbackConfiguration(fallbackKey: string): void {
    if (fallbackKey === 'standard' || fallbackKey === 'legacy') {
      throw new Error('Não é possível remover configurações padrão do sistema');
    }
    
    delete (this.DEFAULT_CONFIGURATIONS as any)[fallbackKey];
    console.info(`🗑️ Configuração de fallback removida: ${fallbackKey}`);
  }

  /**
   * Lista todas as configurações de fallback disponíveis
   * @returns Lista de chaves de configuração
   */
  static getAvailableFallbackConfigurations(): string[] {
    return Object.keys(this.DEFAULT_CONFIGURATIONS);
  }
}

/**
 * Extensão global para métricas de fallback
 */
declare global {
  var fallbackMetrics: Record<string, number> | undefined;
}