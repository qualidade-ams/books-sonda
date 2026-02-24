import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_SECRET_KEY = import.meta.env.VITE_SUPABASE_SECRET_KEY;

// ⚠️ AVISO DE SEGURANÇA:
// Este cliente administrativo usa Secret Key e só deve ser usado em:
// - Edge Functions (backend)
// - Scripts de manutenção (Node.js)
// - NUNCA no código que roda no browser!
//
// Se você está vendo este erro no browser, significa que você está
// tentando usar operações administrativas no frontend, o que é INSEGURO.

// Validar se as variáveis de ambiente estão definidas
if (!SUPABASE_URL) {
  throw new Error('Variável de ambiente VITE_SUPABASE_URL é obrigatória');
}

// Cliente administrativo - só será criado se a Secret Key estiver presente
// Isso permite que o código compile mesmo sem a Secret Key no frontend
let supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null;

if (SUPABASE_SECRET_KEY) {
  supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
} else {
  console.warn('⚠️ VITE_SUPABASE_SECRET_KEY não está definida. Operações administrativas não estarão disponíveis.');
}

// Exportar o cliente (pode ser null se Secret Key não estiver presente)
export { supabaseAdmin };

// Exportar também como adminClient para compatibilidade
export const adminClient = supabaseAdmin;

// Função para verificar se o usuário atual tem permissões de administrador
export const checkAdminPermissions = async (userId: string): Promise<boolean> => {
  // Se não há cliente admin, não podemos verificar permissões
  if (!supabaseAdmin) {
    console.error('❌ Cliente administrativo não disponível (Secret Key não configurada)');
    return false;
  }

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