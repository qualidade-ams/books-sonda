import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  X,
  Bell,
  BellOff,
  Trash2
} from 'lucide-react';
import { useAnexoAlerts } from '@/hooks/useAnexoMetrics';
import { AnexoAlert } from '@/services/anexoMetricsService';

interface AnexoAlertsMonitorProps {
  className?: string;
  showHeader?: boolean;
  maxHeight?: string;
}

export function AnexoAlertsMonitor({ 
  className, 
  showHeader = true,
  maxHeight = "400px" 
}: AnexoAlertsMonitorProps) {
  const {
    alerts,
    allAlerts,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    clearAlerts,
    resolveAlert
  } = useAnexoAlerts();

  const [showResolved, setShowResolved] = useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Clock className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'storage_limit': return 'Limite de Storage';
      case 'failure_rate': return 'Taxa de Falhas';
      case 'processing_time': return 'Tempo de Processamento';
      case 'upload_failure': return 'Falha de Upload';
      default: return type;
    }
  };

  const displayAlerts = showResolved ? allAlerts : alerts;
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const highCount = alerts.filter(a => a.severity === 'high').length;

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Monitor de Alertas
              {alerts.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {alerts.length}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={showResolved ? () => setShowResolved(false) : () => setShowResolved(true)}
              >
                {showResolved ? 'Ocultar Resolvidos' : 'Mostrar Resolvidos'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={isMonitoring ? stopMonitoring : startMonitoring}
              >
                {isMonitoring ? (
                  <>
                    <BellOff className="h-4 w-4 mr-2" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Monitorar
                  </>
                )}
              </Button>
              {alerts.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAlerts}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
          
          {/* Resumo de alertas */}
          {alerts.length > 0 && (
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              {criticalCount > 0 && (
                <span className="flex items-center text-red-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
                </span>
              )}
              {highCount > 0 && (
                <span className="flex items-center text-orange-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {highCount} alta prioridade
                </span>
              )}
              <span className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                Monitoramento {isMonitoring ? 'ativo' : 'pausado'}
              </span>
            </div>
          )}
        </CardHeader>
      )}
      
      <CardContent>
        {displayAlerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-muted-foreground">
              {showResolved ? 'Nenhum alerta encontrado' : 'Nenhum alerta ativo'}
            </p>
            {!isMonitoring && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={startMonitoring}
                className="mt-2"
              >
                <Bell className="h-4 w-4 mr-2" />
                Iniciar Monitoramento
              </Button>
            )}
          </div>
        ) : (
          <ScrollArea style={{ maxHeight }}>
            <div className="space-y-3">
              {displayAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onResolve={resolveAlert}
                  getSeverityColor={getSeverityColor}
                  getSeverityIcon={getSeverityIcon}
                  getAlertTypeLabel={getAlertTypeLabel}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

interface AlertCardProps {
  alert: AnexoAlert;
  onResolve: (alertId: string) => void;
  getSeverityColor: (severity: string) => string;
  getSeverityIcon: (severity: string) => React.ReactNode;
  getAlertTypeLabel: (type: string) => string;
}

function AlertCard({ 
  alert, 
  onResolve, 
  getSeverityColor, 
  getSeverityIcon, 
  getAlertTypeLabel 
}: AlertCardProps) {
  return (
    <div className={`p-4 border rounded-lg ${alert.resolved ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="mt-0.5">
            {getSeverityIcon(alert.severity)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <Badge variant={getSeverityColor(alert.severity) as any}>
                {alert.severity}
              </Badge>
              <Badge variant="outline">
                {getAlertTypeLabel(alert.type)}
              </Badge>
              {alert.resolved && (
                <Badge variant="secondary">
                  Resolvido
                </Badge>
              )}
            </div>
            <p className="font-medium text-sm mb-1">{alert.message}</p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                {new Date(alert.timestamp).toLocaleString('pt-BR')}
              </p>
              {alert.empresa_nome && (
                <p>Empresa: {alert.empresa_nome}</p>
              )}
            </div>
          </div>
        </div>
        
        {!alert.resolved && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onResolve(alert.id)}
            className="ml-2"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}