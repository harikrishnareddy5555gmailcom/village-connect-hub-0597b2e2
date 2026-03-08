import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useVillage } from '@/contexts/VillageContext';
import { Briefcase, Plus, X, Loader2, IndianRupee, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  planned: { label: 'Planned', color: 'bg-muted text-muted-foreground border-border' },
  in_progress: { label: 'In Progress', color: 'bg-info/15 text-blue-700 border-info/30' },
  completed: { label: 'Completed', color: 'bg-success/15 text-green-700 border-success/30' },
  delayed: { label: 'Delayed', color: 'bg-warning/15 text-yellow-700 border-warning/30' },
};

const ProjectsPage: React.FC = () => {
  const { user, role } = useAuth();
  const { currentVillage } = useVillage();
  const queryClient = useQueryClient();
  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'moderator';

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', currentVillage?.id, filterStatus],
    enabled: !!currentVillage,
    queryFn: async () => {
      let q = (supabase as any)
        .from('projects')
        .select('*, profiles(full_name)')
        .eq('village_id', currentVillage!.id)
        .order('created_at', { ascending: false });
      if (filterStatus !== 'all') q = q.eq('status', filterStatus);
      const { data } = await q;
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error('Project title is required');
      const { error } = await (supabase as any).from('projects').insert({
        village_id: currentVillage!.id,
        created_by: user!.id,
        title,
        description: description || null,
        budget: budget ? parseFloat(budget) : null,
        start_date: startDate || null,
        end_date: endDate || null,
        status: 'planned',
        progress: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setShowForm(false); setTitle(''); setDescription(''); setBudget(''); setStartDate(''); setEndDate('');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateProjectStatus = useMutation({
    mutationFn: async ({ id, status, progress }: { id: string; status: string; progress: number }) => {
      const { error } = await (supabase as any).from('projects').update({ status, progress }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project updated');
    },
  });

  const progressMap: Record<string, number> = { planned: 0, in_progress: 50, completed: 100, delayed: 30 };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Briefcase size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Village Projects / ప్రాజెక్టులు</h1>
            <p className="text-xs text-muted-foreground">Development initiatives in {currentVillage?.name}</p>
          </div>
        </div>
        {isAdmin && (
          <Button size="sm" className="btn-primary-gradient" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X size={14} className="mr-1" /> : <Plus size={14} className="mr-1" />}
            {showForm ? 'Cancel' : 'New Project'}
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showForm && isAdmin && (
        <div className="vcp-card p-5 mb-5 animate-fade-in-up">
          <h3 className="font-semibold text-foreground mb-4">Create New Project</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Project Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Road Repair, New Well..." className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Budget (₹)</Label>
                <div className="relative mt-1">
                  <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="0" className="pl-8" />
                </div>
              </div>
              <div />
              <div>
                <Label className="text-sm">Start Date</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Expected End Date</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Project details and objectives..." className="mt-1 resize-none" rows={3} />
            </div>
            <Button className="btn-primary-gradient w-full" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              Create Project
            </Button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'planned', 'in_progress', 'completed', 'delayed'].map(s => (
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

      {/* Projects List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🏗️</div>
          <p className="font-medium text-foreground">No projects yet</p>
          <p className="text-sm text-muted-foreground mt-1">Village development projects will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p: any) => {
            const statusCfg = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG];
            const prog = p.progress ?? progressMap[p.status] ?? 0;
            return (
              <div key={p.id} className="vcp-card p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h4 className="font-semibold text-foreground">{p.title}</h4>
                    {p.profiles?.full_name && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Users size={11} />By {p.profiles.full_name}
                      </p>
                    )}
                  </div>
                  <span className={`border rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${statusCfg?.color}`}>
                    {statusCfg?.label}
                  </span>
                </div>

                {p.description && <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{p.description}</p>}

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span><span>{prog}%</span>
                  </div>
                  <Progress value={prog} className="h-2" />
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  {p.budget && (
                    <span className="flex items-center gap-1">
                      <IndianRupee size={11} className="text-primary" />
                      {parseFloat(p.budget).toLocaleString('en-IN')} budget
                    </span>
                  )}
                  {p.start_date && (
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {format(new Date(p.start_date), 'dd MMM yyyy')}
                      {p.end_date && ` → ${format(new Date(p.end_date), 'dd MMM yyyy')}`}
                    </span>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {(['planned', 'in_progress', 'completed', 'delayed'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => updateProjectStatus.mutate({ id: p.id, status: s, progress: progressMap[s] })}
                        disabled={p.status === s}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                          p.status === s
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
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
