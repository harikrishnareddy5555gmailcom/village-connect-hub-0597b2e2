import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVillage } from '@/contexts/VillageContext';
import {
  Users, FileText, AlertTriangle, Calendar,
  DollarSign, TrendingUp, Loader2, BarChart3,
} from 'lucide-react';
import { startOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  labelTe: string;
  value: string | number;
  sub?: string;
  color: string;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, labelTe, value, sub, color, loading }) => (
  <div className="vcp-card p-5 flex items-start gap-4 animate-fade-in-up">
    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0", color)}>
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="text-[10px] text-muted-foreground/70 telugu mb-1">{labelTe}</p>
      {loading ? (
        <Loader2 size={18} className="animate-spin text-muted-foreground mt-1" />
      ) : (
        <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
      )}
      {sub && !loading && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  </div>
);

const VillageStatsPage: React.FC = () => {
  const { currentVillage } = useVillage();
  const vid = currentVillage?.id;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();

  const { data: membersCount, isLoading: loadingMembers } = useQuery({
    queryKey: ['stats-members', vid],
    enabled: !!vid,
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('village_id', vid)
        .eq('status', 'active');
      return count ?? 0;
    },
  });

  const { data: postsThisWeek, isLoading: loadingPosts } = useQuery({
    queryKey: ['stats-posts-week', vid],
    enabled: !!vid,
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('village_id', vid)
        .eq('is_deleted', false)
        .gte('created_at', weekStart);
      return count ?? 0;
    },
  });

  const { data: activeComplaints, isLoading: loadingComplaints } = useQuery({
    queryKey: ['stats-complaints', vid],
    enabled: !!vid,
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from('complaints')
        .select('*', { count: 'exact', head: true })
        .eq('village_id', vid)
        .in('status', ['reported', 'in_progress']);
      return count ?? 0;
    },
  });

  const { data: upcomingEvents, isLoading: loadingEvents } = useQuery({
    queryKey: ['stats-events', vid],
    enabled: !!vid,
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('village_id', vid)
        .gte('event_date', new Date().toISOString());
      return count ?? 0;
    },
  });

  const { data: totalDonations, isLoading: loadingDonations } = useQuery({
    queryKey: ['stats-donations', vid],
    enabled: !!vid,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('donations')
        .select('amount')
        .eq('village_id', vid);
      if (!data) return 0;
      return (data as { amount: number }[]).reduce((sum, d) => sum + Number(d.amount), 0);
    },
  });

  const { data: recentActivity, isLoading: loadingActivity } = useQuery({
    queryKey: ['stats-activity', vid],
    enabled: !!vid,
    queryFn: async () => {
      const [posts, discussions, complaints] = await Promise.all([
        (supabase as any).from('posts').select('id, created_at, content, profiles!posts_author_id_profiles_fkey(full_name)').eq('village_id', vid).eq('is_deleted', false).order('created_at', { ascending: false }).limit(3),
        (supabase as any).from('discussions').select('id, created_at, title, profiles!discussions_author_id_profiles_fkey(full_name)').eq('village_id', vid).order('created_at', { ascending: false }).limit(3),
        (supabase as any).from('complaints').select('id, created_at, title, status').eq('village_id', vid).order('created_at', { ascending: false }).limit(3),
      ]);
      const items = [
        ...(posts.data ?? []).map((p: any) => ({ type: 'post', title: p.content?.slice(0, 60) + (p.content?.length > 60 ? '…' : ''), author: p.profiles?.full_name, date: p.created_at })),
        ...(discussions.data ?? []).map((d: any) => ({ type: 'discussion', title: d.title, author: d.profiles?.full_name, date: d.created_at })),
        ...(complaints.data ?? []).map((c: any) => ({ type: 'complaint', title: c.title, status: c.status, date: c.created_at })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);
      return items;
    },
  });

  const formatCurrency = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val.toLocaleString()}`;
  };

  const activityIcon: Record<string, string> = {
    post: '📝',
    discussion: '💬',
    complaint: '⚠️',
  };

  const statusColor: Record<string, string> = {
    reported: 'text-warning',
    in_progress: 'text-info',
    resolved: 'text-success',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center">
          <BarChart3 size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Village Statistics / గ్రామ గణాంకాలు</h1>
          <p className="text-xs text-muted-foreground">
            {currentVillage?.name} · Live overview
          </p>
        </div>
      </div>

      {/* Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={<Users size={22} className="text-primary-foreground" />}
          label="Active Members"
          labelTe="చురుకైన సభ్యులు"
          value={membersCount ?? '—'}
          sub="approved & active"
          color="bg-primary"
          loading={loadingMembers}
        />
        <StatCard
          icon={<FileText size={22} className="text-blue-50" />}
          label="Posts This Week"
          labelTe="ఈ వారం పోస్టులు"
          value={postsThisWeek ?? '—'}
          sub="since Monday"
          color="bg-info"
          loading={loadingPosts}
        />
        <StatCard
          icon={<AlertTriangle size={22} className="text-yellow-900" />}
          label="Active Complaints"
          labelTe="పరిష్కారంలో ఫిర్యాదులు"
          value={activeComplaints ?? '—'}
          sub="reported + in progress"
          color="bg-warning"
          loading={loadingComplaints}
        />
        <StatCard
          icon={<Calendar size={22} className="text-blue-50" />}
          label="Upcoming Events"
          labelTe="రాబోయే కార్యక్రమాలు"
          value={upcomingEvents ?? '—'}
          sub="scheduled ahead"
          color="bg-[hsl(var(--info))]"
          loading={loadingEvents}
        />
        <StatCard
          icon={<DollarSign size={22} className="text-white" />}
          label="Total Donations"
          labelTe="మొత్తం విరాళాలు"
          value={totalDonations !== undefined ? formatCurrency(totalDonations) : '—'}
          sub="all time"
          color="bg-success"
          loading={loadingDonations}
        />
        <StatCard
          icon={<TrendingUp size={22} className="text-white" />}
          label="Village"
          labelTe="గ్రామం"
          value={currentVillage?.name ?? '—'}
          sub={`${currentVillage?.district ?? ''}, ${currentVillage?.state ?? ''}`}
          color="bg-accent/80"
          loading={false}
        />
      </div>

      {/* Recent Activity Feed */}
      <div className="vcp-card p-5">
        <h2 className="font-bold text-base text-foreground mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-primary" />
          Recent Activity
        </h2>
        {loadingActivity ? (
          <div className="flex justify-center py-8">
            <Loader2 size={22} className="animate-spin text-primary" />
          </div>
        ) : !recentActivity?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <span className="text-lg leading-none mt-0.5">{activityIcon[item.type]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium line-clamp-1">{item.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {item.author && (
                      <span className="text-xs text-muted-foreground">by {item.author}</span>
                    )}
                    {item.status && (
                      <span className={cn("text-xs font-medium capitalize", statusColor[item.status] ?? 'text-muted-foreground')}>
                        {item.status.replace('_', ' ')}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VillageStatsPage;
