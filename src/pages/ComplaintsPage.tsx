import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useVillage } from '@/contexts/VillageContext';
import {
  AlertTriangle, Plus, X, Loader2, CheckCircle2, Clock, Circle,
  MapPin, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  reported: { label: 'Reported', color: 'bg-warning/15 text-yellow-700 border-warning/30', icon: <Circle size={12} /> },
  in_progress: { label: 'In Progress', color: 'bg-info/15 text-blue-700 border-info/30', icon: <Clock size={12} /> },
  resolved: { label: 'Resolved', color: 'bg-success/15 text-green-700 border-success/30', icon: <CheckCircle2 size={12} /> },
};

const CATEGORIES = ['Road', 'Water Supply', 'Electricity', 'Sanitation', 'Street Light', 'Drainage', 'Tree/Vegetation', 'Other'];

const ComplaintsPage: React.FC = () => {
  const { user, profile, role } = useAuth();
  const { currentVillage } = useVillage();
  const queryClient = useQueryClient();
  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'moderator';

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['complaints', currentVillage?.id, filterStatus],
    enabled: !!currentVillage,
    queryFn: async () => {
      let q = (supabase as any)
        .from('complaints')
        .select('*, profiles(full_name, mobile_number)')
        .eq('village_id', currentVillage!.id)
        .order('created_at', { ascending: false });
      if (filterStatus !== 'all') q = q.eq('status', filterStatus);
      const { data } = await q;
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !description.trim()) throw new Error('Fill all required fields');
      const { error } = await (supabase as any).from('complaints').insert({
        village_id: currentVillage!.id,
        reporter_id: user!.id,
        title,
        description,
        category: category || 'Other',
        location_tag: location || null,
        status: 'reported',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setShowForm(false); setTitle(''); setDescription(''); setCategory(''); setLocation('');
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      toast.success('Complaint submitted!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).from('complaints').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      toast.success('Status updated');
    },
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-warning/15 rounded-xl flex items-center justify-center">
            <AlertTriangle size={20} className="text-warning" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Complaints / ఫిర్యాదులు</h1>
            <p className="text-xs text-muted-foreground">Report issues to your village admin</p>
          </div>
        </div>
        <Button size="sm" className="btn-primary-gradient" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X size={14} className="mr-1" /> : <Plus size={14} className="mr-1" />}
          {showForm ? 'Cancel' : 'New Complaint'}
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="vcp-card p-5 mb-5 animate-fade-in-up">
          <h3 className="font-semibold text-foreground mb-4">Submit a Complaint</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief issue title..." className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Location (optional)</Label>
                <div className="relative mt-1">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Street / Area" className="pl-8" />
                </div>
              </div>
            </div>
            <div>
              <Label className="text-sm">Description *</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe the issue in detail..."
                className="mt-1 resize-none"
                rows={3}
              />
            </div>
            <Button className="btn-primary-gradient w-full" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 size={14} className="mr-2 animate-spin" /> : null}
              Submit Complaint
            </Button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'reported', 'in_progress', 'resolved'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
              filterStatus === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-primary/50'
            )}
          >
            {s === 'all' ? 'All' : STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label}
          </button>
        ))}
      </div>

      {/* Complaints List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : complaints.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">✅</div>
          <p className="font-medium text-foreground">No complaints found</p>
          <p className="text-sm text-muted-foreground mt-1">Your village is doing great!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c: any) => {
            const statusCfg = STATUS_CONFIG[c.status as keyof typeof STATUS_CONFIG];
            const isExpanded = expanded === c.id;
            return (
              <div key={c.id} className="vcp-card p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-warning/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle size={16} className="text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">{c.title}</h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {c.category && <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{c.category}</span>}
                          {c.location_tag && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin size={10} />{c.location_tag}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <span className={`flex items-center gap-1 border rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${statusCfg?.color}`}>
                        {statusCfg?.icon}{statusCfg?.label}
                      </span>
                    </div>

                    <button
                      onClick={() => setExpanded(isExpanded ? null : c.id)}
                      className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
                    >
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {isExpanded ? 'Hide details' : 'View details'}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-3 animate-fade-in-up">
                        <p className="text-sm text-muted-foreground leading-relaxed">{c.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Avatar className="w-5 h-5">
                            <AvatarFallback className="text-[10px] bg-muted">{c.profiles?.full_name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span>Reported by {c.profiles?.full_name}</span>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-2 pt-1">
                            {(['reported', 'in_progress', 'resolved'] as const).map(s => (
                              <button
                                key={s}
                                onClick={() => updateStatus.mutate({ id: c.id, status: s })}
                                disabled={c.status === s || updateStatus.isPending}
                                className={cn(
                                  'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                                  c.status === s
                                    ? STATUS_CONFIG[s].color + ' cursor-default'
                                    : 'border-border text-muted-foreground hover:border-primary/50'
                                )}
                              >
                                {STATUS_CONFIG[s].label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ComplaintsPage;
