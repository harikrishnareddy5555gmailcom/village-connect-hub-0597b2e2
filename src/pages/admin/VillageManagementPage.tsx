import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  MapPin, Plus, X, Loader2, Pencil, Trash2, CheckCircle,
  XCircle, Globe, Users, ToggleLeft, ToggleRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VillageForm {
  name: string;
  district: string;
  state: string;
  country: string;
  population: string;
  latitude: string;
  longitude: string;
  description: string;
  theme_color: string;
}

const EMPTY_FORM: VillageForm = {
  name: '', district: '', state: '', country: 'India',
  population: '', latitude: '', longitude: '',
  description: '', theme_color: '#16a34a',
};

const VillageManagementPage: React.FC = () => {
  const { role } = useAuth();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<VillageForm>(EMPTY_FORM);

  const isSuperAdmin = role === 'super_admin';

  const { data: villages = [], isLoading } = useQuery({
    queryKey: ['all-villages'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('villages').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const resetForm = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(false); };

  const startEdit = (v: any) => {
    setEditId(v.id);
    setForm({
      name: v.name ?? '',
      district: v.district ?? '',
      state: v.state ?? '',
      country: v.country ?? 'India',
      population: v.population?.toString() ?? '',
      latitude: v.latitude?.toString() ?? '',
      longitude: v.longitude?.toString() ?? '',
      description: v.description ?? '',
      theme_color: v.theme_color ?? '#16a34a',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim() || !form.district.trim() || !form.state.trim()) {
        throw new Error('Name, district and state are required');
      }
      const payload = {
        name: form.name.trim(),
        district: form.district.trim(),
        state: form.state.trim(),
        country: form.country.trim() || 'India',
        population: form.population ? parseInt(form.population) : null,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        description: form.description || null,
        theme_color: form.theme_color || '#16a34a',
      };
      if (editId) {
        const { error } = await (supabase as any).from('villages').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('villages').insert({ ...payload, is_active: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-villages'] });
      queryClient.invalidateQueries({ queryKey: ['villages'] });
      toast.success(editId ? 'Village updated!' : 'Village created!');
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any).from('villages').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-villages'] });
      queryClient.invalidateQueries({ queryKey: ['villages'] });
      toast.success('Village status updated');
    },
  });

  const deleteVillage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('villages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-villages'] });
      queryClient.invalidateQueries({ queryKey: ['villages'] });
      toast.success('Village deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const f = (field: keyof VillageForm) => ({
    value: form[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  });

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-5xl mb-3">🔒</div>
          <p className="font-semibold text-foreground">Super Admin access only</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Globe size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Village Management</h1>
            <p className="text-xs text-muted-foreground">Create, edit and manage all villages</p>
          </div>
        </div>
        <Button size="sm" className="btn-primary-gradient" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm && !editId ? <X size={14} className="mr-1" /> : <Plus size={14} className="mr-1" />}
          {showForm && !editId ? 'Cancel' : 'New Village'}
        </Button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="vcp-card p-5 mb-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">{editId ? '✏️ Edit Village' : '➕ Create Village'}</h3>
            <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Village Name *</Label>
              <Input {...f('name')} placeholder="e.g. Varadayapalli" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">District *</Label>
              <Input {...f('district')} placeholder="e.g. Kadapa" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">State *</Label>
              <Input {...f('state')} placeholder="e.g. Andhra Pradesh" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Country</Label>
              <Input {...f('country')} placeholder="India" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Population</Label>
              <div className="relative mt-1">
                <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input {...f('population')} type="number" placeholder="e.g. 750" className="pl-8" />
              </div>
            </div>
            <div>
              <Label className="text-sm">Theme Color</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.theme_color}
                  onChange={e => setForm(p => ({ ...p, theme_color: e.target.value }))}
                  className="w-10 h-9 rounded cursor-pointer border border-border" />
                <Input value={form.theme_color} onChange={e => setForm(p => ({ ...p, theme_color: e.target.value }))} placeholder="#16a34a" className="flex-1" />
              </div>
            </div>
            <div>
              <Label className="text-sm">Latitude</Label>
              <div className="relative mt-1">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input {...f('latitude')} type="number" step="any" placeholder="e.g. 14.4673" className="pl-8" />
              </div>
            </div>
            <div>
              <Label className="text-sm">Longitude</Label>
              <div className="relative mt-1">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input {...f('longitude')} type="number" step="any" placeholder="e.g. 78.8242" className="pl-8" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-sm">Description</Label>
              <Textarea {...f('description')} placeholder="Brief description of the village..." className="mt-1 resize-none" rows={2} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button className="btn-primary-gradient flex-1" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              {editId ? 'Save Changes' : 'Create Village'}
            </Button>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Villages List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : villages.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🏘️</div>
          <p className="font-medium text-foreground">No villages yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {villages.map((v: any) => (
            <div key={v.id} className={cn("vcp-card p-5 transition-all", !v.is_active && "opacity-60")}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: v.theme_color ?? '#16a34a' }}
                  >
                    {v.name?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">{v.name}</h4>
                    <p className="text-xs text-muted-foreground">{v.district}, {v.state}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {v.is_active
                    ? <span className="text-xs bg-success/15 text-green-700 border border-success/30 rounded-full px-2 py-0.5 font-medium flex items-center gap-1"><CheckCircle size={10} />Active</span>
                    : <span className="text-xs bg-muted text-muted-foreground border border-border rounded-full px-2 py-0.5 font-medium flex items-center gap-1"><XCircle size={10} />Inactive</span>
                  }
                </div>
              </div>

              {v.description && (
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{v.description}</p>
              )}

              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                {v.population && <span className="flex items-center gap-1"><Users size={11} />Pop. ~{v.population.toLocaleString()}</span>}
                {v.latitude && v.longitude && (
                  <span className="flex items-center gap-1"><MapPin size={11} />{parseFloat(v.latitude).toFixed(4)}, {parseFloat(v.longitude).toFixed(4)}</span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 flex-1"
                  onClick={() => startEdit(v)}
                >
                  <Pencil size={11} className="mr-1" />Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={cn("text-xs h-7 flex-1", v.is_active ? "text-warning border-warning/50" : "text-success border-success/50")}
                  onClick={() => toggleActive.mutate({ id: v.id, is_active: !v.is_active })}
                  disabled={toggleActive.isPending}
                >
                  {v.is_active
                    ? <><ToggleRight size={11} className="mr-1" />Deactivate</>
                    : <><ToggleLeft size={11} className="mr-1" />Activate</>
                  }
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => {
                    if (confirm(`Delete "${v.name}"? This is permanent.`)) deleteVillage.mutate(v.id);
                  }}
                >
                  <Trash2 size={11} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VillageManagementPage;
