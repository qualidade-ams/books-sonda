import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Square, 
  RefreshCw, 
  Clock, 
  FileX, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { useAnexoCleanupJob } from '@/hooks/useAnexoCleanupJob';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export const AnexoCleanupManager: React.FC = () => {
  const {
    isRunning,
    isScheduled,
    stats,
    startJob,
    stopJob,
    executeManualCleanup,
    getJobConfig,
    getNextExecution,
    isExecuting,
    lastResult,
    error
  } = useAnexoCleanupJob();

  const jobConfig = getJobConfig();
  const nextExecution = getNextExecution();

  const handleManualCleanup = async () => {
    try {
      const result = await executeManualCleanup();
      
      if (result.erros.length > 0) {
        toast.warning(`Limpeza concluída com avisos: ${result.arquivosRemovidos} arquivos removidos`, {
          description: `Erros: ${result.erros.join(', ')}`
        });
      } else {
        toast.success(`Limpeza concluída: ${result.arquivosRemovidos} arquivos removidos`, {
          description: `Tempo de execução: ${result.tempoExecucao}ms`
        });
      }
    } catch (err) {
      toast.error('Erro na limpeza manual', {
        description: err instanceof Error ? err.message : 'Erro desconhecido'
      });
    }
  };

  const handleStartJob = () => {
    startJob();
    toast.success('Job de limpeza iniciado');
  };

  const handleStopJob = () => {
    stopJob();
    toast.info('Job de limpeza parado');
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Gerenciador de Limpeza de Anexos
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Monitore e controle a limpeza automática de anexos temporários expirados
        </p>
      </div>

      {/* Alertas de erro */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Status do Job */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Status do Job
          </CardTitle>
          <CardDescription>
            Estado atual do job de limpeza automática
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">Status:</span>
              <Badge variant={isScheduled ? "default" : "secondary"}>
                {isScheduled ? "Agendado" : "Parado"}
              </Badge>
              {isRunning && (
                <Badge variant="outline" className="text-blue-600">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Executando
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleStartJob}
                disabled={isScheduled || isExecuting}
                size="sm"
                variant="outline"
              >
                <Play className="h-4 w-4 mr-1" />
                Iniciar
              </Button>
              <Button
                onClick={handleStopJob}
                disabled={!isScheduled || isExecuting}
                size="sm"
                variant="outline"
              >
                <Square className="h-4 w-4 mr-1" />
                Parar
              </Button>
              <Button
                onClick={handleManualCleanup}
                disabled={isExecuting}
                size="sm"
              >
                {isExecuting ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <FileX className="h-4 w-4 mr-1" />
                )}
                Executar Agora
              </Button>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Intervalo:</span>
              <p className="font-medium">
                {jobConfig.interval ? `${jobConfig.interval / (60 * 60 * 1000)}h` : 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Próxima Execução:</span>
              <p className="font-medium">
                {nextExecution ? (
                  formatDistanceToNow(new Date(nextExecution), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })
                ) : 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Total de Execuções:</span>
              <p className="font-medium">{stats.totalExecucoes}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Última Execução:</span>
              <p className="font-medium">
                {stats.ultimaExecucao ? (
                  formatDistanceToNow(new Date(stats.ultimaExecucao), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })
                ) : 'Nunca'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Estatísticas de Limpeza
          </CardTitle>
          <CardDescription>
            Métricas de performance e eficiência do job
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.totalArquivosLimpos}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total de Arquivos Removidos
              </div>
            </div>
            
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.mediaArquivosPorExecucao.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Média por Execução
              </div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {stats.totalExecucoes}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Execuções Realizadas
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Último Resultado */}
      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {lastResult.erros.length > 0 ? (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              Última Execução Manual
            </CardTitle>
            <CardDescription>
              Resultado da última limpeza executada manualmente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Arquivos Removidos:</span>
                <p className="font-medium text-lg">{lastResult.arquivosRemovidos}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Tempo de Execução:</span>
                <p className="font-medium">{formatDuration(lastResult.tempoExecucao)}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Data/Hora:</span>
                <p className="font-medium">
                  {new Date(lastResult.dataExecucao).toLocaleString('pt-BR')}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Status:</span>
                <Badge variant={lastResult.erros.length > 0 ? "destructive" : "default"}>
                  {lastResult.erros.length > 0 ? "Com Erros" : "Sucesso"}
                </Badge>
              </div>
            </div>

            {lastResult.erros.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium text-red-600 dark:text-red-400 mb-2">
                    Erros Encontrados:
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    {lastResult.erros.map((erro, index) => (
                      <li key={index}>{erro}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Informações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Informações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p>• O job de limpeza remove automaticamente anexos temporários expirados (mais de 24 horas)</p>
          <p>• A execução automática ocorre diariamente quando o job está ativo</p>
          <p>• Você pode executar a limpeza manualmente a qualquer momento</p>
          <p>• Todas as operações são registradas nos logs de auditoria do sistema</p>
          <p>• Arquivos são removidos tanto do storage quanto do banco de dados</p>
        </CardContent>
      </Card>
    </div>
  );
};