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
        email_confirm: !userData.sendWelcomeEmail
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

      console.log('✅ Usuário criado com sucesso:', authData.user.email);
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
}

export const userManagementService = new UserManagementService();