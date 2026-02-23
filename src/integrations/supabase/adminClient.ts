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
    console.log('🔍 Verificando permissões para usuário:', userId);

    // Buscar grupos do usuário
    const { data: assignments, error: assignmentError } = await supabaseAdmin
      .from('user_group_assignments')
      .select('group_id')
      .eq('user_id', userId);

    if (assignmentError) {
      console.error('❌ Erro ao buscar grupos do usuário:', assignmentError);
      return false;
    }

    if (!assignments || assignments.length === 0) {
      console.warn('⚠️ Usuário não está em nenhum grupo');
      return false;
    }

    const groupIds = assignments.map(a => a.group_id);
    console.log('📋 Grupos do usuário:', groupIds);

    // Buscar permissões dos grupos
    const { data: permissions, error: permissionError } = await supabaseAdmin
      .from('screen_permissions')
      .select('screen_key, permission_level')
      .in('group_id', groupIds)
      .eq('screen_key', 'cadastro-usuarios');

    if (permissionError) {
      console.error('❌ Erro ao buscar permissões:', permissionError);
      return false;
    }

    console.log('🔐 Permissões encontradas:', permissions);

    // Verificar se tem permissão de edição ou admin
    const hasPermission = permissions?.some(p => 
      ['admin', 'edit'].includes(p.permission_level)
    ) || false;

    console.log(hasPermission ? '✅ Usuário tem permissão' : '❌ Usuário NÃO tem permissão');
    return hasPermission;
  } catch (error) {
    console.error('❌ Erro ao verificar permissões administrativas:', error);
    return false;
  }
};