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
      console.log('❌ Criação de usuários não está disponível no frontend');
      console.log('⚠️ Configure uma Edge Function para criar usuários com segurança');
      
      throw new Error(
        'Criação de usuários deve ser feita via Edge Function. ' +
        'Por questões de segurança, não é possível criar usuários diretamente do frontend. ' +
        'Configure uma Edge Function no Supabase para esta operação.'
      );
    } catch (error: any) {
      console.error('Erro no serviço de criação de usuário:', error);
      return { success: false, error: error.message };
    }
  }

  // Atualizar usuário completo (requer permissões de admin)
  async updateUser(userData: UpdateUserData): Promise<{ success: boolean; error?: string }> {
    try {
      // Verificar se o usuário atual tem permissões
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Avisar sobre reset de senha antes de tentar atualizar
      if (userData.resetPassword && userData.newPassword) {
        console.warn('⚠️ Reset de senha não está disponível via RPC');
        console.warn('⚠️ Configure uma Edge Function para esta operação');
        console.warn('⚠️ Continuando com atualização de perfil sem alterar senha...');
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

      // Se tentou resetar senha, avisar que não foi possível
      if (userData.resetPassword && userData.newPassword) {
        console.warn('⚠️ Perfil atualizado, mas senha NÃO foi alterada');
        console.warn('⚠️ Para alterar senha, configure uma Edge Function');
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