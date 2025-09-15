import React from 'react';
import { Loader2, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useProgressTracking } from '@/hooks/useRealTimeNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Props para o componente de progresso individual
 */
export interface ProgressIndicatorProps {
  operationId?: string;
  operationName?: string;
  showDetails?: boolean;
  onCancel?: () => void;
  onComplete?: () => void;
  className?: string;
}

/**
 * Componente de indicador de progresso individual
 */
export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  operationId,
  operationName,
  showDetails = true,
  onCancel,
  onComplete,
  className = ""
}) => {
  const {
    progressStatus,
    isTracking,
    progress,
    message,
    estimatedCompletion,
    isCompleted,
    duration,
    remainingTime
  } = useProgressTracking(operationId);

  if (!isTracking && !progressStatus) {
    return null;
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusIcon = () => {
    if (isCompleted) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (isTracking) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = () => {
    if (isCompleted) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Concluído</Badge>;
    } else if (isTracking) {
      return <Badge variant="default" className="bg-blue-100 text-blue-800">Em andamento</Badge>;
    } else {
      return <Badge variant="secondary">Pausado</Badge>;
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span>{operationName || progressStatus?.operation || 'Operação'}</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {onCancel && isTracking && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                <XCircle className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Barra de progresso */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{message}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Detalhes */}
        {showDetails && (
          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Duração: {formatDuration(duration)}</span>
              </div>
              
              {progressStatus?.startTime && (
                <div>
                  Iniciado: {formatDistanceToNow(progressStatus.startTime, { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </div>
              )}
            </div>

            <div className="space-y-1">
              {remainingTime !== undefined && remainingTime > 0 && (
                <div>
                  Restante: {formatDuration(remainingTime)}
                </div>
              )}
              
              {estimatedCompletion && !isCompleted && (
                <div>
                  Conclusão: {formatDistanceToNow(estimatedCompletion, { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dados adicionais */}
        {showDetails && progressStatus?.data && Object.keys(progressStatus.data).length > 0 && (
          <div className="pt-2 border-t">
            <div className="text-xs font-medium mb-1">Detalhes:</div>
            <div className="text-xs text-muted-foreground space-y-1">
              {Object.entries(progressStatus.data).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ações */}
        {isCompleted && onComplete && (
          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={onComplete} className="w-full">
              Fechar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Props para o componente de múltiplos progressos
 */
export interface MultipleProgressIndicatorProps {
  className?: string;
  maxVisible?: number;
  showCompleted?: boolean;
}

/**
 * Componente para exibir múltiplos indicadores de progresso
 */
export const MultipleProgressIndicator: React.FC<MultipleProgressIndicatorProps> = ({
  className = "",
  maxVisible = 3,
  showCompleted = false
}) => {
  // Este componente seria usado para mostrar múltiplas operações em progresso
  // Por simplicidade, vamos focar no componente individual por enquanto
  
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Implementação futura para múltiplos progressos */}
      <div className="text-xs text-muted-foreground text-center py-4">
        Múltiplos indicadores de progresso serão implementados aqui
      </div>
    </div>
  );
};

/**
 * Hook para criar um indicador de progresso simples
 */
export const useSimpleProgress = () => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [message, setMessage] = React.useState('');
  const [operationName, setOperationName] = React.useState('');

  const start = React.useCallback((name: string, initialMessage = 'Iniciando...') => {
    setOperationName(name);
    setMessage(initialMessage);
    setProgress(0);
    setIsVisible(true);
  }, []);

  const update = React.useCallback((newProgress: number, newMessage?: string) => {
    setProgress(Math.max(0, Math.min(100, newProgress)));
    if (newMessage) {
      setMessage(newMessage);
    }
  }, []);

  const complete = React.useCallback((finalMessage = 'Concluído') => {
    setProgress(100);
    setMessage(finalMessage);
    
    // Auto-hide após 2 segundos
    setTimeout(() => {
      setIsVisible(false);
    }, 2000);
  }, []);

  const hide = React.useCallback(() => {
    setIsVisible(false);
  }, []);

  const ProgressComponent = React.useCallback(() => {
    if (!isVisible) return null;

    return (
      <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{operationName}</span>
            <Button variant="ghost" size="sm" onClick={hide}>
              <XCircle className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{message}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>
    );
  }, [isVisible, operationName, message, progress, hide]);

  return {
    start,
    update,
    complete,
    hide,
    isVisible,
    progress,
    message,
    ProgressComponent
  };
};

export default ProgressIndicator;