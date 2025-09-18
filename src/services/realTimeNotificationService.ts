import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { adminNotificationService, type NotificationData } from './adminNotificationService';
import { auditLogger } from './auditLogger';

/**
 * Tipos de eventos em tempo real
 */
export type RealTimeEventType =
  | 'job_status_changed'
  | 'dispatch_completed'
  | 'dispatch_failed'
  | 'system_alert'
  | 'configuration_changed'
  | 'user_action';

/**
 * Dados de um evento em tempo real
 */
export interface RealTimeEvent {
  id: string;
  type: RealTimeEventType;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  data?: Record<string, any>;
  timestamp: string;
  userId?: string;
  source: string;
}

/**
 * Callback para eventos em tempo real
 */
export type RealTimeEventCallback = (event: RealTimeEvent) => void;

/**
 * Configuração de subscription
 */
export interface SubscriptionConfig {
  channel: string;
  eventTypes: RealTimeEventType[];
  callback: RealTimeEventCallback;
  filter?: Record<string, any>;
}

/**
 * Status de progresso para operações longas
 */
export interface ProgressStatus {
  id: string;
  operation: string;
  progress: number; // 0-100
  message: string;
  startTime: Date;
  estimatedCompletion?: Date;
  data?: Record<string, any>;
}

/**
 * Callback para atualizações de progresso
 */
export type ProgressCallback = (status: ProgressStatus) => void;

/**
 * Serviço de notificações em tempo real
 */
export class RealTimeNotificationService {
  private channels = new Map<string, RealtimeChannel>();
  private eventCallbacks = new Map<string, RealTimeEventCallback[]>();
  private progressCallbacks = new Map<string, ProgressCallback[]>();
  private progressStatuses = new Map<string, ProgressStatus>();
  private isConnected = false;

  /**
   * Inicializa o serviço de notificações em tempo real
   */
  async initialize(): Promise<void> {
    try {
      // Configurar subscriptions principais
      await this.setupJobStatusSubscription();
      await this.setupDispatchSubscription();
      await this.setupNotificationSubscription();
      await this.setupConfigurationSubscription();

      this.isConnected = true;
      console.log('[RealTimeNotification] Serviço inicializado com sucesso');

      // Log de auditoria removido - auditLogger é específico para templates
      // await auditLogger.logOperation(...);

    } catch (error) {
      console.error('[RealTimeNotification] Erro ao inicializar serviço:', error);

      await adminNotificationService.notifySystemIssue(
        'system_failure',
        'Falha na inicialização do serviço de notificações',
        error instanceof Error ? error.message : 'Erro desconhecido',
        'error',
        { error: String(error) }
      );

      throw error;
    }
  }

  /**
   * Finaliza o serviço e remove todas as subscriptions
   */
  async shutdown(): Promise<void> {
    try {
      // Remover todas as subscriptions
      for (const [channelName, channel] of this.channels) {
        await supabase.removeChannel(channel);
        console.log(`[RealTimeNotification] Canal ${channelName} removido`);
      }

      this.channels.clear();
      this.eventCallbacks.clear();
      this.progressCallbacks.clear();
      this.progressStatuses.clear();
      this.isConnected = false;

      console.log('[RealTimeNotification] Serviço finalizado');

      // Log de auditoria removido - auditLogger é específico para templates
      // await auditLogger.logOperation(...);

    } catch (error) {
      console.error('[RealTimeNotification] Erro ao finalizar serviço:', error);
    }
  }

  /**
   * Subscreve a eventos de um tipo específico
   */
  subscribe(eventType: RealTimeEventType, callback: RealTimeEventCallback): () => void {
    const callbacks = this.eventCallbacks.get(eventType) || [];
    callbacks.push(callback);
    this.eventCallbacks.set(eventType, callbacks);

    console.log(`[RealTimeNotification] Subscrito a eventos ${eventType}`);

    // Retorna função para cancelar subscription
    return () => {
      const currentCallbacks = this.eventCallbacks.get(eventType) || [];
      const index = currentCallbacks.indexOf(callback);
      if (index > -1) {
        currentCallbacks.splice(index, 1);
        this.eventCallbacks.set(eventType, currentCallbacks);
      }
    };
  }

  /**
   * Subscreve a atualizações de progresso
   */
  subscribeToProgress(operationId: string, callback: ProgressCallback): () => void {
    const callbacks = this.progressCallbacks.get(operationId) || [];
    callbacks.push(callback);
    this.progressCallbacks.set(operationId, callbacks);

    // Se já existe status para esta operação, enviar imediatamente
    const existingStatus = this.progressStatuses.get(operationId);
    if (existingStatus) {
      callback(existingStatus);
    }

    console.log(`[RealTimeNotification] Subscrito a progresso da operação ${operationId}`);

    // Retorna função para cancelar subscription
    return () => {
      const currentCallbacks = this.progressCallbacks.get(operationId) || [];
      const index = currentCallbacks.indexOf(callback);
      if (index > -1) {
        currentCallbacks.splice(index, 1);
        this.progressCallbacks.set(operationId, currentCallbacks);
      }
    };
  }

