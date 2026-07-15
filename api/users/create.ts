/**
 * API Route para criação de usuários usando Supabase Admin API
 * Endpoint: POST /api/users/create
 * 
 * Cria um novo usuário no Supabase Auth e seu perfil na tabela profiles.
 * Requer autenticação e permissões de administrador.
 * 
 * Compatível com Vercel Serverless Functions (Node.js runtime)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  active: boolean;
  sendWelcomeEmail: boolean;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type')
      .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      .end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers['authorization'] as string;
    if (!authHeader) {
      throw new Error('Não autenticado');
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Variáveis de ambiente do Supabase não configuradas');
    }

    // Criar cliente Supabase com service role key (admin)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Criar cliente Supabase normal para verificar permissões do usuário atual
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verificar se o usuário atual está autenticado
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    // Verificar se o usuário tem permissões de admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('group_id, user_groups(name)')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Perfil não encontrado');
    }

    // Verificar se o usuário é administrador
    const isAdmin = (profile as any).user_groups?.name === 'Administradores';

    if (!isAdmin) {
      throw new Error('Você não tem permissões para criar usuários');
    }

    // Parse do body da requisição
    const { email, password, fullName, active, sendWelcomeEmail }: CreateUserRequest = req.body;

    // Validações
    if (!email || !password || !fullName) {
      throw new Error('Email, senha e nome completo são obrigatórios');
    }

    if (password.length < 6) {
      throw new Error('Senha deve ter pelo menos 6 caracteres');
    }

    // Criar usuário usando Admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createError) {
      console.error('Erro ao criar usuário:', createError);
      throw new Error(createError.message);
    }

    if (!newUser.user) {
      throw new Error('Erro ao criar usuário');
    }

    // Criar perfil do usuário na tabela profiles
    const { error: profileInsertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        full_name: fullName,
        active: active,
      });

    if (profileInsertError) {
      console.error('Erro ao criar perfil:', profileInsertError);

      // Se falhar ao criar perfil, deletar o usuário criado
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);

      throw new Error('Erro ao criar perfil do usuário');
    }

    // Enviar email de boas-vindas (se solicitado)
    if (sendWelcomeEmail) {
      try {
        console.log(`Email de boas-vindas deveria ser enviado para: ${email}`);
      } catch (emailError) {
        console.error('Erro ao enviar email de boas-vindas:', emailError);
      }
    }

    return res.status(200).json({
      success: true,
      userId: newUser.user.id,
      message: 'Usuário criado com sucesso',
    });

  } catch (error: any) {
    console.error('Erro na API:', error);

    return res.status(400).json({
      success: false,
      error: error.message || 'Erro ao criar usuário',
    });
  }
}
