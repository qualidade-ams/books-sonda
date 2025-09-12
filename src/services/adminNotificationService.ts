import { EmailTemplateError } from '@/errors/EmailTemplateError';
import { auditLogger, type AuditLogEntry } from './auditLogger';

/**
 * Tipos de notificação para administradores
 */
export type NotificationType = 
  | 'critical_error'
  | 'system_failure'
  | 'configuration_issue'
  | 'performance_degradation'
  | 'security_alert'
  | 'maintenance_required';

/**
 * Canais de notificação disponíveis
 */
export type NotificationChannel = 
  | 'email'
  | 'console'
  | 'webhook'
  | 'database'
  | 'in_app';

/**
 * Configuração de notificação
 */
export interface NotificationConfig {
  enabled: boolean;
  channels: NotificationChannel[];
  emailRecipients: string[];
  webhookUrl?: string;
  rateLimitMinutes: number;
  severityThreshold: 'critical' | 'error' | 'warning';
  includeStackTrace: boolean;
  includeContext: boolean;
}

/**
 * Dados de uma notificação
 */
export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  timestamp: string;
  source: string;
  error?: EmailTemplateError;
  context?: Record<string, any>;
  auditEntry?: AuditLogEntry;
}

/**
 * Resultado do envio de notificação
 */
export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  error?: string;
  deliveredAt?: string;
}

/**
 * Serviço de notificação para administradores
 */
export class AdminNotificationService {
  private config: NotificationConfig;
  private recentNotifications = new Map<string, Date>();
  private notificationHistory: NotificationData[] = [];

  constructor(config?: Partial<NotificationConfig>) {
    this.config = {
      enabled: true,
      channels: ['console', 'in_app'],
      emailRecipients: [],
      rateLimitMinutes: 5,
      severityThreshold: 'error',
      includeStackTrace: true,
      includeContext: true,
      ...config
    };
  }

  /**
   * Notifica administradores sobre um erro crítico
   */
  async notifyError(
    error: EmailTemplateError,
    context?: Record<string, any>,
    auditEntry?: AuditLogEntry
  ): Promise<NotificationResult[]> {
    if (!this.config.enabled || !this.shouldNotify(error)) {
      return [];
    }

    const notification = this.createErrorNotification(error, context, auditEntry);
    
    // Verificar rate limiting
    if (this.isRateLimited(notification)) {
      console.warn(`[AdminNotification] Rate limited: ${notification.title}`);
      return [];
    }

    return await this.sendNotification(notification);
  }

  /**
   * Notifica sobre problemas de sistema
   */
  async notifySystemIssue(
    type: NotificationType,
    title: string,
    message: string,
    severity: 'critical' | 'error' | 'warning' = 'error',
    context?: Record<string, any>
  ): Promise<NotificationResult[]> {
    if (!this.config.enabled) {
      return [];
    }

    const notification: NotificationData = {
      id: this.generateNotificationId(),
      type,
      title,
      message,
      severity,
      timestamp: new Date().toISOString(),
      source: 'EmailTemplateMappingSystem',
      context
    };

    // Verificar rate limiting
    if (this.isRateLimited(notification)) {
      console.warn(`[AdminNotification] Rate limited: ${notification.title}`);
      return [];
    }

    return await this.sendNotification(notification);
  }

  /**
   * Notifica sobre degradação de performance
   */
  async notifyPerformanceIssue(
    operation: string,
    duration: number,
    threshold: number,
    details?: Record<string, any>
  ): Promise<NotificationResult[]> {
    return await this.notifySystemIssue(
      'performance_degradation',
      `Performance degradada: ${operation}`,
      `Operação ${operation} levou ${duration}ms (limite: ${threshold}ms)`,
      'warning',
      {
        operation,
        duration,
        threshold,
        ...details
      }
    );
  }

  /**
   * Notifica sobre problemas de configuração
   */
  async notifyConfigurationIssue(
    configKey: string,
    issue: string,
    suggestion?: string
  ): Promise<NotificationResult[]> {
    return await this.notifySystemIssue(
      'configuration_issue',
      `Problema de configuração: ${configKey}`,
      `${issue}${suggestion ? ` Sugestão: ${suggestion}` : ''}`,
      'warning',
      {
        configKey,
        issue,
        suggestion
      }
    );
  }

