// Script para configurar permissões do usuário
// Execute com: node setup-permissions.js

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ugwpnonuqhwjagwdpnbu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnd3Bub251cWh3amFnd2RwbmJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwODU1MjcsImV4cCI6MjA2NTY2MTUyN30.vIiLxU3TG0teOZIzA1k1E9NrSTKE5G1kDqoxqDC76Xc";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function setupPermissions() {
  try {
    console.log('🔍 Verificando usuários sem grupo...');
    
    // 1. Verificar usuários sem grupo
    const { data: usersWithoutGroup, error: usersError } = await supabase
      .from('auth.users')
      .select(`
        id,
        email,
        user_group_assignments!left(user_id)
      `)
      .is('user_group_assignments.user_id', null);

    if (usersError) {
      console.error('❌ Erro ao buscar usuários:', usersError);
      return;
    }

    console.log(`📊 Encontrados ${usersWithoutGroup?.length || 0} usuários sem grupo`);

    // 2. Buscar grupo Administradores
    const { data: adminGroup, error: groupError } = await supabase
      .from('user_groups')
      .select('id, name')
      .eq('is_default_admin', true)
      .single();

    if (groupError || !adminGroup) {
      console.error('❌ Grupo Administradores não encontrado:', groupError);
      return;
    }

    console.log(`✅ Grupo Administradores encontrado: ${adminGroup.name} (${adminGroup.id})`);

    // 3. Atribuir usuários ao grupo
    if (usersWithoutGroup && usersWithoutGroup.length > 0) {
      for (const user of usersWithoutGroup) {
        const { error: assignError } = await supabase
          .from('user_group_assignments')
          .insert({
            user_id: user.id,
            group_id: adminGroup.id,
            assigned_by: user.id
          });

        if (assignError) {
          console.error(`❌ Erro ao atribuir usuário ${user.email}:`, assignError);
        } else {
          console.log(`✅ Usuário ${user.email} atribuído ao grupo Administradores`);
        }
      }
    }

    // 4. Verificar resultado final
    const { data: finalCheck, error: finalError } = await supabase
      .from('user_group_assignments')
      .select(`
        user_id,
        user_groups(name),
        auth.users(email)
      `);

    if (finalError) {
      console.error('❌ Erro na verificação final:', finalError);
    } else {
      console.log('\n📋 Usuários com grupos atribuídos:');
      finalCheck?.forEach(assignment => {
        console.log(`  - ${assignment.auth?.users?.email}: ${assignment.user_groups?.name}`);
      });
    }

    console.log('\n🎉 Configuração de permissões concluída!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

setupPermissions();