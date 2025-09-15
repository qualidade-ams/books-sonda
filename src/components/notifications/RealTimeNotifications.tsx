import React, { useState } from 'react';
import { Bell, X, AlertCircle, CheckCircle, AlertTriangle, Info, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRealTimeNotifications } from '@/hooks/useRealTimeNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { RealTimeEvent } from '@/services/realTimeNotificationService';

/**
 * Ícone baseado na severidade do evento
 */
const SeverityIcon: React.FC<{ severity: RealTimeEvent['severity']; className?: string }> = ({ 
  severity, 
  className = "h-4 w-4" 
}) => {
  switch (severity) {
    case 'critical':
      return <AlertCircle className={`${className} text-red-600`} />;
    case 'error':
      return <AlertCircle className={`${className} text-red-500`} />;
    case 'warning':
      return <AlertTriangle className={`${className} text-yellow-500`} />;
    case 'info':
    default:
      return <Info className={`${className} text-blue-500`} />;
  }
};

/**
 * Badge de severidade
 */
const SeverityBadge: React.FC<{ severity: RealTimeEvent['severity'] }> = ({ severity }) => {
  const variants = {
    critical: 'destructive',
    error: 'destructive',
    warning: 'secondary',
    info: 'default'
  } as const;

  return (
    <Badge variant={variants[severity]} className="text-xs">
      {severity.toUpperCase()}
    </Badge>
  );
};

/**
 * Item de evento individual
 */
const EventItem: React.FC<{
  event: RealTimeEvent;
  onMarkAsRead: (eventId: string) => void;
  showDetails?: boolean;
}> = ({ event, onMarkAsRead, showDetails = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isRead = (event as any).read;

  return (
    <Card className={`mb-2 ${isRead ? 'opacity-60' : ''}`}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <SeverityIcon severity={event.severity} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="text-sm font-medium truncate">{event.title}</h4>
              <div className="flex items-center gap-2 flex-shrink-0">
                <SeverityBadge severity={event.severity} />
                {!isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMarkAsRead(event.id)}
                    className="h-6 w-6 p-0"
                  >
                    <CheckCircle className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mb-2">{event.message}</p>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(event.timestamp), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}
              </span>
              <span className="text-xs bg-muted px-2 py-1 rounded">
                {event.source}
              </span>
            </div>

            {showDetails && event.data && (
              <div className="mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-6 text-xs"
                >
                  {isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                </Button>
                
                {isExpanded && (
                  <div className="mt-2 p-2 bg-muted rounded text-xs">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Lista de eventos por categoria
 */
const EventsList: React.FC<{
  events: RealTimeEvent[];
  onMarkAsRead: (eventId: string) => void;
  emptyMessage?: string;
}> = ({ events, onMarkAsRead, emptyMessage = "Nenhum evento encontrado" }) => {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2">
        {events.map(event => (
          <EventItem
            key={event.id}
            event={event}
            onMarkAsRead={onMarkAsRead}
            showDetails
          />
        ))}
      </div>
    </ScrollArea>
  );
};

/**
 * Componente principal de notificações em tempo real
 */
export const RealTimeNotifications: React.FC = () => {
  const {
    events,
    isConnected,
    connectionError,
    unreadCount,
    errorCount,
    jobEvents,
    dispatchEvents,
    systemAlerts,
    configEvents,
    connect,
    disconnect,
    clearEvents,
    markEventAsRead,
    getUnreadEvents,
    getRecentEvents
  } = useRealTimeNotifications();

  const [isOpen, setIsOpen] = useState(false);

  const handleMarkAllAsRead = () => {
    const unreadEvents = getUnreadEvents();
    unreadEvents.forEach(event => markEventAsRead(event.id));
  };

  const handleReconnect = () => {
    if (!isConnected) {
      connect();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant={errorCount > 0 ? "destructive" : "default"}
              className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Notificações em Tempo Real</span>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs text-muted-foreground">
                {isConnected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Status da conexão */}
          {connectionError && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-800">Erro de conexão</span>
                  </div>
                  <Button size="sm" onClick={handleReconnect}>
                    Reconectar
                  </Button>
                </div>
                <p className="text-xs text-red-700 mt-1">{connectionError}</p>
              </CardContent>
            </Card>
          )}

          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-2">
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold">{events.length}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-blue-600">{unreadCount}</div>
                <div className="text-xs text-muted-foreground">Não lidas</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-red-600">{errorCount}</div>
                <div className="text-xs text-muted-foreground">Erros</div>
              </CardContent>
            </Card>
          </div>

          {/* Ações */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
            >
              Marcar todas como lidas
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearEvents}
              disabled={events.length === 0}
            >
              Limpar todas
            </Button>
          </div>

          {/* Abas de eventos */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" className="text-xs">
                Todas ({events.length})
              </TabsTrigger>
              <TabsTrigger value="jobs" className="text-xs">
                Jobs ({jobEvents.length})
              </TabsTrigger>
              <TabsTrigger value="dispatch" className="text-xs">
                Envios ({dispatchEvents.length})
              </TabsTrigger>
              <TabsTrigger value="system" className="text-xs">
                Sistema ({systemAlerts.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <EventsList
                events={events}
                onMarkAsRead={markEventAsRead}
                emptyMessage="Nenhuma notificação recebida"
              />
            </TabsContent>

            <TabsContent value="jobs" className="mt-4">
              <EventsList
                events={jobEvents}
                onMarkAsRead={markEventAsRead}
                emptyMessage="Nenhum evento de job encontrado"
              />
            </TabsContent>

            <TabsContent value="dispatch" className="mt-4">
              <EventsList
                events={dispatchEvents}
                onMarkAsRead={markEventAsRead}
                emptyMessage="Nenhum evento de envio encontrado"
              />
            </TabsContent>

            <TabsContent value="system" className="mt-4">
              <EventsList
                events={[...systemAlerts, ...configEvents]}
                onMarkAsRead={markEventAsRead}
                emptyMessage="Nenhum alerta do sistema encontrado"
              />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default RealTimeNotifications;