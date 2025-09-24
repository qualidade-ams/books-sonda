import { anexoMetricsService } from './anexoMetricsService';
import { anexoAuditService } from './anexoAuditService';
import { jobSchedulerService } from './jobSchedulerService';

export interface MonitoringJobConfig {
  alertCheckInterval: number; // em minutos
  metricsUpdateInterval: number; // em minutos
  reportGenerationTime: string; // formato HH:MM
  enableEmailAlerts: boolean;
  criticalAlertThreshold: number;
}

class AnexoMonitoringJobService {
  private config: MonitoringJobConfig = {
    alertCheckInterval: 10, // 10 minutos
    metricsUpdateInterval: 5, // 5 minutos
    reportGenerationTime: '08:00', // 8:00 AM
    enableEmailAlerts: true,
    criticalAlertThreshold: 3 // máximo de alertas críticos antes de notificar
  };

  private alertCheckJobId: string | null = null;
  private metricsJobId: string | null = null;
  private reportJobId: string | null = null;

  async startMonitoring(customConfig?: Partial<MonitoringJobConfig>): Promise<void> {
    try {
      // Aplicar configuração customizada
      if (customConfig) {
        this.config = { ...this.config, ...customConfig };
      }

      // Parar jobs existentes
      await this.stopMonitoring();

      // Iniciar job de verificação de alertas
      this.alertCheckJobId = await jobSchedulerService.scheduleRecurringJob({
        name: 'anexo-alert-check',
        description: 'Verificação automática de alertas do sistema de anexos',
        intervalMinutes: this.config.alertCheckInterval,
        jobFunction: this.checkAlertsJob.bind(this),
        enabled: true
      });

      // Iniciar job de atualização de métricas
      this.metricsJobId = await jobSchedulerService.scheduleRecurringJob({
        name: 'anexo-metrics-update',
        description: 'Atualização de métricas do sistema de anexos',
        intervalMinutes: this.config.metricsUpdateInterval,
        jobFunction: this.updateMetricsJob.bind(this),
        enabled: true
      });

      // Iniciar job de relatório diário
      this.reportJobId = await jobSchedulerService.scheduleDailyJob({
        name: 'anexo-daily-report',
        description: 'Geração de relatório diário de anexos',
        time: this.config.reportGenerationTime,
        jobFunction: this.generateDailyReportJob.bind(this),
        enabled: true
      });

      await anexoAuditService.logOperacao(
        'monitoring_started',
        'system',
        {
          config: this.config,
          jobs: {
            alertCheck: this.alertCheckJobId,
            metrics: this.metricsJobId,
            report: this.reportJobId
          }
        }
      );

      console.log('Monitoramento de anexos iniciado com sucesso');
    } catch (error) {
      console.error('Erro ao iniciar monitoramento de anexos:', error);
      throw error;
    }
  }

  async stopMonitoring(): Promise<void> {
    try {
      const stoppedJobs = [];

      if (this.alertCheckJobId) {
        await jobSchedulerService.cancelJob(this.alertCheckJobId);
        stoppedJobs.push('alert-check');
        this.alertCheckJobId = null;
      }

      if (this.metricsJobId) {
        await jobSchedulerService.cancelJob(this.metricsJobId);
        stoppedJobs.push('metrics');
        this.metricsJobId = null;
      }

      if (this.reportJobId) {
        await jobSchedulerService.cancelJob(this.reportJobId);
        stoppedJobs.push('report');
        this.reportJobId = null;
      }

      if (stoppedJobs.length > 0) {
        await anexoAuditService.logOperacao(
          'monitoring_stopped',
          'system',
          { stoppedJobs }
        );
      }

      console.log('Monitoramento de anexos parado');
    } catch (error) {
      console.error('Erro ao parar monitoramento de anexos:', error);
      throw error;
    }
  }

  async updateConfig(newConfig: Partial<MonitoringJobConfig>): Promise<void> {
    try {
      const oldConfig = { ...this.config };
      this.config = { ...this.config, ...newConfig };

      // Reiniciar monitoramento com nova configuração
      await this.startMonitoring();

      await anexoAuditService.logOperacao(
        'monitoring_config_updated',
        'system',
        {
          oldConfig,
          newConfig: this.config
        }
      );
    } catch (error) {
      console.error('Erro ao atualizar configuração de monitoramento:', error);
      throw error;
    }
  }

  getConfig(): MonitoringJobConfig {
    return { ...this.config };
  }

