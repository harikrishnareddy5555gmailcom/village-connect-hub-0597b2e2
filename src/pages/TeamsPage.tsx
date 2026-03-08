import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVillage } from '@/contexts/VillageContext';
import {
  Users, Plus, X, Loader2, Trash2, UserPlus, UserMinus,
  CheckCircle2, Clock, Circle, ChevronDown, ChevronUp,
  ListTodo, Crown, Shield, User as UserIcon, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const TEAM_CATEGORIES = [
  'Youth Team', 'Village Development', 'Temple Committee',
  'Festival Organizing', 'Water Management', 'Agriculture',
  'Education', 'Health & Sanitation', 'General'
];

const TASK_STATUSES = {
  pending: { label: 'Pending', color: 'bg-muted text-muted-foreground border-border', icon: <Circle size={12} /> },
  in_progress: { label: 'In Progress', color: 'bg-info/15 text-blue-700 border-info/30', icon: <Clock size={12} /> },
  completed: { label: 'Completed', color: 'bg-success/15 text-green-700 border-success/30', icon: <CheckCircle2 size={12} /> },
  blocked: { label: 'Blocked', color: 'bg-destructive/15 text-red-700 border-destructive/30', icon: <AlertCircle size={12} /> },
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'text-muted-foreground' },
  medium: { label: 'Medium', color: 'text-warning' },
  high: { label: 'High', color: 'text-destructive' },
};

const ROLE_IN_TEAM = ['leader', 'co-leader', 'member'];

