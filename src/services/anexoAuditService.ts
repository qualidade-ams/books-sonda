import { supabase } from '@/integrations/supabase/client';
import { auditLogger, type AuditLogEntry } from './auditLogger';
import type { AnexoData } from './anexoService';

/**
 * Tipos específicos de operações de anexos para auditoria
 */
export type AnexoAuditOperation = 
  | 'anexo_upload_iniciado'
  | 'anexo_upload_concluido'
  | 'anexo_upload_falhou'
  | 'anexo_validacao_tipo'
  | 'anexo_validacao_tamanho'
  | 'anexo_validacao_limite_total'
  | 'anexo_token_gerado'
  | 'anexo_token_renovado'
  | 'anexo_token_revogado'
  | 'anexo_token_validado'
  | 'anexo_download_autorizado'
  | 'anexo_download_negado'
  | 'anexo_removido'
  | 'anexo_movido_permanente'
  | 'anexo_status_atualizado'
  | 'anexo_limpeza_expirados'
  | 'anexo_webhook_preparado'
  | 'anexo_processamento_iniciado'
  | 'anexo_processamento_concluido'
  | 'anexo_processamento_falhou'
  | 'anexo_storage_erro'
  | 'anexo_database_erro';

/**
 * Interface para logs de auditoria específicos de anexos
 */
export interface AnexoAuditLogEntry extends Omit<AuditLogEntry, 'operation' | 'entityType'> {
  operation: AnexoAuditOperation;
  entityType: 'anexo';
  anexoId?: string;
  empresaId?: string;
  nomeArquivo?: string;
  tamanhoArquivo?: number;
  tipoArquivo?: string;
  storageInfo?: {
    bucket: string;
    path: string;
    size: number;
  };
  performanceMetrics?: {
    uploadTime?: number;
    downloadTime?: number;
    processingTime?: number;
    storageLatency?: number;
  };
  securityInfo?: {
    tokenGenerated?: boolean;
    tokenValidated?: boolean;
    accessGranted?: boolean;
    ipAddress?: string;
    userAgent?: string;
  };
}

/**
 * Interface para métricas de uso de storage
 */
export interface StorageMetrics {
  totalArquivos: number;
  tamanhoTotalBytes: number;
  tamanhoTotalMB: number;
  arquivosPorEmpresa: Record<string, number>;
  tamanhosPorEmpresa: Record<string, number>;
  arquivosPorTipo: Record<string, number>;
  arquivosPorStatus: Record<string, number>;
  mediaUploadTime: number;
  mediaProcessingTime: number;
  taxaSucesso: number;
  taxaFalha: number;
  arquivosExpirados: number;
  arquivosProcessados: number;
}

/**
 * Interface para métricas de performance
 */
export interface PerformanceMetrics {
  operacoesPorMinuto: number;
  tempoMedioUpload: number;
  tempoMedioDownload: number;
  tempoMedioProcessamento: number;
  latenciaMediaStorage: number;
  picos: {
    timestamp: string;
    operacao: string;
    duracao: number;
  }[];
  gargalos: {
    operacao: string;
    frequencia: number;
    tempoMedio: number;
  }[];
}

/**
 * Serviço de auditoria específico para sistema de anexos
 */
export class AnexoAuditService {
  private metricsCache: Map<string, any> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutos

  /**
   * Registra operação de upload iniciado
   */
  async logUploadIniciado(
    empresaId: string,
    nomeArquivo: string,
    tamanhoArquivo: number,
    tipoArquivo: string,
    userId?: string
  ): Promise<void> {
    await this.logAnexoOperation(
      'anexo_upload_iniciado',
      {
        empresaId,
        nomeArquivo,
        tamanhoArquivo,
        tipoArquivo,
        validacoes: {
          tipoPermitido: this.isTipoPermitido(tipoArquivo),
          tamanhoValido: tamanhoArquivo <= 10 * 1024 * 1024
        }
      },
      'success',
      undefined,
      userId
    );
  }

  /**
   * Registra operação de upload concluído
   */
  async logUploadConcluido(
    anexoData: AnexoData,
    uploadTime: number,
    storageInfo: { bucket: string; path: string; size: number },
    userId?: string
  ): Promise<void> {
    await this.logAnexoOperation(
      'anexo_upload_concluido',
      {
        anexoId: anexoData.id,
        empresaId: anexoData.empresaId,
        nomeArquivo: anexoData.nome,
        tamanhoArquivo: anexoData.tamanho,
        tipoArquivo: anexoData.tipo,
        storageInfo,
        performanceMetrics: {
          uploadTime
        }
      },
      'success',
      anexoData.id,
      userId,
      uploadTime
    );
  }

