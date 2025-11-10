/**
 * Componente para monitoramento de vigências de contratos
 * Exibe status das vigências e permite execução manual de verificações
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useVigenciaMonitor } from '@/hooks/useVigenciaMonitor';
import { 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  Play,
  TrendingDown,
  Building2,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface VigenciaMonitorProps {
  compacto?: boolean;
  showLogs?: boolean;
}

export function VigenciaMonitor({ compacto = false, showLogs = true }: VigenciaMonitorProps) {
  const {
    statusVigencias,
    estatisticas,
    logs,
    resumoVigencias,
    ultimaVerificacao,
    carregando,
    executandoVerificacao,
    executarVerificacaoManual,
    recarregarTodos
  } = useVigenciaMonitor({
    enableNotifications: true,
    notificationMode: compacto ? 'none' : 'auto' // Sem notificações no modo compacto
  });

  const formatarData = (data: string) => {
    return format(new Date(data), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatarDataHora = (data: string) => {
    return format(new Date(data), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const obterCorStatus = (status: 'VENCIDA' | 'VENCE_BREVE' | 'OK') => {
    switch (status) {
      case 'VENCIDA':
        return 'destructive';
      case 'VENCE_BREVE':
        return 'secondary';
      case 'OK':
        return 'default';
    }
  };

  const obterTextoStatus = (status: 'VENCIDA' | 'VENCE_BREVE' | 'OK', dias: number) => {
    switch (status) {
      case 'VENCIDA':
        return `Vencida há ${Math.abs(dias)} dia(s)`;
      case 'VENCE_BREVE':
        return `Vence em ${dias} dia(s)`;
      case 'OK':
        return `${dias} dias restantes`;
    }
  };

  if (compacto) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Vigências</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={recarregarTodos}
              disabled={carregando}
            >
              <RefreshCw className={`h-4 w-4 ${carregando ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {estatisticas && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-500" />
                <span>{estatisticas.empresas_ativas} ativas</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span>{estatisticas.vigencias_vencidas} vencidas</span>
              </div>
            </div>
          )}
          
          {resumoVigencias && resumoVigencias.vencidas > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {resumoVigencias.vencidas} empresa(s) com vigência vencida
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total de Empresas</p>
                <p className="text-2xl font-bold">{estatisticas?.total_empresas || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Empresas Ativas</p>
                <p className="text-2xl font-bold">{estatisticas?.empresas_ativas || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Vigências Vencidas</p>
                <p className="text-2xl font-bold">{estatisticas?.vigencias_vencidas || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Vencem em 30 dias</p>
                <p className="text-2xl font-bold">{estatisticas?.vigencias_vencendo_30_dias || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Controle de Vigências
          </CardTitle>
          <CardDescription>
            Execute verificações manuais e monitore o status das vigências
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Última verificação:</p>
              <p className="text-sm text-muted-foreground">
                {ultimaVerificacao 
                  ? formatarDataHora(ultimaVerificacao.toISOString())
                  : 'Nunca executada'
                }
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={recarregarTodos}
                disabled={carregando}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${carregando ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button
                onClick={executarVerificacaoManual}
                disabled={executandoVerificacao}
              >
                <Play className={`h-4 w-4 mr-2 ${executandoVerificacao ? 'animate-spin' : ''}`} />
                {executandoVerificacao ? 'Executando...' : 'Verificar Agora'}
              </Button>
            </div>
          </div>

          {estatisticas?.empresas_inativadas_hoje > 0 && (
            <Alert>
              <TrendingDown className="h-4 w-4" />
              <AlertDescription>
                {estatisticas.empresas_inativadas_hoje} empresa(s) foram inativadas hoje por vigência vencida
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Lista de Vigências */}
      {statusVigencias && statusVigencias.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Status das Vigências
            </CardTitle>
            <CardDescription>
              Empresas com vigência definida ordenadas por data de vencimento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statusVigencias.map((empresa) => (
                <div key={empresa.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{empresa.nome_completo}</p>
                    <p className="text-sm text-muted-foreground">
                      Vigência até: {formatarData(empresa.vigencia_final)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={obterCorStatus(empresa.status_vigencia)}>
                      {obterTextoStatus(empresa.status_vigencia, empresa.dias_restantes)}
                    </Badge>
                    <Badge variant={empresa.status === 'ativo' ? 'default' : 'secondary'}>
                      {empresa.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs do Sistema */}
      {showLogs && logs && logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Logs de Vigência</CardTitle>
            <CardDescription>
              Histórico de operações automáticas do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {logs.map((log, index) => (
                <div key={index} className="flex items-start gap-3 p-2 text-sm">
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2" />
                  <div className="flex-1">
                    <p className="font-medium">{log.operacao}</p>
                    <p className="text-muted-foreground">{log.detalhes}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatarDataHora(log.data_operacao)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}