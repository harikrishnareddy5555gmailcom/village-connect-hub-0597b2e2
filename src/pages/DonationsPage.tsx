import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign, Plus, TrendingDown, TrendingUp, History,
  Edit2, RotateCcw, RotateCw, Lock, Unlock, AlertCircle,
  CheckCircle, Clock, Trash2, Image, X, ChevronDown, ChevronUp,
  Filter, Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVillage } from '@/contexts/VillageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────
type Donation = {
  id: string; village_id: string; donor_name: string; donor_id: string | null;
  amount: number; currency: string; date: string; project_id: string | null;
  notes: string | null; is_anonymous: boolean; added_by: string;
  created_at: string; updated_at: string;
  projects?: { title: string } | null;
  profiles?: { full_name: string } | null;
};
type Expense = {
  id: string; village_id: string; description: string; amount: number;
  currency: string; date: string; project_id: string | null; category: string;
  proof_url: string | null; responsible_admin: string; notes: string | null;
  created_at: string; updated_at: string;
  projects?: { title: string } | null;
  admin_profile?: { full_name: string } | null;
};
type AuditEntry = {
  id: string; record_type: string; record_id: string; action: string;
  changed_by: string; previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null; created_at: string;
  profiles?: { full_name: string } | null;
};
type EditRequest = {
  id: string; record_type: string; record_id: string; reason: string;
  status: string; created_at: string;
  requester?: { full_name: string } | null;
};

