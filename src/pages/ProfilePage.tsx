import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Phone, Briefcase, User, Edit2, Save, X, Loader2 } from 'lucide-react';
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

  const queryClient = useQueryClient();

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
          <div className="relative">
            <Avatar className="w-24 h-24 ring-4 ring-primary/20">
              <AvatarImage src={profile.avatar_url ?? ''} />
              <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                {profile.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
              </AvatarFallback>
            </Avatar>
            <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-dark transition-colors">
              {uploading ? <Loader2 size={14} className="text-white animate-spin" /> : <Camera size={14} className="text-white" />}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
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
