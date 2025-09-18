import { supabase } from '@/integrations/supabase/client';
import { clientBooksCacheService } from './clientBooksCache';
import { cacheManager } from './cacheManager';

/**
 * Serviço de otimização de performance para o sistema de Client Books
 */
export class PerformanceOptimizationService {
  private static instance: PerformanceOptimizationService;
  private performanceMetrics: Map<string, PerformanceMetric> = new Map();
  private queryOptimizations: Map<string, QueryOptimization> = new Map();

  private constructor() {
    this.initializeOptimizations();
  }

  static getInstance(): PerformanceOptimizationService {
    if (!PerformanceOptimizationService.instance) {
      PerformanceOptimizationService.instance = new PerformanceOptimizationService();
    }
    return PerformanceOptimizationService.instance;
  }

  /**
   * Inicializa otimizações padrão
   */
  private initializeOptimizations(): void {
    // Otimizações para consultas de empresas
    this.queryOptimizations.set('empresas_list', {
      cacheKey: 'empresas_ativas',
      ttl: 10 * 60, // 10 minutos
      preloadStrategy: 'eager',
      indexHints: ['idx_empresas_clientes_status_nome'],
      batchSize: 50
    });

    // Otimizações para consultas de clientes
    this.queryOptimizations.set('clientes_by_empresa', {
      cacheKey: 'clientes_empresa',
      ttl: 5 * 60, // 5 minutos
      preloadStrategy: 'lazy',
      indexHints: ['idx_clientes_empresa_status'],
      batchSize: 100
    });

    // Otimizações para histórico
    this.queryOptimizations.set('historico_mensal', {
      cacheKey: 'historico_mes',
      ttl: 30 * 60, // 30 minutos
      preloadStrategy: 'background',
      indexHints: ['idx_historico_disparos_mes_ano'],
      batchSize: 200
    });
  }

