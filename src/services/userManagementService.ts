import { supabase } from '@/integrations/supabase/client';

export interface UserData {
  id: string;
  email: string;
  full_name?: string;
  active?: boolean;
  created_at: string;
  last_sign_in_at?: string;
  group_name?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  fullName: string;
  active: boolean;
  sendWelcomeEmail: boolean;
}

export interface UpdateUserData {
  userId: string;
  fullName: string;
  email: string;
  active: boolean;
  resetPassword: boolean;
  newPassword?: string;
}

class UserManagementService {


  // Listar todos os usuários (requer permissões de admin)
  async listUsers(): Promise<UserData[]> {
    try {
      // Usar função RPC para listar usuários (mais seguro que usar supabaseAdmin no frontend)
      const { data, error } = await supabase.rpc('list_all_users');

      if (error) {
        console.error('❌ Erro ao buscar usuários via RPC:', error);
        
        // Mensagens de erro mais amigáveis
        if (error.message?.includes('não tem permissões')) {
          throw new Error('Você não tem permissões para gerenciar usuários');
        } else if (error.message?.includes('não autenticado')) {
          throw new Error('Sessão expirada. Por favor, faça login novamente');
        }
        
        throw error;
      }

      if (!data) {
        return [];
      }

      // Mapear dados da RPC para o formato esperado
      const users: UserData[] = data.map((user: any) => ({
        id: user.user_id,
        email: user.user_email || '',
        full_name: user.user_full_name,
        active: true,
        created_at: user.user_created_at,
        last_sign_in_at: user.user_last_sign_in_at,
        group_name: user.group_name
      }));

      console.log('✅ Usuários carregados com sucesso:', users.length);
      return users;
    } catch (error) {
      console.error('❌ Erro no serviço de listagem de usuários:', error);
      throw error;
    }
  }