  /**
   * Cria notificação a partir de um erro
   */
  private createErrorNotification(
    error: EmailTemplateError,
    context?: Record<string, any>,
    auditEntry?: AuditLogEntry
  ): NotificationData {
    const severity = error.getSeverity();
    const type = this.getNotificationTypeFromError(error);

    return {
      id: this.generateNotificationId(),
      type,
      title: `Erro no sistema de templates: ${error.code}`,
      message: this.formatErrorMessage(error),
      severity,
      timestamp: new Date().toISOString(),
      source: 'EmailTemplateMappingService',
      error,
      context: {
        ...error.context,
        ...context
      },
      auditEntry
    };
  }

  /**
   * Determina tipo de notificação baseado no erro
   */
  private getNotificationTypeFromError(error: EmailTemplateError): NotificationType {
    switch (error.code) {
      case 'DATABASE_CONNECTION_FAILED':
      case 'SYSTEM_ERROR':
        return 'system_failure';
      
      case 'CONFIGURATION_LOAD_FAILED':
      case 'INVALID_CONFIGURATION':
        return 'configuration_issue';
      
      case 'FALLBACK_CHAIN_EXHAUSTED':
        return 'critical_error';
      
      default:
        return 'critical_error';
    }
  }

  /**
   * Formata mensagem de erro para notificação
   */
  private formatErrorMessage(error: EmailTemplateError): string {
    let message = error.message;

    if (this.config.includeContext && error.context) {
      const contextStr = Object.entries(error.context)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      message += `\nContexto: ${contextStr}`;
    }

    if (this.config.includeStackTrace && error.stack) {
      message += `\nStack trace: ${error.stack}`;
    }

    return message;
  }

  /**
   * Verifica se deve notificar baseado na severidade
   */
  private shouldNotify(error: EmailTemplateError): boolean {
    const errorSeverity = error.getSeverity();
    const threshold = this.config.severityThreshold;

    const severityLevels = {
      'critical': 4,
      'error': 3,
      'warning': 2,
      'info': 1
    };

    return severityLevels[errorSeverity] >= severityLevels[threshold];
  }

  /**
   * Verifica rate limiting para evitar spam de notificações
   */
  private isRateLimited(notification: NotificationData): boolean {
    const key = `${notification.type}_${notification.title}`;
    const lastNotification = this.recentNotifications.get(key);
    
    if (!lastNotification) {
      this.recentNotifications.set(key, new Date());
      return false;
    }

    const timeDiff = Date.now() - lastNotification.getTime();
    const rateLimitMs = this.config.rateLimitMinutes * 60 * 1000;

    if (timeDiff < rateLimitMs) {
      return true;
    }

    this.recentNotifications.set(key, new Date());
    return false;
  }

  /**
   * Envia notificação através dos canais configurados
   */
  private async sendNotification(notification: NotificationData): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    // Adicionar ao histórico
    this.notificationHistory.push(notification);
    this.cleanupHistory();

