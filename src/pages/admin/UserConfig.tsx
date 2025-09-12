import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUserSettings } from '@/hooks/useUserSettings';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/LayoutAdmin';
import ProtectedAction from '@/components/auth/ProtectedAction';
import { User, Lock, Save, RefreshCw } from 'lucide-react';

const UserConfig = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  
  // Hook personalizado para configurações do usuário
  const {
    isLoading: isUserSettingsLoading,
    updateProfile
  } = useUserSettings();
  
  // Estados para o formulário de perfil
  const [profileData, setProfileData] = useState({
    name: '',
    email: user?.email || '',
  });

  // Carregar dados do perfil (consistente com UserManagement)
  const loadProfileData = async () => {
    if (!user?.id) return;

    try {
      // Buscar dados da tabela profiles (mesma prioridade que UserManagement)
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Erro ao buscar perfil:', error);
      }

      // Usar mesma prioridade que UserManagement: profiles > auth
      const displayName = profile?.full_name || 
                         user.user_metadata?.full_name || 
                         user.user_metadata?.name || 
                         user.user_metadata?.display_name || 
                         '';

      setProfileData({
        name: displayName,
        email: user.email || '',
      });
    } catch (error) {
      console.error('Erro ao carregar dados do perfil:', error);
      // Fallback para dados do auth
      setProfileData({
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.display_name || '',
        email: user.email || '',
      });
    }
  };

  // Carregar dados quando user mudar
  useEffect(() => {
    if (user?.id) {
      loadProfileData();
    }
  }, [user?.id]);

  // Estados para alteração de senha
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const success = await updateProfile({
        name: profileData.name
      });

      if (success) {
        toast({
          title: "Perfil atualizado",
          description: "Suas informações foram atualizadas com sucesso.",
        });
        
        // Recarregar dados para garantir sincronização
        await loadProfileData();
      }
    } catch (error) {
      toast({
        title: "Erro ao atualizar perfil",
        description: "Ocorreu um erro ao atualizar suas informações.",
        variant: "destructive",
      });
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A nova senha e a confirmação devem ser iguais.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A nova senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsPasswordLoading(true);

    try {
      // Importar supabase no topo do arquivo se não estiver importado
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Atualizar a senha do usuário
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso.",
      });
      
      // Limpar o formulário
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      toast({
        title: "Erro ao alterar senha",
        description: error?.message || "Ocorreu um erro ao alterar sua senha.",
        variant: "destructive",
      });
    } finally {
      setIsPasswordLoading(false);
    }
  };



  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configurações de Usuário</h1>
          <p className="text-gray-600">Gerencie suas informações pessoais e configurações de segurança</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Informações do Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center space-x-2">
              <Lock className="h-4 w-4" />
              <span>Segurança</span>
            </TabsTrigger>
          </TabsList>

          {/* Aba Informações do Perfil */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Informações do Perfil</span>
                </CardTitle>
                <CardDescription>
                  Atualize suas informações pessoais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Usuário</Label>
                    <Input
                      id="name"
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        name: e.target.value
                      }))}
                      placeholder="Digite seu nome completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500">
                      O email não pode ser alterado por questões de segurança
                    </p>
                  </div>

                  <ProtectedAction screenKey="user-config" requiredLevel="edit">
                    <Button type="submit" disabled={isUserSettingsLoading} className="w-full">
                      {isUserSettingsLoading ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Salvar Alterações
                    </Button>
                  </ProtectedAction>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Segurança */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="h-5 w-5" />
                  <span>Segurança</span>
                </CardTitle>
                <CardDescription>
                  Gerencie sua senha e configurações de segurança
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <h4 className="font-medium mb-3">Alterar Senha</h4>
                  <form onSubmit={handlePasswordChange} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Senha Atual</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({
                          ...prev,
                          currentPassword: e.target.value
                        }))}
                        placeholder="Digite sua senha atual"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nova Senha</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({
                          ...prev,
                          newPassword: e.target.value
                        }))}
                        placeholder="Digite a nova senha"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({
                          ...prev,
                          confirmPassword: e.target.value
                        }))}
                        placeholder="Confirme a nova senha"
                      />
                    </div>

                    <ProtectedAction screenKey="user-config" requiredLevel="edit">
                      <Button type="submit" disabled={isPasswordLoading} className="w-full">
                        {isPasswordLoading ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Lock className="h-4 w-4 mr-2" />
                        )}
                        Alterar Senha
                      </Button>
                    </ProtectedAction>
                  </form>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default UserConfig;