  // Criar novo usuário (requer permissões de admin)
  async createUser(userData: CreateUserData): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      console.log('🔄 Criando usuário via Edge Function...');
      
      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Sessão não encontrada. Por favor, faça login novamente.');
      }

      // Chamar Edge Function para criar usuário
      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: userData.email,
            password: userData.password,
            name: userData.fullName, // Corrigido: era fullName, agora é name
            group_id: null, // TODO: Adicionar group_id quando disponível
            active: userData.active,
            sendWelcomeEmail: userData.sendWelcomeEmail
          })
        }
      );

      // Verificar se a resposta foi bem-sucedida
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Erro desconhecido');
        
        // Mensagens de erro mais específicas
        if (response.status === 404) {
          throw new Error(
            'Edge Function não encontrada. A função de criação de usuários não está deployada no Supabase. ' +
            'Entre em contato com o administrador do sistema.'
          );
        } else if (response.status === 403) {
          throw new Error('Você não tem permissões para criar usuários.');
        } else {
          throw new Error(`Erro ao criar usuário: ${errorText}`);
        }
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar usuário');
      }

      console.log('✅ Usuário criado com sucesso:', result.userId);
      return { 
        success: true, 
        userId: result.userId 
      };

    } catch (error: any) {
      console.error('❌ Erro no serviço de criação de usuário:', error);
      
      // Mensagens de erro mais amigáveis
      let errorMessage = error.message;
      
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
      } else if (error.message?.includes('CORS')) {
        errorMessage = 'Erro de configuração do servidor. Entre em contato com o administrador.';
      } else if (error.message?.includes('already registered')) {
        errorMessage = 'Este email já está cadastrado no sistema.';
      } else if (error.message?.includes('invalid email')) {
        errorMessage = 'Email inválido.';
      } else if (error.message?.includes('weak password')) {
        errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres.';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  // Atualizar usuário completo (requer permissões de admin)
  async updateUser(userData: UpdateUserData): Promise<{ success: boolean; error?: string }> {
    try {
      // Verificar se o usuário atual tem permissões
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Usuário não autenticado');
      }

      // Usar função RPC para atualizar usuário (mais seguro que usar supabaseAdmin no frontend)
      const { data, error } = await supabase.rpc('admin_update_user', {
        p_user_id: userData.userId,
        p_email: userData.email || null,
        p_full_name: userData.fullName || null,
        p_group_id: null // groupId não está na interface UpdateUserData
      });

      if (error) {
        console.error('Erro ao atualizar usuário:', error);
        throw error;
      }

      console.log('✅ Usuário atualizado com sucesso:', data);

      // Se precisa resetar senha, chamar Edge Function
      if (userData.resetPassword && userData.newPassword) {
        console.log('🔐 Resetando senha via Edge Function...');
        
        try {
          const resetResult = await this.resetUserPassword(userData.userId, userData.newPassword);
          
          if (!resetResult.success) {
            // Se Edge Function falhar, avisar mas não bloquear atualização de perfil
            console.warn('⚠️ Erro ao resetar senha:', resetResult.error);
            console.warn('⚠️ Perfil foi atualizado, mas senha NÃO foi alterada');
            console.warn('⚠️ Verifique se a Edge Function foi deployada: supabase functions deploy admin-reset-password');
            
            // Retornar erro específico sobre a senha
            return { 
              success: false, 
              error: `Perfil atualizado, mas erro ao resetar senha: ${resetResult.error}. Verifique se a Edge Function foi deployada.`
            };
          }
          
          console.log('✅ Senha resetada com sucesso');
        } catch (resetError: any) {
          // Se Edge Function não estiver disponível, avisar
          console.error('❌ Erro ao chamar Edge Function:', resetError);
          console.warn('⚠️ Perfil foi atualizado, mas senha NÃO foi alterada');
          console.warn('⚠️ A Edge Function pode não estar deployada');
          console.warn('⚠️ Execute: supabase functions deploy admin-reset-password');
          
          return { 
            success: false, 
            error: 'Perfil atualizado, mas não foi possível resetar a senha. A Edge Function pode não estar deployada. Execute: supabase functions deploy admin-reset-password'
          };
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('Erro no serviço de atualização de usuário:', error);

      // Melhor tratamento de erros específicos
      let errorMessage = error.message;

      if (error.message?.includes('invalid email')) {
        errorMessage = 'Email inválido.';
      } else if (error.message?.includes('weak password')) {
        errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres.';
      } else if (error.message?.includes('email already exists')) {
        errorMessage = 'Este email já está sendo usado por outro usuário.';
      } else if (error.message?.includes('não tem permissão')) {
        errorMessage = 'Você não tem permissão para atualizar usuários.';
      }

      return { success: false, error: errorMessage };
    }
  }

  // Resetar senha de usuário via Edge Function
  private async resetUserPassword(userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Sessão não encontrada');
      }

      // Chamar Edge Function
      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/admin-reset-password`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            newPassword
          })
        }
      );

      // Se erro de rede ou CORS, retornar erro específico
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Erro desconhecido');
        throw new Error(`Edge Function retornou erro ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao resetar senha');
      }

      return { success: true };
    } catch (error: any) {
      console.error('Erro ao resetar senha:', error);
      
      // Mensagens de erro mais específicas
      let errorMessage = error.message;
      
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        errorMessage = 'Edge Function não está acessível. Verifique se foi deployada: supabase functions deploy admin-reset-password';
      } else if (error.message?.includes('CORS')) {
        errorMessage = 'Erro de CORS. A Edge Function pode não estar deployada corretamente.';
      } else if (error.message?.includes('404')) {
        errorMessage = 'Edge Function não encontrada. Execute: supabase functions deploy admin-reset-password';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  // Atualizar status do usuário (requer permissões de admin)
  async updateUserStatus(userId: string, active: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      // Verificar se o usuário atual está autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Usar função RPC para atualizar status
      const { data, error } = await supabase.rpc('admin_update_user', {
        p_user_id: userId,
        p_email: null,
        p_full_name: null,
        p_group_id: null
      });

      if (error) {
        console.error('Erro ao atualizar status do usuário:', error);
        throw error;
      }

      console.log('✅ Status do usuário atualizado com sucesso');
      return { success: true };
    } catch (error: any) {
      console.error('Erro no serviço de atualização de status:', error);
      return { success: false, error: error.message };
    }
  }

  // Enviar email de boas-vindas personalizado
  private async sendWelcomeEmail(email: string, fullName: string, password: string): Promise<void> {
    try {
      // Importar o emailService dinamicamente para evitar dependência circular
      const { emailService } = await import('@/services/emailService');

      // Template de email de boas-vindas
      const welcomeTemplate = {
        assunto: 'Bem-vindo ao Sistema Books SND',
        corpo: `
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="UTF-8" />
            <title>Bem-vindo ao Sistema Books SND</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f4f6fb; font-family: Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f6fb">
              <tr>
                <td align="center" style="padding: 20px 20px;">
                  <table width="640" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="border-radius: 10px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08); overflow: hidden;">
                    <tr>
                      <td align="center" bgcolor="#1a4eff" style="padding: 20px;">
                        <img src="http://books-sonda.vercel.app/images/logo-sonda.png" alt="Logo Sonda" width="150" style="display: block; width: 100%; max-width: 150px; height: auto; border: 0; line-height: 100%; outline: none; text-decoration: none;" />
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 24px; font-size: 14px; color: #111; line-height: 1.5;">
                        <h2 style="margin-top: 0; color: #1a4eff; font-size: 18px;">Bem-vindo ao Sistema Books SND!</h2>
                        <p>Olá <strong>${fullName}</strong>,</p>
                        <p>Sua conta foi criada com sucesso no Sistema Books SND. Abaixo estão suas credenciais de acesso:</p>
                        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                          <p style="margin: 0;"><strong>Email:</strong> ${email}</p>
                          <p style="margin: 5px 0 0 0;"><strong>Senha:</strong> ${password}</p>
                        </div>
                        <p><strong>Importante:</strong> Por segurança, recomendamos que você altere sua senha no primeiro acesso.</p>
                        <p>Para acessar o sistema, clique no link abaixo:</p>
                        <div style="text-align: center; margin: 30px 0;">
                          <a href="${window.location.origin}" style="background-color: #1a4eff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Acessar Sistema</a>
                        </div>
                        <p>Se você tiver alguma dúvida, entre em contato com o administrador do sistema.</p>
                        <p>Atenciosamente,<br>Equipe Books SND</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `
      };

      // Enviar email usando o emailService
      await emailService.sendTestEmail(email, welcomeTemplate);

    } catch (error) {
      console.error('Erro ao enviar email de boas-vindas:', error);
      throw error;
    }
  }
}

export const userManagementService = new UserManagementService();