const EXPENSE_CATEGORIES = [
  'General', 'Construction', 'Materials', 'Labour', 'Transport',
  'Food & Refreshments', 'Religious', 'Medical', 'Education', 'Other'
];

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// ─── Main Component ───────────────────────────────────────────────────────────
const DonationsPage: React.FC = () => {
  const { profile, role } = useAuth();
  const { currentVillage, refreshVillage } = useVillage();
  const qc = useQueryClient();
  const isAdmin = role === 'admin' || role === 'super_admin';
  const isSuperAdmin = role === 'super_admin';

  // Dialogs
  const [showAddDonation, setShowAddDonation] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [editTarget, setEditTarget] = useState<{ type: 'donation' | 'expense'; record: Donation | Expense } | null>(null);
  const [editRequestTarget, setEditRequestTarget] = useState<{ type: 'donation' | 'expense'; id: string } | null>(null);
  const [pendingRequestsOpen, setPendingRequestsOpen] = useState(false);

  const villageId = currentVillage?.id;
  const donationsEnabled = (currentVillage as (typeof currentVillage & { donations_enabled?: boolean }))?.donations_enabled ?? false;

  // ─── Queries ───────────────────────────────────────────────────────────────
  const { data: donations = [], isLoading: loadingDonations } = useQuery({
    queryKey: ['donations', villageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donations')
        .select('*, projects(title), profiles!donations_added_by_fkey(full_name)')
        .eq('village_id', villageId!)
        .order('date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Donation[];
    },
    enabled: !!villageId && donationsEnabled,
  });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses', villageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, projects(title), profiles!expenses_responsible_admin_fkey(full_name)')
        .eq('village_id', villageId!)
        .order('date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Expense[];
    },
    enabled: !!villageId && donationsEnabled,
  });

  const { data: auditLog = [] } = useQuery({
    queryKey: ['fund_audit_log', villageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fund_audit_log')
        .select('*, profiles!fund_audit_log_changed_by_fkey(full_name)')
        .eq('village_id', villageId!)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as AuditEntry[];
    },
    enabled: !!villageId && isAdmin,
  });

  const { data: editRequests = [] } = useQuery({
    queryKey: ['fund_edit_requests', villageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fund_edit_requests')
        .select('*, profiles!fund_edit_requests_requested_by_fkey(full_name)')
        .eq('village_id', villageId!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as EditRequest[];
    },
    enabled: !!villageId && isAdmin,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list', villageId],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('id, title').eq('village_id', villageId!);
      return data ?? [];
    },
    enabled: !!villageId,
  });

  // ─── Computed stats ────────────────────────────────────────────────────────
  const totalDonations = donations.reduce((s, d) => s + Number(d.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const balance = totalDonations - totalExpenses;

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const toggleDonationsMutation = useMutation({
    mutationFn: async (enable: boolean) => {
      const { error } = await supabase
        .from('villages')
        .update({ donations_enabled: enable } as Record<string, unknown>)
        .eq('id', villageId!);
      if (error) throw error;
    },
    onSuccess: async (_, enable) => {
      await refreshVillage();
      qc.invalidateQueries({ queryKey: ['villages'] });
      toast.success(enable ? 'Donation system enabled' : 'Donation system disabled');
    },
    onError: () => toast.error('Failed to update setting'),
  });

  const addDonationMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const { data: row, error } = await supabase
        .from('donations')
        .insert({ ...data, village_id: villageId, added_by: profile!.user_id })
        .select()
        .single();
      if (error) throw error;
      // Audit
      await supabase.from('fund_audit_log').insert({
        village_id: villageId!, record_type: 'donation', record_id: row.id,
        action: 'create', changed_by: profile!.user_id, new_data: row,
      });
      return row;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['donations', villageId] }); toast.success('Donation added'); setShowAddDonation(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const { data: row, error } = await supabase
        .from('expenses')
        .insert({ ...data, village_id: villageId, responsible_admin: profile!.user_id })
        .select()
        .single();
      if (error) throw error;
      await supabase.from('fund_audit_log').insert({
        village_id: villageId!, record_type: 'expense', record_id: row.id,
        action: 'create', changed_by: profile!.user_id, new_data: row,
      });
      return row;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses', villageId] }); toast.success('Expense added'); setShowAddExpense(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const editMutation = useMutation({
    mutationFn: async ({ type, id, prev, next }: { type: string; id: string; prev: Record<string, unknown>; next: Record<string, unknown> }) => {
      const table = type === 'donation' ? 'donations' : 'expenses';
      const { error } = await supabase.from(table as 'donations').update(next).eq('id', id);
      if (error) throw error;
      await supabase.from('fund_audit_log').insert({
        village_id: villageId!, record_type: type, record_id: id,
        action: 'edit', changed_by: profile!.user_id, previous_data: prev, new_data: next,
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [vars.type === 'donation' ? 'donations' : 'expenses', villageId] });
      qc.invalidateQueries({ queryKey: ['fund_audit_log', villageId] });
      toast.success('Record updated');
      setEditTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const undoMutation = useMutation({
    mutationFn: async (entry: AuditEntry) => {
      if (!entry.previous_data) { toast.info('Nothing to undo'); return; }
      const table = entry.record_type === 'donation' ? 'donations' : 'expenses';
      const { error } = await supabase.from(table as 'donations').update(entry.previous_data as Record<string, unknown>).eq('id', entry.record_id);
      if (error) throw error;
      await supabase.from('fund_audit_log').insert({
        village_id: villageId!, record_type: entry.record_type, record_id: entry.record_id,
        action: 'undo', changed_by: profile!.user_id, previous_data: entry.new_data, new_data: entry.previous_data,
      });
    },
    onSuccess: (_, entry) => {
      qc.invalidateQueries({ queryKey: [entry.record_type === 'donation' ? 'donations' : 'expenses', villageId] });
      qc.invalidateQueries({ queryKey: ['fund_audit_log', villageId] });
      toast.success('Undo successful');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviewEditRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('fund_edit_requests').update({
        status, reviewed_by: profile!.user_id, reviewed_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fund_edit_requests', villageId] }); toast.success('Request reviewed'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitEditRequestMutation = useMutation({
    mutationFn: async ({ type, id, reason }: { type: string; id: string; reason: string }) => {
      const { error } = await supabase.from('fund_edit_requests').insert({
        village_id: villageId!, record_type: type, record_id: id,
        requested_by: profile!.user_id, reason,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Edit request submitted — awaiting admin approval'); setEditRequestTarget(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  // ─── Render: disabled state ─────────────────────────────────────────────────
  if (!donationsEnabled && !isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <Lock size={48} className="mb-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
        <h2 className="text-xl font-bold text-foreground mb-2">Donation System Not Active</h2>
        <p className="text-muted-foreground text-sm">The village admin hasn't enabled the donation & fund tracking system yet.</p>
      </div>
    );
  }

  if (!donationsEnabled && isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <Lock size={48} className="mb-4 text-warning" />
        <h2 className="text-xl font-bold text-foreground mb-3">Donation System is Disabled</h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-md">
          As Super Admin, you can enable the donation & fund tracking system for this village. Once enabled, admins can log donations and expenses with full audit history.
        </p>
        <Button
          className="btn-primary-gradient"
          onClick={() => toggleDonationsMutation.mutate(true)}
          disabled={toggleDonationsMutation.isPending}
        >
          <Unlock size={16} className="mr-2" />
          Enable Donation System
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Donation & Fund Ledger</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Transparent public record of all donations and expenses</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isSuperAdmin && (
            <Button variant="outline" size="sm" onClick={() => toggleDonationsMutation.mutate(false)} disabled={toggleDonationsMutation.isPending} className="text-destructive border-destructive/40 hover:bg-destructive/10">
              <Lock size={14} className="mr-1.5" /> Disable System
            </Button>
          )}
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowAuditLog(true)}>
                <History size={14} className="mr-1.5" /> Audit Log
              </Button>
              {editRequests.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setPendingRequestsOpen(true)} className="relative">
                  <Clock size={14} className="mr-1.5" /> Edit Requests
                  <span className="ml-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">{editRequests.length}</span>
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setShowAddExpense(true)}>
                <TrendingDown size={14} className="mr-1.5" /> Add Expense
              </Button>
              <Button size="sm" className="btn-primary-gradient" onClick={() => setShowAddDonation(true)}>
                <Plus size={14} className="mr-1.5" /> Add Donation
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<TrendingUp size={20} />} label="Total Donations" value={fmt(totalDonations)} color="success" />
        <StatCard icon={<TrendingDown size={20} />} label="Total Expenses" value={fmt(totalExpenses)} color="destructive" />
        <StatCard icon={<DollarSign size={20} />} label="Balance" value={fmt(balance)} color={balance >= 0 ? 'success' : 'destructive'} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="donations">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="donations" className="flex-1 sm:flex-none">
            Donations <Badge variant="secondary" className="ml-2">{donations.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex-1 sm:flex-none">
            Expenses <Badge variant="secondary" className="ml-2">{expenses.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Donations List */}
        <TabsContent value="donations" className="mt-4 space-y-3">
          {loadingDonations ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="vcp-card h-16 animate-pulse" />)
          ) : donations.length === 0 ? (
            <EmptyState icon="💰" message="No donations recorded yet" />
          ) : donations.map(d => (
            <DonationCard
              key={d.id} donation={d} isAdmin={isAdmin}
              onEdit={() => setEditTarget({ type: 'donation', record: d })}
              onRequestEdit={() => setEditRequestTarget({ type: 'donation', id: d.id })}
            />
          ))}
        </TabsContent>

        {/* Expenses List */}
        <TabsContent value="expenses" className="mt-4 space-y-3">
          {loadingExpenses ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="vcp-card h-16 animate-pulse" />)
          ) : expenses.length === 0 ? (
            <EmptyState icon="🧾" message="No expenses recorded yet" />
          ) : expenses.map(e => (
            <ExpenseCard
              key={e.id} expense={e} isAdmin={isAdmin}
              onEdit={() => setEditTarget({ type: 'expense', record: e })}
              onRequestEdit={() => setEditRequestTarget({ type: 'expense', id: e.id })}
            />
          ))}
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ── */}

      {/* Add Donation */}
      <AddDonationDialog
        open={showAddDonation}
        onClose={() => setShowAddDonation(false)}
        projects={projects}
        onSubmit={(d) => addDonationMutation.mutate(d)}
        loading={addDonationMutation.isPending}
      />

      {/* Add Expense */}
      <AddExpenseDialog
        open={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        projects={projects}
        categories={EXPENSE_CATEGORIES}
        villageId={villageId!}
        onSubmit={(d) => addExpenseMutation.mutate(d)}
        loading={addExpenseMutation.isPending}
      />

      {/* Edit Dialog */}
      {editTarget && (
        <EditRecordDialog
          target={editTarget}
          projects={projects}
          categories={EXPENSE_CATEGORIES}
          onClose={() => setEditTarget(null)}
          onSubmit={(next) => {
            const prev: Record<string, unknown> = {};
            Object.keys(next).forEach(k => { prev[k] = (editTarget.record as Record<string, unknown>)[k]; });
            editMutation.mutate({ type: editTarget.type, id: editTarget.record.id, prev, next });
          }}
          loading={editMutation.isPending}
        />
      )}

      {/* Edit Request Dialog (non-admins) */}
      {editRequestTarget && (
        <EditRequestDialog
          target={editRequestTarget}
          onClose={() => setEditRequestTarget(null)}
          onSubmit={(reason) => submitEditRequestMutation.mutate({ ...editRequestTarget, reason })}
          loading={submitEditRequestMutation.isPending}
        />
      )}

      {/* Audit Log */}
      {showAuditLog && (
        <AuditLogDialog
          log={auditLog}
          onClose={() => setShowAuditLog(false)}
          onUndo={(entry) => undoMutation.mutate(entry)}
          undoLoading={undoMutation.isPending}
        />
      )}

      {/* Pending Edit Requests */}
      {pendingRequestsOpen && (
        <PendingRequestsDialog
          requests={editRequests}
          onClose={() => setPendingRequestsOpen(false)}
          onApprove={(id) => reviewEditRequestMutation.mutate({ id, status: 'approved' })}
          onReject={(id) => reviewEditRequestMutation.mutate({ id, status: 'rejected' })}
          loading={reviewEditRequestMutation.isPending}
        />
      )}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) => (
  <div className="vcp-card p-4 flex items-center gap-4">
    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
      color === 'success' ? 'bg-success/15 text-green-700' :
      color === 'destructive' ? 'bg-destructive/15 text-red-700' : 'bg-primary/15 text-primary'
    )}>
      {icon}
    </div>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-bold text-lg text-foreground">{value}</p>
    </div>
  </div>
);