// ---- Team Tasks Panel ----
const TeamTasksPanel: React.FC<{ team: any; isAdmin: boolean }> = ({ team, isAdmin }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskDue, setTaskDue] = useState('');
  const [assignTo, setAssignTo] = useState('');

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['team-tasks', team.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('team_tasks')
        .select('*, profiles!team_tasks_assigned_to_fkey(full_name), creator:profiles!team_tasks_created_by_fkey(full_name)')
        .eq('team_id', team.id)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ['team-members', team.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('team_members')
        .select('*, profiles(full_name, user_id)')
        .eq('team_id', team.id);
      return data ?? [];
    },
  });

  const createTask = useMutation({
    mutationFn: async () => {
      if (!taskTitle.trim()) throw new Error('Task title required');
      const { error } = await (supabase as any).from('team_tasks').insert({
        team_id: team.id,
        title: taskTitle,
        description: taskDesc || null,
        priority: taskPriority,
        due_date: taskDue || null,
        assigned_to: assignTo || null,
        created_by: user!.id,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setShowForm(false); setTaskTitle(''); setTaskDesc(''); setTaskPriority('medium'); setTaskDue(''); setAssignTo('');
      queryClient.invalidateQueries({ queryKey: ['team-tasks', team.id] });
      toast.success('Task created!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateTaskStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).from('team_tasks').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-tasks', team.id] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('team_tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-tasks', team.id] }),
  });

  return (
    <div className="mt-4 pt-4 border-t border-border space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <ListTodo size={12} /> Tasks ({tasks.length})
        </h5>
        {isAdmin && (
          <button onClick={() => setShowForm(v => !v)} className="text-xs text-primary hover:underline flex items-center gap-1">
            {showForm ? <X size={11} /> : <Plus size={11} />}
            {showForm ? 'Cancel' : 'Add Task'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-muted/30 rounded-xl p-3 space-y-2 animate-fade-in-up">
          <Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Task title..." className="text-sm h-8" />
          <Textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Description (optional)" className="text-xs resize-none" rows={2} />
          <div className="grid grid-cols-2 gap-2">
            <Select value={taskPriority} onValueChange={setTaskPriority}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)} className="h-8 text-xs" />
          </div>
          <Select value={assignTo} onValueChange={setAssignTo}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Assign to member" /></SelectTrigger>
            <SelectContent>
              {members.map((m: any) => (
                <SelectItem key={m.user_id} value={m.user_id}>{m.profiles?.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="btn-primary-gradient h-7 text-xs w-full" onClick={() => createTask.mutate()} disabled={createTask.isPending}>
            Create Task
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-2"><Loader2 size={16} className="animate-spin text-primary" /></div>
      ) : tasks.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">No tasks yet. Add one above!</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {tasks.map((t: any) => {
            const statusCfg = TASK_STATUSES[t.status as keyof typeof TASK_STATUSES];
            const priorityCfg = PRIORITY_CONFIG[t.priority as keyof typeof PRIORITY_CONFIG];
            return (
              <div key={t.id} className="bg-card rounded-lg border border-border p-2.5 text-xs">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-foreground">{t.title}</span>
                      <span className={cn('font-medium', priorityCfg?.color)}>• {priorityCfg?.label}</span>
                    </div>
                    {t.description && <p className="text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>}
                    <div className="flex items-center gap-2 mt-1 flex-wrap text-muted-foreground">
                      {t.profiles?.full_name && <span>👤 {t.profiles.full_name}</span>}
                      {t.due_date && <span>📅 {format(new Date(t.due_date), 'dd MMM')}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Select value={t.status} onValueChange={(s) => updateTaskStatus.mutate({ id: t.id, status: s })}>
                      <SelectTrigger className={cn('h-6 text-[10px] px-2 border rounded-full w-auto min-w-[80px]', statusCfg?.color)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TASK_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {isAdmin && (
                      <button onClick={() => deleteTask.mutate(t.id)} className="text-muted-foreground hover:text-destructive ml-1">
                        <Trash2 size={11} />
                      </button>
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

// ---- Team Members Panel ----
const TeamMembersPanel: React.FC<{ team: any; isAdmin: boolean }> = ({ team, isAdmin }) => {
  const { currentVillage } = useVillage();
  const queryClient = useQueryClient();
  const [addUserId, setAddUserId] = useState('');
  const [addRole, setAddRole] = useState('member');

  const { data: members = [] } = useQuery({
    queryKey: ['team-members', team.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('team_members')
        .select('*, profiles(full_name, user_id, occupation)')
        .eq('team_id', team.id);
      return data ?? [];
    },
  });

  const { data: villageUsers = [] } = useQuery({
    queryKey: ['village-users', currentVillage?.id],
    enabled: isAdmin && !!currentVillage,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('user_id, full_name, occupation')
        .eq('village_id', currentVillage!.id)
        .eq('status', 'active');
      return data ?? [];
    },
  });

  const memberIds = new Set(members.map((m: any) => m.user_id));
  const nonMembers = villageUsers.filter((u: any) => !memberIds.has(u.user_id));

  const addMember = useMutation({
    mutationFn: async () => {
      if (!addUserId) throw new Error('Select a user');
      const { error } = await (supabase as any).from('team_members').insert({
        team_id: team.id, user_id: addUserId, role_in_team: addRole,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setAddUserId(''); setAddRole('member');
      queryClient.invalidateQueries({ queryKey: ['team-members', team.id] });
      toast.success('Member added!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await (supabase as any).from('team_members').delete().eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-members', team.id] }),
  });

  const roleIcon = (role: string) => {
    if (role === 'leader') return <Crown size={11} className="text-warning" />;
    if (role === 'co-leader') return <Shield size={11} className="text-info" />;
    return <UserIcon size={11} className="text-muted-foreground" />;
  };

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-2">
      <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
        <Users size={12} /> Members ({members.length})
      </h5>
      <div className="flex flex-wrap gap-2">
        {members.map((m: any) => (
          <div key={m.id} className="flex items-center gap-1.5 bg-muted rounded-full px-2.5 py-1 text-xs">
            <Avatar className="w-5 h-5 flex-shrink-0">
              <AvatarFallback className="text-[9px] bg-primary/15 text-primary font-bold">
                {m.profiles?.full_name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {roleIcon(m.role_in_team)}
            <span className="text-foreground font-medium">{m.profiles?.full_name}</span>
            <span className="text-muted-foreground capitalize">({m.role_in_team})</span>
            {isAdmin && (
              <button onClick={() => removeMember.mutate(m.id)} className="text-muted-foreground hover:text-destructive ml-0.5">
                <X size={10} />
              </button>
            )}
          </div>
        ))}
      </div>
      {isAdmin && nonMembers.length > 0 && (
        <div className="flex gap-2">
          <Select value={addUserId} onValueChange={setAddUserId}>
            <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Add member..." /></SelectTrigger>
            <SelectContent>
              {nonMembers.map((u: any) => (
                <SelectItem key={u.user_id} value={u.user_id}>{u.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={addRole} onValueChange={setAddRole}>
            <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLE_IN_TEAM.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-7 text-xs btn-primary-gradient px-3" onClick={() => addMember.mutate()} disabled={!addUserId}>
            <UserPlus size={12} />
          </Button>
        </div>
      )}
    </div>
  );
};

// ---- Team Card ----
const TeamCard: React.FC<{ team: any; isAdmin: boolean; onDelete: () => void }> = ({ team, isAdmin, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [showTasks, setShowTasks] = useState(false);

  return (
    <div className="vcp-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-xl">
            {team.category.includes('Youth') ? '🏃' :
             team.category.includes('Temple') ? '⛪' :
             team.category.includes('Festival') ? '🎉' :
             team.category.includes('Water') ? '💧' :
             team.category.includes('Agriculture') ? '🌾' :
             team.category.includes('Education') ? '📚' : '👥'}
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{team.name}</h4>
            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full border border-border">
              {team.category}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!team.is_active && (
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Inactive</span>
          )}
          {isAdmin && (
            <button onClick={onDelete} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {team.description && (
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{team.description}</p>
      )}

      <TeamMembersPanel team={team} isAdmin={isAdmin} />

      <div className="flex gap-3 mt-3 pt-2 border-t border-border">
        <button
          onClick={() => setShowTasks(v => !v)}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {showTasks ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {showTasks ? 'Hide Tasks' : 'View Tasks'}
        </button>
      </div>
      {showTasks && <TeamTasksPanel team={team} isAdmin={isAdmin} />}
    </div>
  );
};

// ---- Main Teams Page ----
const TeamsPage: React.FC = () => {
  const { user, role } = useAuth();
  const { currentVillage } = useVillage();
  const queryClient = useQueryClient();
  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'moderator';

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams', currentVillage?.id],
    enabled: !!currentVillage,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('teams')
        .select('*, profiles!teams_created_by_fkey(full_name)')
        .eq('village_id', currentVillage!.id)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const createTeam = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Team name required');
      const { error } = await (supabase as any).from('teams').insert({
        village_id: currentVillage!.id,
        name, description: description || null, category,
        created_by: user!.id, is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setShowForm(false); setName(''); setDescription(''); setCategory('General');
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team created!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTeam = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('teams').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team deleted');
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Users size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Teams / బృందాలు</h1>
            <p className="text-xs text-muted-foreground">Village work teams and committees</p>
          </div>
        </div>
        {isAdmin && (
          <Button size="sm" className="btn-primary-gradient" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X size={14} className="mr-1" /> : <Plus size={14} className="mr-1" />}
            {showForm ? 'Cancel' : 'New Team'}
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showForm && isAdmin && (
        <div className="vcp-card p-5 mb-5 animate-fade-in-up">
          <h3 className="font-semibold text-foreground mb-4">Create New Team</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Team Name *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Youth Volunteers" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{TEAM_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Team purpose and goals..." className="mt-1 resize-none" rows={2} />
            </div>
            <Button className="btn-primary-gradient w-full" onClick={() => createTeam.mutate()} disabled={createTeam.isPending}>
              {createTeam.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              Create Team
            </Button>
          </div>
        </div>
      )}

      {/* Teams Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : teams.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">👥</div>
          <p className="font-medium text-foreground">No teams yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first village team!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map((team: any) => (
            <TeamCard
              key={team.id}
              team={team}
              isAdmin={isAdmin}
              onDelete={() => deleteTeam.mutate(team.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamsPage;
