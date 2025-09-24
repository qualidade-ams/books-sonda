import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Play, 
  Pause, 
  Save,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  Bell
} from 'lucide-react';
import { useAnexoMonitoring, useAnexoMonitoringConfig } from '@/hooks/useAnexoMonitoring';
import { MonitoringJobConfig } from '@/services/anexoMonitoringJobService';

interface AnexoMonitoringConfigProps {
  className?: string;
}

export function AnexoMonitoringConfig({ className }: AnexoMonitoringConfigProps) {
  const {
    status,
    isLoading,
    error,
    startMonitoring,
    stopMonitoring,
    updateConfig,
    toggleMonitoring,
    isStarting,
    isStopping,
    isUpdatingConfig
  } = useAnexoMonitoring();

  const {
    config,
    updateLocalConfig,
    resetConfig
  } = useAnexoMonitoringConfig();

  const handleSaveConfig = () => {
    updateConfig(config);
  };

  const handleResetConfig = () => {
    resetConfig();
  };

  const handleConfigChange = (field: keyof MonitoringJobConfig, value: any) => {
    updateLocalConfig({ [field]: value });
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
            <span>Carregando configurações...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar configurações de monitoramento
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Status do monitoramento */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Configuração de Monitoramento
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant={status?.isRunning ? 'default' : 'secondary'}>
                {status?.isRunning ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ativo
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Inativo
                  </>
                )}
              </Badge>
              <Button
                onClick={toggleMonitoring}
                disabled={isStarting || isStopping}
                size="sm"
              >
                {status?.isRunning ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    {isStopping ? 'Parando...' : 'Parar'}
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    {isStarting ? 'Iniciando...' : 'Iniciar'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {status && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${status.jobs.alertCheck ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm">Verificação de Alertas</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${status.jobs.metrics ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm">Atualização de Métricas</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${status.jobs.report ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm">Relatório Diário</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configurações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Intervalos de Execução
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="alert-interval">
                Verificação de Alertas (minutos)
              </Label>
              <Input
                id="alert-interval"
                type="number"
                min="1"
                max="60"
                value={config.alertCheckInterval}
                onChange={(e) => handleConfigChange('alertCheckInterval', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Frequência de verificação automática de alertas
              </p>
            </div>

            <div>
              <Label htmlFor="metrics-interval">
                Atualização de Métricas (minutos)
              </Label>
              <Input
                id="metrics-interval"
                type="number"
                min="1"
                max="30"
                value={config.metricsUpdateInterval}
                onChange={(e) => handleConfigChange('metricsUpdateInterval', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Frequência de atualização das métricas
              </p>
            </div>

            <div>
              <Label htmlFor="report-time">
                Horário do Relatório Diário
              </Label>
              <Input
                id="report-time"
                type="time"
                value={config.reportGenerationTime}
                onChange={(e) => handleConfigChange('reportGenerationTime', e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Horário para geração do relatório diário
              </p>
            </div>

            <div>
              <Label htmlFor="critical-threshold">
                Limite de Alertas Críticos
              </Label>
              <Input
                id="critical-threshold"
                type="number"
                min="1"
                max="10"
                value={config.criticalAlertThreshold}
                onChange={(e) => handleConfigChange('criticalAlertThreshold', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Número máximo de alertas críticos antes de notificar
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notificações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notificações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-alerts">Alertas por E-mail</Label>
              <p className="text-sm text-muted-foreground">
                Enviar notificações por e-mail para alertas críticos
              </p>
            </div>
            <Switch
              id="email-alerts"
              checked={config.enableEmailAlerts}
              onCheckedChange={(checked) => handleConfigChange('enableEmailAlerts', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          onClick={handleResetConfig}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Restaurar Padrão
        </Button>
        <Button
          onClick={handleSaveConfig}
          disabled={isUpdatingConfig}
        >
          <Save className="h-4 w-4 mr-2" />
          {isUpdatingConfig ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}