const EmptyState = ({ icon, message }: { icon: string; message: string }) => (
  <div className="vcp-card p-10 text-center">
    <p className="text-4xl mb-3">{icon}</p>
    <p className="text-muted-foreground">{message}</p>
  </div>
);

const DonationCard = ({ donation: d, isAdmin, onEdit, onRequestEdit }: { donation: Donation; isAdmin: boolean; onEdit: () => void; onRequestEdit: () => void }) => (
  <div className="vcp-card p-4 flex items-center gap-4">
    <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center flex-shrink-0">
      <TrendingUp size={18} className="text-green-700" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-foreground">{d.is_anonymous ? 'Anonymous' : d.donor_name}</span>
        {d.projects && <Badge variant="outline" className="text-xs">{d.projects.title}</Badge>}
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(d.date), 'dd MMM yyyy')} {d.notes && `• ${d.notes}`}</p>
    </div>
    <div className="text-right flex-shrink-0">
      <p className="font-bold text-green-700">{fmt(d.amount)}</p>
      {isAdmin ? (
        <button onClick={onEdit} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-1 ml-auto">
          <Edit2 size={11} /> Edit
        </button>
      ) : (
        <button onClick={onRequestEdit} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-1 ml-auto">
          <Edit2 size={11} /> Request edit
        </button>
      )}
    </div>
  </div>
);

