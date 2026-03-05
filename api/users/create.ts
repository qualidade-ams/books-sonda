import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  active: boolean;
  sendWelcomeEmail: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autenticado');
    }

    // Criar cliente Supabase com service role key (admin)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Criar cliente Supabase normal para verificar permissões do usuário atual
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

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
    const isAdmin = profile.user_groups?.name === 'Administradores';
    
    if (!isAdmin) {
      throw new Error('Você não tem permissões para criar usuários');
    }

    // Parse do body da requisição
    const { email, password, fullName, active, sendWelcomeEmail }: CreateUserRequest = await req.json();

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
      email_confirm: true, // Confirmar email automaticamente
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
        // Aqui você pode integrar com seu serviço de email
        // Por enquanto, apenas logamos
        console.log(`Email de boas-vindas deveria ser enviado para: ${email}`);
      } catch (emailError) {
        console.error('Erro ao enviar email de boas-vindas:', emailError);
        // Não falhar a criação do usuário se o email falhar
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: newUser.user.id,
        message: 'Usuário criado com sucesso',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Erro na Edge Function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro ao criar usuário',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
