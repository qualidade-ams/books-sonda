/**
 * Componente de monitoramento de performance do sistema de anexos
 * Exibe estatísticas de cache, compressão e uso de recursos
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Progress } from '../../ui/progress';
import { 
  Activity, 
  Database, 
  Zap, 
  HardDrive, 
  Clock, 
  TrendingUp,
  RefreshCw,
  Info
} from 'lucide-react';
import { anexoCache, cacheUtils, type CacheStats } from '@/utils/anexoCache';
import { cn } from '@/lib/utils';

interface PerformanceMetrics {
  cacheStats: CacheStats;
  memoryUsage: string;
  compressionSavings: number;
  averageUploadTime: number;
  totalFilesProcessed: number;
  errorRate: number;
}

interface AnexoPerformanceMonitorProps {
  className?: string;
  showDetails?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function AnexoPerformanceMonitor({
  className,
  showDetails = false,
  autoRefresh = true,
  refreshInterval = 30000 // 30 segundos
}: AnexoPerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Função para coletar métricas
  const collectMetrics = async (): Promise<PerformanceMetrics> => {
    const cacheStats = anexoCache.getStats();
    
    // Simular outras métricas (em uma implementação real, viriam de APIs)
    const compressionSavings = Math.random() * 30 + 10; // 10-40% de economia
    const averageUploadTime = Math.random() * 2000 + 500; // 500-2500ms
    const totalFilesProcessed = Math.floor(Math.random() * 1000 + 100);
    const errorRate = Math.random() * 5; // 0-5% de erro
    
    return {
      cacheStats,
      memoryUsage: formatBytes(cacheStats.memoryUsage),
      compressionSavings,
      averageUploadTime,
      totalFilesProcessed,
      errorRate
    };
  };

  // Atualizar métricas
  const updateMetrics = async () => {
    setIsLoading(true);
    try {
      const newMetrics = await collectMetrics();
      setMetrics(newMetrics);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erro ao coletar métricas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Efeito para atualização inicial e automática
  useEffect(() => {
    updateMetrics();

    if (autoRefresh) {
      const interval = setInterval(updateMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // Função para formatar bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Função para formatar tempo
  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Função para obter cor baseada na performance
  const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }): string => {
    if (value <= thresholds.good) return 'text-green-600';
    if (value <= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading && !metrics) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Performance do Sistema</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Coletando métricas...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Performance do Sistema</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              Atualizado: {lastUpdate.toLocaleTimeString()}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={updateMetrics}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Métricas Principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Cache Hit Rate */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Cache</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-blue-600">
                  {metrics.cacheStats.hitRate.toFixed(1)}%
                </span>
                <Badge variant={metrics.cacheStats.hitRate > 80 ? "default" : "secondary"}>
                  {metrics.cacheStats.hitRate > 80 ? "Ótimo" : "Regular"}
                </Badge>
              </div>
              <Progress value={metrics.cacheStats.hitRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {metrics.cacheStats.totalEntries} entradas
              </p>
            </div>
          </div>

          {/* Compressão */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Compressão</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-green-600">
                  {metrics.compressionSavings.toFixed(1)}%
                </span>
                <Badge variant="default">
                  Economia
                </Badge>
              </div>
              <Progress value={metrics.compressionSavings} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Redução média
              </p>
            </div>
          </div>

          {/* Tempo de Upload */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Upload</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className={cn(
                  "text-2xl font-bold",
                  getPerformanceColor(metrics.averageUploadTime, { good: 1000, warning: 2000 })
                )}>
                  {formatTime(metrics.averageUploadTime)}
                </span>
                <Badge variant={metrics.averageUploadTime < 1000 ? "default" : "secondary"}>
                  {metrics.averageUploadTime < 1000 ? "Rápido" : "Normal"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Tempo médio
              </p>
            </div>
          </div>

          {/* Taxa de Erro */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Confiabilidade</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className={cn(
                  "text-2xl font-bold",
                  getPerformanceColor(metrics.errorRate, { good: 1, warning: 3 })
                )}>
                  {metrics.errorRate.toFixed(1)}%
                </span>
                <Badge variant={metrics.errorRate < 1 ? "default" : "destructive"}>
                  {metrics.errorRate < 1 ? "Excelente" : "Atenção"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Taxa de erro
              </p>
            </div>
          </div>
        </div>

        {/* Detalhes Expandidos */}
        {showDetails && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium flex items-center space-x-2">
              <Info className="h-4 w-4" />
              <span>Detalhes do Sistema</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Estatísticas de Cache */}
              <div className="space-y-3">
                <h5 className="font-medium text-sm">Cache do Sistema</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uso de Memória:</span>
                    <span className="font-medium">{metrics.memoryUsage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total de Hits:</span>
                    <span className="font-medium">{metrics.cacheStats.totalHits.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total de Misses:</span>
                    <span className="font-medium">{metrics.cacheStats.totalMisses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entradas Ativas:</span>
                    <span className="font-medium">{metrics.cacheStats.totalEntries}</span>
                  </div>
                </div>
              </div>

              {/* Estatísticas de Processamento */}
              <div className="space-y-3">
                <h5 className="font-medium text-sm">Processamento</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Arquivos Processados:</span>
                    <span className="font-medium">{metrics.totalFilesProcessed.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Economia de Espaço:</span>
                    <span className="font-medium text-green-600">
                      {metrics.compressionSavings.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tempo Médio:</span>
                    <span className="font-medium">{formatTime(metrics.averageUploadTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxa de Sucesso:</span>
                    <span className="font-medium text-green-600">
                      {(100 - metrics.errorRate).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações de Manutenção */}
            <div className="flex space-x-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  cacheUtils.cleanup();
                  updateMetrics();
                }}
              >
                <Database className="h-4 w-4 mr-2" />
                Limpar Cache
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  anexoCache.clear();
                  updateMetrics();
                }}
              >
                <HardDrive className="h-4 w-4 mr-2" />
                Reset Completo
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}