const ExpenseCard = ({ expense: e, isAdmin, onEdit, onRequestEdit }: { expense: Expense; isAdmin: boolean; onEdit: () => void; onRequestEdit: () => void }) => (
  <div className="vcp-card p-4 flex items-center gap-4">
    <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center flex-shrink-0">
      <TrendingDown size={18} className="text-red-700" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-foreground truncate">{e.description}</span>
        <Badge variant="outline" className="text-xs">{e.category}</Badge>
        {e.projects && <Badge variant="outline" className="text-xs">{e.projects.title}</Badge>}
      </div>
      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
        <p className="text-xs text-muted-foreground">{format(new Date(e.date), 'dd MMM yyyy')}</p>
        {e.proof_url && (
          <a href={e.proof_url} target="_blank" rel="noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
            <Image size={11} /> View proof
          </a>
        )}
      </div>
    </div>
    <div className="text-right flex-shrink-0">
      <p className="font-bold text-red-700">{fmt(e.amount)}</p>
      {isAdmin ? (
        <button onClick={onEdit} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-1 ml-auto">
          <Edit2 size={11} /> Edit
        </button>
      ) : (
        <button onClick={onRequestEdit} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-1 ml-auto">
          <Edit2 size={11} /> Request edit
        </button>
      )}
    </div>
  </div>
);

// ─── Add Donation Dialog ───────────────────────────────────────────────────────
const AddDonationDialog = ({ open, onClose, projects, onSubmit, loading }: {
  open: boolean; onClose: () => void;
  projects: { id: string; title: string }[];
  onSubmit: (d: Record<string, unknown>) => void;
  loading: boolean;
}) => {
  const [form, setForm] = useState({ donor_name: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), project_id: '', notes: '', is_anonymous: false });
  const set = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Donation</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Donor Name *</Label>
            <Input value={form.donor_name} onChange={e => set('donor_name', e.target.value)} placeholder="Full name" className="mt-1.5" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="anon" checked={form.is_anonymous} onChange={e => set('is_anonymous', e.target.checked)} />
            <Label htmlFor="anon" className="cursor-pointer">Mark as anonymous</Label>
          </div>
          <div>
            <Label>Amount (₹) *</Label>
            <Input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" className="mt-1.5" />
          </div>
          <div>
            <Label>Date *</Label>
            <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Linked Project</Label>
            <Select value={form.project_id} onValueChange={v => set('project_id', v)}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes" className="mt-1.5" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="btn-primary-gradient"
            disabled={loading || !form.donor_name || !form.amount}
            onClick={() => onSubmit({ donor_name: form.donor_name, amount: parseFloat(form.amount), date: form.date, project_id: form.project_id || null, notes: form.notes || null, is_anonymous: form.is_anonymous })}
          >
            {loading ? 'Saving...' : 'Add Donation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Add Expense Dialog ────────────────────────────────────────────────────────
const AddExpenseDialog = ({ open, onClose, projects, categories, villageId, onSubmit, loading }: {
  open: boolean; onClose: () => void;
  projects: { id: string; title: string }[];
  categories: string[]; villageId: string;
  onSubmit: (d: Record<string, unknown>) => void;
  loading: boolean;
}) => {
  const [form, setForm] = useState({ description: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), project_id: '', category: 'General', notes: '', proof_url: '' });
  const [uploading, setUploading] = useState(false);
  const set = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `expenses/${villageId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: true });
    if (error) { toast.error('Upload failed'); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
    set('proof_url', urlData.publicUrl);
    setUploading(false);
    toast.success('Proof uploaded');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Description *</Label>
            <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="What was the expense for?" className="mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount (₹) *</Label>
              <Input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" className="mt-1.5" />
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label>Category *</Label>
            <Select value={form.category} onValueChange={v => set('category', v)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Linked Project</Label>
            <Select value={form.project_id} onValueChange={v => set('project_id', v)}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Proof Image / Document</Label>
            <div className="mt-1.5 flex items-center gap-2">
              <label className="cursor-pointer flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted">
                <Image size={14} /> {uploading ? 'Uploading...' : form.proof_url ? 'Change file' : 'Upload proof'}
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleProofUpload} />
              </label>
              {form.proof_url && <span className="text-xs text-success">✓ Uploaded</span>}
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes" className="mt-1.5" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="btn-primary-gradient"
            disabled={loading || uploading || !form.description || !form.amount}
            onClick={() => onSubmit({ description: form.description, amount: parseFloat(form.amount), date: form.date, category: form.category, project_id: form.project_id || null, notes: form.notes || null, proof_url: form.proof_url || null })}
          >
            {loading ? 'Saving...' : 'Add Expense'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Edit Record Dialog ────────────────────────────────────────────────────────
const EditRecordDialog = ({ target, projects, categories, onClose, onSubmit, loading }: {
  target: { type: 'donation' | 'expense'; record: Donation | Expense };
  projects: { id: string; title: string }[];
  categories: string[];
  onClose: () => void;
  onSubmit: (d: Record<string, unknown>) => void;
  loading: boolean;
}) => {
  const isDonation = target.type === 'donation';
  const r = target.record as Record<string, unknown>;
  const [form, setForm] = useState<Record<string, unknown>>({ ...r });
  const set = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Edit {isDonation ? 'Donation' : 'Expense'}</DialogTitle></DialogHeader>
        <div className="p-2 bg-warning/10 border border-warning/30 rounded-lg text-xs text-yellow-800 mb-2">
          ⚠️ This edit is being recorded in the audit log with your name and timestamp.
        </div>
        <div className="space-y-4">
          {isDonation ? (
            <>
              <div><Label>Donor Name</Label><Input value={form.donor_name as string} onChange={e => set('donor_name', e.target.value)} className="mt-1.5" /></div>
              <div><Label>Amount (₹)</Label><Input type="number" value={form.amount as string} onChange={e => set('amount', parseFloat(e.target.value))} className="mt-1.5" /></div>
              <div><Label>Date</Label><Input type="date" value={(form.date as string)?.slice(0, 10)} onChange={e => set('date', e.target.value)} className="mt-1.5" /></div>
              <div><Label>Notes</Label><Textarea value={(form.notes as string) ?? ''} onChange={e => set('notes', e.target.value)} className="mt-1.5" rows={2} /></div>
            </>
          ) : (
            <>
              <div><Label>Description</Label><Input value={form.description as string} onChange={e => set('description', e.target.value)} className="mt-1.5" /></div>
              <div><Label>Amount (₹)</Label><Input type="number" value={form.amount as string} onChange={e => set('amount', parseFloat(e.target.value))} className="mt-1.5" /></div>
              <div><Label>Date</Label><Input type="date" value={(form.date as string)?.slice(0, 10)} onChange={e => set('date', e.target.value)} className="mt-1.5" /></div>
              <div>
                <Label>Category</Label>
                <Select value={form.category as string} onValueChange={v => set('category', v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Textarea value={(form.notes as string) ?? ''} onChange={e => set('notes', e.target.value)} className="mt-1.5" rows={2} /></div>
            </>
          )}
          <div>
            <Label>Linked Project</Label>
            <Select value={(form.project_id as string) ?? ''} onValueChange={v => set('project_id', v || null)}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="btn-primary-gradient" disabled={loading} onClick={() => onSubmit(form)}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Edit Request Dialog ───────────────────────────────────────────────────────
const EditRequestDialog = ({ target, onClose, onSubmit, loading }: {
  target: { type: string; id: string };
  onClose: () => void;
  onSubmit: (reason: string) => void;
  loading: boolean;
}) => {
  const [reason, setReason] = useState('');
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Request Edit Permission</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Describe why you need to edit this {target.type}. An admin will review your request.</p>
        <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for edit..." className="mt-2" rows={3} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="btn-primary-gradient" disabled={loading || !reason.trim()} onClick={() => onSubmit(reason)}>
            {loading ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Audit Log Dialog ──────────────────────────────────────────────────────────
const AuditLogDialog = ({ log, onClose, onUndo, undoLoading }: {
  log: AuditEntry[];
  onClose: () => void;
  onUndo: (entry: AuditEntry) => void;
  undoLoading: boolean;
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const actionColor: Record<string, string> = {
    create: 'bg-success/15 text-green-700',
    edit: 'bg-info/15 text-blue-700',
    undo: 'bg-warning/15 text-yellow-700',
    redo: 'bg-primary/15 text-primary',
    delete: 'bg-destructive/15 text-red-700',
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><History size={18} /> Audit Log</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground mb-4">Full history of all changes — who changed what and when.</p>
        {log.length === 0 ? (
          <EmptyState icon="📋" message="No audit entries yet" />
        ) : (
          <div className="space-y-2">
            {log.map(entry => (
              <div key={entry.id} className="vcp-card p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize', actionColor[entry.action] ?? 'bg-muted text-muted-foreground')}>
                      {entry.action}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">{entry.record_type}</span>
                    <span className="text-xs font-medium text-foreground">{entry.profiles?.full_name ?? 'Unknown'}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(entry.created_at), 'dd MMM yyyy HH:mm')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {entry.action === 'edit' && entry.previous_data && (
                      <button
                        onClick={() => onUndo(entry)}
                        disabled={undoLoading}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary px-2 py-1 rounded hover:bg-muted"
                      >
                        <RotateCcw size={11} /> Undo
                      </button>
                    )}
                    <button onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)} className="text-muted-foreground hover:text-foreground">
                      {expandedId === entry.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>
                {expandedId === entry.id && (
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    {entry.previous_data && (
                      <div>
                        <p className="font-medium text-muted-foreground mb-1">Before</p>
                        <pre className="bg-muted p-2 rounded text-[10px] overflow-auto max-h-32">
                          {JSON.stringify(entry.previous_data, null, 2)}
                        </pre>
                      </div>
                    )}
                    {entry.new_data && (
                      <div>
                        <p className="font-medium text-muted-foreground mb-1">After</p>
                        <pre className="bg-muted p-2 rounded text-[10px] overflow-auto max-h-32">
                          {JSON.stringify(entry.new_data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ─── Pending Requests Dialog ───────────────────────────────────────────────────
const PendingRequestsDialog = ({ requests, onClose, onApprove, onReject, loading }: {
  requests: EditRequest[];
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  loading: boolean;
}) => (
  <Dialog open onOpenChange={onClose}>
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Pending Edit Requests</DialogTitle></DialogHeader>
      <div className="space-y-3">
        {requests.map(r => (
          <div key={r.id} className="vcp-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{r.requester?.full_name ?? 'Unknown'} wants to edit a {r.record_type}</p>
                <p className="text-xs text-muted-foreground mt-1">Reason: {r.reason}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'dd MMM yyyy HH:mm')}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" disabled={loading} onClick={() => onReject(r.id)} className="text-destructive">Reject</Button>
                <Button size="sm" className="btn-primary-gradient" disabled={loading} onClick={() => onApprove(r.id)}>Approve</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DialogContent>
  </Dialog>
);

export default DonationsPage;
