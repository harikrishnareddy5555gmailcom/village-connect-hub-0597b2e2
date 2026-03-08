import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useVillage } from '@/contexts/VillageContext';
import { Settings, Globe, Save, Loader2, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const SettingsPage: React.FC = () => {
  const { role } = useAuth();
  const { currentVillage, refreshVillage } = useVillage();
  const isSuperAdmin = role === 'super_admin';

  const [name, setName] = useState(currentVillage?.name ?? '');
  const [description, setDescription] = useState(currentVillage?.description ?? '');
  const [district, setDistrict] = useState(currentVillage?.district ?? '');
  const [state, setState] = useState(currentVillage?.state ?? '');
  const [population, setPopulation] = useState(String(currentVillage?.population ?? ''));

  React.useEffect(() => {
    if (currentVillage) {
      setName(currentVillage.name);
      setDescription(currentVillage.description ?? '');
      setDistrict(currentVillage.district);
      setState(currentVillage.state);
      setPopulation(String(currentVillage.population ?? ''));
    }
  }, [currentVillage]);

  const updateVillage = useMutation({
    mutationFn: async () => {
      if (!currentVillage) return;
      const { error } = await (supabase as any)
        .from('villages')
        .update({
          name,
          description: description || null,
          district,
          state,
          population: population ? parseInt(population) : null,
        })
        .eq('id', currentVillage.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshVillage?.();
      toast.success('Village settings saved!');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  if (!currentVillage) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
          <Settings size={20} className="text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Settings / సెట్టింగ్స్</h1>
          <p className="text-xs text-muted-foreground">Village platform configuration</p>
        </div>
      </div>

      {/* Village Info */}
      <div className="vcp-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={16} className="text-primary" />
          <h2 className="font-semibold text-foreground">Village Information</h2>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Village Name</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={!isSuperAdmin}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Population</Label>
              <div className="relative mt-1">
                <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="number"
                  value={population}
                  onChange={e => setPopulation(e.target.value)}
                  disabled={!isSuperAdmin}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm">District</Label>
              <div className="relative mt-1">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={district} onChange={e => setDistrict(e.target.value)} disabled={!isSuperAdmin} className="pl-8" />
              </div>
            </div>
            <div>
              <Label className="text-sm">State</Label>
              <Input value={state} onChange={e => setState(e.target.value)} disabled={!isSuperAdmin} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-sm">Description / వివరణ</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={!isSuperAdmin}
              rows={3}
              className="mt-1 resize-none"
              placeholder="Brief description of the village..."
            />
          </div>

          {isSuperAdmin ? (
            <Button className="btn-primary-gradient" onClick={() => updateVillage.mutate()} disabled={updateVillage.isPending}>
              {updateVillage.isPending ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Save size={14} className="mr-2" />}
              Save Changes
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground italic">Only Super Admin can edit village settings.</p>
          )}
        </div>
      </div>

      {/* Village Stats */}
      <div className="vcp-card p-5">
        <h2 className="font-semibold text-foreground mb-3">Village Details</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Village ID', value: currentVillage.id.slice(0, 8) + '...' },
            { label: 'Country', value: currentVillage.country },
            { label: 'Status', value: currentVillage.is_active ? '✅ Active' : '❌ Inactive' },
            { label: 'Theme Color', value: currentVillage.theme_color ?? '#16a34a' },
          ].map(item => (
            <div key={item.label} className="bg-muted/40 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="font-medium text-foreground mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
