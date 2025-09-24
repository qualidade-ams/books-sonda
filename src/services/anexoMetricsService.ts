import { supabase } from '@/integrations/supabase/client';
import { anexoAuditService } from './anexoAuditService';

export interface AnexoMetrics {
  totalUploads: number;
  totalSize: number;
  successRate: number;
  failureRate: number;
  avgProcessingTime: number;
  topFileTypes: { tipo: string; count: number }[];
  storageUsageByEmpresa: { empresa_id: string; empresa_nome: string; total_size: number; file_count: number }[];
  dailyStats: { date: string; uploads: number; size: number; failures: number }[];
  performanceAlerts: AnexoAlert[];
}

export interface AnexoAlert {
  id: string;
  type: 'storage_limit' | 'failure_rate' | 'processing_time' | 'upload_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  empresa_id?: string;
  empresa_nome?: string;
  timestamp: string;
  resolved: boolean;
}

export interface DashboardMetrics {
  totalStorageUsed: number;
  totalFiles: number;
  activeEmpresas: number;
  avgSuccessRate: number;
  recentAlerts: AnexoAlert[];
  storageByEmpresa: { empresa_id: string; nome: string; usage: number; percentage: number }[];
  performanceTrends: { period: string; uploads: number; failures: number; avgTime: number }[];
}

class AnexoMetricsService {
  private readonly STORAGE_LIMIT_MB = 25;
  private readonly FAILURE_RATE_THRESHOLD = 0.15; // 15%
  private readonly PROCESSING_TIME_THRESHOLD = 30000; // 30 segundos

  async getMetrics(startDate?: Date, endDate?: Date): Promise<AnexoMetrics> {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate);
      
      const [
        totalStats,
        fileTypeStats,
        storageStats,
        dailyStats,
        alerts
      ] = await Promise.all([
        this.getTotalStats(dateFilter),
        this.getFileTypeStats(dateFilter),
        this.getStorageStatsByEmpresa(),
        this.getDailyStats(dateFilter),
        this.getActiveAlerts()
      ]);