    // Enviar através de cada canal configurado
    for (const channel of this.config.channels) {
      try {
        const result = await this.sendToChannel(notification, channel);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          channel,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Log da notificação enviada
    await auditLogger.logOperation(
      'admin_notification_sent',
      'configuration',
      {
        notificationId: notification.id,
        type: notification.type,
        severity: notification.severity,
        channels: this.config.channels,
        results: results.map(r => ({ channel: r.channel, success: r.success }))
      },
      results.some(r => r.success) ? 'success' : 'failure'
    );

    return results;
  }

  /**
   * Envia notificação para um canal específico
   */
  private async sendToChannel(
    notification: NotificationData,
    channel: NotificationChannel
  ): Promise<NotificationResult> {
    switch (channel) {
      case 'console':
        return this.sendToConsole(notification);
      
      case 'email':
        return await this.sendToEmail(notification);
      
      case 'webhook':
        return await this.sendToWebhook(notification);
      
      case 'database':
        return await this.sendToDatabase(notification);
      
      case 'in_app':
        return this.sendToInApp(notification);
      
      default:
        throw new Error(`Canal de notificação não suportado: ${channel}`);
    }
  }

  /**
   * Envia notificação para console
   */
  private sendToConsole(notification: NotificationData): NotificationResult {
    const prefix = `[ADMIN ALERT - ${notification.severity.toUpperCase()}]`;
    const message = `${prefix} ${notification.title}\n${notification.message}`;

    switch (notification.severity) {
      case 'critical':
      case 'error':
        console.error(message);
        break;
      case 'warning':
        console.warn(message);
        break;
      default:
        console.log(message);
    }

    return {
      success: true,
      channel: 'console',
      deliveredAt: new Date().toISOString()
    };
  }

  /**
   * Envia notificação por email (placeholder)
   */
  private async sendToEmail(notification: NotificationData): Promise<NotificationResult> {
    // Implementação futura: integração com serviço de email
    console.log(`[EmailNotification] ${notification.title} para ${this.config.emailRecipients.join(', ')}`);
    
    return {
      success: true,
      channel: 'email',
      deliveredAt: new Date().toISOString()
    };
  }

  /**
   * Envia notificação via webhook (placeholder)
   */
  private async sendToWebhook(notification: NotificationData): Promise<NotificationResult> {
    if (!this.config.webhookUrl) {
      throw new Error('Webhook URL não configurada');
    }

    // Implementação futura: envio via webhook
    console.log(`[WebhookNotification] ${notification.title} para ${this.config.webhookUrl}`);
    
    return {
      success: true,
      channel: 'webhook',
      deliveredAt: new Date().toISOString()
    };
  }

  /**
   * Salva notificação no banco de dados (placeholder)
   */
  private async sendToDatabase(notification: NotificationData): Promise<NotificationResult> {
    // Implementação futura: salvar no banco
    console.log(`[DatabaseNotification] Salvando notificação ${notification.id}`);
    
    return {
      success: true,
      channel: 'database',
      deliveredAt: new Date().toISOString()
    };
  }

  /**
   * Envia notificação in-app (placeholder)
   */
  private sendToInApp(notification: NotificationData): NotificationResult {
    // Implementação futura: notificação in-app
    console.log(`[InAppNotification] ${notification.title}`);
    
    return {
      success: true,
      channel: 'in_app',
      deliveredAt: new Date().toISOString()
    };
  }

  /**
   * Obtém histórico de notificações
   */
  getNotificationHistory(limit?: number): NotificationData[] {
    const history = [...this.notificationHistory]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Limpa histórico antigo
   */
  private cleanupHistory(): void {
    const maxHistory = 100;
    if (this.notificationHistory.length > maxHistory) {
      this.notificationHistory = this.notificationHistory
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, maxHistory);
    }
  }

  /**
   * Gera ID único para notificação
   */
  private generateNotificationId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Atualiza configuração do serviço
   */
  updateConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Obtém configuração atual
   */
  getConfig(): NotificationConfig {
    return { ...this.config };
  }

  /**
   * Obtém estatísticas de notificações
   */
  getStatistics(): {
    totalNotifications: number;
    notificationsByType: Record<NotificationType, number>;
    notificationsBySeverity: Record<string, number>;
    recentNotifications: number;
  } {
    const totalNotifications = this.notificationHistory.length;
    
    const notificationsByType = this.notificationHistory.reduce((acc, notification) => {
      acc[notification.type] = (acc[notification.type] || 0) + 1;
      return acc;
    }, {} as Record<NotificationType, number>);

    const notificationsBySeverity = this.notificationHistory.reduce((acc, notification) => {
      acc[notification.severity] = (acc[notification.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentNotifications = this.notificationHistory.filter(
      notification => new Date(notification.timestamp) > oneHourAgo
    ).length;

    return {
      totalNotifications,
      notificationsByType,
      notificationsBySeverity,
      recentNotifications
    };
  }
}

// Instância singleton do serviço de notificação
export const adminNotificationService = new AdminNotificationService();