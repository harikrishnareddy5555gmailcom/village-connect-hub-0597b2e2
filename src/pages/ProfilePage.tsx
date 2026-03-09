import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMutation } from '@tanstack/react-query';
import { Camera, Phone, Briefcase, Edit2, Save, X, Loader2, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const ProfilePage: React.FC = () => {
  const { profile, role, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [occupation, setOccupation] = useState(profile?.occupation ?? '');
  const [uploading, setUploading] = useState(false);

  // Password change state
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, bio, occupation })
        .eq('user_id', profile!.user_id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshProfile();
      setEditing(false);
      toast.success('Profile updated!');
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      // Re-authenticate by signing in again with current password
      const email = `${profile!.mobile_number}@villageconnect.app`;
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: currentPw });
      if (signInErr) throw new Error('Current password is incorrect');
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Password changed successfully!');
      setPwOpen(false);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to change password'),
  });

  const handlePasswordSubmit = () => {
    if (!currentPw) return toast.error('Enter your current password');
    if (newPw.length < 6) return toast.error('New password must be at least 6 characters');
    if (newPw !== confirmPw) return toast.error('Passwords do not match');
    if (newPw === currentPw) return toast.error('New password must differ from current password');
    passwordMutation.mutate();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${profile.user_id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('user_id', profile.user_id);
      if (profileErr) throw profileErr;
      await refreshProfile();
      toast.success('Avatar updated!');
    } catch {
      toast.error('Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const roleColors: Record<string, string> = {
    super_admin: 'bg-destructive/15 text-destructive border-destructive/30',
    admin: 'bg-primary/15 text-primary border-primary/30',
    moderator: 'bg-info/15 text-info border-info/30',
    user: 'bg-muted text-muted-foreground border-border',
  };

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Avatar & Name Banner */}
      <div className="vcp-card p-6">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="relative group">
            <Avatar className="w-24 h-24 ring-4 ring-primary/20">
              <AvatarImage src={profile.avatar_url ?? ''} />
              <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                {profile.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
              </AvatarFallback>
            </Avatar>
            <label className="absolute inset-0 rounded-full flex items-center justify-center cursor-pointer bg-foreground/0 group-hover:bg-foreground/40 transition-all duration-200">
              {uploading
                ? <Loader2 size={20} className="text-background animate-spin" />
                : <Camera size={20} className="text-background opacity-0 group-hover:opacity-100 transition-opacity" />}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
            </label>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center border-2 border-background pointer-events-none">
              {uploading ? <Loader2 size={12} className="text-primary-foreground animate-spin" /> : <Camera size={12} className="text-primary-foreground" />}
            </div>
          </div>
          <div className="text-center sm:text-left flex-1">
            <h2 className="text-2xl font-bold text-foreground">{profile.full_name}</h2>
            <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-1 justify-center sm:justify-start">
              <Phone size={13} />
              {profile.mobile_number ?? 'No mobile'}
            </p>
            {role && (
              <span className={`inline-block mt-2 border rounded-full px-3 py-0.5 text-xs font-medium capitalize ${roleColors[role] ?? roleColors.user}`}>
                {role.replace('_', ' ')}
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (editing) {
                setFullName(profile.full_name);
                setBio(profile.bio ?? '');
                setOccupation(profile.occupation ?? '');
              }
              setEditing(!editing);
            }}
          >
            {editing ? <><X size={14} className="mr-1" />Cancel</> : <><Edit2 size={14} className="mr-1" />Edit Profile</>}
          </Button>
        </div>
      </div>

      {/* Edit / View Details */}
      <div className="vcp-card p-5 space-y-4">
        <h3 className="font-semibold text-foreground">About</h3>

        {editing ? (
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Full Name</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Occupation / వృత్తి</Label>
              <Input
                value={occupation}
                onChange={e => setOccupation(e.target.value)}
                placeholder="e.g. Farmer, Teacher, Business Owner"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Bio / పరిచయం</Label>
              <Textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell your village about yourself..."
                className="mt-1 resize-none"
                rows={3}
              />
            </div>
            <Button
              className="btn-primary-gradient"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Save size={14} className="mr-2" />}
              Save Changes
            </Button>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            {profile.occupation && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase size={14} className="text-primary" />
                <span>{profile.occupation}</span>
              </div>
            )}
            {profile.bio ? (
              <p className="text-foreground leading-relaxed">{profile.bio}</p>
            ) : (
              <p className="text-muted-foreground italic">No bio yet. Click Edit Profile to add one.</p>
            )}
            {profile.skills && profile.skills.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {profile.skills.map(s => (
                  <Badge key={s} variant="secondary">{s}</Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="vcp-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-primary" />
            <h3 className="font-semibold text-foreground">Change Password</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPwOpen(v => !v);
              setCurrentPw('');
              setNewPw('');
              setConfirmPw('');
            }}
          >
            {pwOpen ? <><X size={14} className="mr-1" />Cancel</> : <><Edit2 size={14} className="mr-1" />Change</>}
          </Button>
        </div>

        {pwOpen && (
          <div className="space-y-4">
            {/* Current password */}
            <div>
              <Label className="text-sm">Current Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  placeholder="Enter current password"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCurrent(v => !v)}
                >
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <Label className="text-sm">New Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNew(v => !v)}
                >
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* Strength indicator */}
              {newPw.length > 0 && (
                <div className="mt-1.5 flex gap-1">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        newPw.length >= i * 3
                          ? i <= 1 ? 'bg-destructive' : i <= 2 ? 'bg-warning' : i <= 3 ? 'bg-info' : 'bg-success'
                          : 'bg-muted'
                      }`}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">
                    {newPw.length < 4 ? 'Weak' : newPw.length < 7 ? 'Fair' : newPw.length < 10 ? 'Good' : 'Strong'}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <Label className="text-sm">Confirm New Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Re-enter new password"
                  className={`pr-10 ${confirmPw && confirmPw !== newPw ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirm(v => !v)}
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {confirmPw && confirmPw !== newPw && (
                <p className="text-xs text-destructive mt-1">Passwords do not match</p>
              )}
              {confirmPw && confirmPw === newPw && newPw.length >= 6 && (
                <p className="text-xs text-success mt-1 flex items-center gap-1"><ShieldCheck size={12} /> Passwords match</p>
              )}
            </div>

            <Button
              className="btn-primary-gradient"
              onClick={handlePasswordSubmit}
              disabled={passwordMutation.isPending}
            >
              {passwordMutation.isPending ? <Loader2 size={14} className="mr-2 animate-spin" /> : <KeyRound size={14} className="mr-2" />}
              Update Password
            </Button>
          </div>
        )}

        {!pwOpen && (
          <p className="text-sm text-muted-foreground">Keep your account secure by using a strong, unique password.</p>
        )}
      </div>

      {/* Account Status */}
      <div className="vcp-card p-5">
        <h3 className="font-semibold text-foreground mb-3">Account Status</h3>
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${profile.status === 'active' ? 'bg-success animate-pulse-green' : 'bg-warning'}`} />
          <span className="text-sm capitalize text-foreground font-medium">{profile.status}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">Joined {new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
