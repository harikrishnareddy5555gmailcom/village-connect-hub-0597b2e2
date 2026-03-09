import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVillage } from '@/contexts/VillageContext';
import {
  Briefcase, Plus, X, Loader2, IndianRupee, Calendar, Users,
  Trash2, MessageSquare, Send, Star, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { writeAuditLog } from '@/lib/auditLog';

const STATUS_CONFIG = {
  planned: { label: 'Planned', color: 'bg-muted text-muted-foreground border-border' },
  in_progress: { label: 'In Progress', color: 'bg-info/15 text-blue-700 border-info/30' },
  completed: { label: 'Completed', color: 'bg-success/15 text-green-700 border-success/30' },
  delayed: { label: 'Delayed', color: 'bg-warning/15 text-yellow-700 border-warning/30' },
};
const progressMap: Record<string, number> = { planned: 0, in_progress: 50, completed: 100, delayed: 30 };

// ---- Project Reviews/Comments Panel ----
const ProjectUpdates: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { user, role, profile } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [updateType, setUpdateType] = useState<'comment' | 'review'>('comment');

  const { data: updates = [], isLoading } = useQuery({
    queryKey: ['project-updates', projectId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('project_updates')
        .select('*, profiles!project_updates_author_id_profiles_fkey(full_name, avatar_url)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const addUpdate = useMutation({
    mutationFn: async () => {
      if (!text.trim()) throw new Error('Write something first');
      const { error } = await (supabase as any).from('project_updates').insert({
        project_id: projectId,
        author_id: user!.id,
        content: text,
        update_type: updateType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setText('');
      queryClient.invalidateQueries({ queryKey: ['project-updates', projectId] });
      toast.success(`${updateType === 'review' ? 'Review' : 'Comment'} posted!`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteUpdate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('project_updates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-updates', projectId] });
      toast.success('Deleted');
    },
  });

  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'moderator';

  return (
    <div className="mt-4 pt-4 border-t border-border space-y-3">
      <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
        <MessageSquare size={12} /> Discussions & Reviews ({updates.length})
      </h5>

      {/* Input area */}
      <div className="space-y-2">
        <div className="flex gap-2">
          {(['comment', 'review'] as const).map(t => (
            <button
              key={t}
              onClick={() => setUpdateType(t)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize',
                updateType === t
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              )}
            >
              {t === 'review' ? '⭐ Review' : '💬 Comment'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={updateType === 'review' ? 'Share your review...' : 'Post a comment...'}
            onKeyDown={e => e.key === 'Enter' && !addUpdate.isPending && addUpdate.mutate()}
            className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
          />
          <button
            onClick={() => addUpdate.mutate()}
            disabled={!text.trim() || addUpdate.isPending}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send size={13} />
          </button>
        </div>
      </div>

      {/* Updates list */}
      {isLoading ? (
        <div className="flex justify-center py-3"><Loader2 size={16} className="animate-spin text-primary" /></div>
      ) : updates.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">No discussions yet. Be the first!</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {updates.map((u: any) => (
            <div key={u.id} className="flex gap-2">
              <Avatar className="w-7 h-7 flex-shrink-0">
                <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-bold">
                  {u.profiles?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-foreground">{u.profiles?.full_name}</p>
                    {u.update_type === 'review' && <Star size={10} className="text-yellow-500 fill-yellow-500" />}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                    </span>
                    {(isAdmin || u.author_id === user?.id) && (
                      <button
                        onClick={() => deleteUpdate.mutate(u.id)}
                        className="text-muted-foreground hover:text-destructive ml-1"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{u.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---- Project Card ----
interface ProjectCardProps {
  project: any;
  isAdmin: boolean;
  onStatusChange: (status: string, progress: number) => void;
  onProgressChange: (progress: number) => void;
  onDelete: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project: p, isAdmin, onStatusChange, onProgressChange, onDelete }) => {
  const statusCfg = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG];
  const prog = p.progress ?? progressMap[p.status] ?? 0;
  const [sliderVal, setSliderVal] = useState(prog);
  const [showSlider, setShowSlider] = useState(false);
  const [showDiscussion, setShowDiscussion] = useState(false);

  return (
    <div className="vcp-card p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h4 className="font-semibold text-foreground">{p.title}</h4>
          {p.profiles?.full_name && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Users size={11} />By {p.profiles.full_name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`border rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${statusCfg?.color}`}>
            {statusCfg?.label}
          </span>
          {isAdmin && (
            <button
              onClick={onDelete}
              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Delete project"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {p.description && <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{p.description}</p>}

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Progress</span>
          <span className="font-medium text-primary">{prog}%</span>
        </div>
        <Progress value={prog} className="h-2" />
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap mb-3">
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
        <div className="space-y-3 pt-2 border-t border-border">
          {/* Status buttons */}
          <div className="flex gap-2 flex-wrap">
            {(['planned', 'in_progress', 'completed', 'delayed'] as const).map(s => (
              <button
                key={s}
                onClick={() => onStatusChange(s, progressMap[s])}
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
          {/* Progress slider */}
          <div>
            <button
              onClick={() => setShowSlider(v => !v)}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              {showSlider ? '▲ Hide' : '▼ Set custom progress %'}
            </button>
            {showSlider && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-3">
                  <Slider
                    value={[sliderVal]}
                    onValueChange={([v]) => setSliderVal(v)}
                    min={0} max={100} step={5}
                    className="flex-1"
                  />
                  <span className="text-xs font-bold text-primary w-8 text-right">{sliderVal}%</span>
                </div>
                <Button
                  size="sm"
                  className="btn-primary-gradient h-7 text-xs"
                  onClick={() => { onProgressChange(sliderVal); setShowSlider(false); }}
                >
                  Update Progress
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Discussions toggle */}
      <button
        onClick={() => setShowDiscussion(v => !v)}
        className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-3 pt-2 border-t border-border w-full"
      >
        {showDiscussion ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Discussions & Reviews
      </button>
      {showDiscussion && <ProjectUpdates projectId={p.id} />}
    </div>
  );
};

// ---- Main Page ----
const ProjectsPage: React.FC = () => {
  const { user, role, profile } = useAuth();
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
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', currentVillage?.id, filterStatus],
    enabled: !!currentVillage,
    queryFn: async () => {
      let q = (supabase as any)
        .from('projects')
        .select('*, profiles!projects_created_by_profiles_fkey(full_name)')
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

  const updateProject = useMutation({
    mutationFn: async ({ id, status, progress }: { id: string; status?: string; progress: number }) => {
      const update: any = { progress };
      if (status !== undefined) update.status = status;
      const { error } = await (supabase as any).from('projects').update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project updated');
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const proj = projects.find((p: any) => p.id === id);
      const { error } = await (supabase as any).from('projects').delete().eq('id', id);
      if (error) throw error;
      await writeAuditLog({
        action_type: 'delete',
        entity_type: 'project',
        entity_id: id,
        entity_name: proj?.title,
        performed_by: user!.id,
        performed_by_name: profile?.full_name,
        village_id: currentVillage?.id,
      });
    },
    onSuccess: () => {
      setDeleteProjectId(null);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
          {isAdmin && (
            <Button className="btn-primary-gradient mt-4" size="sm" onClick={() => setShowForm(true)}>
              <Plus size={14} className="mr-1" /> Add First Project
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p: any) => (
            <ProjectCard
              key={p.id}
              project={p}
              isAdmin={isAdmin}
              onStatusChange={(status, progress) => updateProject.mutate({ id: p.id, status, progress })}
              onProgressChange={(progress) => updateProject.mutate({ id: p.id, progress })}
              onDelete={() => deleteProject.mutate(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
