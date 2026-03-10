import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Obter variáveis de ambiente
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_KEY') ?? ''

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with Service Role Key
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autenticação não fornecido' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ Requisição autenticada, processando criação de usuário...')

    // Parse request body
    const { email, password, name, group_id } = await req.json()

    console.log('📝 Dados recebidos:', { 
      email: email ? '✓' : '✗', 
      password: password ? '✓' : '✗', 
      name: name ? '✓' : '✗',
      group_id: group_id || 'não fornecido'
    })

    // Validate required fields
    if (!email || !password || !name) {
      console.error('❌ Campos obrigatórios faltando')
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: email, password, name' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ Validação de campos OK')

    // Create the user in Auth
    console.log('🔄 Criando usuário no Auth...')
    const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name
      }
    })

    if (createError) {
      console.error('❌ Erro ao criar usuário no Auth:', createError)
      return new Response(
        JSON.stringify({ error: createError.message }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ Usuário criado no Auth:', newUser.user!.id)

    // Create profile
    console.log('🔄 Criando perfil...')
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        id: newUser.user!.id,
        full_name: name,
        email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('❌ Erro ao criar perfil:', profileError)
      
      // Rollback: delete the auth user
      console.log('🔄 Rollback: deletando usuário do Auth...')
      await supabaseClient.auth.admin.deleteUser(newUser.user!.id)
      
      return new Response(
        JSON.stringify({ error: `Erro ao criar perfil: ${profileError.message}` }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ Perfil criado com sucesso')

    // Create user group assignment if group_id is provided
    if (group_id) {
      console.log('🔄 Atribuindo grupo ao usuário...')
      const { error: assignmentError } = await supabaseClient
        .from('user_group_assignments')
        .insert({
          user_id: newUser.user!.id,
          group_id: group_id,
          created_at: new Date().toISOString()
        })

      if (assignmentError) {
        console.error('❌ Erro ao atribuir grupo:', assignmentError)
        
        // Rollback: delete profile and auth user
        console.log('🔄 Rollback: deletando perfil e usuário...')
        await supabaseClient.from('profiles').delete().eq('id', newUser.user!.id)
        await supabaseClient.auth.admin.deleteUser(newUser.user!.id)
        
        return new Response(
          JSON.stringify({ error: `Erro ao atribuir grupo: ${assignmentError.message}` }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      console.log('✅ Grupo atribuído com sucesso')
    }

    console.log('🎉 Usuário criado com sucesso!')

    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: newUser.user!.id,
          email: newUser.user!.email,
          name
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Erro na função:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erro desconhecido' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
