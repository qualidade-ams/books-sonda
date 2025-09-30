const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ixqjqvqjqvqjqvqj.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY ou VITE_SUPABASE_ANON_KEY não encontrada');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupRequerimentosPermissions() {
  console.log('🚀 Configurando permissões do sistema de requerimentos...\n');

  try {
    // 1. Registrar telas do sistema de requerimentos
    console.log('📋 Registrando telas no sistema de permissões...');

    const screens = [
      {
        key: 'lancar_requerimentos',
        name: 'Lançar Requerimentos',
        description: 'Tela para lançamento de novos requerimentos de especificações funcionais',
        category: 'requerimentos',
        route: '/admin/lancar-requerimentos'
      },
      {
        key: 'faturar_requerimentos',
        name: 'Faturar Requerimentos',
        description: 'Tela para faturamento e envio de relatórios de requerimentos aprovados',
        category: 'requerimentos',
        route: '/admin/faturar-requerimentos'
      }
    ];

    for (const screen of screens) {
      const { data, error } = await supabase
        .from('screens')
        .upsert(screen, { onConflict: 'key' })
        .select();

      if (error) {
        console.error(`❌ Erro ao registrar tela ${screen.key}:`, error);
        throw error;
      }
      console.log(`✅ Tela registrada: ${screen.name} (${screen.key})`);
    }

    // 2. Buscar grupo administrador padrão
    console.log('\n👥 Buscando grupo administrador padrão...');
    const { data: adminGroups, error: adminError } = await supabase
      .from('user_groups')
      .select('*')
      .eq('is_default_admin', true);

    if (adminError) {
      console.error('❌ Erro ao buscar grupo administrador:', adminError);
      throw adminError;
    }

    if (!adminGroups || adminGroups.length === 0) {
      console.log('⚠️  Nenhum grupo administrador padrão encontrado. Buscando grupo "admin"...');

      const { data: adminByName, error: adminByNameError } = await supabase
        .from('user_groups')
        .select('*')
        .ilike('name', '%admin%');

      if (adminByNameError) {
        console.error('❌ Erro ao buscar grupo admin por nome:', adminByNameError);
        throw adminByNameError;
      }

      if (!adminByName || adminByName.length === 0) {
        console.log('❌ Nenhum grupo administrador encontrado. Criando grupo padrão...');

        const { data: newAdminGroup, error: createError } = await supabase
          .from('user_groups')
          .insert({
            name: 'Administradores',
            description: 'Grupo de administradores do sistema',
            is_default_admin: true
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Erro ao criar grupo administrador:', createError);
          throw createError;
        }

        adminGroups.push(newAdminGroup);
        console.log('✅ Grupo administrador criado:', newAdminGroup.name);
      } else {
        adminGroups.push(...adminByName);
        console.log(`✅ Encontrado grupo administrador: ${adminByName[0].name}`);
      }
    } else {
      console.log(`✅ Grupo administrador encontrado: ${adminGroups[0].name}`);
    }

    // 3. Configurar permissões para grupo administrador
    console.log('\n🔐 Configurando permissões para grupo administrador...');

    for (const adminGroup of adminGroups) {
      for (const screen of screens) {
        const { data, error } = await supabase
          .from('screen_permissions')
          .upsert({
            group_id: adminGroup.id,
            screen_key: screen.key,
            permission_level: 'edit'
          }, { onConflict: 'group_id,screen_key' })
          .select();

        if (error) {
          console.error(`❌ Erro ao configurar permissão para ${screen.key}:`, error);
          throw error;
        }
        console.log(`✅ Permissão configurada: ${adminGroup.name} -> ${screen.name} (edit)`);
      }
    }

    // 4. Verificar configuração final
    console.log('\n🔍 Verificando configuração final...');

    const { data: finalScreens, error: screenError } = await supabase
      .from('screens')
      .select('*')
      .in('key', ['lancar_requerimentos', 'faturar_requerimentos']);

    if (screenError) {
      console.error('❌ Erro ao verificar telas:', screenError);
      throw screenError;
    }

    const { data: finalPermissions, error: permError } = await supabase
      .from('screen_permissions')
      .select(`
        *,
        user_groups(name),
        screens(name)
      `)
      .in('screen_key', ['lancar_requerimentos', 'faturar_requerimentos']);

    if (permError) {
      console.error('❌ Erro ao verificar permissões:', permError);
      throw permError;
    }

    console.log('\n📊 RESUMO DA CONFIGURAÇÃO:');
    console.log('========================');
    console.log('\n📋 Telas registradas:');
    finalScreens.forEach(screen => {
      console.log(`  • ${screen.name} (${screen.key}) - ${screen.route}`);
    });

    console.log('\n🔐 Permissões configuradas:');
    finalPermissions.forEach(perm => {
      console.log(`  • ${perm.user_groups.name} -> ${perm.screens.name} (${perm.permission_level})`);
    });

    console.log('\n✅ Configuração de permissões concluída com sucesso!');
    console.log('\n📝 Próximos passos:');
    console.log('  1. Verificar se as rotas estão protegidas com ProtectedRoute');
    console.log('  2. Testar acesso com usuário administrador');
    console.log('  3. Testar bloqueio de acesso com usuário não administrador');

  } catch (error) {
    console.error('\n❌ Erro durante a configuração:', error);
    process.exit(1);
  }
}

// Executar configuração
setupRequerimentosPermissions();