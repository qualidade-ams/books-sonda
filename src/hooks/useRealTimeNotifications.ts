import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  realTimeNotificationService, 
  type RealTimeEvent, 
  type RealTimeEventType,
  type ProgressStatus 
} from '@/services/realTimeNotificationService';
import { useToast } from '@/hooks/use-toast';

/**
 * Configuração do hook
 */
export interface UseRealTimeNotificationsConfig {
  enableToasts?: boolean;
  toastDuration?: number;
  maxEvents?: number;
  eventTypes?: RealTimeEventType[];
  autoConnect?: boolean;
}

/**
 * Hook para gerenciar notificações em tempo real
 */
export function useRealTimeNotifications(config: UseRealTimeNotificationsConfig = {}) {
  const {
    enableToasts = true,
    toastDuration = 5000,
    maxEvents = 100,
    eventTypes = ['job_status_changed', 'dispatch_completed', 'dispatch_failed', 'system_alert'],
    autoConnect = true
  } = config;

  const { toast } = useToast();
  const [events, setEvents] = useState<RealTimeEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const unsubscribeFunctions = useRef<(() => void)[]>([]);

  // Conectar ao serviço
  const connect = useCallback(async () => {
    try {
      setConnectionError(null);
      
      if (!realTimeNotificationService.isServiceConnected()) {
        await realTimeNotificationService.initialize();
      }

      // Subscrever aos tipos de eventos especificados
      const unsubscribes = eventTypes.map(eventType => 
        realTimeNotificationService.subscribe(eventType, handleEvent)
      );

      unsubscribeFunctions.current = unsubscribes;
      setIsConnected(true);

      if (import.meta.env.DEV) {
        console.log('[useRealTimeNotifications] Conectado com sucesso');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setConnectionError(errorMessage);
      setIsConnected(false);
      
      console.error('[useRealTimeNotifications] Erro ao conectar:', error);
      
      if (enableToasts) {
        toast({
          title: 'Erro de conexão',
          description: 'Falha ao conectar às notificações em tempo real',
          variant: 'destructive',
        });
      }
    }
  }, [eventTypes, enableToasts, toast]);

  // Desconectar do serviço
  const disconnect = useCallback(() => {
    try {
      // Cancelar todas as subscriptions
      unsubscribeFunctions.current.forEach(unsubscribe => unsubscribe());
      unsubscribeFunctions.current = [];
      
      setIsConnected(false);
      setConnectionError(null);
      
      if (import.meta.env.DEV) {
        console.log('[useRealTimeNotifications] Desconectado');
      }

    } catch (error) {
      console.error('[useRealTimeNotifications] Erro ao desconectar:', error);
    }
  }, []);

  // Handler para eventos recebidos
  const handleEvent = useCallback((event: RealTimeEvent) => {
    // Adicionar evento à lista
    setEvents(prevEvents => {
      const newEvents = [event, ...prevEvents];
      return newEvents.slice(0, maxEvents); // Manter apenas os mais recentes
    });

    // Mostrar toast se habilitado
    if (enableToasts) {
      const variant = event.severity === 'error' || event.severity === 'critical' 
        ? 'destructive' 
        : 'default';

      toast({
        title: event.title,
        description: event.message,
        variant,
        duration: toastDuration,
      });
    }

    console.log('[useRealTimeNotifications] Evento recebido:', event);
  }, [enableToasts, maxEvents, toast, toastDuration]);

  // Limpar eventos
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Marcar evento como lido
  const markEventAsRead = useCallback((eventId: string) => {
    setEvents(prevEvents => 
      prevEvents.map(event => 
        event.id === eventId 
          ? { ...event, read: true }
          : event
      )
    );
  }, []);

  // Filtrar eventos por tipo
  const getEventsByType = useCallback((type: RealTimeEventType) => {
    return events.filter(event => event.type === type);
  }, [events]);

  // Filtrar eventos por severidade
  const getEventsBySeverity = useCallback((severity: 'info' | 'warning' | 'error' | 'critical') => {
    return events.filter(event => event.severity === severity);
  }, [events]);

  // Obter eventos não lidos
  const getUnreadEvents = useCallback(() => {
    return events.filter(event => !(event as any).read);
  }, [events]);

  // Obter eventos recentes (última hora)
  const getRecentEvents = useCallback((hours = 1) => {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return events.filter(event => new Date(event.timestamp) > cutoff);
  }, [events]);

  // Conectar automaticamente se habilitado
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup na desmontagem
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Reconectar se a conexão for perdida
  useEffect(() => {
    if (!isConnected && !connectionError && autoConnect) {
      const reconnectTimer = setTimeout(() => {
        console.log('[useRealTimeNotifications] Tentando reconectar...');
        connect();
      }, 5000);

      return () => clearTimeout(reconnectTimer);
    }
  }, [isConnected, connectionError, autoConnect, connect]);

  return {
    // Estado
    events,
    isConnected,
    connectionError,
    
    // Ações
    connect,
    disconnect,
    clearEvents,
    markEventAsRead,
    
    // Filtros e utilitários
    getEventsByType,
    getEventsBySeverity,
    getUnreadEvents,
    getRecentEvents,
    
    // Estatísticas
    totalEvents: events.length,
    unreadCount: getUnreadEvents().length,
    errorCount: getEventsBySeverity('error').length + getEventsBySeverity('critical').length,
    recentCount: getRecentEvents().length,
    
    // Eventos por tipo
    jobEvents: getEventsByType('job_status_changed'),
    dispatchEvents: [...getEventsByType('dispatch_completed'), ...getEventsByType('dispatch_failed')],
    systemAlerts: getEventsByType('system_alert'),
    configEvents: getEventsByType('configuration_changed'),
  };
}

/**
 * Hook específico para tracking de progresso
 */
export function useProgressTracking(operationId?: string) {
  const [progressStatus, setProgressStatus] = useState<ProgressStatus | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Iniciar tracking de uma operação
  const startTracking = useCallback((id: string, operationName: string) => {
    // Parar tracking anterior se existir
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    setIsTracking(true);
    setProgressStatus(null);

    // Iniciar tracking no serviço
    realTimeNotificationService.startProgress(id, operationName);

    // Subscrever a atualizações
    const unsubscribe = realTimeNotificationService.subscribeToProgress(id, (status) => {
      setProgressStatus(status);
      
      // Parar tracking quando completar
      if (status.progress >= 100) {
        setIsTracking(false);
      }
    });

    unsubscribeRef.current = unsubscribe;

    console.log(`[useProgressTracking] Iniciado tracking para ${id}: ${operationName}`);
  }, []);

  // Parar tracking
  const stopTracking = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    setIsTracking(false);
    setProgressStatus(null);
  }, []);

  // Atualizar progresso
  const updateProgress = useCallback((progress: number, message: string, data?: Record<string, any>) => {
    if (operationId && isTracking) {
      realTimeNotificationService.updateProgress(operationId, progress, message, data);
    }
  }, [operationId, isTracking]);

  // Completar operação
  const completeOperation = useCallback((message = 'Concluído') => {
    if (operationId && isTracking) {
      realTimeNotificationService.completeProgress(operationId, message);
    }
  }, [operationId, isTracking]);

  // Falhar operação
  const failOperation = useCallback((error: string) => {
    if (operationId && isTracking) {
      realTimeNotificationService.failProgress(operationId, error);
    }
    setIsTracking(false);
  }, [operationId, isTracking]);

  // Iniciar tracking automaticamente se operationId for fornecido
  useEffect(() => {
    if (operationId && !isTracking) {
      const existingStatus = realTimeNotificationService.getProgressStatus(operationId);
      if (existingStatus) {
        setProgressStatus(existingStatus);
        setIsTracking(existingStatus.progress < 100);
        
        if (existingStatus.progress < 100) {
          const unsubscribe = realTimeNotificationService.subscribeToProgress(operationId, (status) => {
            setProgressStatus(status);
            if (status.progress >= 100) {
              setIsTracking(false);
            }
          });
          unsubscribeRef.current = unsubscribe;
        }
      }
    }
  }, [operationId, isTracking]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return {
    // Estado
    progressStatus,
    isTracking,
    progress: progressStatus?.progress || 0,
    message: progressStatus?.message || '',
    estimatedCompletion: progressStatus?.estimatedCompletion,
    
    // Ações
    startTracking,
    stopTracking,
    updateProgress,
    completeOperation,
    failOperation,
    
    // Utilitários
    isCompleted: progressStatus?.progress === 100,
    duration: progressStatus ? Date.now() - progressStatus.startTime.getTime() : 0,
    remainingTime: progressStatus?.estimatedCompletion 
      ? Math.max(0, progressStatus.estimatedCompletion.getTime() - Date.now())
      : undefined
  };
}