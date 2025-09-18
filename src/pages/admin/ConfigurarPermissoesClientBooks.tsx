import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Users, 
  Settings,
  RefreshCw,
  Eye
} from 'lucide-react';
import { useClientBooksPermissions } from '@/hooks/useClientBooksPermissions';
import AdminLayout from '@/components/admin/LayoutAdmin';

const ConfigurarPermissoesClientBooks: React.FC = () => {
  const [verificacaoRealizada, setVerificacaoRealizada] = useState(false);
  const [statusVerificacao, setStatusVerificacao] = useState<any>(null);
  
  const {
    setupPermissions,
    verifyPermissions,
    isLoading,
    error
  } = useClientBooksPermissions();

  // Verificar status das permissões ao carregar a página
  useEffect(() => {
    handleVerificarPermissoes();
  }, []);

  const handleVerificarPermissoes = async () => {
    try {
      const resultado = await verifyPermissions();
      setStatusVerificacao(resultado);
      setVerificacaoRealizada(true);
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
    }
  };

  const handleConfigurarPermissoes = async () => {
    try {
      await setupPermissions();
      // Verificar novamente após configurar
      await handleVerificarPermissoes();
    } catch (error) {
      console.error('Erro ao configurar permissões:', error);
    }
  };

  const telasEsperadas = [
    { key: 'empresas_clientes', name: 'Cadastro de Empresas' },
    { key: 'clientes', name: 'Cadastro de Clientes' },
    { key: 'grupos_responsaveis', name: 'Grupos de Responsáveis' },
    { key: 'controle_disparos', name: 'Controle de Disparos' },
    { key: 'historico_books', name: 'Histórico de Books' }
  ];

  const telasRegistradas = statusVerificacao?.screens || [];
  const permissoesConfiguradas = statusVerificacao?.permissions || [];

  const todasTelasRegistradas = telasEsperadas.every(tela => 
    telasRegistradas.some((t: any) => t.key === tela.key)
  );

  const todasPermissoesConfiguradas = telasEsperadas.every(tela =>
    permissoesConfiguradas.some((p: any) => p.screen_key === tela.key && p.permission_level === 'edit')
  );

  const configuracaoCompleta = todasTelasRegistradas && todasPermissoesConfiguradas;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Configurar Permissões - Sistema de Client Books
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Configure as permissões para o sistema de gerenciamento de clientes e books
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleVerificarPermissoes}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Verificar Status
            </Button>
          </div>
        </div>

        {/* Status Geral */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Status da Configuração
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!verificacaoRealizada ? (
              <div className="flex items-center gap-2 text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verificando status das permissões...
              </div>
            ) : configuracaoCompleta ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Configuração completa!</strong> Todas as telas estão registradas e as permissões estão configuradas corretamente.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Configuração incompleta.</strong> Algumas telas ou permissões precisam ser configuradas.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Ação Principal */}
        {!configuracaoCompleta && (
          <Card>
            <CardHeader>
              <CardTitle>Configurar Permissões</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Clique no botão abaixo para registrar as telas do sistema de client books 
                e configurar as permissões padrão para administradores.
              </p>
              
              <Button
                onClick={handleConfigurarPermissoes}
                disabled={isLoading}
                className="flex items-center gap-2"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Configurando...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4" />
                    Configurar Permissões do Client Books
                  </>
                )}
              </Button>

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>Erro:</strong> {error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Detalhes das Telas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Status das Telas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {telasEsperadas.map((tela) => {
                const telaRegistrada = telasRegistradas.find((t: any) => t.key === tela.key);
                const permissaoConfigurada = permissoesConfiguradas.find((p: any) => 
                  p.screen_key === tela.key && p.permission_level === 'edit'
                );

                return (
                  <div
                    key={tela.key}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{tela.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Chave: {tela.key}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={telaRegistrada ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {telaRegistrada ? "Registrada" : "Não Registrada"}
                      </Badge>
                      
                      <Badge 
                        variant={permissaoConfigurada ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {permissaoConfigurada ? "Permissão OK" : "Sem Permissão"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Detalhes das Permissões */}
        {permissoesConfiguradas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Permissões Configuradas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {permissoesConfiguradas.map((permissao: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 border rounded text-sm"
                  >
                    <span>{permissao.screen_key}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {permissao.user_groups?.name || 'Grupo não encontrado'}
                      </Badge>
                      <Badge 
                        variant={permissao.permission_level === 'edit' ? 'default' : 'secondary'}
                      >
                        {permissao.permission_level}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Próximos Passos */}
        {configuracaoCompleta && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Configuração Concluída</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p>✅ Todas as telas foram registradas no sistema de permissões</p>
                <p>✅ Permissões de administrador foram configuradas</p>
                <p>✅ O sistema está pronto para uso</p>
                
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-blue-800 dark:text-blue-200 font-medium">
                    Próximos passos:
                  </p>
                  <ul className="text-blue-700 dark:text-blue-300 text-sm mt-1 space-y-1">
                    <li>• Navegue para as páginas do sistema de client books</li>
                    <li>• Configure grupos de usuários específicos se necessário</li>
                    <li>• Esta página pode ser removida após a configuração</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default ConfigurarPermissoesClientBooks;