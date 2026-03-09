import { supabase } from '@/integrations/supabase/client';

export interface AuditLogEntry {
  action_type: string;
  entity_type: string;
  entity_id: string;
  entity_name?: string;
  performed_by: string;
  performed_by_name?: string;
  village_id?: string;
  metadata?: Record<string, any>;
}

export async function writeAuditLog(entry: AuditLogEntry) {
  try {
    await (supabase as any).from('admin_audit_log').insert(entry);
  } catch (e) {
    // silently fail — audit log is non-blocking
    console.warn('Audit log write failed:', e);
  }
}
