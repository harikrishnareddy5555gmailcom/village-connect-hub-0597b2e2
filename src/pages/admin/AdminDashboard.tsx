import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useVillage } from '@/contexts/VillageContext';
import { CheckCircle, XCircle, Users, Clock, BarChart3, Bell, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const AdminDashboard: React.FC = () => {
  const { role } = useAuth();
  const { currentVillage } = useVillage();
  const queryClient = useQueryClient();

  // Pending users
  const { data: pendingUsers = [], isLoading: loadingPending } = useQuery({
    queryKey: ['pending-users'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  // Active users count
  const { data: activeCount = 0 } = useQuery({
    queryKey: ['active-users-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      return count ?? 0;
    },
  });

  // Posts count
  const { data: postsCount = 0 } = useQuery({
    queryKey: ['posts-count'],
    queryFn: async () => {
      if (!currentVillage) return 0;
      const { count } = await (supabase as any)
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('village_id', currentVillage.id)
        .eq('is_deleted', false);
      return count ?? 0;
    },
    enabled: !!currentVillage,
  });

  const approveUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ status: 'active' })
        .eq('user_id', userId);
      if (error) throw error;

      // Assign 'user' role
      await (supabase as any).from('user_roles').insert({
        user_id: userId,
        village_id: currentVillage?.id ?? null,
        role: 'user',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['active-users-count'] });
      toast.success('User approved and activated!');
    },
    onError: () => toast.error('Failed to approve user'),
  });

  const rejectUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'banned' })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-users'] });
      toast.success('User rejected');
    },
  });

  const stats = [
    { label: 'Active Users', value: activeCount, icon: <Users size={20} />, color: 'bg-success/10 text-success' },
    { label: 'Pending Approval', value: pendingUsers.length, icon: <Clock size={20} />, color: 'bg-warning/10 text-warning' },
    { label: 'Total Posts', value: postsCount, icon: <BarChart3 size={20} />, color: 'bg-info/10 text-info' },
    { label: 'Village', value: currentVillage?.name ?? 'N/A', icon: <Bell size={20} />, color: 'bg-primary/10 text-primary', isText: true },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
          <Shield size={20} className="text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground capitalize">{role?.replace('_', ' ')} · {currentVillage?.name}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="vcp-card p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>
              {stat.icon}
            </div>
            <p className={`font-bold ${stat.isText ? 'text-base' : 'text-2xl'} text-foreground`}>
              {stat.value}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Pending Approvals */}
      <div className="vcp-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-foreground">Pending Registrations</h2>
            <p className="text-xs text-muted-foreground">Approve or reject new user registrations</p>
          </div>
          {pendingUsers.length > 0 && (
            <span className="badge-pending">{pendingUsers.length} pending</span>
          )}
        </div>

        {loadingPending ? (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-medium text-foreground">All registrations reviewed!</p>
            <p className="text-sm text-muted-foreground mt-1">No pending approvals at this time.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingUsers.map((user: any) => (
              <div key={user.id} className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarFallback className="bg-primary/15 text-primary font-bold">
                    {user.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{user.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    📱 {user.mobile_number || 'No number'} · Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    className="bg-success hover:bg-success/90 text-success-foreground h-8 text-xs"
                    onClick={() => approveUser.mutate(user.user_id)}
                    disabled={approveUser.isPending}
                  >
                    <CheckCircle size={13} className="mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-destructive text-destructive hover:bg-destructive/10 h-8 text-xs"
                    onClick={() => rejectUser.mutate(user.user_id)}
                    disabled={rejectUser.isPending}
                  >
                    <XCircle size={13} className="mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
