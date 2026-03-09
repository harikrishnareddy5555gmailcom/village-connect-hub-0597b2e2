import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVillage } from '@/contexts/VillageContext';
import { Users, Search, Ban, CheckCircle, Loader2, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-success/15 text-green-700 border-success/30',
  pending: 'bg-warning/15 text-yellow-700 border-warning/30',
  banned: 'bg-destructive/15 text-red-700 border-destructive/30',
  suspended: 'bg-muted text-muted-foreground border-border',
};

const UserManagementPage: React.FC = () => {
  const { role: myRole } = useAuth();
  const { currentVillage } = useVillage();
  const queryClient = useQueryClient();
  const isSuperAdmin = myRole === 'super_admin';

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['all-users', filterStatus, currentVillage?.id],
    enabled: !!currentVillage,
    queryFn: async () => {
      // Fetch profiles
      let q = supabase
        .from('profiles')
        .select('*')
        .eq('village_id', currentVillage!.id)
        .order('created_at', { ascending: false });
      if (filterStatus !== 'all') q = (q as any).eq('status', filterStatus);
      const { data: profiles, error } = await q;
      if (error) throw error;

      // Fetch all user_roles for this village in one query
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', (profiles ?? []).map((p: any) => p.user_id));

      // Merge roles into profiles
      const rolesMap: Record<string, string> = {};
      (roles ?? []).forEach((r: any) => { rolesMap[r.user_id] = r.role; });
      return (profiles ?? []).map((p: any) => ({
        ...p,
        user_roles: rolesMap[p.user_id] ? [{ role: rolesMap[p.user_id] }] : [],
      }));
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const { error } = await (supabase as any).from('profiles').update({ status }).eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('User status updated');
    },
    onError: () => toast.error('Failed to update user'),
  });

  const assignRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await (supabase as any).from('user_roles').delete().eq('user_id', userId);
      const { error } = await (supabase as any).from('user_roles').insert({
        user_id: userId,
        village_id: currentVillage?.id ?? null,
        role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('Role assigned');
    },
    onError: () => toast.error('Failed to assign role'),
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      // Delete user_roles first, then profile
      await (supabase as any).from('user_roles').delete().eq('user_id', userId);
      const { error } = await (supabase as any).from('profiles').delete().eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      setDeleteUserId(null);
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('User removed from village');
    },
    onError: () => toast.error('Failed to delete user'),
  });

  const filtered = (users as any[]).filter((u: any) => {
    if (!search) return true;
    return u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.mobile_number?.includes(search);
  });

  const deleteTarget = filtered.find((u: any) => u.user_id === deleteUserId);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Users size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">User Management</h1>
          <p className="text-xs text-muted-foreground">Manage all village members · {(users as any[]).length} total</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or mobile..." className="pl-8" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">👥</div>
          <p className="font-medium text-foreground">No users found</p>
          <p className="text-sm text-muted-foreground mt-1">Try a different filter or search term</p>
        </div>
      ) : (
        <div className="vcp-card overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((u: any) => {
              const topRole = (u.user_roles as any[])?.[0]?.role ?? 'user';
              return (
                <div key={u.id} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary/15 text-primary font-bold">
                      {u.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      📱 {u.mobile_number ?? '—'} · Joined {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    <span className={`border rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[u.status] ?? STATUS_COLOR.pending}`}>
                      {u.status}
                    </span>

                    {isSuperAdmin && (
                      <Select value={topRole} onValueChange={role => assignRole.mutate({ userId: u.user_id, role })}>
                        <SelectTrigger className="h-7 text-xs w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    <div className="flex gap-1">
                      {u.status !== 'active' && (
                        <Button size="sm" className="h-7 text-xs bg-success/90 hover:bg-success text-white"
                          onClick={() => updateStatus.mutate({ userId: u.user_id, status: 'active' })}>
                          <CheckCircle size={11} className="mr-1" />Activate
                        </Button>
                      )}
                      {u.status !== 'banned' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs border-destructive text-destructive hover:bg-destructive/10"
                          onClick={() => updateStatus.mutate({ userId: u.user_id, status: 'banned' })}>
                          <Ban size={11} className="mr-1" />Ban
                        </Button>
                      )}
                      {isSuperAdmin && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteUserId(u.user_id)}
                          title="Delete user">
                          <Trash2 size={13} />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={open => !open && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.full_name}</strong> from the village.
              Their posts and activity will remain but they won't be able to log in. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteUserId && deleteUser.mutate(deleteUserId)}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagementPage;
