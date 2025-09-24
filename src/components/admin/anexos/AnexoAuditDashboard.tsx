import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileText, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  HardDrive,
  TrendingUp,
  Download,
  Upload,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { anexoAuditService, type StorageMetrics, type PerformanceMetrics, type AnexoAuditLogEntry } from '@/services/anexoAuditService';
import { formatBytes, formatDuration } from '@/lib/utils';

interface AnexoAuditDashboardProps {
  className?: string;
}

export function AnexoAuditDashboard({ className }: AnexoAuditDashboardProps) {
  const [storageMetrics, setStorageMetrics] = useState<StorageMetrics | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AnexoAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>('');
  const [filtroOperacao, setFiltroOperacao] = useState<string>('');
  const [filtroResultado, setFiltroResultado] = useState<string>('');
  const [periodoHoras, setPeriodoHoras] = useState<number>(24);

  useEffect(() => {
    carregarDados();
  }, [periodoHoras]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);

      const [storage, performance, logs] = await Promise.all([
        anexoAuditService.obterMetricasStorage(),
        anexoAuditService.obterMetricasPerformance(periodoHoras),
        anexoAuditService.obterLogsAnexos({
          limit: 100,
          startDate: new Date(Date.now() - periodoHoras * 60 * 60 * 1000)
        })
      ]);

      setStorageMetrics(storage);
      setPerformanceMetrics(performance);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Erro ao carregar dados de auditoria:', err);
      setError('Erro ao carregar dados de auditoria');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    return auditLogs.filter(log => {
      if (filtroEmpresa && !log.details.empresaId?.includes(filtroEmpresa)) return false;
      if (filtroOperacao && log.operation !== filtroOperacao) return false;
      if (filtroResultado && log.result !== filtroResultado) return false;
      return true;
    });
  };

  const formatarOperacao = (operacao: string): string => {
    const operacoes: Record<string, string> = {
      'anexo_upload_iniciado': 'Upload Iniciado',
      'anexo_upload_concluido': 'Upload Concluído',
      'anexo_upload_falhou': 'Upload Falhou',
      'anexo_validacao_tipo': 'Validação de Tipo',
      'anexo_validacao_tamanho': 'Validação de Tamanho',
      'anexo_validacao_limite_total': 'Validação de Limite',
      'anexo_token_gerado': 'Token Gerado',
      'anexo_token_validado': 'Token Validado',
      'anexo_download_autorizado': 'Download Autorizado',
      'anexo_removido': 'Anexo Removido',
      'anexo_movido_permanente': 'Movido para Permanente',
      'anexo_limpeza_expirados': 'Limpeza de Expirados',
      'anexo_webhook_preparado': 'Webhook Preparado',
      'anexo_storage_erro': 'Erro de Storage',
      'anexo_database_erro': 'Erro de Banco'
    };
    
    return operacoes[operacao] || operacao;
  };

  const getResultadoBadge = (resultado: string) => {
    const variants = {
      success: 'default' as const,
      warning: 'secondary' as const,
      failure: 'destructive' as const
    };
    
    const labels = {
      success: 'Sucesso',
      warning: 'Aviso',
      failure: 'Falha'
    };
    
    return (
      <Badge variant={variants[resultado as keyof typeof variants] || 'outline'}>
        {labels[resultado as keyof typeof labels] || resultado}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando dados de auditoria...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center text-red-600">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
          <Button onClick={carregarDados} className="mt-4" variant="outline">
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const logsFilterados = aplicarFiltros();

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Auditoria de Anexos</h2>
          <p className="text-muted-foreground">
            Monitoramento e métricas do sistema de anexos
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={periodoHoras.toString()} onValueChange={(value) => setPeriodoHoras(Number(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 hora</SelectItem>
              <SelectItem value="6">6 horas</SelectItem>
              <SelectItem value="24">24 horas</SelectItem>
              <SelectItem value="168">7 dias</SelectItem>
              <SelectItem value="720">30 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={carregarDados} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="metricas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metricas">Métricas</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="logs">Logs de Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="metricas" className="space-y-4">
          {storageMetrics && (
            <>
              {/* Cards de Resumo */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Arquivos</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{storageMetrics.totalArquivos}</div>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(storageMetrics.tamanhoTotalBytes)} utilizados
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{storageMetrics.taxaSucesso.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">
                      {storageMetrics.taxaFalha.toFixed(1)}% de falhas
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Arquivos Processados</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{storageMetrics.arquivosProcessados}</div>
                    <p className="text-xs text-muted-foreground">
                      {storageMetrics.arquivosExpirados} expirados
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tempo Médio Upload</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatDuration(storageMetrics.mediaUploadTime)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Processamento: {formatDuration(storageMetrics.mediaProcessingTime)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos de Distribuição */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Arquivos por Tipo</CardTitle>
                    <CardDescription>Distribuição por tipo MIME</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(storageMetrics.arquivosPorTipo).map(([tipo, count]) => (
                        <div key={tipo} className="flex items-center justify-between">
                          <span className="text-sm truncate">{tipo.split('/').pop()}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Arquivos por Status</CardTitle>
                    <CardDescription>Distribuição por status de processamento</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(storageMetrics.arquivosPorStatus).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{status}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {performanceMetrics && (
            <>
              {/* Métricas de Performance */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Operações/min</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {performanceMetrics.operacoesPorMinuto.toFixed(1)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Upload Médio</CardTitle>
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatDuration(performanceMetrics.tempoMedioUpload)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Download Médio</CardTitle>
                    <Download className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatDuration(performanceMetrics.tempoMedioDownload)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Latência Storage</CardTitle>
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatDuration(performanceMetrics.latenciaMediaStorage)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Picos e Gargalos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Picos de Performance</CardTitle>
                    <CardDescription>Operações mais lentas recentes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {performanceMetrics.picos.slice(0, 5).map((pico, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="truncate">{formatarOperacao(pico.operacao)}</span>
                          <Badge variant="secondary">{formatDuration(pico.duracao)}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Gargalos Identificados</CardTitle>
                    <CardDescription>Operações frequentemente lentas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {performanceMetrics.gargalos.map((gargalo, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div>
                            <div className="truncate">{formatarOperacao(gargalo.operacao)}</div>
                            <div className="text-xs text-muted-foreground">
                              {gargalo.frequencia} ocorrências
                            </div>
                          </div>
                          <Badge variant="outline">{formatDuration(gargalo.tempoMedio)}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="filtro-empresa">Empresa ID</Label>
                  <Input
                    id="filtro-empresa"
                    placeholder="ID da empresa..."
                    value={filtroEmpresa}
                    onChange={(e) => setFiltroEmpresa(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="filtro-operacao">Operação</Label>
                  <Select value={filtroOperacao} onValueChange={setFiltroOperacao}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as operações" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas</SelectItem>
                      <SelectItem value="anexo_upload_concluido">Upload Concluído</SelectItem>
                      <SelectItem value="anexo_upload_falhou">Upload Falhou</SelectItem>
                      <SelectItem value="anexo_removido">Anexo Removido</SelectItem>
                      <SelectItem value="anexo_limpeza_expirados">Limpeza</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="filtro-resultado">Resultado</Label>
                  <Select value={filtroResultado} onValueChange={setFiltroResultado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os resultados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="success">Sucesso</SelectItem>
                      <SelectItem value="warning">Aviso</SelectItem>
                      <SelectItem value="failure">Falha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Logs de Auditoria</CardTitle>
              <CardDescription>
                {logsFilterados.length} de {auditLogs.length} registros
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logsFilterados.map((log) => (
                  <div key={log.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">
                          {formatarOperacao(log.operation)}
                        </span>
                        {getResultadoBadge(log.result)}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    
                    {log.details.nomeArquivo && (
                      <div className="text-sm text-muted-foreground">
                        Arquivo: {log.details.nomeArquivo}
                      </div>
                    )}
                    
                    {log.details.empresaId && (
                      <div className="text-sm text-muted-foreground">
                        Empresa: {log.details.empresaId}
                      </div>
                    )}
                    
                    {log.duration && (
                      <div className="text-sm text-muted-foreground">
                        Duração: {formatDuration(log.duration)}
                      </div>
                    )}
                    
                    {log.details.erro && (
                      <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        {log.details.erro.message || log.details.erro}
                      </div>
                    )}
                  </div>
                ))}
                
                {logsFilterados.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum log encontrado com os filtros aplicados
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AnexoAuditDashboard;