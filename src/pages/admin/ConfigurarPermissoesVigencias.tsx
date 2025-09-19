/**
 * Página para configurar permissões da tela de Monitoramento de Vigências
 */

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ClientBooksPermissionsService } from '@/services/clientBooksPermissionsService';
import { 
  Settings, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  Shield,
  Monitor,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

const ConfigurarPermissoesVigencias = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const handleSetupPermissions = async () => {
    setIsLoading(true);
    try {
      const result = await ClientBooksPermissionsService.setupPermissions();
      
      if (result.success) {
        toast.success('Permissões configuradas com sucesso!');
        
        // Executar verificação automaticamente após configuração
        await handleVerifyPermissions();
      }
    } catch (error: any) {
      console.error('Erro ao configurar permissões:', error);
      toast.error(error.message || 'Erro ao configurar permissões');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPermissions = async () => {
    setIsVerifying(true);
    try {
      const result = await ClientBooksPermissionsService.verifyPermissions();
      setVerificationResult(result);
      
      if (result.success) {
        toast.success('Verificação concluída com sucesso!');
      }
    } catch (error: any) {
      console.error('Erro ao verificar permissões:', error);
      toast.error(error.message || 'Erro ao verificar permissões');
      setVerificationResult(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const getScreenCategoryIcon = (category: string) => {
    switch (category) {
      case 'admin':
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'client_books':
        return <Monitor className="h-4 w-4 text-blue-500" />;
      default:
        return <Settings className="h-4 w-4 text-gray-500" />;
    }
  };

  const getScreenCategoryLabel = (category: string) => {
    switch (category) {
      case 'admin':
        return 'Administração';
      case 'client_books':
        return 'Client Books';
      default:
        return category;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configurar Permissões - Monitoramento de Vigências</h1>
            <p className="text-gray-600">
              Configure as permissões para a tela de Monitoramento de Vigências
            </p>
          </div>
        </div>

        {/* Controles Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurar Permissões
              </CardTitle>
              <CardDescription>
                Registra a tela de Monitoramento de Vigências e configura permissões padrão
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleSetupPermissions}
                disabled={isLoading}
                className="w-full"
              >
                <Settings className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Configurando...' : 'Configurar Permissões'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Verificar Configuração
              </CardTitle>
              <CardDescription>
                Verifica se as permissões estão configuradas corretamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={handleVerifyPermissions}
                disabled={isVerifying}
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isVerifying ? 'animate-spin' : ''}`} />
                {isVerifying ? 'Verificando...' : 'Verificar Permissões'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Resultado da Verificação */}
        {verificationResult && (
          <div className="space-y-6">
            {/* Resumo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Status da Configuração
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {verificationResult.screens?.length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Telas Registradas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {verificationResult.permissions?.length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Permissões Configuradas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {verificationResult.success ? '✓' : '✗'}
                    </p>
                    <p className="text-sm text-muted-foreground">Status Geral</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Telas Registradas */}
            {verificationResult.screens && verificationResult.screens.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Telas Registradas
                  </CardTitle>
                  <CardDescription>
                    Telas disponíveis no sistema de permissões
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {verificationResult.screens.map((screen: any) => (
                      <div key={screen.key} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {screen.key === 'monitoramento_vigencias' ? (
                            <Calendar className="h-5 w-5 text-orange-500" />
                          ) : (
                            getScreenCategoryIcon(screen.category)
                          )}
                          <div>
                            <p className="font-medium">{screen.name}</p>
                            <p className="text-sm text-muted-foreground">{screen.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {getScreenCategoryLabel(screen.category)}
                          </Badge>
                          {screen.key === 'monitoramento_vigencias' && (
                            <Badge variant="default" className="bg-orange-500">
                              Nova Tela
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Permissões Configuradas */}
            {verificationResult.permissions && verificationResult.permissions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Permissões Configuradas
                  </CardTitle>
                  <CardDescription>
                    Permissões atribuídas aos grupos de usuários
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {verificationResult.permissions.map((permission: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Shield className="h-4 w-4 text-green-500" />
                          <div>
                            <p className="font-medium">{permission.screen_key}</p>
                            <p className="text-sm text-muted-foreground">
                              Grupo: {permission.user_groups?.name || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={permission.permission_level === 'edit' ? 'default' : 'secondary'}
                          >
                            {permission.permission_level === 'edit' ? 'Edição' : 'Visualização'}
                          </Badge>
                          {permission.user_groups?.is_default_admin && (
                            <Badge variant="outline" className="text-red-600 border-red-600">
                              Admin
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Instruções */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Instruções
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Importante:</strong> Esta configuração registra a tela "Monitoramento de Vigências" 
                no sistema de permissões e atribui permissão de edição para o grupo de administradores.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="font-medium">O que esta configuração faz:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Registra a tela "Monitoramento de Vigências" no sistema</li>
                <li>Configura permissão de edição para administradores</li>
                <li>Permite acesso à funcionalidade de monitoramento de vigências</li>
                <li>Inclui controle de jobs automáticos e verificação manual</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Após a configuração:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>A tela aparecerá na lista de permissões dos grupos</li>
                <li>Administradores terão acesso completo à funcionalidade</li>
                <li>Outros grupos podem receber permissões específicas conforme necessário</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default ConfigurarPermissoesVigencias;