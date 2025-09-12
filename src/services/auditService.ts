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
  formatChanges(log: PermissionAuditLog): string {
    if (log.action === 'INSERT') {
      return this.formatInsertDetails(log);
    }
    
    if (log.action === 'DELETE') {
      return this.formatDeleteDetails(log);
    }
    
    if (log.action === 'UPDATE' && log.old_values && log.new_values) {
      return this.formatUpdateDetails(log);
    }
    
    return 'Alteração desconhecida';
  }

  /**
   * Format INSERT action details
   */
  private formatInsertDetails(log: PermissionAuditLog): string {
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
        if (screenKey) {
          const screenName = this.getScreenDisplayName(screenKey);
          const levelText = this.formatPermissionLevel(permissionLevel);
          return `Permissão criada para tela: "${screenName}" - Nível: ${levelText}`;
        }
        return 'Permissão de tela criada';
      
      case 'user_group_assignments':
        const userId = this.getValueFromJson(values, 'user_id');
        const groupId = this.getValueFromJson(values, 'group_id');
        return `Usuário ${userId ? `(${userId})` : ''} atribuído ao grupo ${groupId ? `(${groupId})` : ''}`.trim();
      
      default:
        return `Registro criado - ${this.getRecordIdentifier(values)}`;
    }
  }

  /**
   * Format DELETE action details
   */
  private formatDeleteDetails(log: PermissionAuditLog): string {
    const values = log.old_values;
    if (!values || typeof values !== 'object') return 'Registro excluído';

    switch (log.table_name) {
      case 'user_groups':
        const groupName = this.getValueFromJson(values, 'name') || 'Nome não disponível';
        const groupDesc = this.getValueFromJson(values, 'description') || 'Sem descrição';
        return `Grupo excluído: "${groupName}" - ${groupDesc}`;
      
      case 'screen_permissions':
        const screenKey = this.getValueFromJson(values, 'screen_key');
        const permissionLevel = this.getValueFromJson(values, 'permission_level');
        if (screenKey) {
          const screenName = this.getScreenDisplayName(screenKey);
          const levelText = this.formatPermissionLevel(permissionLevel);
          return `Permissão excluída da tela: "${screenName}" - Nível: ${levelText}`;
        }
        return 'Permissão de tela excluída';
      
      case 'user_group_assignments':
        const userId = this.getValueFromJson(values, 'user_id');
        const groupId = this.getValueFromJson(values, 'group_id');
        return `Usuário ${userId ? `(${userId})` : ''} removido do grupo ${groupId ? `(${groupId})` : ''}`.trim();
      
      default:
        return `Registro excluído - ${this.getRecordIdentifier(values)}`;
    }
  }

  /**
   * Format UPDATE action details
   */
  private formatUpdateDetails(log: PermissionAuditLog): string {
    const changes: string[] = [];
    const fieldLabels = this.getFieldLabels(log.table_name);
    
    Object.keys(log.new_values || {}).forEach(key => {
      if (key === 'updated_at' || key === 'updated_by') return;
      
      const oldValue = log.old_values?.[key];
      const newValue = log.new_values?.[key];
      
      if (oldValue !== newValue) {
        const fieldLabel = fieldLabels[key] || key;
        const formattedOldValue = this.formatFieldValue(key, oldValue);
        const formattedNewValue = this.formatFieldValue(key, newValue);
        changes.push(`${fieldLabel}: "${formattedOldValue}" → "${formattedNewValue}"`);
      }
    });

    if (changes.length === 0) {
      return 'Nenhuma alteração detectada';
    }

    const recordName = this.getRecordName(log);
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
        'allowed': 'Permitido'
      },
      'user_group_assignments': {
        'user_id': 'Usuário',
        'group_id': 'Grupo'
      }
    };
    
    return labels[tableName] || {};
  }

  /**
   * Format field values for better display
   */
  private formatFieldValue(fieldName: string, value: any): string {
    if (value === null || value === undefined) return 'Vazio';
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (typeof value === 'string' && value.trim() === '') return 'Vazio';
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
  private getRecordName(log: PermissionAuditLog): string {
    const values = log.new_values || log.old_values;
    if (!values) return '';

    switch (log.table_name) {
      case 'user_groups':
        const name = this.getValueFromJson(values, 'name');
        return name ? `Grupo "${name}"` : 'Grupo';
      
      case 'screen_permissions':
        const screenName = this.getValueFromJson(values, 'screen_name');
        return screenName ? `Permissão da tela "${screenName}"` : 'Permissão';
      
      case 'user_group_assignments':
        return 'Atribuição de usuário';
      
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
   * Get screen display name by key
   */
  private getScreenDisplayName(screenKey: string): string {
    const screenNames: Record<string, string> = {
      'dashboard': 'Dashboard',
      'user-groups': 'Grupos de Usuários',
      'user-assignment': 'Atribuir Usuários',
      'email-config': 'Configuração de Email',
      'user-config': 'Configuração de Usuários',
      'audit-logs': 'Logs de Auditoria'
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
   * Get table display name
   */
  getTableDisplayName(tableName: string): string {
    const tableNames: Record<string, string> = {
      'user_groups': 'Grupos de Usuários',
      'screen_permissions': 'Permissões de Tela',
      'user_group_assignments': 'Atribuições de Usuários'
    };
    
    return tableNames[tableName] || tableName;
  }
}

export const auditService = new AuditService();