  /**
   * Monitora performance de uma consulta
   */
  async monitorQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    options?: {
      enableCache?: boolean;
      cacheKey?: string;
      ttl?: number;
    }
  ): Promise<T> {
    const startTime = performance.now();
    const optimization = this.queryOptimizations.get(queryName);

    try {
      // Tentar cache primeiro se habilitado
      if (options?.enableCache && options.cacheKey) {
        const cached = cacheManager.get<T>(options.cacheKey);
        if (cached) {
          this.recordMetric(queryName, performance.now() - startTime, true);
          return cached;
        }
      }

      // Executar consulta
      const result = await queryFn();
      const duration = performance.now() - startTime;

      // Cachear resultado se configurado
      if (options?.enableCache && options.cacheKey) {
        const ttl = options.ttl || optimization?.ttl || 300;
        cacheManager.set(options.cacheKey, result, ttl);
      }

      // Registrar métrica
      this.recordMetric(queryName, duration, false);

      // Verificar se precisa de otimização
      this.checkOptimizationNeeded(queryName, duration);

      return result;

    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(queryName, duration, false, error as Error);
      throw error;
    }
  }

  /**
   * Registra métrica de performance
   */
  private recordMetric(
    queryName: string,
    duration: number,
    fromCache: boolean,
    error?: Error
  ): void {
    const existing = this.performanceMetrics.get(queryName);

    if (existing) {
      existing.totalExecutions++;
      existing.totalDuration += duration;
      existing.averageDuration = existing.totalDuration / existing.totalExecutions;
      existing.cacheHits += fromCache ? 1 : 0;
      existing.errors += error ? 1 : 0;
      existing.lastExecution = new Date();

      if (duration > existing.maxDuration) {
        existing.maxDuration = duration;
      }

      if (duration < existing.minDuration) {
        existing.minDuration = duration;
      }
    } else {
      this.performanceMetrics.set(queryName, {
        queryName,
        totalExecutions: 1,
        totalDuration: duration,
        averageDuration: duration,
        minDuration: duration,
        maxDuration: duration,
        cacheHits: fromCache ? 1 : 0,
        errors: error ? 1 : 0,
        lastExecution: new Date(),
        optimizationSuggestions: []
      });
    }
  }

  /**
   * Verifica se uma consulta precisa de otimização
   */
  private checkOptimizationNeeded(queryName: string, duration: number): void {
    const metric = this.performanceMetrics.get(queryName);
    if (!metric) return;

    const suggestions: string[] = [];

    // Consulta muito lenta
    if (duration > 2000) { // 2 segundos
      suggestions.push('Consulta muito lenta - considere adicionar índices ou otimizar query');
    }

    // Baixa taxa de cache hit
    const cacheHitRate = metric.cacheHits / metric.totalExecutions;
    if (cacheHitRate < 0.3 && metric.totalExecutions > 10) {
      suggestions.push('Baixa taxa de cache hit - considere aumentar TTL ou melhorar estratégia de cache');
    }

    // Muitos erros
    const errorRate = metric.errors / metric.totalExecutions;
    if (errorRate > 0.1) {
      suggestions.push('Alta taxa de erro - verificar lógica da consulta');
    }

    // Variação alta no tempo de resposta
    const variation = (metric.maxDuration - metric.minDuration) / metric.averageDuration;
    if (variation > 2) {
      suggestions.push('Alta variação no tempo de resposta - possível problema de concorrência');
    }

    if (suggestions.length > 0) {
      metric.optimizationSuggestions = suggestions;
      console.warn(`⚠️ Otimização necessária para ${queryName}:`, suggestions);
    }
  }

  /**
   * Pré-carrega dados críticos
   */
  async preloadCriticalData(): Promise<void> {
    console.info('🚀 Iniciando pré-carregamento de dados críticos...');

    try {
      // Pré-carregar empresas ativas (mais consultadas)
      const empresasAtivas = await this.monitorQuery(
        'preload_empresas_ativas',
        async () => {
          const { data } = await supabase
            .from('empresas_clientes')
            .select('*')
            .eq('status', 'ativo')
            .order('nome_completo');
          return data || [];
        },
        {
          enableCache: true,
          cacheKey: 'empresas_ativas_preload',
          ttl: 15 * 60 // 15 minutos
        }
      );

      // Pré-carregar grupos responsáveis
      const grupos = await this.monitorQuery(
        'preload_grupos',
        async () => {
          const { data } = await supabase
            .from('grupos_responsaveis')
            .select(`
              *,
              emails:grupo_emails(*)
            `)
            .order('nome');
          return data || [];
        },
        {
          enableCache: true,
          cacheKey: 'grupos_responsaveis_preload',
          ttl: 30 * 60 // 30 minutos
        }
      );

      // Pré-carregar estatísticas do mês atual
      const mesAtual = new Date().getMonth() + 1;
      const anoAtual = new Date().getFullYear();

      await this.monitorQuery(
        'preload_stats_mes_atual',
        async () => {
          const { data } = await supabase
            .from('controle_mensal')
            .select(`
              *,
              empresas_clientes(nome_completo, status)
            `)
            .eq('mes', mesAtual)
            .eq('ano', anoAtual);
          return data || [];
        },
        {
          enableCache: true,
          cacheKey: `controle_mensal_${anoAtual}_${mesAtual}`,
          ttl: 10 * 60 // 10 minutos
        }
      );

      console.info('✅ Pré-carregamento concluído com sucesso');

    } catch (error) {
      console.error('❌ Erro no pré-carregamento:', error);
    }
  }

  /**
   * Otimiza consultas baseado em padrões de uso
   */
  async optimizeBasedOnUsage(): Promise<void> {
    const metrics = Array.from(this.performanceMetrics.values());

    // Identificar consultas mais frequentes
    const frequentQueries = metrics
      .filter(m => m.totalExecutions > 50)
      .sort((a, b) => b.totalExecutions - a.totalExecutions)
      .slice(0, 10);

    // Identificar consultas mais lentas
    const slowQueries = metrics
      .filter(m => m.averageDuration > 1000)
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, 5);

    console.info('📊 Análise de performance:', {
      totalQueries: metrics.length,
      frequentQueries: frequentQueries.map(q => ({
        name: q.queryName,
        executions: q.totalExecutions,
        avgDuration: Math.round(q.averageDuration)
      })),
      slowQueries: slowQueries.map(q => ({
        name: q.queryName,
        avgDuration: Math.round(q.averageDuration),
        suggestions: q.optimizationSuggestions
      }))
    });

    // Aplicar otimizações automáticas
    for (const query of frequentQueries) {
      await this.applyAutomaticOptimizations(query);
    }
  }

  /**
   * Aplica otimizações automáticas
   */
  private async applyAutomaticOptimizations(metric: PerformanceMetric): Promise<void> {
    const cacheHitRate = metric.cacheHits / metric.totalExecutions;

    // Se a consulta é frequente mas tem baixo cache hit, aumentar TTL
    if (metric.totalExecutions > 100 && cacheHitRate < 0.5) {
      const optimization = this.queryOptimizations.get(metric.queryName);
      if (optimization) {
        optimization.ttl = Math.min(optimization.ttl * 1.5, 60 * 60); // Máximo 1 hora
        console.info(`🔧 TTL aumentado para ${metric.queryName}: ${optimization.ttl}s`);
      }
    }

    // Se a consulta é lenta, sugerir pré-carregamento
    if (metric.averageDuration > 2000) {
      const optimization = this.queryOptimizations.get(metric.queryName);
      if (optimization && optimization.preloadStrategy === 'lazy') {
        optimization.preloadStrategy = 'eager';
        console.info(`🔧 Estratégia alterada para eager: ${metric.queryName}`);
      }
    }
  }

  /**
   * Limpa cache baseado em padrões de uso
   */
  async intelligentCacheCleanup(): Promise<void> {
    const stats = cacheManager.getStats();

    // Se o cache está muito cheio, limpar entradas menos usadas
    if (stats.totalEntries > stats.maxSize * 0.8) {
      console.info('🧹 Iniciando limpeza inteligente do cache...');

      // Limpar cache de consultas com baixo hit rate
      const metrics = Array.from(this.performanceMetrics.values());
      const lowHitRateQueries = metrics
        .filter(m => {
          const hitRate = m.cacheHits / m.totalExecutions;
          return hitRate < 0.2 && m.totalExecutions > 10;
        })
        .map(m => m.queryName);

      for (const queryName of lowHitRateQueries) {
        cacheManager.invalidatePattern(queryName);
      }

      console.info(`🧹 Limpeza concluída: ${lowHitRateQueries.length} padrões removidos`);
    }
  }

  /**
   * Gera relatório de performance
   */
  generatePerformanceReport(): PerformanceReport {
    const metrics = Array.from(this.performanceMetrics.values());
    const cacheStats = cacheManager.getStats();

    const totalExecutions = metrics.reduce((sum, m) => sum + m.totalExecutions, 0);
    const totalCacheHits = metrics.reduce((sum, m) => sum + m.cacheHits, 0);
    const totalErrors = metrics.reduce((sum, m) => sum + m.errors, 0);
    const avgDuration = metrics.reduce((sum, m) => sum + m.averageDuration, 0) / metrics.length;

    return {
      summary: {
        totalQueries: metrics.length,
        totalExecutions,
        overallCacheHitRate: totalExecutions > 0 ? (totalCacheHits / totalExecutions) * 100 : 0,
        overallErrorRate: totalExecutions > 0 ? (totalErrors / totalExecutions) * 100 : 0,
        averageQueryDuration: avgDuration,
        cacheStats
      },
      topQueries: metrics
        .sort((a, b) => b.totalExecutions - a.totalExecutions)
        .slice(0, 10),
      slowestQueries: metrics
        .sort((a, b) => b.averageDuration - a.averageDuration)
        .slice(0, 5),
      queriesWithIssues: metrics.filter(m => m.optimizationSuggestions.length > 0),
      recommendations: this.generateRecommendations(metrics)
    };
  }

  /**
   * Gera recomendações de otimização
   */
  private generateRecommendations(metrics: PerformanceMetric[]): string[] {
    const recommendations: string[] = [];

    const totalExecutions = metrics.reduce((sum, m) => sum + m.totalExecutions, 0);
    const totalCacheHits = metrics.reduce((sum, m) => sum + m.cacheHits, 0);
    const overallCacheHitRate = totalExecutions > 0 ? (totalCacheHits / totalExecutions) : 0;

    if (overallCacheHitRate < 0.4) {
      recommendations.push('Taxa geral de cache hit baixa - considere revisar estratégias de cache');
    }

    const slowQueries = metrics.filter(m => m.averageDuration > 1500);
    if (slowQueries.length > 0) {
      recommendations.push(`${slowQueries.length} consultas lentas identificadas - revisar índices e otimizações`);
    }

    const errorProneQueries = metrics.filter(m => (m.errors / m.totalExecutions) > 0.05);
    if (errorProneQueries.length > 0) {
      recommendations.push(`${errorProneQueries.length} consultas com alta taxa de erro - revisar lógica`);
    }

    const cacheStats = cacheManager.getStats();
    if (cacheStats.totalEntries > cacheStats.maxSize * 0.9) {
      recommendations.push('Cache próximo do limite - considere aumentar tamanho ou melhorar limpeza');
    }

    return recommendations;
  }

  /**
   * Executa manutenção automática
   */
  async runAutomaticMaintenance(): Promise<void> {
    console.info('🔧 Iniciando manutenção automática de performance...');

    try {
      // Limpeza de cache
      await this.intelligentCacheCleanup();

      // Otimização baseada em uso
      await this.optimizeBasedOnUsage();

      // Limpeza de métricas antigas (manter apenas últimas 1000 execuções por query)
      for (const [queryName, metric] of this.performanceMetrics.entries()) {
        if (metric.totalExecutions > 1000) {
          // Reset parcial das métricas mantendo tendências
          metric.totalExecutions = Math.floor(metric.totalExecutions * 0.7);
          metric.totalDuration = metric.totalDuration * 0.7;
          metric.cacheHits = Math.floor(metric.cacheHits * 0.7);
          metric.errors = Math.floor(metric.errors * 0.7);
        }
      }

      // Refresh das views materializadas no banco
      // TODO: Implementar função RPC refresh_client_books_stats no banco
      // await supabase.rpc('refresh_client_books_stats');

      console.info('✅ Manutenção automática concluída');

    } catch (error) {
      console.error('❌ Erro na manutenção automática:', error);
    }
  }

  /**
   * Obtém métricas de uma consulta específica
   */
  getQueryMetrics(queryName: string): PerformanceMetric | undefined {
    return this.performanceMetrics.get(queryName);
  }

  /**
   * Limpa todas as métricas
   */
  clearMetrics(): void {
    this.performanceMetrics.clear();
  }
}

