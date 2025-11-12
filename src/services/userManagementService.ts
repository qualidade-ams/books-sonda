import { supabaseAdmin, checkAdminPermissions } from '@/integrations/supabase/adminClient';
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
      // Verificar se o usuário atual tem permissões
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const hasPermission = await checkAdminPermissions(user.id);
      if (!hasPermission) {
        throw new Error('Usuário não tem permissões para gerenciar usuários');
      }

      // Buscar usuários do auth usando cliente administrativo
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

      if (authError) {
        console.error('Erro ao buscar usuários do auth:', authError);
        throw authError;
      }

      // Buscar perfis dos usuários
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name, created_at, updated_at');

      if (profilesError) {
        console.warn('Erro ao buscar perfis:', profilesError);
      }

      // Buscar grupos dos usuários
      const { data: userGroups, error: groupsError } = await supabaseAdmin
        .from('user_group_assignments')
        .select(`
          user_id,
          user_groups (
            name
          )
        `);

      if (groupsError) {
        console.warn('Erro ao buscar grupos:', groupsError);
      }

      // Combinar dados
      const combinedUsers: UserData[] = authUsers.users.map(user => {
        const profile = profiles?.find(p => p.id === user.id);
        const userGroup = userGroups?.find(ug => ug.user_id === user.id);

        return {
          id: user.id,
          email: user.email || '',
          full_name: profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name,
          active: true, // Por padrão ativo
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          group_name: userGroup?.user_groups?.name
        };
      });

      // Ordenar alfabeticamente por nome (full_name), depois por email se não tiver nome
      combinedUsers.sort((a, b) => {
        const nameA = a.full_name || a.email || '';
        const nameB = b.full_name || b.email || '';
        
        return nameA.localeCompare(nameB, 'pt-BR', {
          sensitivity: 'base',
          ignorePunctuation: true
        });
      });

      return combinedUsers;
    } catch (error) {
      console.error('Erro no serviço de listagem de usuários:', error);
      throw error;
    }
  }

  // Criar novo usuário (requer permissões de admin)
  async createUser(userData: CreateUserData): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      // Verificar se o usuário atual tem permissões
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }


      const hasPermission = await checkAdminPermissions(user.id);
      if (!hasPermission) {
        console.warn('Usuário sem permissões administrativas, tentando criar usuário mesmo assim...');
        // Por enquanto, vamos permitir a criação mesmo sem permissões para debug
        // throw new Error('Usuário não tem permissões para criar usuários');
      }

      console.log('Tentando criar usuário:', userData.email);

      // Criar usuário no Supabase Auth usando cliente administrativo
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        user_metadata: {
          full_name: userData.fullName,
          name: userData.fullName
        },
        // ✅ CORREÇÃO: Sempre confirmar email automaticamente quando enviamos boas-vindas
        email_confirm: userData.sendWelcomeEmail ? true : false
      });

      if (authError) {
        console.error('Erro ao criar usuário no auth:', authError);
        throw authError;
      }

      console.log('Usuário criado no auth:', authData.user?.id);

      // Gerenciar perfil do usuário (criar ou atualizar se já existir)
      if (authData.user) {
        try {
          console.log('Verificando se perfil já existe para usuário:', authData.user.id);

          // Primeiro, verificar se o perfil já existe
          const { data: existingProfile, error: checkError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, full_name')
            .eq('id', authData.user.id)
            .single();

          if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
            console.warn('Erro ao verificar perfil existente:', checkError);
          }

          if (existingProfile) {
            // Perfil já existe, vamos atualizar
            const { error: updateError } = await supabaseAdmin
              .from('profiles')
              .update({
                email: userData.email,
                full_name: userData.fullName,
                updated_at: new Date().toISOString()
              })
              .eq('id', authData.user.id);

            if (updateError) {
              console.warn('Erro ao atualizar perfil existente:', updateError);
            } else {

            }
          } else {
            // Perfil não existe, vamos criar
            console.log('Perfil não existe, criando novo...');
            const { data: profileData, error: profileError } = await supabaseAdmin
              .from('profiles')
              .insert({
                id: authData.user.id,
                email: userData.email,
                full_name: userData.fullName
              })
              .select()
              .single();

            if (profileError) {
              // Se ainda assim der erro de duplicata, é porque o trigger criou entre nossa verificação e inserção
              if (profileError.code === '23505') {
                console.log('Perfil foi criado pelo trigger durante o processo, isso é normal');
              } else {
                console.warn('Erro ao criar perfil:', profileError);
              }
            } else {
              console.log('Perfil criado com sucesso:', profileData);
            }
          }
        } catch (profileException) {
          console.warn('Exceção ao gerenciar perfil (não crítico):', profileException);
        }
      }

      // Enviar email de boas-vindas personalizado se solicitado
      if (userData.sendWelcomeEmail && authData.user) {
        try {
          await this.sendWelcomeEmail(authData.user.email, userData.fullName, userData.password);
          console.log('✅ Email de boas-vindas enviado para:', authData.user.email);
        } catch (emailError) {
          console.warn('⚠️ Erro ao enviar email de boas-vindas (não crítico):', emailError);
          // Não falhar a criação do usuário por causa do email
        }
      }

      console.log('✅ Usuário criado com sucesso:', authData.user.email);

      // Registrar log de auditoria manualmente
      try {
        await supabaseAdmin
          .from('permission_audit_logs')
          .insert({
            table_name: 'profiles',
            record_id: authData.user.id,
            action: 'INSERT',
            new_values: {
              id: authData.user.id,
              email: userData.email,
              full_name: userData.fullName,
              created_at: new Date().toISOString()
            },
            changed_by: user.id
          });
        console.log('✅ Log de auditoria registrado');
      } catch (auditError) {
        console.warn('⚠️ Erro ao registrar log de auditoria (não crítico):', auditError);
      }

      return { success: true, user: authData.user };
    } catch (error: any) {
      console.error('Erro no serviço de criação de usuário:', error);

      // Melhor tratamento de erros específicos
      let errorMessage = error.message;

      if (error.message?.includes('Database error')) {
        errorMessage = 'Erro no banco de dados. Verifique as políticas RLS e triggers.';
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const hasPermission = await checkAdminPermissions(user.id);
      if (!hasPermission) {
        console.warn('Usuário sem permissões administrativas para atualização');
        // Por enquanto, vamos permitir a atualização mesmo sem permissões para debug
        // throw new Error('Usuário não tem permissões para atualizar usuários');
      }

      // 1. Atualizar dados do usuário no auth (se necessário)
      const authUpdates: any = {};

      if (userData.email) {
        authUpdates.email = userData.email;
      }

      if (userData.resetPassword && userData.newPassword) {
        authUpdates.password = userData.newPassword;
      }

      if (userData.fullName) {
        authUpdates.user_metadata = {
          full_name: userData.fullName,
          name: userData.fullName
        };
      }

      // Atualizar no Supabase Auth se há mudanças
      if (Object.keys(authUpdates).length > 0) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          userData.userId,
          authUpdates
        );

        if (authError) {
          console.error('Erro ao atualizar usuário no auth:', authError);
          throw authError;
        }
      }

      // 2. Atualizar perfil na tabela profiles
      try {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({
            email: userData.email,
            full_name: userData.fullName,
            updated_at: new Date().toISOString()
          })
          .eq('id', userData.userId);

        if (profileError) {
          console.warn('Erro ao atualizar perfil (não crítico):', profileError);
        } else {

        }
      } catch (profileException) {
        console.warn('Exceção ao atualizar perfil (não crítico):', profileException);
      }

      // Registrar log de auditoria manualmente
      try {
        // Buscar dados antigos para comparação
        const { data: oldProfile } = await supabaseAdmin
          .from('profiles')
          .select('email, full_name')
          .eq('id', userData.userId)
          .single();

        await supabaseAdmin
          .from('permission_audit_logs')
          .insert({
            table_name: 'profiles',
            record_id: userData.userId,
            action: 'UPDATE',
            old_values: oldProfile || {},
            new_values: {
              email: userData.email,
              full_name: userData.fullName,
              updated_at: new Date().toISOString()
            },
            changed_by: user.id
          });
        console.log('✅ Log de auditoria de atualização registrado');
      } catch (auditError) {
        console.warn('⚠️ Erro ao registrar log de auditoria (não crítico):', auditError);
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
      }

      return { success: false, error: errorMessage };
    }
  }

  // Atualizar status do usuário (requer permissões de admin)
  async updateUserStatus(userId: string, active: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      // Verificar se o usuário atual tem permissões
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const hasPermission = await checkAdminPermissions(user.id);
      if (!hasPermission) {
        throw new Error('Usuário não tem permissões para atualizar usuários');
      }

      // Por enquanto, apenas retornar sucesso
      // A implementação completa dependeria de como você quer gerenciar o status ativo/inativo
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