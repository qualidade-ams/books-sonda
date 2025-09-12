import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Validar se as variáveis de ambiente estão definidas
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_SERVICE_ROLE_KEY são obrigatórias para operações administrativas');
}

// Cliente administrativo com service_role key
// ATENÇÃO: Este cliente deve ser usado APENAS no backend ou em operações administrativas seguras
export const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Função para verificar se o usuário atual tem permissões de administrador
export const checkAdminPermissions = async (userId: string): Promise<boolean> => {
  try {
    // Verificar se o usuário tem permissões de administrador
    // Você pode implementar sua própria lógica aqui baseada na tabela de permissões
    const { data, error } = await supabaseAdmin
      .from('user_group_assignments')
      .select(`
        user_groups (
          name,
          screen_permissions (
            screen_key,
            permission_level
          )
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Erro ao verificar permissões:', error);
      return false;
    }

    // Verificar se o usuário tem permissões de administrador para gerenciar usuários
    const hasAdminPermission = data?.some(assignment => 
      assignment.user_groups?.screen_permissions?.some(permission => 
        permission.screen_key === 'cadastro-usuarios' && 
        ['admin', 'edit'].includes(permission.permission_level)
      )
    );

    return hasAdminPermission || false;
  } catch (error) {
    console.error('Erro ao verificar permissões administrativas:', error);
    return false;
  }
};