import { supabase } from '@/integrations/supabase/client';

/**
 * Serviço para configurar permissões do sistema de gerenciamento de clientes e books
 */
export class ClientBooksPermissionsService {
  /**
   * Registra as novas telas no sistema de permissões
   */
  static async registerScreens() {
    try {
      // 1. Inserir novas telas no sistema de permissões
      const screens = [
        {
          key: 'empresas_clientes',
          name: 'Cadastro de Empresas',
          description: 'Gerenciamento de empresas clientes',
          category: 'client_books',
          route: '/admin/empresas-clientes'
        },
        {
          key: 'clientes',
          name: 'Cadastro de Clientes',
          description: 'Gerenciamento de clientes',
          category: 'client_books',
          route: '/admin/clientes'
        },
        {
          key: 'grupos_responsaveis',
          name: 'Grupos de Responsáveis',
          description: 'Gerenciamento de grupos de e-mail',
          category: 'client_books',
          route: '/admin/grupos-responsaveis'
        },
        {
          key: 'controle_disparos',
          name: 'Disparos',
          description: 'Controle mensal de envio de books',
          category: 'client_books',
          route: '/admin/controle-disparos'
        },
        {
          key: 'historico_books',
          name: 'Histórico de Books',
          description: 'Relatórios e histórico de envios',
          category: 'client_books',
          route: '/admin/historico-books'
        }
      ];

      // Inserir ou atualizar telas
      for (const screen of screens) {
        const { error } = await supabase
          .from('screens')
          .upsert(screen, { 
            onConflict: 'key',
            ignoreDuplicates: false 
          });

        if (error) {
          console.error(`Erro ao registrar tela ${screen.key}:`, error);
          throw error;
        }
      }

      console.log('✅ Telas registradas com sucesso');
      return { success: true, message: 'Telas registradas com sucesso' };
    } catch (error) {
      console.error('❌ Erro ao registrar telas:', error);
      throw error;
    }
  }

  /**
   * Configura permissões padrão para o grupo de administradores
   */
  static async configureDefaultPermissions() {
    try {
      // 1. Buscar grupo de administradores
      const { data: adminGroups, error: groupError } = await supabase
        .from('user_groups')
        .select('id')
        .eq('is_default_admin', true);

      if (groupError) {
        console.error('Erro ao buscar grupo admin:', groupError);
        throw groupError;
      }

      if (!adminGroups || adminGroups.length === 0) {
        throw new Error('Grupo de administradores não encontrado');
      }

      const adminGroupId = adminGroups[0].id;

      // 2. Telas do sistema de client books
      const clientBooksScreens = [
        'empresas_clientes',
        'clientes', 
        'grupos_responsaveis',
        'controle_disparos',
        'historico_books'
      ];

      // 3. Configurar permissões de edição para administradores
      for (const screenKey of clientBooksScreens) {
        const { error } = await supabase
          .from('screen_permissions')
          .upsert({
            group_id: adminGroupId,
            screen_key: screenKey,
            permission_level: 'edit'
          }, {
            onConflict: 'group_id,screen_key',
            ignoreDuplicates: false
          });

        if (error) {
          console.error(`Erro ao configurar permissão para ${screenKey}:`, error);
          throw error;
        }
      }

      console.log('✅ Permissões padrão configuradas com sucesso');
      return { success: true, message: 'Permissões configuradas com sucesso' };
    } catch (error) {
      console.error('❌ Erro ao configurar permissões:', error);
      throw error;
    }
  }

  /**
   * Verifica se as permissões estão configuradas corretamente
   */
  static async verifyPermissions() {
    try {
      // 1. Verificar se as telas foram registradas
      const { data: screens, error: screensError } = await supabase
        .from('screens')
        .select('key, name, description, category, route')
        .in('key', [
          'empresas_clientes',
          'clientes',
          'grupos_responsaveis', 
          'controle_disparos',
          'historico_books'
        ]);

      if (screensError) {
        throw screensError;
      }

      // 2. Verificar permissões configuradas
      const { data: permissions, error: permissionsError } = await supabase
        .from('screen_permissions')
        .select(`
          permission_level,
          screen_key,
          user_groups!inner(name, is_default_admin)
        `)
        .in('screen_key', [
          'empresas_clientes',
          'clientes',
          'grupos_responsaveis',
          'controle_disparos', 
          'historico_books'
        ]);

      if (permissionsError) {
        throw permissionsError;
      }

      return {
        screens: screens || [],
        permissions: permissions || [],
        success: true
      };
    } catch (error) {
      console.error('❌ Erro ao verificar permissões:', error);
      throw error;
    }
  }

  /**
   * Executa a configuração completa das permissões
   */
  static async setupPermissions() {
    try {
      console.log('🚀 Iniciando configuração de permissões do sistema de client books...');
      
      // 1. Registrar telas
      await this.registerScreens();
      
      // 2. Configurar permissões padrão
      await this.configureDefaultPermissions();
      
      // 3. Verificar configuração
      const verification = await this.verifyPermissions();
      
      console.log('✅ Configuração de permissões concluída com sucesso!');
      console.log(`📊 Telas registradas: ${verification.screens.length}`);
      console.log(`🔐 Permissões configuradas: ${verification.permissions.length}`);
      
      return {
        success: true,
        message: 'Permissões configuradas com sucesso',
        details: verification
      };
    } catch (error) {
      console.error('❌ Erro na configuração de permissões:', error);
      throw error;
    }
  }
}