      return {
        totalUploads: totalStats.total_uploads,
        totalSize: totalStats.total_size,
        successRate: totalStats.success_rate,
        failureRate: totalStats.failure_rate,
        avgProcessingTime: totalStats.avg_processing_time,
        topFileTypes: fileTypeStats,
        storageUsageByEmpresa: storageStats,
        dailyStats,
        performanceAlerts: alerts
      };
    } catch (error) {
      console.error('Erro ao buscar métricas de anexos:', error);
      throw error;
    }
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      const [
        storageStats,
        generalStats,
        alerts,
        trends
      ] = await Promise.all([
        this.getStorageStatsByEmpresa(),
        this.getGeneralStats(),
        this.getRecentAlerts(),
        this.getPerformanceTrends()
      ]);

      const totalStorage = storageStats.reduce((sum, item) => sum + item.total_size, 0);
      const totalFiles = storageStats.reduce((sum, item) => sum + item.file_count, 0);

      return {
        totalStorageUsed: totalStorage,
        totalFiles,
        activeEmpresas: storageStats.length,
        avgSuccessRate: generalStats.avg_success_rate,
        recentAlerts: alerts,
        storageByEmpresa: storageStats.map(item => ({
          empresa_id: item.empresa_id,
          nome: item.empresa_nome,
          usage: item.total_size,
          percentage: (item.total_size / (this.STORAGE_LIMIT_MB * 1024 * 1024)) * 100
        })),
        performanceTrends: trends
      };
    } catch (error) {
      console.error('Erro ao buscar métricas do dashboard:', error);
      throw error;
    }
  }

  async checkAndCreateAlerts(): Promise<AnexoAlert[]> {
    try {
      const alerts: AnexoAlert[] = [];
      
      // Verificar limite de storage por empresa
      const storageAlerts = await this.checkStorageAlerts();
      alerts.push(...storageAlerts);

      // Verificar taxa de falhas
      const failureAlerts = await this.checkFailureRateAlerts();
      alerts.push(...failureAlerts);

      // Verificar tempo de processamento
      const processingAlerts = await this.checkProcessingTimeAlerts();
      alerts.push(...processingAlerts);

      // Salvar alertas no banco
      for (const alert of alerts) {
        await this.saveAlert(alert);
      }

      return alerts;
    } catch (error) {
      console.error('Erro ao verificar alertas:', error);
      throw error;
    }
  }

  private async getTotalStats(dateFilter: string) {
    const { data, error } = await supabase
      .from('anexos_temporarios')
      .select('status, tamanho_bytes, data_upload, data_processamento')
      .gte('data_upload', dateFilter);

    if (error) throw error;

    const total = data?.length || 0;
    const successful = data?.filter(item => item.status === 'processado').length || 0;
    const totalSize = data?.reduce((sum, item) => sum + (item.tamanho_bytes || 0), 0) || 0;
    
    const processingTimes = data
      ?.filter(item => item.data_processamento && item.data_upload)
      .map(item => {
        const upload = new Date(item.data_upload).getTime();
        const processed = new Date(item.data_processamento!).getTime();
        return processed - upload;
      }) || [];

    const avgProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
      : 0;

    return {
      total_uploads: total,
      total_size: totalSize,
      success_rate: total > 0 ? successful / total : 0,
      failure_rate: total > 0 ? (total - successful) / total : 0,
      avg_processing_time: avgProcessingTime
    };
  }

  private async getFileTypeStats(dateFilter: string) {
    const { data, error } = await supabase
      .from('anexos_temporarios')
      .select('tipo_mime')
      .gte('data_upload', dateFilter);

    if (error) throw error;

    const typeCount = data?.reduce((acc, item) => {
      const type = item.tipo_mime || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return Object.entries(typeCount)
      .map(([tipo, count]) => ({ tipo, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private async getStorageStatsByEmpresa() {
    const { data, error } = await supabase
      .from('anexos_temporarios')
      .select(`
        empresa_id,
        tamanho_bytes,
        empresas_clientes!inner(nome)
      `);

    if (error) throw error;

    const empresaStats = data?.reduce((acc, item) => {
      const empresaId = item.empresa_id;
      if (!acc[empresaId]) {
        acc[empresaId] = {
          empresa_id: empresaId,
          empresa_nome: (item.empresas_clientes as any)?.nome || 'Empresa não encontrada',
          total_size: 0,
          file_count: 0
        };
      }
      acc[empresaId].total_size += item.tamanho_bytes || 0;
      acc[empresaId].file_count += 1;
      return acc;
    }, {} as Record<string, any>) || {};

    return Object.values(empresaStats);
  }

  private async getDailyStats(dateFilter: string) {
    const { data, error } = await supabase
      .from('anexos_temporarios')
      .select('data_upload, tamanho_bytes, status')
      .gte('data_upload', dateFilter)
      .order('data_upload', { ascending: true });

    if (error) throw error;

    const dailyStats = data?.reduce((acc, item) => {
      const date = new Date(item.data_upload).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, uploads: 0, size: 0, failures: 0 };
      }
      acc[date].uploads += 1;
      acc[date].size += item.tamanho_bytes || 0;
      if (item.status === 'erro') {
        acc[date].failures += 1;
      }
      return acc;
    }, {} as Record<string, any>) || {};

    return Object.values(dailyStats);
  }

  private async checkStorageAlerts(): Promise<AnexoAlert[]> {
    const storageStats = await this.getStorageStatsByEmpresa();
    const alerts: AnexoAlert[] = [];

    for (const stat of storageStats) {
      const usagePercentage = (stat.total_size / (this.STORAGE_LIMIT_MB * 1024 * 1024)) * 100;
      
      if (usagePercentage >= 95) {
        alerts.push({
          id: `storage_${stat.empresa_id}_${Date.now()}`,
          type: 'storage_limit',
          severity: 'critical',
          message: `Empresa ${stat.empresa_nome} atingiu ${usagePercentage.toFixed(1)}% do limite de storage`,
          empresa_id: stat.empresa_id,
          empresa_nome: stat.empresa_nome,
          timestamp: new Date().toISOString(),
          resolved: false
        });
      } else if (usagePercentage >= 80) {
        alerts.push({
          id: `storage_${stat.empresa_id}_${Date.now()}`,
          type: 'storage_limit',
          severity: 'high',
          message: `Empresa ${stat.empresa_nome} atingiu ${usagePercentage.toFixed(1)}% do limite de storage`,
          empresa_id: stat.empresa_id,
          empresa_nome: stat.empresa_nome,
          timestamp: new Date().toISOString(),
          resolved: false
        });
      }
    }

    return alerts;
  }

  private async checkFailureRateAlerts(): Promise<AnexoAlert[]> {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const stats = await this.getTotalStats(last24h);
    const alerts: AnexoAlert[] = [];

    if (stats.failure_rate > this.FAILURE_RATE_THRESHOLD) {
      alerts.push({
        id: `failure_rate_${Date.now()}`,
        type: 'failure_rate',
        severity: stats.failure_rate > 0.3 ? 'critical' : 'high',
        message: `Taxa de falhas elevada: ${(stats.failure_rate * 100).toFixed(1)}% nas últimas 24h`,
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }

    return alerts;
  }

  private async checkProcessingTimeAlerts(): Promise<AnexoAlert[]> {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const stats = await this.getTotalStats(last24h);
    const alerts: AnexoAlert[] = [];

    if (stats.avg_processing_time > this.PROCESSING_TIME_THRESHOLD) {
      alerts.push({
        id: `processing_time_${Date.now()}`,
        type: 'processing_time',
        severity: stats.avg_processing_time > 60000 ? 'high' : 'medium',
        message: `Tempo de processamento elevado: ${(stats.avg_processing_time / 1000).toFixed(1)}s em média`,
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }

    return alerts;
  }

  private async getActiveAlerts(): Promise<AnexoAlert[]> {
    // Implementar busca de alertas ativos do banco
    // Por enquanto, retorna array vazio
    return [];
  }

  private async getGeneralStats() {
    const { data, error } = await supabase
      .from('anexos_temporarios')
      .select('status');

    if (error) throw error;

    const total = data?.length || 0;
    const successful = data?.filter(item => item.status === 'processado').length || 0;

    return {
      avg_success_rate: total > 0 ? successful / total : 0
    };
  }

  private async getRecentAlerts(): Promise<AnexoAlert[]> {
    // Implementar busca de alertas recentes
    return [];
  }

  private async getPerformanceTrends() {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    return this.getDailyStats(last30Days);
  }

  private async saveAlert(alert: AnexoAlert): Promise<void> {
    // Implementar salvamento de alerta no banco
    await anexoAuditService.logOperacao(
      'alert_created',
      alert.empresa_id || 'system',
      {
        alert_type: alert.type,
        severity: alert.severity,
        message: alert.message
      }
    );
  }

  private buildDateFilter(startDate?: Date, endDate?: Date): string {
    if (startDate) {
      return startDate.toISOString();
    }
    // Por padrão, últimos 30 dias
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
}

export const anexoMetricsService = new AnexoMetricsService();