// Interfaces
interface PerformanceMetric {
  queryName: string;
  totalExecutions: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  cacheHits: number;
  errors: number;
  lastExecution: Date;
  optimizationSuggestions: string[];
}

interface QueryOptimization {
  cacheKey: string;
  ttl: number;
  preloadStrategy: 'eager' | 'lazy' | 'background';
  indexHints: string[];
  batchSize: number;
}

interface PerformanceReport {
  summary: {
    totalQueries: number;
    totalExecutions: number;
    overallCacheHitRate: number;
    overallErrorRate: number;
    averageQueryDuration: number;
    cacheStats: any;
  };
  topQueries: PerformanceMetric[];
  slowestQueries: PerformanceMetric[];
  queriesWithIssues: PerformanceMetric[];
  recommendations: string[];
}

// Instância singleton
export const performanceOptimizationService = PerformanceOptimizationService.getInstance();

// Inicializar manutenção automática
if (typeof window !== 'undefined') {
  // Executar manutenção a cada 30 minutos
  setInterval(() => {
    performanceOptimizationService.runAutomaticMaintenance();
  }, 30 * 60 * 1000);

  // Pré-carregar dados críticos na inicialização
  setTimeout(() => {
    performanceOptimizationService.preloadCriticalData();
  }, 2000);
}