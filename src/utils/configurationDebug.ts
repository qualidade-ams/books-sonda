/**
 * Utilitários de Debug para Configurações
 * Fornece ferramentas para debugar e diagnosticar problemas
 * Task 9: Create configuration management utilities
 */

import type { 
  ConfigurationRequest, 
  ColumnConfig, 
  LegacyColumnConfig 
} from '@/types/configuration';

/**
 * Interface para log de debug
 */
export interface DebugLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
  source: string;
}

/**
 * Interface para análise de performance
 */
export interface PerformanceAnalysis {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  cacheHit: boolean;
  resultSize: number;
  memoryUsage?: {
    before: number;
    after: number;
    delta: number;
  };
}

/**
 * Classe para debug de configurações
 */
export class ConfigurationDebugger {
  private logs: DebugLog[] = [];
  private performanceData: PerformanceAnalysis[] = [];
  private maxLogs = 1000;
  private isEnabled = process.env.NODE_ENV === 'development';

  /**
   * Habilita ou desabilita debug
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.log('info', `Debug ${enabled ? 'habilitado' : 'desabilitado'}`, {}, 'ConfigurationDebugger');
  }

  /**
   * Adiciona log de debug
   */
  log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any, source = 'Unknown'): void {
    if (!this.isEnabled && level !== 'error') return;

    const logEntry: DebugLog = {
      timestamp: new Date(),
      level,
      message,
      data,
      source
    };

    this.logs.push(logEntry);

    // Manter apenas os últimos logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log no console se habilitado
    if (this.isEnabled) {
      const emoji = this.getEmojiForLevel(level);
      const timestamp = logEntry.timestamp.toISOString();
      console.log(`${emoji} [${timestamp}] [${source}] ${message}`, data || '');
    }
  }

  /**
   * Inicia medição de performance
   */
  startPerformanceTracking(operation: string): string {
    const trackingId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (this.isEnabled) {
      this.log('debug', `Iniciando tracking de performance: ${operation}`, { trackingId }, 'PerformanceTracker');
    }

    return trackingId;
  }

  /**
   * Finaliza medição de performance
   */
  endPerformanceTracking(
    trackingId: string, 
    operation: string, 
    cacheHit: boolean, 
    resultSize: number,
    startTime?: number
  ): PerformanceAnalysis {
    const endTime = Date.now();
    const actualStartTime = startTime || (endTime - 1000); // Fallback se não fornecido
    
    const analysis: PerformanceAnalysis = {
      operation,
      startTime: actualStartTime,
      endTime,
      duration: endTime - actualStartTime,
      cacheHit,
      resultSize
    };

    // Adicionar informações de memória se disponível
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      analysis.memoryUsage = {
        before: 0, // Seria necessário capturar no início
        after: memUsage.heapUsed,
        delta: 0
      };
    }

    this.performanceData.push(analysis);
    
    if (this.isEnabled) {
      this.log('debug', `Performance tracking finalizado: ${operation}`, {
        duration: `${analysis.duration}ms`,
        cacheHit,
        resultSize
      }, 'PerformanceTracker');
    }

    return analysis;
  }

  /**
   * Analisa parâmetros de configuração
   */
  analyzeConfigurationRequest(params: ConfigurationRequest): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
    complexity: 'low' | 'medium' | 'high';
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let complexity: 'low' | 'medium' | 'high' = 'low';

    // Validar parâmetros
    if (!params.tipo) {
      issues.push('Tipo não especificado');
      suggestions.push('Especificar tipo de configuração (ex: percentual)');
    }

    if (!params.regraId && !params.aba) {
      issues.push('Nem regraId nem aba especificados');
      suggestions.push('Especificar pelo menos regraId ou aba para melhor precisão');
      complexity = 'high';
    }

    if (params.regraId && params.aba && params.segmento) {
      complexity = 'medium';
    }

    // Verificar se parâmetros são muito genéricos
    const paramCount = Object.keys(params).filter(key => params[key as keyof ConfigurationRequest]).length;
    if (paramCount === 1) {
      suggestions.push('Considerar adicionar mais parâmetros para configuração mais específica');
    }

    const analysis = {
      isValid: issues.length === 0,
      issues,
      suggestions,
      complexity
    };

    this.log('debug', 'Análise de parâmetros de configuração', {
      params,
      analysis
    }, 'ConfigurationAnalyzer');

    return analysis;
  }

  /**
   * Analisa resultado de configuração
   */
  analyzeConfigurationResult(result: ColumnConfig[] | LegacyColumnConfig[]): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
    statistics: {
      count: number;
      totalPercentage: number;
      averagePercentage: number;
      minPercentage: number;
      maxPercentage: number;
    };
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    if (result.length === 0) {
      issues.push('Nenhuma configuração retornada');
      suggestions.push('Verificar se existem dados no banco para os parâmetros fornecidos');
    }

    // Calcular estatísticas
    const percentages = result.map(item => 
      'porcentagem' in item ? item.porcentagem : item.percentual
    );
    
    const totalPercentage = percentages.reduce((sum, p) => sum + p, 0);
    const averagePercentage = percentages.length > 0 ? totalPercentage / percentages.length : 0;
    const minPercentage = percentages.length > 0 ? Math.min(...percentages) : 0;
    const maxPercentage = percentages.length > 0 ? Math.max(...percentages) : 0;

    // Validações
    if (Math.abs(totalPercentage - 100) > 0.01) {
      issues.push(`Total de percentuais (${totalPercentage.toFixed(2)}%) não soma 100%`);
      suggestions.push('Ajustar percentuais para somar exatamente 100%');
    }

    if (percentages.some(p => p < 0 || p > 100)) {
      issues.push('Percentuais fora do range válido (0-100%)');
      suggestions.push('Verificar dados no banco - percentuais devem estar entre 0 e 100');
    }

    if (percentages.some(p => p === 0)) {
      issues.push('Percentuais com valor zero encontrados');
      suggestions.push('Considerar remover ou ajustar configurações com 0%');
    }

    const analysis = {
      isValid: issues.length === 0,
      issues,
      suggestions,
      statistics: {
        count: result.length,
        totalPercentage,
        averagePercentage,
        minPercentage,
        maxPercentage
      }
    };

    this.log('debug', 'Análise de resultado de configuração', {
      result: result.length > 0 ? `${result.length} itens` : 'vazio',
      analysis
    }, 'ResultAnalyzer');

    return analysis;
  }

  /**
   * Gera relatório de debug
   */
  generateDebugReport(): {
    summary: {
      totalLogs: number;
      errorCount: number;
      warningCount: number;
      performanceTracking: number;
      averageResponseTime: number;
    };
    recentLogs: DebugLog[];
    performanceData: PerformanceAnalysis[];
    recommendations: string[];
  } {
    const errorCount = this.logs.filter(log => log.level === 'error').length;
    const warningCount = this.logs.filter(log => log.level === 'warn').length;
    
    const avgResponseTime = this.performanceData.length > 0 
      ? this.performanceData.reduce((sum, p) => sum + p.duration, 0) / this.performanceData.length
      : 0;

    const recommendations: string[] = [];
    
    if (errorCount > 0) {
      recommendations.push(`${errorCount} erros encontrados - verificar logs detalhados`);
    }
    
    if (avgResponseTime > 1000) {
      recommendations.push('Tempo de resposta alto - considerar otimizações de cache');
    }
    
    if (this.performanceData.filter(p => !p.cacheHit).length > this.performanceData.length * 0.7) {
      recommendations.push('Taxa de cache miss alta - verificar configuração de TTL');
    }

    return {
      summary: {
        totalLogs: this.logs.length,
        errorCount,
        warningCount,
        performanceTracking: this.performanceData.length,
        averageResponseTime: avgResponseTime
      },
      recentLogs: this.logs.slice(-50), // Últimos 50 logs
      performanceData: this.performanceData.slice(-20), // Últimas 20 medições
      recommendations
    };
  }

  /**
   * Limpa logs e dados de performance
   */
  clearDebugData(): void {
    this.logs = [];
    this.performanceData = [];
    this.log('info', 'Dados de debug limpos', {}, 'ConfigurationDebugger');
  }

  /**
   * Exporta logs para análise externa
   */
  exportLogs(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      logs: this.logs,
      performanceData: this.performanceData
    }, null, 2);
  }

  /**
   * Métodos auxiliares privados
   */
  private getEmojiForLevel(level: string): string {
    switch (level) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'info': return 'ℹ️';
      case 'debug': return '🐛';
      default: return '📝';
    }
  }
}

// Exportar instância singleton
export const configurationDebugger = new ConfigurationDebugger();

/**
 * Decorator para tracking automático de performance
 */
export function trackPerformance(operation: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const trackingId = configurationDebugger.startPerformanceTracking(operation);
      const startTime = Date.now();
      
      try {
        const result = await method.apply(this, args);
        const resultSize = Array.isArray(result) ? result.length : 1;
        
        configurationDebugger.endPerformanceTracking(
          trackingId, 
          operation, 
          false, // Assumir cache miss por padrão
          resultSize,
          startTime
        );
        
        return result;
      } catch (error) {
        configurationDebugger.log('error', `Erro em ${operation}`, error, 'PerformanceTracker');
        throw error;
      }
    };

    return descriptor;
  };
}