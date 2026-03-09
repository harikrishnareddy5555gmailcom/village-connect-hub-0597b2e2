import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVillage } from '@/contexts/VillageContext';
import { ShieldAlert, Search, Loader2, Trash2, Ban, CheckCircle, Key, UserCog, Download, PauseCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  delete:         { label: 'Deleted',        icon: <Trash2 size={13} />,       color: 'bg-destructive/15 text-red-700 border-destructive/30' },
  ban:            { label: 'Banned',         icon: <Ban size={13} />,          color: 'bg-destructive/15 text-red-700 border-destructive/30' },
  activate:       { label: 'Activated',      icon: <CheckCircle size={13} />,  color: 'bg-success/15 text-green-700 border-success/30' },
  suspend:        { label: 'Suspended',      icon: <PauseCircle size={13} />,  color: 'bg-orange-500/15 text-orange-700 border-orange-500/30' },
  suspended:      { label: 'Suspended',      icon: <PauseCircle size={13} />,  color: 'bg-orange-500/15 text-orange-700 border-orange-500/30' },
  role_change:    { label: 'Role Changed',   icon: <UserCog size={13} />,      color: 'bg-info/15 text-blue-700 border-info/30' },
  password_reset: { label: 'Password Reset', icon: <Key size={13} />,          color: 'bg-info/15 text-blue-700 border-info/30' },
};

const ENTITY_EMOJI: Record<string, string> = {
  user:       '👤',
  event:      '📅',
  project:    '🏗️',
  discussion: '💬',
  complaint:  '⚠️',
  business:   '🏢',
  post:       '📝',
};

const AuditLogPage: React.FC = () => {
  const { currentVillage } = useVillage();
  const [search,       setSearch]       = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['admin-audit-log', currentVillage?.id],
    enabled: !!currentVillage,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('admin_audit_log')
        .select('*')
        .eq('village_id', currentVillage!.id)
        .order('created_at', { ascending: false })
        .limit(500);
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const filtered = logs.filter((l: any) => {
    const matchSearch  = !search ||
      l.entity_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.performed_by_name?.toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === 'all' || l.action_type === filterAction;
    const matchEntity = filterEntity === 'all' || l.entity_type === filterEntity;
    return matchSearch && matchAction && matchEntity;
  });

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (filtered.length === 0) {
      toast.error('No records to export');
      return;
    }

    const headers = ['Date', 'Time', 'Action', 'Entity Type', 'Entity Name', 'Performed By', 'Details'];
    const rows = filtered.map((l: any) => {
      const date    = format(new Date(l.created_at), 'dd MMM yyyy');
      const time    = format(new Date(l.created_at), 'HH:mm:ss');
      const action  = ACTION_CONFIG[l.action_type]?.label ?? l.action_type;
      const details = l.metadata
        ? Object.entries(l.metadata).map(([k, v]) => `${k}=${v}`).join('; ')
        : '';
      return [
        date,
        time,
        action,
        l.entity_type ?? '',
        `"${(l.entity_name ?? l.entity_id ?? '').replace(/"/g, '""')}"`,
        `"${(l.performed_by_name ?? 'Admin').replace(/"/g, '""')}"`,
        `"${details.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csv      = [headers.join(','), ...rows].join('\n');
    const blob     = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url      = URL.createObjectURL(blob);
    const link     = document.createElement('a');
    link.href      = url;
    link.download  = `audit-log-${currentVillage?.name ?? 'village'}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} records to CSV`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-destructive/10 rounded-xl flex items-center justify-center">
          <ShieldAlert size={20} className="text-destructive" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Audit Log</h1>
          <p className="text-xs text-muted-foreground">Track all admin actions — who did what and when</p>
        </div>
        {/* CSV Export Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={exportCSV}
          disabled={isLoading || filtered.length === 0}
          className="flex items-center gap-2 text-xs"
        >
          <Download size={14} />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or admin..."
            className="pl-8"
          />
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="ban">Ban</SelectItem>
            <SelectItem value="activate">Activate</SelectItem>
            <SelectItem value="suspended">Suspend</SelectItem>
            <SelectItem value="role_change">Role Change</SelectItem>
            <SelectItem value="password_reset">Password Reset</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEntity} onValueChange={setFilterEntity}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="event">Event</SelectItem>
            <SelectItem value="project">Project</SelectItem>
            <SelectItem value="discussion">Discussion</SelectItem>
            <SelectItem value="complaint">Complaint</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="post">Post</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Total Actions',  value: logs.length,                                                  color: 'bg-muted' },
          { label: 'Deletions',      value: logs.filter((l: any) => l.action_type === 'delete').length,   color: 'bg-destructive/10' },
          { label: 'User Changes',   value: logs.filter((l: any) => l.entity_type === 'user').length,     color: 'bg-info/10' },
        ].map(s => (
          <div key={s.label} className={cn('vcp-card p-3 text-center', s.color)}>
            <p className="text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Log List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🛡️</div>
          <p className="font-medium text-foreground">No audit records yet</p>
          <p className="text-sm text-muted-foreground mt-1">Admin actions will appear here automatically</p>
        </div>
      ) : (
        <div className="vcp-card overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((log: any) => {
              const actionCfg = ACTION_CONFIG[log.action_type] ?? {
                label: log.action_type,
                icon:  <ShieldAlert size={13} />,
                color: 'bg-muted text-muted-foreground border-border',
              };
              return (
                <div key={log.id} className="flex items-start gap-3 p-4 hover:bg-muted/20 transition-colors">
                  {/* Entity emoji */}
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-lg flex-shrink-0">
                    {ENTITY_EMOJI[log.entity_type] ?? '📋'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('flex items-center gap-1 border rounded-full px-2 py-0.5 text-xs font-medium', actionCfg.color)}>
                        {actionCfg.icon}
                        {actionCfg.label}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground capitalize">{log.entity_type}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground mt-0.5 truncate">
                      {log.entity_name ?? log.entity_id}
                    </p>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {Object.entries(log.metadata).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      By <span className="font-medium text-foreground">{log.performed_by_name ?? 'Admin'}</span>
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), 'dd MMM yyyy')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), 'h:mm a')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogPage;
