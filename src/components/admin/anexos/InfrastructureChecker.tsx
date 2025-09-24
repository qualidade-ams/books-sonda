/**
 * Componente para Verificação da Infraestrutura de Anexos
 * Verifica e inicializa automaticamente os recursos necessários
 */

import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, RefreshCw, Info } from 'lucide-react';
import { AnexoInfrastructureUtils, InfrastructureStatus } from '@/utils/anexoInfrastructureUtils';

interface InfrastructureCheckerProps {
  onStatusChange?: (status: InfrastructureStatus) => void;
  autoCheck?: boolean;
  showDetails?: boolean;
}

export const InfrastructureChecker: React.FC<InfrastructureCheckerProps> = ({
  onStatusChange,
  autoCheck = true,
  showDetails = true
}) => {
  const [status, setStatus] = useState<InfrastructureStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [relatorio, setRelatorio] = useState<string>('');

  const verificarInfraestrutura = async () => {
    setLoading(true);
    setError(null);

    try {
      const novoStatus = await AnexoInfrastructureUtils.verificarInfraestrutura();
      setStatus(novoStatus);
      onStatusChange?.(novoStatus);

      if (showDetails) {
        const novoRelatorio = await AnexoInfrastructureUtils.gerarRelatorioInfraestrutura();
        setRelatorio(novoRelatorio);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const inicializarInfraestrutura = async () => {
    setLoading(true);
    setError(null);

    try {
      const resultado = await AnexoInfrastructureUtils.inicializarInfraestrutura();
      
      if (resultado.sucesso) {
        await verificarInfraestrutura(); // Recarregar status
      } else {
        setError(resultado.mensagem);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro na inicialização';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoCheck) {
      verificarInfraestrutura();
    }
  }, [autoCheck]);

  const getStatusIcon = (isReady: boolean) => {
    if (loading) return <Loader2 className="h-4 w-4 animate-spin" />;
    return isReady ? 
      <CheckCircle className="h-4 w-4 text-green-600" /> : 
      <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getStatusBadge = (isReady: boolean, label: string) => {
    const variant = isReady ? 'default' : 'destructive';
    const icon = isReady ? '✅' : '❌';
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <span>{icon}</span>
        {label}
      </Badge>
    );
  };

  if (!status && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Infraestrutura de Anexos
          </CardTitle>
          <CardDescription>
            Verificação da infraestrutura necessária para o sistema de anexos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={verificarInfraestrutura} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verificar Infraestrutura
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Geral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(status?.pronto || false)}
            Status da Infraestrutura de Anexos
          </CardTitle>
          <CardDescription>
            {status?.pronto 
              ? 'Todos os componentes estão configurados e funcionando'
              : 'Alguns componentes precisam ser configurados'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {status && (
              <>
                {getStatusBadge(status.bucketsExistem, 'Storage Buckets')}
                {getStatusBadge(status.tabelasExistem, 'Tabelas Database')}
                {getStatusBadge(status.politicasConfiguradas, 'Políticas RLS')}
                {getStatusBadge(status.funcoesExistem, 'Funções SQL')}
              </>
            )}
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={verificarInfraestrutura} 
              disabled={loading}
              variant="outline"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Verificar Novamente
            </Button>
            
            {status && !status.pronto && (
              <Button 
                onClick={inicializarInfraestrutura} 
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tentar Inicializar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Erros */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Erros de Status */}
      {status?.erros && status.erros.length > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Problemas encontrados:</p>
              <ul className="list-disc list-inside space-y-1">
                {status.erros.map((erro, index) => (
                  <li key={index} className="text-sm">{erro}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Relatório Detalhado */}
      {showDetails && relatorio && (
        <Card>
          <CardHeader>
            <CardTitle>Relatório Detalhado</CardTitle>
            <CardDescription>
              Informações completas sobre a configuração da infraestrutura
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-muted p-4 rounded-md overflow-auto whitespace-pre-wrap">
              {relatorio}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Instruções para Resolução */}
      {status && !status.pronto && (
        <Card>
          <CardHeader>
            <CardTitle>Como Resolver</CardTitle>
            <CardDescription>
              Passos para configurar a infraestrutura manualmente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">1. Execute as Migrações SQL</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Execute os seguintes arquivos no seu banco Supabase:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• <code>supabase/migration/anexos_infrastructure_migration.sql</code></li>
                  <li>• <code>supabase/migration/anexos_rls_policies.sql</code></li>
                  <li>• <code>supabase/migration/anexos_storage_setup.sql</code></li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">2. Verifique as Permissões</h4>
                <p className="text-sm text-muted-foreground">
                  Certifique-se de que seu usuário tem as permissões necessárias para:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Criar e gerenciar buckets no Supabase Storage</li>
                  <li>• Executar funções RPC no banco de dados</li>
                  <li>• Acessar a tela de disparos personalizados</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">3. Configure as Políticas RLS</h4>
                <p className="text-sm text-muted-foreground">
                  As políticas de segurança devem estar ativas para controlar o acesso aos anexos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InfrastructureChecker;