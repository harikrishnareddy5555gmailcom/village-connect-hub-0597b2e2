import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign, Plus, TrendingDown, TrendingUp, History,
  Lock, Unlock, QrCode, Smartphone, Banknote, Camera,
  Target, Users, ChevronDown, ChevronUp, Image, X, Loader2, CheckCircle,
  CreditCard, Upload
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
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/imageCompression';

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// ─── Types ───────────────────────────────────────────────────────────────────
type Campaign = {
  id: string; title: string; description: string | null;
  target_amount: number | null; is_active: boolean;
  image_urls: string[] | null; created_at: string; village_id: string;
};
type Donation = {
  id: string; donor_name: string; amount: number; date: string;
  payment_method: string; proof_url: string | null; is_anonymous: boolean;
  campaign_id: string | null; notes: string | null;
};
type Expense = {
  id: string; description: string; amount: number; date: string;
  category: string; proof_url: string | null; notes: string | null;
};

const PAYMENT_METHODS = [
  { value: 'cash',    label: 'Cash',    icon: <Banknote size={16} /> },
  { value: 'upi',     label: 'UPI',     icon: <Smartphone size={16} /> },
  { value: 'scanner', label: 'QR Scan', icon: <QrCode size={16} /> },
];

const EXPENSE_CATEGORIES = [
  'General', 'Construction', 'Materials', 'Labour', 'Transport',
  'Food & Refreshments', 'Religious', 'Medical', 'Education', 'Other'
];

// ─── Main Component ───────────────────────────────────────────────────────────
const DonationsPage: React.FC = () => {
  const { profile, role } = useAuth();
  const { currentVillage, refreshVillage } = useVillage();
  const qc = useQueryClient();
  const isAdmin = role === 'admin' || role === 'super_admin';
  const isSuperAdmin = role === 'super_admin';

  const [showAddDonation, setShowAddDonation] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);

  const villageId = currentVillage?.id;
  const donationsEnabled = (currentVillage as any)?.donations_enabled ?? false;
  const upiId = (currentVillage as any)?.upi_id ?? null;
  const qrCodeUrl = (currentVillage as any)?.qr_code_url ?? null;

  // ─── Queries ───────────────────────────────────────────────────────────────
  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ['donation-campaigns', villageId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('donation_campaigns')
        .select('*')
        .eq('village_id', villageId!)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!villageId && donationsEnabled,
  });

  const { data: donations = [], isLoading: loadingDonations } = useQuery<Donation[]>({
    queryKey: ['donations', villageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('village_id', villageId!)
        .order('date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Donation[];
    },
    enabled: !!villageId && donationsEnabled,
  });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery<Expense[]>({
    queryKey: ['expenses', villageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('village_id', villageId!)
        .order('date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Expense[];
    },
    enabled: !!villageId,
  });

  const totalDonations = donations.reduce((s, d) => s + Number(d.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const balance = totalDonations - totalExpenses;

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const toggleDonationsMutation = useMutation({
    mutationFn: async (enable: boolean) => {
      const { error } = await (supabase as any)
        .from('villages')
        .update({ donations_enabled: enable })
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
      const { error } = await supabase.from('donations').insert({
        donor_name: data.donor_name as string,
        amount: data.amount as number,
        date: data.date as string,
        payment_method: data.payment_method as string,
        proof_url: (data.proof_url as string) || null,
        campaign_id: (data.campaign_id as string) || null,
        notes: (data.notes as string) || null,
        is_anonymous: data.is_anonymous as boolean,
        village_id: villageId!,
        added_by: profile!.user_id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['donations', villageId] });
      toast.success('Donation recorded! 🙏');
      setShowAddDonation(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const { error } = await supabase.from('expenses').insert({
        description: data.description as string,
        amount: data.amount as number,
        date: data.date as string,
        category: data.category as string,
        project_id: (data.project_id as string) || null,
        notes: (data.notes as string) || null,
        proof_url: (data.proof_url as string) || null,
        village_id: villageId!,
        responsible_admin: profile!.user_id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', villageId] });
      toast.success('Expense added');
      setShowAddExpense(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const { error } = await (supabase as any).from('donation_campaigns').insert({
        ...data,
        village_id: villageId!,
        created_by: profile!.user_id,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['donation-campaigns', villageId] });
      toast.success('Campaign created!');
      setShowCreateCampaign(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('donation_campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['donation-campaigns', villageId] });
      toast.success('Campaign removed');
    },
  });

  // ─── Disabled State ─────────────────────────────────────────────────────────
  if (!donationsEnabled && !isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <Lock size={48} className="mb-4 text-muted-foreground" />
        <h2 className="text-xl font-bold text-foreground mb-2">Donation System Not Active</h2>
        <p className="text-muted-foreground text-sm">The village admin hasn't enabled the donation system yet.</p>
      </div>
    );
  }

  if (!donationsEnabled && isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <Lock size={48} className="mb-4 text-warning" />
        <h2 className="text-xl font-bold text-foreground mb-3">Donation System is Disabled</h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-md">
          Enable the donation & fund tracking system for this village.
        </p>
        <Button className="btn-primary-gradient" onClick={() => toggleDonationsMutation.mutate(true)} disabled={toggleDonationsMutation.isPending}>
          <Unlock size={16} className="mr-2" /> Enable Donation System
        </Button>
      </div>
    );
  }

  const campaignDonations = (cId: string) => donations.filter(d => d.campaign_id === cId);
  const campaignTotal = (cId: string) => campaignDonations(cId).reduce((s, d) => s + Number(d.amount), 0);

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Donations & Fund Ledger</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Transparent public record for {currentVillage?.name}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isSuperAdmin && (
            <Button variant="outline" size="sm" onClick={() => toggleDonationsMutation.mutate(false)} disabled={toggleDonationsMutation.isPending} className="text-destructive border-destructive/40 hover:bg-destructive/10">
              <Lock size={14} className="mr-1.5" /> Disable System
            </Button>
          )}
          {isAdmin && (
            <>
              <Button size="sm" variant="outline" onClick={() => setShowCreateCampaign(true)}>
                <Target size={14} className="mr-1.5" /> New Campaign
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddExpense(true)}>
                <TrendingDown size={14} className="mr-1.5" /> Add Expense
              </Button>
              <Button size="sm" className="btn-primary-gradient" onClick={() => { setSelectedCampaign(null); setShowAddDonation(true); }}>
                <Plus size={14} className="mr-1.5" /> Record Donation
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

      {/* Payment Info (visible to all) */}
      {(upiId || qrCodeUrl) && (
        <div className="vcp-card p-4">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <CreditCard size={16} className="text-primary" /> How to Donate
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {upiId && (
              <div className="flex items-center gap-3 bg-success/10 rounded-xl px-4 py-3 flex-1">
                <Smartphone size={20} className="text-success flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">UPI ID</p>
                  <p className="font-mono font-semibold text-foreground">{upiId}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pay via PhonePe, GPay, Paytm</p>
                </div>
              </div>
            )}
            {qrCodeUrl && (
              <div className="flex flex-col items-center gap-2">
                <img src={qrCodeUrl} alt="UPI QR Code" className="w-28 h-28 rounded-xl border border-border object-contain" />
                <p className="text-xs text-muted-foreground">Scan to pay</p>
              </div>
            )}
          </div>
          {!isAdmin && (
            <p className="text-xs text-muted-foreground mt-3 border-t border-border pt-3">
              After donating, contact the admin to record your donation with proof screenshot.
            </p>
          )}
        </div>
      )}

      {/* Campaigns */}
      {campaigns.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-foreground text-lg">🎯 Active Campaigns</h2>
          {campaigns.map(campaign => {
            const collected = campaignTotal(campaign.id);
            const target = campaign.target_amount ?? 0;
            const pct = target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 0;
            const isExpanded = expandedCampaignId === campaign.id;
            const cDonations = campaignDonations(campaign.id);

            return (
              <div key={campaign.id} className="vcp-card overflow-hidden">
                {/* Campaign image */}
                {campaign.image_urls && campaign.image_urls.length > 0 && (
                  <div className="relative h-40 overflow-hidden">
                    <img src={campaign.image_urls[0]} alt={campaign.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-4">
                      <h3 className="font-bold text-white text-lg">{campaign.title}</h3>
                    </div>
                    {campaign.is_active && (
                      <Badge className="absolute top-3 right-3 bg-success/90 text-white border-0">Active</Badge>
                    )}
                  </div>
                )}

                <div className="p-4">
                  {(!campaign.image_urls || campaign.image_urls.length === 0) && (
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-foreground">{campaign.title}</h3>
                      {campaign.is_active && <Badge className="bg-success/15 text-success border-success/30">Active</Badge>}
                    </div>
                  )}

                  {campaign.description && (
                    <p className="text-sm text-muted-foreground mb-3">{campaign.description}</p>
                  )}

                  {/* Progress */}
                  {target > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                        <span className="font-medium text-success">{fmt(collected)} collected</span>
                        <span>Goal: {fmt(target)}</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">{pct}% of goal · {cDonations.length} donors</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm" variant="outline"
                      className="text-xs h-7"
                      onClick={() => setExpandedCampaignId(isExpanded ? null : campaign.id)}
                    >
                      <Users size={12} className="mr-1" />
                      {cDonations.length} Donors
                      {isExpanded ? <ChevronUp size={12} className="ml-1" /> : <ChevronDown size={12} className="ml-1" />}
                    </Button>
                    {isAdmin && (
                      <>
                        <Button
                          size="sm" className="btn-primary-gradient text-xs h-7"
                          onClick={() => { setSelectedCampaign(campaign); setShowAddDonation(true); }}
                        >
                          <Plus size={12} className="mr-1" /> Add Donation
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          className="text-xs h-7 text-destructive hover:bg-destructive/10"
                          onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Expanded donor list */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border space-y-2">
                      {cDonations.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">No donations yet for this campaign</p>
                      ) : cDonations.map(d => (
                        <div key={d.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-success/15 flex items-center justify-center text-xs font-bold text-success">
                              {d.is_anonymous ? '?' : d.donor_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-xs">{d.is_anonymous ? 'Anonymous' : d.donor_name}</p>
                              <p className="text-[10px] text-muted-foreground">{d.payment_method} · {format(new Date(d.date), 'dd MMM')}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-success text-xs">{fmt(d.amount)}</span>
                            {d.proof_url && (
                              <a href={d.proof_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-[10px]">
                                <Image size={12} />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="donations">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="donations" className="flex-1 sm:flex-none">
            Donations <Badge variant="secondary" className="ml-2">{donations.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex-1 sm:flex-none">
            Expenses <Badge variant="secondary" className="ml-2">{expenses.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="donations" className="mt-4 space-y-3">
          {loadingDonations ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="vcp-card h-16 animate-pulse" />)
          ) : donations.length === 0 ? (
            <EmptyState icon="💰" message="No donations recorded yet" />
          ) : donations.map(d => (
            <div key={d.id} className="vcp-card p-4 flex items-center gap-4">
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                d.payment_method === 'cash' ? 'bg-warning/15' :
                d.payment_method === 'upi' ? 'bg-success/15' : 'bg-primary/15'
              )}>
                {d.payment_method === 'cash' ? <Banknote size={18} className="text-warning" /> :
                 d.payment_method === 'upi' ? <Smartphone size={18} className="text-success" /> :
                 <QrCode size={18} className="text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground text-sm">{d.is_anonymous ? 'Anonymous' : d.donor_name}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 capitalize">{d.payment_method}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(d.date), 'dd MMM yyyy')}
                  {d.notes && ` · ${d.notes}`}
                </p>
              </div>
              <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                <p className="font-bold text-success">{fmt(d.amount)}</p>
                {d.proof_url && (
                  <a href={d.proof_url} target="_blank" rel="noreferrer" className="flex items-center gap-0.5 text-[10px] text-primary hover:underline">
                    <Image size={10} /> Proof
                  </a>
                )}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="expenses" className="mt-4 space-y-3">
          {loadingExpenses ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="vcp-card h-16 animate-pulse" />)
          ) : expenses.length === 0 ? (
            <EmptyState icon="🧾" message="No expenses recorded yet" />
          ) : expenses.map(e => (
            <div key={e.id} className="vcp-card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center flex-shrink-0">
                <TrendingDown size={18} className="text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground text-sm truncate">{e.description}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5">{e.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(e.date), 'dd MMM yyyy')}
                  {e.notes && ` · ${e.notes}`}
                </p>
              </div>
              <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                <p className="font-bold text-destructive">{fmt(e.amount)}</p>
                {e.proof_url && (
                  <a href={e.proof_url} target="_blank" rel="noreferrer" className="flex items-center gap-0.5 text-[10px] text-primary hover:underline">
                    <Image size={10} /> Proof
                  </a>
                )}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddDonationDialog
        open={showAddDonation}
        onClose={() => { setShowAddDonation(false); setSelectedCampaign(null); }}
        campaigns={campaigns}
        selectedCampaign={selectedCampaign}
        villageId={villageId!}
        upiId={upiId}
        qrCodeUrl={qrCodeUrl}
        onSubmit={(d) => addDonationMutation.mutate(d)}
        loading={addDonationMutation.isPending}
      />

      <AddExpenseDialog
        open={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        categories={EXPENSE_CATEGORIES}
        villageId={villageId!}
        onSubmit={(d) => addExpenseMutation.mutate(d)}
        loading={addExpenseMutation.isPending}
      />

      <CreateCampaignDialog
        open={showCreateCampaign}
        onClose={() => setShowCreateCampaign(false)}
        villageId={villageId!}
        onSubmit={(d) => createCampaignMutation.mutate(d)}
        loading={createCampaignMutation.isPending}
      />
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) => (
  <div className="vcp-card p-4 flex items-center gap-4">
    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
      color === 'success' ? 'bg-success/15 text-success' :
      color === 'destructive' ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'
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

// ─── Add Donation Dialog ──────────────────────────────────────────────────────
const AddDonationDialog: React.FC<{
  open: boolean; onClose: () => void;
  campaigns: Campaign[]; selectedCampaign: Campaign | null;
  villageId: string; upiId: string | null; qrCodeUrl: string | null;
  onSubmit: (d: Record<string, unknown>) => void; loading: boolean;
}> = ({ open, onClose, campaigns, selectedCampaign, villageId, upiId, qrCodeUrl, onSubmit, loading }) => {
  const getInitialForm = (campaign: Campaign | null) => ({
    donor_name: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: 'cash', campaign_id: campaign?.id ?? '',
    notes: '', is_anonymous: false, proof_url: '',
  });
  const [form, setForm] = useState(() => getInitialForm(selectedCampaign));
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  // Reset form whenever dialog opens/closes or selectedCampaign changes
  React.useEffect(() => {
    if (open) setForm(getInitialForm(selectedCampaign));
  }, [open, selectedCampaign?.id]);

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file, 'proof');
      const ext = 'jpg';
      const path = `proofs/${villageId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('donation-proofs').upload(path, compressed, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('donation-proofs').getPublicUrl(path);
      set('proof_url', urlData.publicUrl);
      toast.success('Proof uploaded ✓');
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const selectedMethod = PAYMENT_METHODS.find(m => m.value === form.payment_method);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign size={18} className="text-success" /> Record Donation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment method selector */}
          <div>
            <Label className="text-sm font-medium">Payment Method *</Label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => set('payment_method', m.value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all',
                    form.payment_method === m.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  )}
                >
                  {m.icon}
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* UPI / QR info when selected */}
          {(form.payment_method === 'upi' || form.payment_method === 'scanner') && (upiId || qrCodeUrl) && (
            <div className="bg-success/10 border border-success/20 rounded-xl p-3 flex gap-3 items-start">
              {qrCodeUrl && <img src={qrCodeUrl} alt="QR" className="w-20 h-20 rounded-lg object-contain border border-border" />}
              <div>
                {upiId && (
                  <>
                    <p className="text-xs text-muted-foreground">UPI ID</p>
                    <p className="font-mono font-semibold text-foreground text-sm">{upiId}</p>
                  </>
                )}
                <p className="text-xs text-muted-foreground mt-1.5">Pay, then upload screenshot below</p>
              </div>
            </div>
          )}

          {/* Donor name */}
          <div>
            <Label className="text-sm font-medium">Donor Name *</Label>
            <Input value={form.donor_name} onChange={e => set('donor_name', e.target.value)} placeholder="Full name" className="mt-1.5" disabled={form.is_anonymous} />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox" id="anon"
              checked={form.is_anonymous}
              onChange={e => { set('is_anonymous', e.target.checked); if (e.target.checked) set('donor_name', 'Anonymous'); }}
              className="rounded"
            />
            <Label htmlFor="anon" className="cursor-pointer text-sm">Mark as anonymous</Label>
          </div>

          {/* Amount */}
          <div>
            <Label className="text-sm font-medium">Amount (₹) *</Label>
            <Input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" className="mt-1.5" />
          </div>

          {/* Date */}
          <div>
            <Label className="text-sm font-medium">Date *</Label>
            <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="mt-1.5" />
          </div>

          {/* Campaign link */}
          {campaigns.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Campaign</Label>
              <Select value={form.campaign_id} onValueChange={v => set('campaign_id', v)}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="General donation" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">General donation</SelectItem>
                  {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Proof upload */}
          <div>
            <Label className="text-sm font-medium">
              Payment Screenshot
              {(form.payment_method === 'upi' || form.payment_method === 'scanner') && <span className="text-destructive ml-1">*</span>}
              <span className="ml-1 text-xs font-normal text-muted-foreground">(for UPI/Cash receipts)</span>
            </Label>
            <div className="mt-1.5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 border rounded-xl text-sm transition-colors",
                  form.proof_url
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {uploading
                  ? <><Loader2 size={14} className="animate-spin" /> Uploading...</>
                  : form.proof_url
                    ? <><CheckCircle size={14} /> Uploaded ✓</>
                    : <><Upload size={14} /> Upload screenshot</>
                }
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleProofUpload} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-sm font-medium">Notes</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." className="mt-1.5" rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="btn-primary-gradient"
            disabled={loading || uploading || !form.donor_name || !form.amount}
            onClick={() => onSubmit({
              donor_name: form.donor_name,
              amount: parseFloat(form.amount),
              date: form.date,
              payment_method: form.payment_method,
              proof_url: form.proof_url || null,
              campaign_id: form.campaign_id || null,
              notes: form.notes || null,
              is_anonymous: form.is_anonymous,
            })}
          >
            {loading ? <><Loader2 size={14} className="animate-spin mr-1.5" />Saving...</> : 'Record Donation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Add Expense Dialog ────────────────────────────────────────────────────────
const AddExpenseDialog: React.FC<{
  open: boolean; onClose: () => void;
  categories: string[]; villageId: string;
  onSubmit: (d: Record<string, unknown>) => void; loading: boolean;
}> = ({ open, onClose, categories, villageId, onSubmit, loading }) => {
  const [form, setForm] = useState({
    description: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'),
    category: 'General', notes: '', proof_url: '',
  });
  const [uploading, setUploading] = useState(false);
  const set = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const compressed = await compressImage(file, 'proof');
    const path = `expenses/${villageId}/${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('documents').upload(path, compressed, { upsert: true });
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
            <Label>Proof / Receipt</Label>
            <div className="mt-1.5 flex items-center gap-2">
              <label className={cn(
                "cursor-pointer flex items-center gap-2 px-3 py-2 border rounded-xl text-sm transition-colors",
                form.proof_url ? "border-success/30 bg-success/10 text-success" : "border-border hover:bg-muted"
              )}>
                {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading...</> :
                 form.proof_url ? <><CheckCircle size={14} /> Uploaded ✓</> :
                 <><Image size={14} /> Upload proof</>}
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleProofUpload} />
              </label>
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
            onClick={() => onSubmit({ description: form.description, amount: parseFloat(form.amount), date: form.date, category: form.category, notes: form.notes || null, proof_url: form.proof_url || null })}
          >
            {loading ? 'Saving...' : 'Add Expense'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Create Campaign Dialog ───────────────────────────────────────────────────
const CreateCampaignDialog: React.FC<{
  open: boolean; onClose: () => void; villageId: string;
  onSubmit: (d: Record<string, unknown>) => void; loading: boolean;
}> = ({ open, onClose, villageId, onSubmit, loading }) => {
  const [form, setForm] = useState({ title: '', description: '', target_amount: '', image_urls: [] as string[] });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 3);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const compressed = await compressImage(file, 'post');
        const path = `campaigns/${villageId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const { error } = await supabase.storage.from('post-media').upload(path, compressed, { upsert: false });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('post-media').getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
      set('image_urls', [...form.image_urls, ...urls].slice(0, 3));
      toast.success(`${urls.length} image(s) uploaded`);
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Target size={18} className="text-primary" /> Create Campaign</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Campaign Title *</Label>
            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g., Temple Renovation Fund" className="mt-1.5" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Why are you raising funds? What will it be used for?" className="mt-1.5" rows={3} />
          </div>
          <div>
            <Label>Target Amount (₹)</Label>
            <Input type="number" value={form.target_amount} onChange={e => set('target_amount', e.target.value)} placeholder="Leave blank for no target" className="mt-1.5" />
          </div>
          <div>
            <Label>Campaign Images <span className="text-xs font-normal text-muted-foreground">(up to 3)</span></Label>
            <div className="mt-1.5">
              {form.image_urls.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {form.image_urls.map((url, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden aspect-video">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => set('image_urls', form.image_urls.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {form.image_urls.length < 3 && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors w-full justify-center"
                >
                  {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading...</> : <><Camera size={14} /> Add images</>}
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="btn-primary-gradient"
            disabled={loading || uploading || !form.title}
            onClick={() => onSubmit({
              title: form.title,
              description: form.description || null,
              target_amount: form.target_amount ? parseFloat(form.target_amount) : null,
              image_urls: form.image_urls.length > 0 ? form.image_urls : null,
            })}
          >
            {loading ? <><Loader2 size={14} className="animate-spin mr-1.5" />Creating...</> : 'Create Campaign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DonationsPage;
