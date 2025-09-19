/**
 * Componente para gerenciamento do job scheduler
 * Interface administrativa para controlar jobs automáticos
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useJobScheduler } from '@/hooks/useJobScheduler';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle,
  Activity,
  Settings,
  Calendar,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface JobSchedulerManagerProps {
  compacto?: boolean;
}

export function JobSchedulerManager({ compacto = false }: JobSchedulerManagerProps) {
  const {
    jobs,
    schedulerStatus,
    estatisticas,
    carregandoJobs,
    executandoJob,
    alterandoJob,
    iniciarScheduler,
    pararScheduler,
    executarJobEspecifico,
    alternarStatusJob,
    recarregarJobs,
    formatarProximaExecucao,
    formatarIntervalo
  } = useJobScheduler();

  const formatarDataHora = (data: Date) => {
    return format(data, 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const obterCorStatus = (enabled: boolean) => {
    return enabled ? 'default' : 'secondary';
  };

  const obterIconeStatus = (enabled: boolean) => {
    return enabled ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-gray-400" />;
  };

  if (compacto) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Job Scheduler
            </CardTitle>
            <Badge variant={schedulerStatus.isRunning ? 'default' : 'secondary'}>
              {schedulerStatus.isRunning ? 'Ativo' : 'Parado'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-blue-500" />
              <span>{schedulerStatus.jobCount} jobs</span>
            </div>
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-green-500" />
              <span>{schedulerStatus.activeJobs} ativos</span>
            </div>
          </div>
          
          {!schedulerStatus.isRunning && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Scheduler parado - jobs não serão executados
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Geral */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Status do Scheduler</p>
                <p className="text-lg font-bold">
                  {schedulerStatus.isRunning ? 'Ativo' : 'Parado'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium">Total de Jobs</p>
                <p className="text-2xl font-bold">{schedulerStatus.jobCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Jobs Ativos</p>
                <p className="text-2xl font-bold">{schedulerStatus.activeJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Taxa de Sucesso</p>
                <p className="text-2xl font-bold">{estatisticas?.taxaSucesso || '0'}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controles do Scheduler */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Controle do Scheduler
          </CardTitle>
          <CardDescription>
            Gerencie o status geral do job scheduler
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Status do Scheduler</p>
              <p className="text-sm text-muted-foreground">
                {schedulerStatus.isRunning 
                  ? 'O scheduler está executando jobs automaticamente'
                  : 'O scheduler está parado - jobs não serão executados'
                }
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={recarregarJobs}
                disabled={carregandoJobs}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${carregandoJobs ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              {schedulerStatus.isRunning ? (
                <Button variant="destructive" onClick={pararScheduler}>
                  <Pause className="h-4 w-4 mr-2" />
                  Parar Scheduler
                </Button>
              ) : (
                <Button onClick={iniciarScheduler}>
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar Scheduler
                </Button>
              )}
            </div>
          </div>

          {estatisticas && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Execuções</p>
                <p className="text-lg font-bold">{estatisticas.totalExecucoes}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Erros</p>
                <p className="text-lg font-bold text-red-500">{estatisticas.totalErros}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Jobs Ativos</p>
                <p className="text-lg font-bold text-green-500">{estatisticas.ativos}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Jobs Inativos</p>
                <p className="text-lg font-bold text-gray-500">{estatisticas.inativos}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Jobs */}
      {jobs && jobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Jobs Configurados
            </CardTitle>
            <CardDescription>
              Gerencie jobs individuais e suas configurações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {obterIconeStatus(job.enabled)}
                        <h3 className="font-medium">{job.name}</h3>
                        <Badge variant={obterCorStatus(job.enabled)}>
                          {job.enabled ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {job.description}
                      </p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Intervalo</p>
                          <p className="font-medium">{formatarIntervalo(job.interval)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Próxima Execução</p>
                          <p className="font-medium">
                            {job.enabled ? formatarProximaExecucao(job) : 'Desabilitado'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Execuções</p>
                          <p className="font-medium">{job.runCount}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Erros</p>
                          <p className="font-medium text-red-500">{job.errorCount}</p>
                        </div>
                      </div>

                      {job.lastRun && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground">
                            Última execução: {formatarDataHora(job.lastRun)}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Switch
                        checked={job.enabled}
                        onCheckedChange={(enabled) => alternarStatusJob(job.id, enabled)}
                        disabled={alterandoJob}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => executarJobEspecifico(job.id)}
                        disabled={executandoJob || !schedulerStatus.isRunning}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas */}
      {!schedulerStatus.isRunning && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Atenção:</strong> O job scheduler está parado. 
            Jobs automáticos como verificação de vigências não serão executados.
            Clique em "Iniciar Scheduler" para ativar os jobs automáticos.
          </AlertDescription>
        </Alert>
      )}

      {estatisticas && estatisticas.totalErros > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Foram detectados {estatisticas.totalErros} erro(s) na execução de jobs. 
            Verifique os logs do sistema para mais detalhes.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}