  /**
   * Emite um evento em tempo real
   */
  async emitEvent(event: Omit<RealTimeEvent, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: RealTimeEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date().toISOString()
    };

    try {
      // Notificar callbacks locais
      this.notifyEventCallbacks(fullEvent);

      // Enviar via Supabase Realtime (se configurado)
      await this.broadcastEvent(fullEvent);

      console.log(`[RealTimeNotification] Evento emitido: ${fullEvent.type} - ${fullEvent.title}`);

    } catch (error) {
      console.error('[RealTimeNotification] Erro ao emitir evento:', error);
    }
  }

  /**
   * Atualiza progresso de uma operação
   */
  async updateProgress(
    operationId: string,
    progress: number,
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    const existingStatus = this.progressStatuses.get(operationId);

    const status: ProgressStatus = {
      id: operationId,
      operation: existingStatus?.operation || 'Operação',
      progress: Math.max(0, Math.min(100, progress)),
      message,
      startTime: existingStatus?.startTime || new Date(),
      data: { ...existingStatus?.data, ...data }
    };

    // Calcular estimativa de conclusão
    if (progress > 0 && progress < 100) {
      const elapsed = Date.now() - status.startTime.getTime();
      const estimatedTotal = (elapsed / progress) * 100;
      const remaining = estimatedTotal - elapsed;
      status.estimatedCompletion = new Date(Date.now() + remaining);
    }

    this.progressStatuses.set(operationId, status);

    // Notificar callbacks
    const callbacks = this.progressCallbacks.get(operationId) || [];
    callbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('[RealTimeNotification] Erro no callback de progresso:', error);
      }
    });

    // Emitir evento se for conclusão
    if (progress >= 100) {
      await this.emitEvent({
        type: 'user_action',
        title: 'Operação concluída',
        message: `${status.operation} concluída com sucesso`,
        severity: 'info',
        source: 'progress_tracker',
        data: { operationId, duration: Date.now() - status.startTime.getTime() }
      });

      // Limpar status após conclusão
      setTimeout(() => {
        this.progressStatuses.delete(operationId);
        this.progressCallbacks.delete(operationId);
      }, 5000);
    }
  }

  /**
   * Inicia tracking de progresso para uma operação
   */
  startProgress(operationId: string, operationName: string): void {
    const status: ProgressStatus = {
      id: operationId,
      operation: operationName,
      progress: 0,
      message: 'Iniciando...',
      startTime: new Date()
    };

    this.progressStatuses.set(operationId, status);

    this.emitEvent({
      type: 'user_action',
      title: 'Operação iniciada',
      message: `${operationName} foi iniciada`,
      severity: 'info',
      source: 'progress_tracker',
      data: { operationId }
    });
  }

  /**
   * Finaliza tracking de progresso
   */
  completeProgress(operationId: string, message = 'Concluído'): void {
    this.updateProgress(operationId, 100, message);
  }

  /**
   * Falha no tracking de progresso
   */
  failProgress(operationId: string, error: string): void {
    const status = this.progressStatuses.get(operationId);
    if (status) {
      this.emitEvent({
        type: 'user_action',
        title: 'Operação falhada',
        message: `${status.operation} falhou: ${error}`,
        severity: 'error',
        source: 'progress_tracker',
        data: { operationId, error }
      });
    }

    // Limpar status
    this.progressStatuses.delete(operationId);
    this.progressCallbacks.delete(operationId);
  }

  /**
   * Obtém status atual de uma operação
   */
  getProgressStatus(operationId: string): ProgressStatus | undefined {
    return this.progressStatuses.get(operationId);
  }

  /**
   * Lista todas as operações em progresso
   */
  getActiveOperations(): ProgressStatus[] {
    return Array.from(this.progressStatuses.values())
      .filter(status => status.progress < 100);
  }

  /**
   * Verifica se o serviço está conectado
   */
  isServiceConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Obtém estatísticas do serviço
   */
  getServiceStats(): {
    channelsCount: number;
    eventCallbacksCount: number;
    progressCallbacksCount: number;
    activeOperationsCount: number;
    isConnected: boolean;
  } {
    return {
      channelsCount: this.channels.size,
      eventCallbacksCount: Array.from(this.eventCallbacks.values())
        .reduce((total, callbacks) => total + callbacks.length, 0),
      progressCallbacksCount: Array.from(this.progressCallbacks.values())
        .reduce((total, callbacks) => total + callbacks.length, 0),
      activeOperationsCount: this.getActiveOperations().length,
      isConnected: this.isConnected
    };
  }

  // Métodos privados

  private async setupJobStatusSubscription(): Promise<void> {
    const channel = supabase
      .channel('jobs_status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs_queue'
        },
        (payload) => {
          this.handleJobStatusChange(payload);
        }
      )
      .subscribe();

    this.channels.set('jobs_status', channel);
  }

  private async setupDispatchSubscription(): Promise<void> {
    const channel = supabase
      .channel('dispatch_events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'historico_disparos'
        },
        (payload) => {
          this.handleDispatchEvent(payload);
        }
      )
      .subscribe();

    this.channels.set('dispatch_events', channel);
  }

  private async setupNotificationSubscription(): Promise<void> {
    const channel = supabase
      .channel('admin_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications'
        },
        (payload) => {
          this.handleNotificationEvent(payload);
        }
      )
      .subscribe();

    this.channels.set('admin_notifications', channel);
  }

  private async setupConfigurationSubscription(): Promise<void> {
    const channel = supabase
      .channel('configuration_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'job_configurations'
        },
        (payload) => {
          this.handleConfigurationChange(payload);
        }
      )
      .subscribe();

    this.channels.set('configuration_changes', channel);
  }

  private handleJobStatusChange(payload: any): void {
    const { new: newRecord, old: oldRecord } = payload;

    if (newRecord.status !== oldRecord.status) {
      const event: RealTimeEvent = {
        id: this.generateEventId(),
        type: 'job_status_changed',
        title: 'Status do job alterado',
        message: `Job ${newRecord.id} mudou de ${oldRecord.status} para ${newRecord.status}`,
        severity: newRecord.status === 'failed' ? 'error' : 'info',
        timestamp: new Date().toISOString(),
        source: 'job_scheduler',
        data: {
          jobId: newRecord.id,
          jobType: newRecord.type,
          oldStatus: oldRecord.status,
          newStatus: newRecord.status,
          error: newRecord.last_error
        }
      };

      this.notifyEventCallbacks(event);
    }
  }

  private handleDispatchEvent(payload: any): void {
    const record = payload.new;

    const event: RealTimeEvent = {
      id: this.generateEventId(),
      type: record.status === 'enviado' ? 'dispatch_completed' : 'dispatch_failed',
      title: record.status === 'enviado' ? 'E-mail enviado' : 'Falha no envio',
      message: record.status === 'enviado'
        ? `E-mail enviado com sucesso para ${record.cliente_id}`
        : `Falha ao enviar e-mail: ${record.erro_detalhes}`,
      severity: record.status === 'enviado' ? 'info' : 'error',
      timestamp: new Date().toISOString(),
      source: 'email_dispatcher',
      data: {
        empresaId: record.empresa_id,
        clienteId: record.cliente_id,
        status: record.status,
        error: record.erro_detalhes
      }
    };

    this.notifyEventCallbacks(event);
  }

  private handleNotificationEvent(payload: any): void {
    const record = payload.new;

    const event: RealTimeEvent = {
      id: this.generateEventId(),
      type: 'system_alert',
      title: record.title,
      message: record.message,
      severity: record.severity,
      timestamp: new Date().toISOString(),
      source: record.source,
      data: record.context
    };

    this.notifyEventCallbacks(event);
  }

  private handleConfigurationChange(payload: any): void {
    const { new: newRecord, old: oldRecord } = payload;

    const event: RealTimeEvent = {
      id: this.generateEventId(),
      type: 'configuration_changed',
      title: 'Configuração alterada',
      message: `Configuração ${newRecord.key} foi alterada`,
      severity: 'info',
      timestamp: new Date().toISOString(),
      source: 'configuration_service',
      data: {
        key: newRecord.key,
        oldValue: oldRecord.value,
        newValue: newRecord.value
      }
    };

    this.notifyEventCallbacks(event);
  }

  private notifyEventCallbacks(event: RealTimeEvent): void {
    const callbacks = this.eventCallbacks.get(event.type) || [];

    callbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[RealTimeNotification] Erro no callback de evento:', error);
      }
    });
  }

  private async broadcastEvent(event: RealTimeEvent): Promise<void> {
    // Implementação futura: broadcast via Supabase Realtime
    // Por enquanto, apenas log local
    console.log('[RealTimeNotification] Broadcasting event:', event);
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Instância singleton do serviço de notificações em tempo real
export const realTimeNotificationService = new RealTimeNotificationService();