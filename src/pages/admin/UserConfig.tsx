import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useLanguage } from '@/hooks/useLanguage';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/LayoutAdmin';
import ProtectedAction from '@/components/auth/ProtectedAction';
import { User, Lock, Save, RefreshCw, Globe } from 'lucide-react';

const UserConfig = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage, isLoading: isLanguageLoading } = useLanguage();
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



  // Handler para mudança de idioma
  const handleLanguageChange = async (language: string) => {
    const success = await changeLanguage(language as any);
    if (success) {
      toast({
        title: t('userConfig.languageUpdated'),
        description: t('userConfig.languageUpdatedDesc'),
      });
    } else {
      toast({
        title: t('userConfig.languageUpdateError'),
        description: t('userConfig.languageUpdateErrorDesc'),
        variant: 'destructive',
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('userConfig.title')}</h1>
          <p className="text-gray-600">{t('userConfig.subtitle')}</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>{t('userConfig.profileTab')}</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center space-x-2">
              <Lock className="h-4 w-4" />
              <span>{t('userConfig.securityTab')}</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <span>{t('userConfig.preferencesTab')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Aba Informações do Perfil */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>{t('userConfig.profileTitle')}</span>
                </CardTitle>
                <CardDescription>
                  {t('userConfig.profileDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('userConfig.userName')}</Label>
                    <Input
                      id="name"
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        name: e.target.value
                      }))}
                      placeholder={t('userConfig.userNamePlaceholder')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{t('userConfig.emailLabel')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500">
                      {t('userConfig.emailNote')}
                    </p>
                  </div>

                  <ProtectedAction screenKey="user-config" requiredLevel="edit">
                    <Button type="submit" disabled={isUserSettingsLoading} className="w-full">
                      {isUserSettingsLoading ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {t('userConfig.saveChanges')}
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
                  <span>{t('userConfig.securityTitle')}</span>
                </CardTitle>
                <CardDescription>
                  {t('userConfig.securityDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <h4 className="font-medium mb-3">{t('userConfig.changePassword')}</h4>
                  <form onSubmit={handlePasswordChange} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">{t('auth.currentPassword')}</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({
                          ...prev,
                          currentPassword: e.target.value
                        }))}
                        placeholder={t('userConfig.currentPasswordPlaceholder')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">{t('auth.newPassword')}</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({
                          ...prev,
                          newPassword: e.target.value
                        }))}
                        placeholder={t('userConfig.newPasswordPlaceholder')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({
                          ...prev,
                          confirmPassword: e.target.value
                        }))}
                        placeholder={t('userConfig.confirmPasswordPlaceholder')}
                      />
                    </div>

                    <ProtectedAction screenKey="user-config" requiredLevel="edit">
                      <Button type="submit" disabled={isPasswordLoading} className="w-full">
                        {isPasswordLoading ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Lock className="h-4 w-4 mr-2" />
                        )}
                        {t('userConfig.changePassword')}
                      </Button>
                    </ProtectedAction>
                  </form>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Preferências */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5" />
                  <span>{t('userConfig.preferencesTitle')}</span>
                </CardTitle>
                <CardDescription>
                  {t('userConfig.preferencesDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      {t('userConfig.languageLabel')}
                    </Label>
                    <p className="text-xs text-gray-500">
                      {t('userConfig.languageDescription')}
                    </p>
                    <Select
                      value={currentLanguage}
                      onValueChange={handleLanguageChange}
                      disabled={isLanguageLoading}
                    >
                      <SelectTrigger className="w-full max-w-xs focus:ring-sonda-blue focus:border-sonda-blue">
                        <SelectValue placeholder={t('common.select')} />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            <div className="flex items-center gap-2">
                              <span>{lang.flag}</span>
                              <span>{lang.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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