  /**
   * Registra falha no upload
   */
  async logUploadFalhou(
    empresaId: string,
    nomeArquivo: string,
    erro: Error,
    uploadTime?: number,
    userId?: string
  ): Promise<void> {
    await this.logAnexoOperation(
      'anexo_upload_falhou',
      {
        empresaId,
        nomeArquivo,
        erro: {
          message: erro.message,
          stack: erro.stack,
          name: erro.name
        },
        performanceMetrics: uploadTime ? { uploadTime } : undefined
      },
      'failure',
      undefined,
      userId,
      uploadTime
    );
  }

  /**
   * Registra validação de tipo de arquivo
   */
  async logValidacaoTipo(
    nomeArquivo: string,
    tipoArquivo: string,
    valido: boolean,
    userId?: string
  ): Promise<void> {
    await this.logAnexoOperation(
      'anexo_validacao_tipo',
      {
        nomeArquivo,
        tipoArquivo,
        valido,
        tiposPermitidos: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ]
      },
      valido ? 'success' : 'warning',
      undefined,
      userId
    );
  }

  /**
   * Registra validação de tamanho
   */
  async logValidacaoTamanho(
    nomeArquivo: string,
    tamanhoArquivo: number,
    valido: boolean,
    limite: number,
    userId?: string
  ): Promise<void> {
    await this.logAnexoOperation(
      'anexo_validacao_tamanho',
      {
        nomeArquivo,
        tamanhoArquivo,
        tamanhoMB: Math.round(tamanhoArquivo / 1024 / 1024 * 100) / 100,
        limite,
        limiteMB: Math.round(limite / 1024 / 1024),
        valido,
        percentualLimite: Math.round((tamanhoArquivo / limite) * 100)
      },
      valido ? 'success' : 'warning',
      undefined,
      userId
    );
  }

  /**
   * Registra validação de limite total por empresa
   */
  async logValidacaoLimiteTotal(
    empresaId: string,
    tamanhoAtual: number,
    tamanhoNovo: number,
    limite: number,
    valido: boolean,
    userId?: string
  ): Promise<void> {
    const tamanhoTotal = tamanhoAtual + tamanhoNovo;
    
    await this.logAnexoOperation(
      'anexo_validacao_limite_total',
      {
        empresaId,
        tamanhoAtual,
        tamanhoNovo,
        tamanhoTotal,
        limite,
        tamanhoAtualMB: Math.round(tamanhoAtual / 1024 / 1024 * 100) / 100,
        tamanhoNovoMB: Math.round(tamanhoNovo / 1024 / 1024 * 100) / 100,
        tamanhoTotalMB: Math.round(tamanhoTotal / 1024 / 1024 * 100) / 100,
        limiteMB: Math.round(limite / 1024 / 1024),
        valido,
        percentualUso: Math.round((tamanhoTotal / limite) * 100),
        espacoRestante: limite - tamanhoTotal,
        espacoRestanteMB: Math.round((limite - tamanhoTotal) / 1024 / 1024 * 100) / 100
      },
      valido ? 'success' : 'warning',
      undefined,
      userId
    );
  }

  /**
   * Registra geração de token
   */
  async logTokenGerado(
    anexoId: string,
    empresaId: string,
    tokenDuration: number,
    userId?: string
  ): Promise<void> {
    await this.logAnexoOperation(
      'anexo_token_gerado',
      {
        anexoId,
        empresaId,
        tokenDuration,
        expiresAt: new Date(Date.now() + tokenDuration * 1000).toISOString(),
        securityInfo: {
          tokenGenerated: true
        }
      },
      'success',
      anexoId,
      userId
    );
  }

  /**
   * Registra validação de token
   */
  async logTokenValidado(
    anexoId: string,
    valido: boolean,
    motivo?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAnexoOperation(
      'anexo_token_validado',
      {
        anexoId,
        valido,
        motivo,
        securityInfo: {
          tokenValidated: valido,
          accessGranted: valido,
          ipAddress,
          userAgent
        }
      },
      valido ? 'success' : 'warning',
      anexoId
    );
  }

  /**
   * Registra autorização de download
   */
  async logDownloadAutorizado(
    anexoId: string,
    empresaId: string,
    nomeArquivo: string,
    downloadTime?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAnexoOperation(
      'anexo_download_autorizado',
      {
        anexoId,
        empresaId,
        nomeArquivo,
        performanceMetrics: downloadTime ? { downloadTime } : undefined,
        securityInfo: {
          accessGranted: true,
          ipAddress,
          userAgent
        }
      },
      'success',
      anexoId,
      undefined,
      downloadTime
    );
  }

  /**
   * Registra remoção de anexo
   */
  async logAnexoRemovido(
    anexoId: string,
    empresaId: string,
    nomeArquivo: string,
    motivo: 'usuario' | 'expiracao' | 'limpeza' | 'erro',
    userId?: string
  ): Promise<void> {
    await this.logAnexoOperation(
      'anexo_removido',
      {
        anexoId,
        empresaId,
        nomeArquivo,
        motivo,
        removidoPor: userId ? 'usuario' : 'sistema'
      },
      'success',
      anexoId,
      userId
    );
  }

  /**
   * Registra movimentação para storage permanente
   */
  async logMovidoPermanente(
    anexoId: string,
    empresaId: string,
    nomeArquivo: string,
    processingTime: number,
    userId?: string
  ): Promise<void> {
    await this.logAnexoOperation(
      'anexo_movido_permanente',
      {
        anexoId,
        empresaId,
        nomeArquivo,
        performanceMetrics: {
          processingTime
        }
      },
      'success',
      anexoId,
      userId,
      processingTime
    );
  }

  /**
   * Registra limpeza de anexos expirados
   */
  async logLimpezaExpirados(
    anexosRemovidos: number,
    tamanhoLiberado: number,
    tempoExecucao: number,
    detalhes?: { anexoId: string; empresaId: string; nomeArquivo: string }[]
  ): Promise<void> {
    await this.logAnexoOperation(
      'anexo_limpeza_expirados',
      {
        anexosRemovidos,
        tamanhoLiberado,
        tamanhoLiberadoMB: Math.round(tamanhoLiberado / 1024 / 1024 * 100) / 100,
        tempoExecucao,
        detalhes: detalhes?.slice(0, 10), // Limitar detalhes para evitar logs muito grandes
        totalDetalhes: detalhes?.length || 0
      },
      'success',
      undefined,
      undefined,
      tempoExecucao
    );
  }

  /**
   * Registra preparação para webhook
   */
  async logWebhookPreparado(
    empresaId: string,
    anexos: Array<{ anexoId: string; nome: string; tamanho: number }>,
    tempoPreparacao: number
  ): Promise<void> {
    await this.logAnexoOperation(
      'anexo_webhook_preparado',
      {
        empresaId,
        totalAnexos: anexos.length,
        tamanhoTotal: anexos.reduce((sum, a) => sum + a.tamanho, 0),
        anexos: anexos.map(a => ({
          anexoId: a.anexoId,
          nome: a.nome,
          tamanho: a.tamanho
        })),
        performanceMetrics: {
          processingTime: tempoPreparacao
        }
      },
      'success',
      undefined,
      undefined,
      tempoPreparacao
    );
  }

  /**
   * Registra erro de storage
   */
  async logStorageErro(
    operacao: string,
    erro: Error,
    contexto: Record<string, any>
  ): Promise<void> {
    await this.logAnexoOperation(
      'anexo_storage_erro',
      {
        operacao,
        erro: {
          message: erro.message,
          stack: erro.stack,
          name: erro.name
        },
        contexto
      },
      'failure'
    );
  }

  /**
   * Registra erro de banco de dados
   */
  async logDatabaseErro(
    operacao: string,
    erro: Error,
    contexto: Record<string, any>
  ): Promise<void> {
    await this.logAnexoOperation(
      'anexo_database_erro',
      {
        operacao,
        erro: {
          message: erro.message,
          stack: erro.stack,
          name: erro.name
        },
        contexto
      },
      'failure'
    );
  }

  /**
   * Obtém métricas de uso de storage
   */
  async obterMetricasStorage(forceRefresh = false): Promise<StorageMetrics> {
    const cacheKey = 'storage_metrics';
    
    if (!forceRefresh && this.metricsCache.has(cacheKey)) {
      const cached = this.metricsCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Buscar dados dos anexos
      const { data: anexos, error } = await supabase
        .from('anexos_temporarios')
        .select('empresa_id, tipo_mime, tamanho_bytes, status, data_upload, data_expiracao, data_processamento');

      if (error) {
        throw new Error(`Erro ao buscar dados de anexos: ${error.message}`);
      }

      // Buscar logs de auditoria para métricas de performance
      const logs = auditLogger.getLogs({
        entityType: 'anexo',
        limit: 1000
      });

      const uploadLogs = logs.filter(log => 
        log.operation === 'anexo_upload_concluido' && log.duration
      );

      const processingLogs = logs.filter(log => 
        (log.operation === 'anexo_movido_permanente' || 
         log.operation === 'anexo_processamento_concluido') && log.duration
      );

      // Calcular métricas
      const totalArquivos = anexos?.length || 0;
      const tamanhoTotalBytes = anexos?.reduce((sum, a) => sum + a.tamanho_bytes, 0) || 0;
      
      const arquivosPorEmpresa: Record<string, number> = {};
      const tamanhosPorEmpresa: Record<string, number> = {};
      const arquivosPorTipo: Record<string, number> = {};
      const arquivosPorStatus: Record<string, number> = {};

      anexos?.forEach(anexo => {
        // Por empresa
        arquivosPorEmpresa[anexo.empresa_id] = (arquivosPorEmpresa[anexo.empresa_id] || 0) + 1;
        tamanhosPorEmpresa[anexo.empresa_id] = (tamanhosPorEmpresa[anexo.empresa_id] || 0) + anexo.tamanho_bytes;
        
        // Por tipo
        arquivosPorTipo[anexo.tipo_mime] = (arquivosPorTipo[anexo.tipo_mime] || 0) + 1;
        
        // Por status
        arquivosPorStatus[anexo.status] = (arquivosPorStatus[anexo.status] || 0) + 1;
      });

      const mediaUploadTime = uploadLogs.length > 0
        ? uploadLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / uploadLogs.length
        : 0;

      const mediaProcessingTime = processingLogs.length > 0
        ? processingLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / processingLogs.length
        : 0;

      const sucessoLogs = logs.filter(log => log.result === 'success').length;
      const falhaLogs = logs.filter(log => log.result === 'failure').length;
      const totalLogs = sucessoLogs + falhaLogs;

      const taxaSucesso = totalLogs > 0 ? (sucessoLogs / totalLogs) * 100 : 0;
      const taxaFalha = totalLogs > 0 ? (falhaLogs / totalLogs) * 100 : 0;

      const arquivosExpirados = anexos?.filter(a => 
        new Date(a.data_expiracao) < new Date()
      ).length || 0;

      const arquivosProcessados = anexos?.filter(a => 
        a.status === 'processado'
      ).length || 0;

      const metrics: StorageMetrics = {
        totalArquivos,
        tamanhoTotalBytes,
        tamanhoTotalMB: Math.round(tamanhoTotalBytes / 1024 / 1024 * 100) / 100,
        arquivosPorEmpresa,
        tamanhosPorEmpresa,
        arquivosPorTipo,
        arquivosPorStatus,
        mediaUploadTime,
        mediaProcessingTime,
        taxaSucesso,
        taxaFalha,
        arquivosExpirados,
        arquivosProcessados
      };

      // Cache das métricas
      this.metricsCache.set(cacheKey, {
        data: metrics,
        timestamp: Date.now()
      });

      return metrics;
    } catch (error) {
      console.error('Erro ao obter métricas de storage:', error);
      throw error;
    }
  }

  /**
   * Obtém métricas de performance
   */
  async obterMetricasPerformance(periodoHoras = 24): Promise<PerformanceMetrics> {
    const cacheKey = `performance_metrics_${periodoHoras}h`;
    
    if (this.metricsCache.has(cacheKey)) {
      const cached = this.metricsCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const dataInicio = new Date();
      dataInicio.setHours(dataInicio.getHours() - periodoHoras);

      const logs = auditLogger.getLogs({
        entityType: 'anexo',
        startDate: dataInicio,
        limit: 5000
      });

      const logsComDuracao = logs.filter(log => log.duration && log.duration > 0);
      
      // Operações por minuto
      const operacoesPorMinuto = logs.length / (periodoHoras * 60);

      // Tempos médios por tipo de operação
      const uploadLogs = logsComDuracao.filter(log => log.operation === 'anexo_upload_concluido');
      const downloadLogs = logsComDuracao.filter(log => log.operation === 'anexo_download_autorizado');
      const processingLogs = logsComDuracao.filter(log => 
        log.operation === 'anexo_movido_permanente' || 
        log.operation === 'anexo_processamento_concluido'
      );

      const tempoMedioUpload = uploadLogs.length > 0
        ? uploadLogs.reduce((sum, log) => sum + log.duration!, 0) / uploadLogs.length
        : 0;

      const tempoMedioDownload = downloadLogs.length > 0
        ? downloadLogs.reduce((sum, log) => sum + log.duration!, 0) / downloadLogs.length
        : 0;

      const tempoMedioProcessamento = processingLogs.length > 0
        ? processingLogs.reduce((sum, log) => sum + log.duration!, 0) / processingLogs.length
        : 0;

      // Latência média de storage (baseada em operações de upload/download)
      const storageOps = [...uploadLogs, ...downloadLogs];
      const latenciaMediaStorage = storageOps.length > 0
        ? storageOps.reduce((sum, log) => sum + log.duration!, 0) / storageOps.length
        : 0;

      // Identificar picos de performance (operações que demoraram mais que 2x a média)
      const picos = logsComDuracao
        .filter(log => {
          const media = tempoMedioUpload || tempoMedioDownload || tempoMedioProcessamento || 1000;
          return log.duration! > media * 2;
        })
        .sort((a, b) => b.duration! - a.duration!)
        .slice(0, 10)
        .map(log => ({
          timestamp: log.timestamp,
          operacao: log.operation,
          duracao: log.duration!
        }));

      // Identificar gargalos (operações que frequentemente demoram mais)
      const operacoesPorTipo: Record<string, { count: number; totalTime: number }> = {};
      
      logsComDuracao.forEach(log => {
        const op = log.operation;
        if (!operacoesPorTipo[op]) {
          operacoesPorTipo[op] = { count: 0, totalTime: 0 };
        }
        operacoesPorTipo[op].count++;
        operacoesPorTipo[op].totalTime += log.duration!;
      });

      const gargalos = Object.entries(operacoesPorTipo)
        .map(([operacao, stats]) => ({
          operacao,
          frequencia: stats.count,
          tempoMedio: stats.totalTime / stats.count
        }))
        .filter(g => g.frequencia >= 5) // Apenas operações com pelo menos 5 ocorrências
        .sort((a, b) => b.tempoMedio - a.tempoMedio)
        .slice(0, 5);

      const metrics: PerformanceMetrics = {
        operacoesPorMinuto,
        tempoMedioUpload,
        tempoMedioDownload,
        tempoMedioProcessamento,
        latenciaMediaStorage,
        picos,
        gargalos
      };

      // Cache das métricas
      this.metricsCache.set(cacheKey, {
        data: metrics,
        timestamp: Date.now()
      });

      return metrics;
    } catch (error) {
      console.error('Erro ao obter métricas de performance:', error);
      throw error;
    }
  }

  /**
   * Obtém logs de auditoria específicos de anexos
   */
  obterLogsAnexos(filtros?: {
    anexoId?: string;
    empresaId?: string;
    operation?: AnexoAuditOperation;
    result?: 'success' | 'failure' | 'warning';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): AnexoAuditLogEntry[] {
    const logs = auditLogger.getLogs({
      entityType: 'anexo',
      operation: filtros?.operation,
      result: filtros?.result,
      startDate: filtros?.startDate,
      endDate: filtros?.endDate,
      limit: filtros?.limit
    });

    let filteredLogs = logs as AnexoAuditLogEntry[];

    if (filtros?.anexoId) {
      filteredLogs = filteredLogs.filter(log => 
        log.anexoId === filtros.anexoId || 
        log.details.anexoId === filtros.anexoId
      );
    }

    if (filtros?.empresaId) {
      filteredLogs = filteredLogs.filter(log => 
        log.empresaId === filtros.empresaId || 
        log.details.empresaId === filtros.empresaId
      );
    }

    return filteredLogs;
  }

  /**
   * Limpa cache de métricas
   */
  limparCacheMetricas(): void {
    this.metricsCache.clear();
  }

  /**
   * Método privado para registrar operações de anexo
   */
  private async logAnexoOperation(
    operation: AnexoAuditOperation,
    details: Record<string, any>,
    result: 'success' | 'failure' | 'warning' = 'success',
    anexoId?: string,
    userId?: string,
    duration?: number
  ): Promise<void> {
    await auditLogger.logOperation(
      operation as any,
      'anexo',
      {
        ...details,
        anexoId,
        timestamp: new Date().toISOString()
      },
      result,
      anexoId,
      userId,
      duration
    );
  }

  /**
   * Verifica se o tipo de arquivo é permitido
   */
  private isTipoPermitido(tipoArquivo: string): boolean {
    const tiposPermitidos = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    return tiposPermitidos.includes(tipoArquivo);
  }
}

// Instância singleton do serviço de auditoria de anexos
export const anexoAuditService = new AnexoAuditService();