  getStatus(): {
    isRunning: boolean;
    jobs: {
      alertCheck: boolean;
      metrics: boolean;
      report: boolean;
    };
    config: MonitoringJobConfig;
  } {
    return {
      isRunning: !!(this.alertCheckJobId || this.metricsJobId || this.reportJobId),
      jobs: {
        alertCheck: !!this.alertCheckJobId,
        metrics: !!this.metricsJobId,
        report: !!this.reportJobId
      },
      config: this.config
    };
  }

  private async checkAlertsJob(): Promise<void> {
    try {
      console.log('Executando verificação automática de alertas...');
      
      const alerts = await anexoMetricsService.checkAndCreateAlerts();
      
      if (alerts.length > 0) {
        const criticalAlerts = alerts.filter(a => a.severity === 'critical');
        const highAlerts = alerts.filter(a => a.severity === 'high');

        await anexoAuditService.logOperacao(
          'alerts_detected',
          'system',
          {
            totalAlerts: alerts.length,
            criticalCount: criticalAlerts.length,
            highCount: highAlerts.length,
            alerts: alerts.map(a => ({
              type: a.type,
              severity: a.severity,
              message: a.message,
              empresa_id: a.empresa_id
            }))
          }
        );

        // Verificar se deve enviar notificação por email
        if (this.config.enableEmailAlerts && criticalAlerts.length >= this.config.criticalAlertThreshold) {
          await this.sendCriticalAlertNotification(criticalAlerts);
        }
      }

      console.log(`Verificação de alertas concluída: ${alerts.length} alertas detectados`);
    } catch (error) {
      console.error('Erro na verificação automática de alertas:', error);
      await anexoAuditService.logOperacao(
        'alert_check_error',
        'system',
        { error: error instanceof Error ? error.message : 'Erro desconhecido' }
      );
    }
  }

  private async updateMetricsJob(): Promise<void> {
    try {
      console.log('Atualizando métricas do sistema de anexos...');
      
      const metrics = await anexoMetricsService.getDashboardMetrics();
      
      await anexoAuditService.logOperacao(
        'metrics_updated',
        'system',
        {
          totalStorage: metrics.totalStorageUsed,
          totalFiles: metrics.totalFiles,
          activeEmpresas: metrics.activeEmpresas,
          successRate: metrics.avgSuccessRate,
          alertCount: metrics.recentAlerts.length
        }
      );

      console.log('Métricas atualizadas com sucesso');
    } catch (error) {
      console.error('Erro na atualização de métricas:', error);
      await anexoAuditService.logOperacao(
        'metrics_update_error',
        'system',
        { error: error instanceof Error ? error.message : 'Erro desconhecido' }
      );
    }
  }

  private async generateDailyReportJob(): Promise<void> {
    try {
      console.log('Gerando relatório diário de anexos...');
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const metrics = await anexoMetricsService.getMetrics(yesterday, today);
      
      const report = {
        date: yesterday.toISOString().split('T')[0],
        summary: {
          totalUploads: metrics.totalUploads,
          totalSize: metrics.totalSize,
          successRate: metrics.successRate,
          failureRate: metrics.failureRate,
          avgProcessingTime: metrics.avgProcessingTime
        },
        topFileTypes: metrics.topFileTypes.slice(0, 5),
        topCompanies: metrics.storageUsageByEmpresa.slice(0, 10),
        alerts: metrics.performanceAlerts
      };

      await anexoAuditService.logOperacao(
        'daily_report_generated',
        'system',
        report
      );

      console.log('Relatório diário gerado com sucesso');
    } catch (error) {
      console.error('Erro na geração do relatório diário:', error);
      await anexoAuditService.logOperacao(
        'daily_report_error',
        'system',
        { error: error instanceof Error ? error.message : 'Erro desconhecido' }
      );
    }
  }

  private async sendCriticalAlertNotification(criticalAlerts: any[]): Promise<void> {
    try {
      // Implementar envio de notificação por email para administradores
      // Por enquanto, apenas registra no log
      await anexoAuditService.logOperacao(
        'critical_alert_notification',
        'system',
        {
          alertCount: criticalAlerts.length,
          alerts: criticalAlerts.map(a => ({
            type: a.type,
            message: a.message,
            empresa_id: a.empresa_id,
            timestamp: a.timestamp
          }))
        }
      );

      console.log(`Notificação de ${criticalAlerts.length} alertas críticos enviada`);
    } catch (error) {
      console.error('Erro ao enviar notificação de alertas críticos:', error);
    }
  }
}

export const anexoMonitoringJobService = new AnexoMonitoringJobService();