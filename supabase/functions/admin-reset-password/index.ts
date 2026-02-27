// Edge Function para resetar senha de usuários
// Requer Service Role Key para acessar Supabase Admin API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔐 Iniciando reset de senha...')
    
    // Criar cliente Supabase com Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('✅ Cliente Supabase Admin criado')

    // Verificar autenticação do usuário que está fazendo a requisição
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Não autenticado')
    }

    // Extrair token do header
    const token = authHeader.replace('Bearer ', '')

    // Verificar token usando Admin API
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      console.error('Erro ao verificar usuário:', userError)
      throw new Error('Usuário não autenticado')
    }

    console.log('✅ Usuário autenticado:', user.id)

    // Verificar se o usuário tem permissões de admin
    const { data: permissions, error: permError } = await supabaseAdmin
      .from('user_group_assignments')
      .select(`
        user_groups!inner(name),
        group_id
      `)
      .eq('user_id', user.id)

    if (permError) {
      console.error('Erro ao verificar permissões:', permError)
      throw new Error('Erro ao verificar permissões')
    }

    // Verificar se tem permissão para gerenciar usuários
    let hasPermission = false

    // Verificar se é administrador
    const isAdmin = permissions?.some((perm: any) => {
      const groupName = perm.user_groups?.name
      return groupName === 'Administradores' || 
             groupName === 'Admin' ||
             groupName === 'Administrador'
    })

    if (isAdmin) {
      hasPermission = true
      console.log('✅ Usuário é administrador')
    } else {
      // Verificar permissões específicas da tela
      const groupIds = permissions?.map((p: any) => p.group_id) || []
      
      if (groupIds.length > 0) {
        const { data: screenPerms } = await supabaseAdmin
          .from('screen_permissions')
          .select('screen_key, permission_level')
          .in('group_id', groupIds)
          .eq('screen_key', 'cadastro-usuarios')
        
        hasPermission = screenPerms?.some((sp: any) => 
          sp.permission_level === 'admin' || sp.permission_level === 'edit'
        ) || false
        
        if (hasPermission) {
          console.log('✅ Usuário tem permissão na tela cadastro-usuarios')
        }
      }
    }

    if (!hasPermission) {
      throw new Error('Você não tem permissão para resetar senhas de usuários')
    }

    // Obter dados da requisição
    const { userId, newPassword } = await req.json()

    console.log('📝 Dados recebidos:', { userId: userId ? '✓' : '✗', newPassword: newPassword ? '✓' : '✗' })

    if (!userId || !newPassword) {
      throw new Error('userId e newPassword são obrigatórios')
    }

    // Validar senha
    if (newPassword.length < 6) {
      throw new Error('Senha deve ter pelo menos 6 caracteres')
    }

    console.log('✅ Dados validados')

    // Não permitir resetar a própria senha
    if (userId === user.id) {
      throw new Error('Não é possível resetar a própria senha por esta função. Use a opção de alterar senha no perfil.')
    }

    console.log('✅ Verificação de própria senha OK')

    // Resetar senha usando Admin API
    console.log('🔄 Resetando senha do usuário:', userId)
    
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (updateError) {
      console.error('❌ Erro ao resetar senha:', updateError)
      throw new Error(`Erro ao resetar senha: ${updateError.message}`)
    }

    console.log('✅ Senha resetada com sucesso para usuário:', userId)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Senha resetada com sucesso',
        userId: userId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Erro na Edge Function:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro desconhecido ao resetar senha'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
