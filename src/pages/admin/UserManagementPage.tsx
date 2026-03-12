import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVillage } from '@/contexts/VillageContext';
import { Users, Search, Ban, CheckCircle, Loader2, Trash2, Key, PauseCircle, Eye, EyeOff, MoreVertical } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { writeAuditLog } from '@/lib/auditLog';

const STATUS_COLOR: Record<string, string> = {
  active:    'bg-success/15 text-green-700 dark:text-green-400 border-success/30',
  pending:   'bg-warning/15 text-yellow-700 dark:text-yellow-400 border-warning/30',
  banned:    'bg-destructive/15 text-red-700 dark:text-red-400 border-destructive/30',
  suspended: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
};

const ROLE_BADGE: Record<string, string> = {
  super_admin: 'bg-destructive/15 text-destructive border-destructive/30',
  admin:       'bg-primary/15 text-primary border-primary/30',
  moderator:   'bg-info/15 text-info border-info/30',
  user:        'bg-muted text-muted-foreground border-border',
};

const UserManagementPage: React.FC = () => {
  const { role: myRole, user: currentUser, profile: currentProfile } = useAuth();
  const { currentVillage } = useVillage();
  const queryClient = useQueryClient();
  const isSuperAdmin = myRole === 'super_admin';
  const isAdmin = myRole === 'admin' || myRole === 'super_admin';
  // Moderators can only activate/suspend users (not admins, not ban/delete/role-change)
  const isModerator = myRole === 'moderator';

  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [resetUserId,  setResetUserId]  = useState<string | null>(null);
  const [suspendUserId, setSuspendUserId] = useState<string | null>(null);
  const [banUserId,     setBanUserId]     = useState<string | null>(null);
  const [showMobiles, setShowMobiles] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['all-users', filterStatus, currentVillage?.id, isSuperAdmin],
    queryFn: async () => {
      let q = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (currentVillage?.id) {
        q = (q as any).eq('village_id', currentVillage.id);
      }
      if (filterStatus !== 'all') q = (q as any).eq('status', filterStatus);

      const { data: profiles, error } = await q;
      if (error) throw error;

      const profileList = (profiles ?? []) as any[];
      if (profileList.length === 0) return [];

      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', profileList.map((p: any) => p.user_id));

      const rolesMap: Record<string, string> = {};
      const roleOrder: Record<string, number> = { super_admin: 1, admin: 2, moderator: 3, user: 4 };
      (roles ?? []).forEach((r: any) => {
        const existing = rolesMap[r.user_id];
        if (!existing || (roleOrder[r.role] ?? 99) < (roleOrder[existing] ?? 99)) {
          rolesMap[r.user_id] = r.role;
        }
      });

      const result = profileList.map((p: any) => ({
        ...p,
        _topRole: rolesMap[p.user_id] ?? 'user',
      }));

      if (!isSuperAdmin) {
        return result.filter((u: any) => u._topRole !== 'super_admin');
      }

      return result;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ userId, status, userName }: { userId: string; status: string; userName?: string }) => {
      const { error } = await (supabase as any).from('profiles').update({ status }).eq('user_id', userId);
      if (error) throw error;
      await writeAuditLog({
        action_type: status === 'active' ? 'activate' : status,
        entity_type: 'user', entity_id: userId, entity_name: userName,
        performed_by: currentUser!.id, performed_by_name: currentProfile?.full_name,
        village_id: currentVillage?.id, metadata: { new_status: status },
      });
    },
    onSuccess: () => {
      setSuspendUserId(null); setBanUserId(null);
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('User status updated');
    },
    onError: () => toast.error('Failed to update user'),
  });

  const assignRole = useMutation({
    mutationFn: async ({ userId, role, userName }: { userId: string; role: string; userName?: string }) => {
      if (!isSuperAdmin) { throw new Error('Only Super Admin can assign roles'); }
      await (supabase as any).from('user_roles').delete().eq('user_id', userId);
      const { error } = await (supabase as any).from('user_roles').insert({
        user_id: userId, village_id: currentVillage?.id ?? null, role,
      });
      if (error) throw error;
      await writeAuditLog({
        action_type: 'role_change', entity_type: 'user', entity_id: userId, entity_name: userName,
        performed_by: currentUser!.id, performed_by_name: currentProfile?.full_name,
        village_id: currentVillage?.id, metadata: { new_role: role },
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['all-users'] }); toast.success('Role assigned'); },
    onError: (e: Error) => toast.error(e.message ?? 'Failed to assign role'),
  });

  const deleteUser = useMutation({
    mutationFn: async ({ userId, userName }: { userId: string; userName?: string }) => {
      await (supabase as any).from('user_roles').delete().eq('user_id', userId);
      const { error } = await (supabase as any).from('profiles').delete().eq('user_id', userId);
      if (error) throw error;
      await writeAuditLog({
        action_type: 'delete', entity_type: 'user', entity_id: userId, entity_name: userName,
        performed_by: currentUser!.id, performed_by_name: currentProfile?.full_name,
        village_id: currentVillage?.id,
      });
    },
    onSuccess: () => {
      setDeleteUserId(null);
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('User removed');
    },
    onError: () => toast.error('Failed to delete user'),
  });

  const resetPassword = useMutation({
    mutationFn: async ({ userId, userMobile, userName }: { userId: string; userMobile?: string; userName?: string }) => {
      const email = `${userMobile}@villageconnect.app`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      await writeAuditLog({
        action_type: 'password_reset', entity_type: 'user', entity_id: userId, entity_name: userName,
        performed_by: currentUser!.id, performed_by_name: currentProfile?.full_name, village_id: currentVillage?.id,
      });
    },
    onSuccess: () => { setResetUserId(null); toast.success('Password reset link sent'); },
    onError: (e: Error) => toast.error(`Reset failed: ${e.message}`),
  });

  const filtered = (users as any[]).filter((u: any) => {
    if (!search) return true;
    return u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.mobile_number?.includes(search);
  });

  const deleteTarget  = (users as any[]).find((u: any) => u.user_id === deleteUserId);
  const resetTarget   = (users as any[]).find((u: any) => u.user_id === resetUserId);
  const suspendTarget = (users as any[]).find((u: any) => u.user_id === suspendUserId);
  const banTarget     = (users as any[]).find((u: any) => u.user_id === banUserId);

  // Permission rules:
  // super_admin: full access
  // admin: can activate/suspend/ban user-role and moderator-role accounts, but NOT role-change/delete/reset
  // moderator: can only activate/suspend user-role accounts (NO ban, no admin-level accounts)
  const canActOn = (u: any) => {
    if (u.user_id === currentUser?.id) return false;
    if (isSuperAdmin) return true;
    if (isAdmin) return u._topRole !== 'super_admin' && u._topRole !== 'admin';
    if (isModerator) return u._topRole === 'user'; // moderator can only act on plain users
    return false;
  };

  const canBan = (u: any) => {
    if (!canActOn(u)) return false;
    if (isModerator) return false; // moderators cannot ban
    return true;
  };

  const getMobileDisplay = (u: any) => {
    if (isSuperAdmin && showMobiles) return u.mobile_number ?? '—';
    if (u.gender === 'Female' && !u.show_mobile) return '🔒 Private';
    return (isSuperAdmin || isAdmin) ? (u.mobile_number ?? '—') : (u.show_mobile ? u.mobile_number ?? '—' : '🔒 Private');
  };

  return (
    <div className="max-w-4xl mx-auto px-3 py-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Users size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground">User Management</h1>
          <p className="text-xs text-muted-foreground">
            {(users as any[]).length} members
            {isModerator && ' · Moderator access'}
          </p>
        </div>
        {isSuperAdmin && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground flex-shrink-0"
            onClick={() => setShowMobiles(!showMobiles)}
          >
            {showMobiles ? <EyeOff size={14} className="mr-1" /> : <Eye size={14} className="mr-1" />}
            <span className="hidden sm:inline">{showMobiles ? 'Hide' : 'Show'}</span>
          </Button>
        )}
      </div>

      {/* Role notice */}
      {isModerator && (
        <div className="mb-4 p-3 bg-info/10 border border-info/20 rounded-xl text-xs text-foreground">
          🛡️ As moderator, you can activate or suspend regular users only.
        </div>
      )}
      {!isSuperAdmin && !isModerator && (
        <div className="mb-4 p-3 bg-info/10 border border-info/20 rounded-xl text-xs text-foreground">
          🔒 Female members' contact details are private by default.
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or mobile..." className="pl-8 text-sm" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[120px] flex-shrink-0 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">👥</div>
          <p className="font-medium text-foreground">No users found</p>
          <p className="text-sm text-muted-foreground mt-1">Try a different filter</p>
        </div>
      ) : (
        <div className="vcp-card overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((u: any) => {
              const topRole    = u._topRole ?? 'user';
              const actionable = canActOn(u);
              const isSelf     = u.user_id === currentUser?.id;
              const isFemale   = u.gender === 'Female';

              return (
                <div key={u.id} className="flex items-center gap-3 p-3 sm:p-4 hover:bg-muted/30 transition-colors">
                  {/* Avatar */}
                  <Avatar className="w-9 h-9 flex-shrink-0">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <AvatarFallback className={cn(
                        'font-bold text-sm',
                        isFemale ? 'bg-pink-100 text-pink-700' : 'bg-primary/15 text-primary'
                      )}>
                        {u.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-sm text-foreground truncate max-w-[140px] sm:max-w-none">{u.full_name}</p>
                      {isFemale && <span className="text-xs text-pink-500">♀</span>}
                      <Badge className={cn('text-[9px] px-1.5 py-0 h-4 border flex-shrink-0', ROLE_BADGE[topRole] ?? ROLE_BADGE.user)}>
                        {topRole === 'super_admin' ? '⭐ SA' : topRole}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span className={cn('border rounded-full px-2 py-0 text-[10px] font-medium leading-5', STATUS_COLOR[u.status] ?? STATUS_COLOR.pending)}>
                        {u.status}
                      </span>
                      <span className="text-[10px] text-muted-foreground hidden sm:inline">
                        📱 {getMobileDisplay(u)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Role selector — super admin only */}
                    {isSuperAdmin && !isSelf && (
                      <Select
                        value={topRole}
                        onValueChange={role => assignRole.mutate({ userId: u.user_id, role, userName: u.full_name })}
                      >
                        <SelectTrigger className="h-7 text-xs w-[90px] sm:w-[110px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {/* Quick activate for pending */}
                    {actionable && u.status === 'pending' && (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-success/90 hover:bg-success text-white flex-shrink-0"
                        onClick={() => updateStatus.mutate({ userId: u.user_id, status: 'active', userName: u.full_name })}
                        disabled={updateStatus.isPending}
                      >
                        <CheckCircle size={11} className="sm:mr-1" />
                        <span className="hidden sm:inline">Activate</span>
                      </Button>
                    )}

                    {/* Overflow menu for more actions */}
                    {(actionable || (isSuperAdmin && !isSelf)) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                            <MoreVertical size={14} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {/* Activate */}
                          {actionable && u.status !== 'active' && (
                            <DropdownMenuItem
                              className="text-success focus:text-success"
                              onClick={() => updateStatus.mutate({ userId: u.user_id, status: 'active', userName: u.full_name })}
                            >
                              <CheckCircle size={13} className="mr-2" /> Activate
                            </DropdownMenuItem>
                          )}

                          {/* Suspend */}
                          {actionable && u.status !== 'suspended' && (
                            <DropdownMenuItem
                              className="text-orange-600 focus:text-orange-600"
                              onClick={() => setSuspendUserId(u.user_id)}
                            >
                              <PauseCircle size={13} className="mr-2" /> Suspend
                            </DropdownMenuItem>
                          )}

                          {/* Ban — admin & super_admin only */}
                          {canBan(u) && u.status !== 'banned' && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setBanUserId(u.user_id)}
                            >
                              <Ban size={13} className="mr-2" /> Ban
                            </DropdownMenuItem>
                          )}

                          {/* Super admin only */}
                          {isSuperAdmin && !isSelf && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-info focus:text-info"
                                onClick={() => setResetUserId(u.user_id)}
                              >
                                <Key size={13} className="mr-2" /> Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteUserId(u.user_id)}
                              >
                                <Trash2 size={13} className="mr-2" /> Delete User
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Suspend Confirmation ── */}
      <AlertDialog open={!!suspendUserId} onOpenChange={open => !open && setSuspendUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend User?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{suspendTarget?.full_name}</strong> will be temporarily suspended.
              You can reactivate them at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-500 text-white hover:bg-orange-600"
              onClick={() => suspendUserId && updateStatus.mutate({ userId: suspendUserId, status: 'suspended', userName: suspendTarget?.full_name })}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              Suspend User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Ban Confirmation ── */}
      <AlertDialog open={!!banUserId} onOpenChange={open => !open && setBanUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ban User?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{banTarget?.full_name}</strong> will be permanently banned from the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => banUserId && updateStatus.mutate({ userId: banUserId, status: 'banned', userName: banTarget?.full_name })}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              Ban User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteUserId} onOpenChange={open => !open && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.full_name}</strong> from the village. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteUserId && deleteUser.mutate({ userId: deleteUserId, userName: deleteTarget?.full_name })}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Reset Password Confirmation ── */}
      <AlertDialog open={!!resetUserId} onOpenChange={open => !open && setResetUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password?</AlertDialogTitle>
            <AlertDialogDescription>
              Send a password reset link to <strong>{resetTarget?.full_name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetUserId && resetPassword.mutate({ userId: resetUserId, userMobile: resetTarget?.mobile_number, userName: resetTarget?.full_name })}
              disabled={resetPassword.isPending}
            >
              {resetPassword.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              Send Reset Link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagementPage;
