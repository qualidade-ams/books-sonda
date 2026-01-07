/**
 * Componente para diagnóstico da API de sincronização
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Copy,
  Server,
  Database,
  Zap
} from 'lucide-react';
import { diagnosticarApi, formatarTempo, gerarRelatorio, type DiagnosticoApi } from '@/utils/apiDiagnostics';
import { useToast } from '@/hooks/use-toast';

export function DiagnosticoApi() {
  const [diagnostico, setDiagnostico] = useState<DiagnosticoApi | null>(null);
  const [executando, setExecutando] = useState(false);
  const { toast } = useToast();

  const executarDiagnostico = async () => {
    setExecutando(true);
    try {
      const resultado = await diagnosticarApi();
      setDiagnostico(resultado);
      
      const sucessos = [
        resultado.healthCheck,
        resultado.testConnection,
        resultado.syncPesquisas,
        resultado.syncEspecialistas
      ].filter(Boolean).length;

      if (sucessos === 4) {
        toast({
          title: "Diagnóstico Concluído",
          description: "Todos os testes passaram! API funcionando corretamente.",
        });
      } else if (sucessos > 0) {
        toast({
          title: "Diagnóstico Concluído",
          description: `${sucessos}/4 testes passaram. Verifique os detalhes.`,
        });
      } else {
        toast({
          title: "Diagnóstico Concluído",
          description: "Nenhum teste passou. API parece estar offline.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro no Diagnóstico",
        description: "Falha ao executar diagnóstico da API.",
        variant: "destructive"
      });
    } finally {
      setExecutando(false);
    }
  };

  const copiarRelatorio = () => {
    if (!diagnostico) return;
    
    const relatorio = gerarRelatorio(diagnostico);
    navigator.clipboard.writeText(relatorio);
    
    toast({
      title: "Relatório Copiado",
      description: "Relatório de diagnóstico copiado para a área de transferência.",
    });
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getStatusBadge = (status: boolean, tempo?: number) => {
    return (
      <Badge variant={status ? "success" : "destructive"} className="ml-2">
        {status ? 'OK' : 'FALHOU'} {tempo && `(${formatarTempo(tempo)})`}
      </Badge>
    );
  };

  const getStatusGeral = () => {
    if (!diagnostico) return null;
    
    const sucessos = [
      diagnostico.healthCheck,
      diagnostico.testConnection,
      diagnostico.syncPesquisas,
      diagnostico.syncEspecialistas
    ].filter(Boolean).length;

    if (sucessos === 4) {
      return { icon: CheckCircle, text: 'TUDO OK', variant: 'default' as const, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-l-green-500' };
    } else if (sucessos > 0) {
      return { icon: AlertTriangle, text: 'PARCIAL', variant: 'default' as const, color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-l-yellow-500' };
    } else {
      return { icon: XCircle, text: 'OFFLINE', variant: 'destructive' as const, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-l-red-500' };
    }
  };

  const statusGeral = getStatusGeral();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-sonda-blue" />
              Diagnóstico da API
            </CardTitle>
            <CardDescription>
              Verificar conectividade e status dos endpoints da API de sincronização
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {diagnostico && (
              <Button
                variant="outline"
                size="sm"
                onClick={copiarRelatorio}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copiar Relatório
              </Button>
            )}
            <Button
              onClick={executarDiagnostico}
              disabled={executando}
              className="flex items-center gap-2 bg-sonda-blue hover:bg-sonda-dark-blue"
            >
              <RefreshCw className={`h-4 w-4 ${executando ? 'animate-spin' : ''}`} />
              {executando ? 'Executando...' : 'Executar Diagnóstico'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* URL da API */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Server className="h-4 w-4" />
          <span>URL: </span>
          <code className="bg-gray-100 px-2 py-1 rounded text-xs">
            {diagnostico?.configInfo?.apiUrl || import.meta.env.VITE_SYNC_API_URL || 'http://SAPSERVDB.sondait.com.br:3001'}
          </code>
        </div>

        {/* Informações de Configuração */}
        {diagnostico?.configInfo && (
          <div className="text-xs text-gray-500 space-y-1">
            <div>Protocolo: {diagnostico.configInfo.protocol}</div>
            <div>Ambiente: {diagnostico.configInfo.isDev ? 'Desenvolvimento' : 'Produção'}</div>
            <div>HTTPS: {diagnostico.configInfo.isHttps ? 'Sim' : 'Não'}</div>
          </div>
        )}

        {/* Status Geral */}
        {statusGeral && (
          <Alert variant={statusGeral.variant} className={`border-l-4 ${statusGeral.borderColor} ${statusGeral.bgColor}`}>
            <statusGeral.icon className={`h-4 w-4 ${statusGeral.color}`} />
            <AlertDescription className="flex items-center gap-2">
              <span className="font-semibold">Status Geral:</span>
              <Badge variant={statusGeral.variant === 'destructive' ? 'destructive' : statusGeral.text === 'TUDO OK' ? 'success' : 'warning'}>{statusGeral.text}</Badge>
            </AlertDescription>
          </Alert>
        )}

        {/* Resultados dos Testes */}
        {diagnostico && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-gray-700">Resultados dos Testes:</h4>
            
            <div className="grid gap-3">
              {/* Health Check */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(diagnostico.healthCheck)}
                  <Zap className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Health Check</span>
                </div>
                {getStatusBadge(diagnostico.healthCheck, diagnostico.tempos.healthCheck)}
              </div>

              {/* Conexão SQL Server */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(diagnostico.testConnection)}
                  <Database className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Conexão SQL Server</span>
                </div>
                {getStatusBadge(diagnostico.testConnection, diagnostico.tempos.testConnection)}
              </div>

              {/* Endpoint Pesquisas */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(diagnostico.syncPesquisas)}
                  <Server className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Endpoint Pesquisas</span>
                </div>
                {getStatusBadge(diagnostico.syncPesquisas, diagnostico.tempos.syncPesquisas)}
              </div>

              {/* Endpoint Especialistas */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(diagnostico.syncEspecialistas)}
                  <Server className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Endpoint Especialistas</span>
                </div>
                {getStatusBadge(diagnostico.syncEspecialistas, diagnostico.tempos.syncEspecialistas)}
              </div>
            </div>

            {/* Erros */}
            {diagnostico.erros.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-sm text-red-700 mb-2">Erros Encontrados:</h4>
                  <div className="space-y-1">
                    {diagnostico.erros.map((erro, index) => (
                      <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        • {erro}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Instruções */}
        {!diagnostico && (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">
              Clique em "Executar Diagnóstico" para verificar o status da API de sincronização.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}