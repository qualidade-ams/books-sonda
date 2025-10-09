import { supabase } from '@/integrations/supabase/client';
import type { 
  PermissionAuditLog, 
  AuditLogWithUser, 
  AuditLogFilters, 
  AuditLogSummary 
} from '@/types/audit';

export class AuditService {
  /**
   * Get audit logs with optional filters and pagination
   */
  async getAuditLogs(
    filters: AuditLogFilters = {},
    page = 1,
    pageSize = 50
  ): Promise<{ data: AuditLogWithUser[]; count: number }> {
    let query = supabase
      .from('permission_audit_logs')
      .select('*', { count: 'exact' })
      .order('changed_at', { ascending: false });

    // Apply filters
    if (filters.table_name) {
      query = query.eq('table_name', filters.table_name);
    }
    
    if (filters.action) {
      query = query.eq('action', filters.action);
    }
    
    if (filters.changed_by) {
      query = query.eq('changed_by', filters.changed_by);
    }
    
    if (filters.record_id) {
      query = query.eq('record_id', filters.record_id);
    }
    
    if (filters.date_from) {
      query = query.gte('changed_at', filters.date_from);
    }
    
    if (filters.date_to) {
      query = query.lte('changed_at', filters.date_to);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch audit logs: ${error.message}`);
    }

    // Get unique user IDs to fetch user information
    const userIds = [...new Set((data || []).map(log => log.changed_by).filter(Boolean))];
    
    // Fetch user information if we have user IDs
    let usersMap: Record<string, any> = {};
    if (userIds.length > 0) {
      try {
        // Try to get from profiles table first
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);

        if (profiles && profiles.length > 0) {
          profiles.forEach(profile => {
            usersMap[profile.id] = {
              email: profile.email,
              full_name: profile.full_name
            };
          });
        } else {
          // Fallback to auth.users if profiles don't exist
          const { data: authUsers } = await supabase.auth.admin.listUsers();
          if (authUsers?.users && Array.isArray(authUsers.users)) {
            authUsers.users.forEach((user: any) => {
              if (user?.id && userIds.includes(user.id)) {
                usersMap[user.id] = {
                  email: user.email || null,
                  full_name: user.user_metadata?.full_name || user.user_metadata?.name || null
                };
              }
            });
          }
        }
      } catch (userError) {
        console.warn('Could not fetch user information:', userError);
      }
    }

    // Transform data to include user information
    const transformedData: AuditLogWithUser[] = (data || []).map(log => {
      const user = usersMap[log.changed_by];
      return {
        ...log,
        user_name: user?.full_name || user?.email?.split('@')[0] || 'Sistema',
        user_email: user?.email
      };
    });

    return {
      data: transformedData,
      count: count || 0
    };
  }

  /**
   * Get audit summary statistics
   */
  async getAuditSummary(days = 30): Promise<AuditLogSummary> {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    // Get total changes count
    const { count: totalChanges } = await supabase
      .from('permission_audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('changed_at', dateFrom.toISOString());

    // Get changes by table
    const { data: tableStats } = await supabase
      .from('permission_audit_logs')
      .select('table_name')
      .gte('changed_at', dateFrom.toISOString());

    // Get changes by action
    const { data: actionStats } = await supabase
      .from('permission_audit_logs')
      .select('action')
      .gte('changed_at', dateFrom.toISOString());

    // Get recent changes
    const { data: recentChanges } = await supabase
      .from('permission_audit_logs')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(10);

    // Process statistics
    const changesByTable: Record<string, number> = {};
    tableStats?.forEach(stat => {
      changesByTable[stat.table_name] = (changesByTable[stat.table_name] || 0) + 1;
    });

    const changesByAction: Record<string, number> = {};
    actionStats?.forEach(stat => {
      changesByAction[stat.action] = (changesByAction[stat.action] || 0) + 1;
    });

    return {
      total_changes: totalChanges || 0,
      changes_by_table: changesByTable,
      changes_by_action: changesByAction,
      recent_changes: recentChanges || []
    };
  }

  /**
   * Get audit logs for a specific record
   */
  async getRecordAuditHistory(
    tableName: string, 
    recordId: string
  ): Promise<AuditLogWithUser[]> {
    const { data } = await this.getAuditLogs({
      table_name: tableName,
      record_id: recordId
    }, 1, 100);

    return data;
  }

  /**
   * Get user activity logs
   */
  async getUserActivity(
    userId: string,
    days = 30
  ): Promise<AuditLogWithUser[]> {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const { data } = await this.getAuditLogs({
      changed_by: userId,
      date_from: dateFrom.toISOString()
    }, 1, 100);

    return data;
  }

  /**
   * Format audit log changes for display
   */
  async formatChanges(log: PermissionAuditLog): Promise<string> {
    if (log.action === 'INSERT') {
      return await this.formatInsertDetails(log);
    }
    
    if (log.action === 'DELETE') {
      return await this.formatDeleteDetails(log);
    }
    
    if (log.action === 'UPDATE' && log.old_values && log.new_values) {
      return await this.formatUpdateDetails(log);
    }
    
    return 'Alteração desconhecida';
  }

  /**
   * Format INSERT action details
   */
  private async formatInsertDetails(log: PermissionAuditLog): Promise<string> {
    const values = log.new_values;
    if (!values || typeof values !== 'object') return 'Registro criado';

    switch (log.table_name) {
      case 'user_groups':
        const groupName = this.getValueFromJson(values, 'name') || 'Sem nome';
        const groupDesc = this.getValueFromJson(values, 'description') || 'Sem descrição';
        return `Grupo criado: "${groupName}" - ${groupDesc}`;
      
      case 'screen_permissions':
        const screenKey = this.getValueFromJson(values, 'screen_key');
        const permissionLevel = this.getValueFromJson(values, 'permission_level');
        const permGroupId = this.getValueFromJson(values, 'group_id');
        
        if (screenKey) {
          const screenName = this.getScreenDisplayName(screenKey);
          const levelText = this.formatPermissionLevel(permissionLevel);
          const permGroupName = permGroupId ? await this.getGroupNameById(permGroupId) : 'Grupo desconhecido';
          return `Permissão criada para tela: "${screenName}" - Nível: ${levelText} - Grupo: ${permGroupName}`;
        }
        return 'Permissão de tela criada';
      
      case 'user_group_assignments':
        const assignUserId = this.getValueFromJson(values, 'user_id');
        const assignGroupId = this.getValueFromJson(values, 'group_id');
        
        const assignUserName = assignUserId ? await this.getUserNameById(assignUserId) : 'Usuário desconhecido';
        const assignGroupName = assignGroupId ? await this.getGroupNameById(assignGroupId) : 'Grupo desconhecido';
        
        return `Usuário ${assignUserName} atribuído ao grupo ${assignGroupName}`;

      // Novos usuários (profiles)
      case 'profiles':
        const userFullName = this.getValueFromJson(values, 'full_name') || 'Sem nome';
        const userEmail = this.getValueFromJson(values, 'email') || 'Sem email';
        return `Usuário criado: "${userFullName}" (${userEmail})`;

      // Empresas clientes
      case 'empresas_clientes':
        const empresaNome = this.getValueFromJson(values, 'nome_completo') || 
                           this.getValueFromJson(values, 'nome_abreviado') || 'Sem nome';
        const empresaCnpj = this.getValueFromJson(values, 'cnpj') || 'Sem CNPJ';
        const empresaStatus = this.getValueFromJson(values, 'status') || 'Sem status';
        return `Empresa criada: "${empresaNome}" - CNPJ: ${empresaCnpj} - Status: ${this.formatStatus(empresaStatus)}`;

      // Clientes (colaboradores)
      case 'clientes':
        const clienteNome = this.getValueFromJson(values, 'nome') || 'Sem nome';
        const clienteEmail = this.getValueFromJson(values, 'email') || 'Sem email';
        const clienteEmpresa = this.getValueFromJson(values, 'empresa_id');
        const empresaClienteNome = clienteEmpresa ? await this.getEmpresaNameById(clienteEmpresa) : 'Empresa não informada';
        return `Cliente criado: "${clienteNome}" (${clienteEmail}) - Empresa: ${empresaClienteNome}`;

      // Grupos responsáveis
      case 'grupos_responsaveis':
        const grupoRespNome = this.getValueFromJson(values, 'nome') || 'Sem nome';
        const grupoRespProduto = this.getValueFromJson(values, 'produto') || 'Sem produto';
        return `Grupo responsável criado: "${grupoRespNome}" - Produto: ${this.formatProduto(grupoRespProduto)}`;

      // Templates de email
      case 'email_templates':
        const templateNome = this.getValueFromJson(values, 'nome') || 'Sem nome';
        const templateAssunto = this.getValueFromJson(values, 'assunto') || 'Sem assunto';
        const templateAtivo = this.getValueFromJson(values, 'ativo');
        return `Template de email criado: "${templateNome}" - Assunto: "${templateAssunto}" - Status: ${templateAtivo ? 'Ativo' : 'Inativo'}`;

      // Histórico de disparos
      case 'historico_disparos':
        const dispEmpresa = this.getValueFromJson(values, 'empresa_id');
        const dispTipo = this.getValueFromJson(values, 'tipo_disparo') || 'padrão';
        const dispStatus = this.getValueFromJson(values, 'status') || 'enviado';
        const empresaDispNome = dispEmpresa ? await this.getEmpresaNameById(dispEmpresa) : 'Empresa não informada';
        return `Disparo ${this.formatTipoDisparo(dispTipo)} executado para empresa: "${empresaDispNome}" - Status: ${this.formatStatusDisparo(dispStatus)}`;

      // Requerimentos
      case 'requerimentos':
        const reqChamado = this.getValueFromJson(values, 'chamado') || 'Sem chamado';
        const reqCliente = this.getValueFromJson(values, 'cliente_id');
        const reqTipoCobranca = this.getValueFromJson(values, 'tipo_cobranca') || 'Sem tipo';
        const clienteReqNome = reqCliente ? await this.getClienteNameById(reqCliente) : 'Cliente não informado';
        return `Requerimento criado: Chamado ${reqChamado} - Cliente: ${clienteReqNome} - Tipo: ${this.formatTipoCobranca(reqTipoCobranca)}`;
      
      default:
        return `Registro criado - ${this.getRecordIdentifier(values)}`;
    }
  }

  /**
   * Format DELETE action details
   */
  private async formatDeleteDetails(log: PermissionAuditLog): Promise<string> {
    const values = log.old_values;
    if (!values || typeof values !== 'object') return 'Registro excluído';

    switch (log.table_name) {
      case 'user_groups':
        const groupName = this.getValueFromJson(values, 'name') || 'Nome não disponível';
        const groupDesc = this.getValueFromJson(values, 'description') || 'Sem descrição';
        return `Grupo excluído: "${groupName}" - ${groupDesc}`;
      
      case 'screen_permissions':
        const delScreenKey = this.getValueFromJson(values, 'screen_key');
        const delPermissionLevel = this.getValueFromJson(values, 'permission_level');
        const delGroupId = this.getValueFromJson(values, 'group_id');
        
        if (delScreenKey) {
          const delScreenName = this.getScreenDisplayName(delScreenKey);
          const delLevelText = this.formatPermissionLevel(delPermissionLevel);
          const delGroupName = delGroupId ? await this.getGroupNameById(delGroupId) : 'Grupo desconhecido';
          return `Permissão excluída da tela: "${delScreenName}" - Nível: ${delLevelText} - Grupo: ${delGroupName}`;
        }
        return 'Permissão de tela excluída';
      
      case 'user_group_assignments':
        const delUserId = this.getValueFromJson(values, 'user_id');
        const delGroupId2 = this.getValueFromJson(values, 'group_id');
        
        const delUserName = delUserId ? await this.getUserNameById(delUserId) : 'Usuário desconhecido';
        const delGroupName2 = delGroupId2 ? await this.getGroupNameById(delGroupId2) : 'Grupo desconhecido';
        
        return `Usuário ${delUserName} removido do grupo ${delGroupName2}`;

      // Usuários excluídos
      case 'profiles':
        const delUserFullName = this.getValueFromJson(values, 'full_name') || 'Sem nome';
        const delUserEmail = this.getValueFromJson(values, 'email') || 'Sem email';
        return `Usuário excluído: "${delUserFullName}" (${delUserEmail})`;

      // Empresas excluídas
      case 'empresas_clientes':
        const delEmpresaNome = this.getValueFromJson(values, 'nome_completo') || 
                              this.getValueFromJson(values, 'nome_abreviado') || 'Sem nome';
        const delEmpresaCnpj = this.getValueFromJson(values, 'cnpj') || 'Sem CNPJ';
        return `Empresa excluída: "${delEmpresaNome}" - CNPJ: ${delEmpresaCnpj}`;

      // Clientes excluídos
      case 'clientes':
        const delClienteNome = this.getValueFromJson(values, 'nome') || 'Sem nome';
        const delClienteEmail = this.getValueFromJson(values, 'email') || 'Sem email';
        const delClienteEmpresa = this.getValueFromJson(values, 'empresa_id');
        const delEmpresaClienteNome = delClienteEmpresa ? await this.getEmpresaNameById(delClienteEmpresa) : 'Empresa não informada';
        return `Cliente excluído: "${delClienteNome}" (${delClienteEmail}) - Empresa: ${delEmpresaClienteNome}`;

      // Grupos responsáveis excluídos
      case 'grupos_responsaveis':
        const delGrupoRespNome = this.getValueFromJson(values, 'nome') || 'Sem nome';
        const delGrupoRespProduto = this.getValueFromJson(values, 'produto') || 'Sem produto';
        return `Grupo responsável excluído: "${delGrupoRespNome}" - Produto: ${this.formatProduto(delGrupoRespProduto)}`;

      // Templates excluídos
      case 'email_templates':
        const delTemplateNome = this.getValueFromJson(values, 'nome') || 'Sem nome';
        const delTemplateAssunto = this.getValueFromJson(values, 'assunto') || 'Sem assunto';
        return `Template de email excluído: "${delTemplateNome}" - Assunto: "${delTemplateAssunto}"`;

      // Requerimentos excluídos
      case 'requerimentos':
        const delReqChamado = this.getValueFromJson(values, 'chamado') || 'Sem chamado';
        const delReqCliente = this.getValueFromJson(values, 'cliente_id');
        const delClienteReqNome = delReqCliente ? await this.getClienteNameById(delReqCliente) : 'Cliente não informado';
        return `Requerimento excluído: Chamado ${delReqChamado} - Cliente: ${delClienteReqNome}`;
      
      default:
        return `Registro excluído - ${this.getRecordIdentifier(values)}`;
    }
  }

  /**
   * Format UPDATE action details
   */
  private async formatUpdateDetails(log: PermissionAuditLog): Promise<string> {
    const changes: string[] = [];
    const fieldLabels = this.getFieldLabels(log.table_name);
    
    for (const key of Object.keys(log.new_values || {})) {
      if (key === 'updated_at' || key === 'updated_by') continue;
      
      const oldValue = log.old_values?.[key];
      const newValue = log.new_values?.[key];
      
      if (oldValue !== newValue) {
        const fieldLabel = fieldLabels[key] || key;
        const formattedOldValue = await this.formatFieldValue(key, oldValue, log.table_name);
        const formattedNewValue = await this.formatFieldValue(key, newValue, log.table_name);
        changes.push(`${fieldLabel}: "${formattedOldValue}" → "${formattedNewValue}"`);
      }
    }

    if (changes.length === 0) {
      return 'Nenhuma alteração detectada';
    }

    const recordName = await this.getRecordName(log);
    return recordName ? `${recordName} - ${changes.join(', ')}` : changes.join(', ');
  }

  /**
   * Get field labels for better display
   */
  private getFieldLabels(tableName: string): Record<string, string> {
    const labels: Record<string, Record<string, string>> = {
      'user_groups': {
        'name': 'Nome',
        'description': 'Descrição',
        'active': 'Ativo'
      },
      'screen_permissions': {
        'screen_name': 'Tela',
        'action': 'Ação',
        'allowed': 'Permitido',
        'group_id': 'Grupo'
      },
      'user_group_assignments': {
        'user_id': 'Usuário',
        'group_id': 'Grupo'
      },
      'profiles': {
        'full_name': 'Nome Completo',
        'email': 'Email',
        'active': 'Ativo'
      },
      'empresas_clientes': {
        'nome_completo': 'Nome Completo',
        'nome_abreviado': 'Nome Abreviado',
        'cnpj': 'CNPJ',
        'status': 'Status',
        'email_gestor': 'Email Gestor',
        'produtos': 'Produtos',
        'link_sharepoint': 'Link SharePoint',
        'tem_ams': 'Tem AMS',
        'tipo_book': 'Tipo de Book',
        'book_personalizado': 'Book Personalizado',
        'template_padrao': 'Template Padrão',
        'vigencia_inicial': 'Vigência Inicial',
        'vigencia_final': 'Vigência Final'
      },
      'clientes': {
        'nome': 'Nome',
        'email': 'Email',
        'empresa_id': 'Empresa',
        'status': 'Status'
      },
      'grupos_responsaveis': {
        'nome': 'Nome',
        'produto': 'Produto',
        'ativo': 'Ativo'
      },
      'email_templates': {
        'nome': 'Nome',
        'assunto': 'Assunto',
        'corpo': 'Corpo do Email',
        'ativo': 'Ativo',
        'tipo': 'Tipo'
      },
      'historico_disparos': {
        'empresa_id': 'Empresa',
        'tipo_disparo': 'Tipo de Disparo',
        'status': 'Status',
        'data_disparo': 'Data do Disparo',
        'anexo_id': 'Anexo',
        'anexo_processado': 'Anexo Processado'
      },
      'requerimentos': {
        'chamado': 'Chamado',
        'cliente_id': 'Cliente',
        'modulo': 'Módulo',
        'linguagem': 'Linguagem',
        'tipo_cobranca': 'Tipo de Cobrança',
        'descricao': 'Descrição',
        'horas_funcional': 'Horas Funcionais',
        'horas_tecnico': 'Horas Técnicas',
        'horas_total': 'Horas Total',
        'data_aprovacao': 'Data de Aprovação',
        'status': 'Status',
        'enviado_faturamento': 'Enviado para Faturamento'
      }
    };
    
    return labels[tableName] || {};
  }

  /**
   * Format field values for better display
   */
  private async formatFieldValue(fieldName: string, value: any, tableName?: string): Promise<string> {
    if (value === null || value === undefined) return 'Vazio';
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (typeof value === 'string' && value.trim() === '') return 'Vazio';
    
    // Handle special field types that need name resolution
    if (fieldName === 'user_id' && typeof value === 'string') {
      const userName = await this.getUserNameById(value);
      return userName || `ID: ${value}`;
    }
    
    if (fieldName === 'group_id' && typeof value === 'string') {
      const groupName = await this.getGroupNameById(value);
      return groupName || `ID: ${value}`;
    }

    if (fieldName === 'empresa_id' && typeof value === 'string') {
      const empresaName = await this.getEmpresaNameById(value);
      return empresaName || `ID: ${value}`;
    }

    if (fieldName === 'cliente_id' && typeof value === 'string') {
      const clienteName = await this.getClienteNameById(value);
      return clienteName || `ID: ${value}`;
    }
    
    if (fieldName === 'screen_key' && typeof value === 'string') {
      return this.getScreenDisplayName(value);
    }
    
    if (fieldName === 'permission_level' && typeof value === 'string') {
      return this.formatPermissionLevel(value);
    }

    if (fieldName === 'status' && typeof value === 'string') {
      return this.formatStatus(value);
    }

    if (fieldName === 'produto' && typeof value === 'string') {
      return this.formatProduto(value);
    }

    if (fieldName === 'tipo_disparo' && typeof value === 'string') {
      return this.formatTipoDisparo(value);
    }

    if (fieldName === 'tipo_cobranca' && typeof value === 'string') {
      return this.formatTipoCobranca(value);
    }

    // Format arrays (like produtos)
    if (Array.isArray(value)) {
      return value.map(v => this.formatProduto(v)).join(', ');
    }

    // Format dates
    if (fieldName.includes('data') || fieldName.includes('vigencia') || fieldName.includes('_at')) {
      try {
        const date = new Date(value);
        return date.toLocaleDateString('pt-BR');
      } catch {
        return String(value);
      }
    }
    
    return String(value);
  }

  /**
   * Get record identifier for display
   */
  private getRecordIdentifier(values: any): string {
    if (values.name) return `Nome: ${values.name}`;
    if (values.screen_name) return `Tela: ${values.screen_name}`;
    if (values.id) return `ID: ${values.id}`;
    return 'Detalhes não disponíveis';
  }

  /**
   * Get record name for context
   */
  private async getRecordName(log: PermissionAuditLog): Promise<string> {
    const values = log.new_values || log.old_values;
    if (!values) return '';

    switch (log.table_name) {
      case 'user_groups':
        const name = this.getValueFromJson(values, 'name');
        return name ? `Grupo "${name}"` : 'Grupo';
      
      case 'screen_permissions':
        const screenKey = this.getValueFromJson(values, 'screen_key');
        const screenName = screenKey ? this.getScreenDisplayName(screenKey) : 'Tela desconhecida';
        return `Permissão da tela "${screenName}"`;
      
      case 'user_group_assignments':
        return 'Atribuição de usuário';

      case 'profiles':
        const userName = this.getValueFromJson(values, 'full_name') || this.getValueFromJson(values, 'email');
        return userName ? `Usuário "${userName}"` : 'Usuário';

      case 'empresas_clientes':
        const empresaNome = this.getValueFromJson(values, 'nome_completo') || this.getValueFromJson(values, 'nome_abreviado');
        return empresaNome ? `Empresa "${empresaNome}"` : 'Empresa';

      case 'clientes':
        const clienteNome = this.getValueFromJson(values, 'nome');
        return clienteNome ? `Cliente "${clienteNome}"` : 'Cliente';

      case 'grupos_responsaveis':
        const grupoNome = this.getValueFromJson(values, 'nome');
        return grupoNome ? `Grupo responsável "${grupoNome}"` : 'Grupo responsável';

      case 'email_templates':
        const templateNome = this.getValueFromJson(values, 'nome');
        return templateNome ? `Template "${templateNome}"` : 'Template de email';

      case 'historico_disparos':
        return 'Disparo de book';

      case 'requerimentos':
        const chamado = this.getValueFromJson(values, 'chamado');
        return chamado ? `Requerimento "${chamado}"` : 'Requerimento';
      
      default:
        return '';
    }
  }

  /**
   * Safely get value from JSON object
   */
  private getValueFromJson(json: any, key: string): string | null {
    if (!json || typeof json !== 'object') return null;
    
    const value = json[key];
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    
    return null;
  }

  /**
   * Get user name by ID
   */
  private async getUserNameById(userId: string): Promise<string | null> {
    try {
      // Try profiles table first
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single();

      if (profile) {
        return profile.full_name || profile.email?.split('@')[0] || null;
      }

      // Fallback to auth.users
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const user = authUsers?.users?.find((u: any) => u.id === userId);
      
      if (user) {
        return user.user_metadata?.full_name || 
               user.user_metadata?.name || 
               user.email?.split('@')[0] || 
               null;
      }

      return null;
    } catch (error) {
      console.warn('Error fetching user name:', error);
      return null;
    }
  }

  /**
   * Get group name by ID
   */
  private async getGroupNameById(groupId: string): Promise<string | null> {
    try {
      const { data: group } = await supabase
        .from('user_groups')
        .select('name')
        .eq('id', groupId)
        .single();

      return group?.name || null;
    } catch (error) {
      console.warn('Error fetching group name:', error);
      return null;
    }
  }

  /**
   * Get empresa name by ID
   */
  private async getEmpresaNameById(empresaId: string): Promise<string | null> {
    try {
      const { data: empresa } = await supabase
        .from('empresas_clientes')
        .select('nome_completo, nome_abreviado')
        .eq('id', empresaId)
        .single();

      return empresa?.nome_completo || empresa?.nome_abreviado || null;
    } catch (error) {
      console.warn('Error fetching empresa name:', error);
      return null;
    }
  }

  /**
   * Get cliente name by ID
   */
  private async getClienteNameById(clienteId: string): Promise<string | null> {
    try {
      const { data: cliente } = await supabase
        .from('clientes')
        .select('nome')
        .eq('id', clienteId)
        .single();

      return cliente?.nome || null;
    } catch (error) {
      console.warn('Error fetching cliente name:', error);
      return null;
    }
  }

  /**
   * Get screen display name by key
   */
  private getScreenDisplayName(screenKey: string): string {
    const screenNames: Record<string, string> = {
      'dashboard': 'Dashboard',
      'user-groups': 'Grupos de Usuários',
      'user-assignment': 'Atribuir Usuários',
      'email-config': 'Configuração de Email',
      'user-config': 'Configuração de Usuários',
      'audit-logs': 'Logs de Auditoria',
      'empresas_clientes': 'Empresas Clientes',
      'clientes': 'Cadastro de Clientes',
      'grupos_responsaveis': 'Grupos Responsáveis',
      'controle_disparos': 'Disparos',
      'historico_books': 'Histórico de Books',
      'monitoramento_vigencias': 'Monitoramento de Vigências',
      'lancar_requerimentos': 'Lançar Requerimentos',
      'faturar_requerimentos': 'Faturar Requerimentos'
    };
    
    return screenNames[screenKey] || screenKey;
  }

  /**
   * Format permission level for display
   */
  private formatPermissionLevel(level: string | null): string {
    const levels: Record<string, string> = {
      'none': 'Nenhum',
      'view': 'Visualizar',
      'edit': 'Editar'
    };
    
    return levels[level || ''] || level || 'Desconhecido';
  }

  /**
   * Format status for display
   */
  private formatStatus(status: string | null): string {
    const statuses: Record<string, string> = {
      'ativo': 'Ativo',
      'inativo': 'Inativo',
      'suspenso': 'Suspenso'
    };
    
    return statuses[status || ''] || status || 'Desconhecido';
  }

  /**
   * Format produto for display
   */
  private formatProduto(produto: string | null): string {
    const produtos: Record<string, string> = {
      'COMEX': 'Comércio Exterior',
      'FISCAL': 'Fiscal',
      'GALLERY': 'Gallery'
    };
    
    return produtos[produto || ''] || produto || 'Desconhecido';
  }

  /**
   * Format tipo de disparo for display
   */
  private formatTipoDisparo(tipo: string | null): string {
    const tipos: Record<string, string> = {
      'padrao': 'Padrão',
      'personalizado': 'Personalizado'
    };
    
    return tipos[tipo || ''] || tipo || 'Padrão';
  }

  /**
   * Format status do disparo for display
   */
  private formatStatusDisparo(status: string | null): string {
    const statuses: Record<string, string> = {
      'enviado': 'Enviado',
      'falha': 'Falha',
      'pendente': 'Pendente',
      'processando': 'Processando'
    };
    
    return statuses[status || ''] || status || 'Desconhecido';
  }

  /**
   * Format tipo de cobrança for display
   */
  private formatTipoCobranca(tipo: string | null): string {
    const tipos: Record<string, string> = {
      'banco_horas': 'Banco de Horas',
      'cobro_interno': 'Cobro Interno',
      'contrato': 'Contrato',
      'faturado': 'Faturado',
      'hora_extra': 'Hora Extra',
      'sobreaviso': 'Sobreaviso',
      'reprovado': 'Reprovado',
      'bolsao_enel': 'Bolsão Enel'
    };
    
    return tipos[tipo || ''] || tipo || 'Desconhecido';
  }

  /**
   * Get table display name
   */
  getTableDisplayName(tableName: string): string {
    const tableNames: Record<string, string> = {
      'user_groups': 'Grupos de Usuários',
      'screen_permissions': 'Permissões de Tela',
      'user_group_assignments': 'Atribuições de Usuários',
      'profiles': 'Usuários do Sistema',
      'empresas_clientes': 'Empresas Clientes',
      'clientes': 'Cadastro de Clientes',
      'grupos_responsaveis': 'Grupos Responsáveis',
      'email_templates': 'Templates de Email',
      'historico_disparos': 'Disparos de Books',
      'requerimentos': 'Requerimentos'
    };
    
    return tableNames[tableName] || tableName;
  }
}

export const auditService = new AuditService();