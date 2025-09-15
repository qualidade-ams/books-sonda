import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClientBooksPermissions } from '@/hooks/useClientBooksPermissions';

interface FixResult {
  success: boolean;
  message: string;
  details?: string[];
}

const PermissionsFixer: React.FC = () => {
  const { user } = useAuth();
  const [isFixing, setIsFixing] = useState(false);
  const [result, setResult] = useState<FixResult | null>(null);
  const { setupPermissions, isLoading: isSettingUpClientBooks } = useClientBooksPermissions();

  const fixPermissions = async () => {
    if (!user) {
      setResult({
        success: false,
        message: 'Usuário não está logado'
      });
      return;
    }

    setIsFixing(true);
    setResult(null);

    try {
      const details: string[] = [];

      // Executar operações individuais para evitar problemas de tipos

      // Tentar executar as operações individualmente
      let hasErrors = false;

      try {
        // 1. Verificar/criar grupo Administradores
        let adminGroup;
        try {
          const { data: existingGroup } = await supabase
            .from('user_groups' as any)
            .select('id, name')
            .eq('is_default_admin', true)
            .single();

          if (existingGroup) {
            adminGroup = existingGroup;
            details.push('✅ Grupo Administradores já existe');
          } else {
            const { data: newGroup, error: createError } = await supabase
              .from('user_groups' as any)
              .insert({
                name: 'Administradores',
                description: 'Grupo padrão com acesso total ao sistema',
                is_default_admin: true
              })
              .select()
              .single();

            if (createError) throw createError;
            adminGroup = newGroup;
            details.push('✅ Grupo Administradores criado');
          }
        } catch (groupError) {
          details.push('❌ Erro ao configurar grupo Administradores');
          hasErrors = true;
        }

        // 2. Atribuir usuário ao grupo
        if (adminGroup) {
          try {
            const { error: assignError } = await supabase
              .from('user_group_assignments' as any)
              .upsert({
                user_id: user.id,
                group_id: adminGroup.id,
                assigned_by: user.id
              });

            if (assignError) throw assignError;
            details.push('✅ Usuário atribuído ao grupo Administradores');
          } catch (assignError) {
            details.push('❌ Erro ao atribuir usuário ao grupo');
            hasErrors = true;
          }
        }

        // 3. Criar telas básicas
        const screens = [
          { key: 'dashboard', name: 'Dashboard' },
          { key: 'grupos', name: 'Grupos de Usuários' },
          { key: 'usuarios-grupos', name: 'Atribuir Usuários' }
        ];

        for (const screen of screens) {
          try {
            await supabase
              .from('screens' as any)
              .upsert({
                key: screen.key,
                name: screen.name,
                description: screen.name,
                category: 'admin',
                route: `/admin/${screen.key}`
              });
          } catch (screenError) {
            console.warn(`Erro ao criar tela ${screen.key}:`, screenError);
          }
        }
        details.push('✅ Telas básicas configuradas');

        // 4. Criar permissões básicas
        if (adminGroup) {
          for (const screen of screens) {
            try {
              await supabase
                .from('screen_permissions' as any)
                .upsert({
                  group_id: adminGroup.id,
                  screen_key: screen.key,
                  permission_level: 'edit'
                });
            } catch (permError) {
              console.warn(`Erro ao criar permissão para ${screen.key}:`, permError);
            }
          }
          details.push('✅ Permissões básicas configuradas');
        }

      } catch (error) {
        console.error('Erro geral:', error);
        details.push('❌ Tabelas de permissões podem não existir');
        details.push('📝 Execute o script SQL manualmente no Supabase Dashboard');
        hasErrors = true;
      }

      setResult({
        success: !hasErrors,
        message: hasErrors
          ? 'Configuração parcial - algumas operações falharam'
          : 'Permissões configuradas com sucesso!',
        details
      });

    } catch (error) {
      console.error('Erro ao configurar permissões:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        details: [
          '❌ Erro na configuração automática',
          '📝 Use o script SQL manual no Supabase Dashboard',
          '🔧 Ou execute: ultra-simple-fix.sql'
        ]
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          Configurador de Permissões
        </CardTitle>
        <CardDescription>
          Use este utilitário para configurar as permissões do seu usuário no sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {user && (
          <Alert>
            <AlertDescription>
              Usuário atual: <strong>{user.email}</strong>
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={fixPermissions}
          disabled={isFixing || !user}
          className="w-full"
        >
          {isFixing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Configurando permissões...
            </>
          ) : (
            'Configurar Permissões'
          )}
        </Button>

        {result && (
          <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <div className="flex items-start gap-2">
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <AlertDescription className={result.success ? 'text-green-800' : 'text-red-800'}>
                  <strong>{result.message}</strong>
                  {result.details && (
                    <ul className="mt-2 space-y-1 text-sm">
                      {result.details.map((detail, index) => (
                        <li key={index}>{detail}</li>
                      ))}
                    </ul>
                  )}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        {/* Configuração específica do sistema de Client Books */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Sistema de Gerenciamento de Clientes e Books
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Configure as permissões específicas para o sistema de gerenciamento de clientes e books.
          </p>
          
          <Button
            onClick={setupPermissions}
            disabled={isSettingUpClientBooks || !user}
            variant="outline"
            className="w-full"
          >
            {isSettingUpClientBooks ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Configurando permissões do Client Books...
              </>
            ) : (
              'Configurar Permissões do Client Books'
            )}
          </Button>
        </div>

        {result?.success && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800">
              <strong>Próximos passos:</strong>
              <ol className="mt-2 space-y-1 text-sm list-decimal list-inside">
                <li>Recarregue a página (F5) para aplicar as novas permissões</li>
                <li>Navegue para o menu administrativo</li>
                <li>Você pode remover este componente após a configuração</li>
              </ol>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default PermissionsFixer;