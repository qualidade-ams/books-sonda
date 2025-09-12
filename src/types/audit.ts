import type { Json } from '@/integrations/supabase/types';

export interface PermissionAuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values: Json | null;
  new_values: Json | null;
  changed_by: string;
  changed_at: string;
}

export interface AuditLogWithUser extends PermissionAuditLog {
  user_name?: string;
  user_email?: string;
}

export interface AuditLogFilters {
  table_name?: string;
  action?: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_by?: string;
  date_from?: string;
  date_to?: string;
  record_id?: string;
}

export interface AuditLogSummary {
  total_changes: number;
  changes_by_table: Record<string, number>;
  changes_by_action: Record<string, number>;
  recent_changes: PermissionAuditLog[];
}