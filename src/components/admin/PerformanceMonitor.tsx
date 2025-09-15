import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Database, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  RefreshCw,
  BarChart3,
  Zap
} from 'lucide-react';
import { performanceOptimizationService } from '@/services/performanceOptimizationService';
import { cacheManager } from '@/services/cacheManager';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Componente para monitoramento de performance do sistema
 */
export function PerformanceMonitor() {
  const [report, setReport] = useState<any>(null);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    loadPerformanceData();
  }, []);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadPerformanceData();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadPerformanceData = async () => {
    setIsLoading(true);
    try {
      const performanceReport = performanceOptimizationService.generatePerformanceReport();
      const cacheStatistics = cacheManager.getStats();
      
      setReport(performanceReport);
      setCacheStats(cacheStatistics);
    } catch (error) {
      console.error('Erro ao carregar dados de performance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runMaintenance = async () => {
    setIsLoading(true);
    try {
      await performanceOptimizationService.runAutomaticMaintenance();
      await loadPerformanceData();
    } catch (error) {
      console.error('Erro na manutenção:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const preloadData = async () => {
    setIsLoading(true);
    try {
      await performanceOptimizationService.preloadCriticalData();
      await loadPerformanceData();
    } catch (error) {
      console.error('Erro no pré-carregamento:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!report || !cacheStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Carregando dados de performance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com controles */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Monitor de Performance</h2>
          <p className="text-muted-foreground">
            Monitoramento em tempo real do sistema de Client Books
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            {autoRefresh ? 'Pausar' : 'Auto Refresh'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={loadPerformanceData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={preloadData}
            disabled={isLoading}
          >
            <Zap className="h-4 w-4 mr-2" />
            Pré-carregar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={runMaintenance}
            disabled={isLoading}
          >
            <Database className="h-4 w-4 mr-2" />
            Manutenção
          </Button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Consultas</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.summary.totalQueries}</div>
            <p className="text-xs text-muted-foreground">
              {report.summary.totalExecutions} execuções
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {report.summary.overallCacheHitRate.toFixed(1)}%
            </div>
            <Progress 
              value={report.summary.overallCacheHitRate} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {report.summary.averageQueryDuration.toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              por consulta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Erro</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {report.summary.overallErrorRate.toFixed(2)}%
            </div>
            <Badge 
              variant={report.summary.overallErrorRate > 5 ? "destructive" : "secondary"}
              className="mt-1"
            >
              {report.summary.overallErrorRate > 5 ? "Alto" : "Normal"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Recomendações */}
      {report.recommendations.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Recomendações de otimização:</p>
              <ul className="list-disc list-inside space-y-1">
                {report.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="text-sm">{rec}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs com detalhes */}
      <Tabs defaultValue="queries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queries">Consultas</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="issues">Problemas</TabsTrigger>
        </TabsList>

        <TabsContent value="queries" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Top Queries */}
            <Card>
              <CardHeader>
                <CardTitle>Consultas Mais Frequentes</CardTitle>
                <CardDescription>
                  Top 10 consultas por número de execuções
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.topQueries.slice(0, 10).map((query: any, index: number) => (
                    <div key={query.queryName} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {query.queryName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {query.totalExecutions} execuções
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{query.averageDuration.toFixed(0)}ms</p>
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Slowest Queries */}
            <Card>
              <CardHeader>
                <CardTitle>Consultas Mais Lentas</CardTitle>
                <CardDescription>
                  Top 5 consultas por tempo de resposta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.slowestQueries.map((query: any, index: number) => (
                    <div key={query.queryName} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {query.queryName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {query.totalExecutions} execuções
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-orange-600">
                          {query.averageDuration.toFixed(0)}ms
                        </p>
                        <Badge 
                          variant={query.averageDuration > 2000 ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {query.averageDuration > 2000 ? "Crítico" : "Lento"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Cache Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas do Cache</CardTitle>
                <CardDescription>
                  Informações detalhadas sobre o uso do cache
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Entradas Totais</p>
                    <p className="text-2xl font-bold">{cacheStats.totalEntries}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Entradas Válidas</p>
                    <p className="text-2xl font-bold">{cacheStats.validEntries}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Hits</p>
                    <p className="text-2xl font-bold text-green-600">{cacheStats.hits}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Misses</p>
                    <p className="text-2xl font-bold text-red-600">{cacheStats.misses}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-2">Hit Rate</p>
                  <Progress value={cacheStats.hitRate} className="mb-1" />
                  <p className="text-xs text-muted-foreground">
                    {cacheStats.hitRate}% de acertos
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Uso de Memória</p>
                  <p className="text-sm">{(cacheStats.memoryUsage / 1024).toFixed(1)} KB</p>
                </div>
              </CardContent>
            </Card>

            {/* Cache Operations */}
            <Card>
              <CardHeader>
                <CardTitle>Operações do Cache</CardTitle>
                <CardDescription>
                  Histórico de operações realizadas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Sets</p>
                    <p className="text-2xl font-bold">{cacheStats.sets}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Deletes</p>
                    <p className="text-2xl font-bold">{cacheStats.deletes}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Evictions</p>
                    <p className="text-2xl font-bold text-orange-600">{cacheStats.evictions}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Errors</p>
                    <p className="text-2xl font-bold text-red-600">{cacheStats.errors}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium">Idade Média das Entradas</p>
                  <p className="text-sm">{(cacheStats.averageAgeMs / 1000).toFixed(1)}s</p>
                </div>

                <div>
                  <p className="text-sm font-medium">TTL Padrão</p>
                  <p className="text-sm">{cacheStats.defaultTtlSeconds}s</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Consultas com Problemas</CardTitle>
              <CardDescription>
                Consultas que precisam de atenção ou otimização
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report.queriesWithIssues.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">Tudo funcionando bem!</p>
                  <p className="text-muted-foreground">
                    Nenhum problema de performance detectado.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {report.queriesWithIssues.map((query: any) => (
                    <div key={query.queryName} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{query.queryName}</h4>
                        <Badge variant="destructive">
                          {query.optimizationSuggestions.length} problema(s)
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Execuções</p>
                          <p className="font-medium">{query.totalExecutions}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Tempo Médio</p>
                          <p className="font-medium">{query.averageDuration.toFixed(0)}ms</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Última Execução</p>
                          <p className="font-medium">
                            {formatDistanceToNow(query.lastExecution, { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-1">Sugestões:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {query.optimizationSuggestions.map((suggestion: string, index: number) => (
                            <li key={index} className="text-sm text-muted-foreground">
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}