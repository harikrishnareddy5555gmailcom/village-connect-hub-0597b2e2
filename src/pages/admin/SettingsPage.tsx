import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVillage } from '@/contexts/VillageContext';
import { Settings, Globe, Save, Loader2, MapPin, Users, Navigation, CheckCircle, Trash2, Mail, MessageSquare, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

// Fix Leaflet icons in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const villagePinIcon = L.divIcon({
  className: '',
  html: `<div style="
    background:hsl(142,70%,30%);border:3px solid white;border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);width:38px;height:38px;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 3px 12px rgba(0,0,0,0.4);cursor:grab;">
    <span style="transform:rotate(45deg);font-size:16px;line-height:1;">🏘️</span>
  </div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -42],
});

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], 14); }, [lat, lng, map]);
  return null;
}

const DEFAULT_LAT = 17.385;
const DEFAULT_LNG = 78.4867;

const SettingsPage: React.FC = () => {
  const { role, profile } = useAuth();
  const { currentVillage, refreshVillage } = useVillage();
  const queryClient = useQueryClient();
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin' || isSuperAdmin;

  // Password change state
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [name, setName] = useState(currentVillage?.name ?? '');
  const [description, setDescription] = useState(currentVillage?.description ?? '');
  const [district, setDistrict] = useState(currentVillage?.district ?? '');
  const [state, setState] = useState(currentVillage?.state ?? '');
  const [population, setPopulation] = useState(String(currentVillage?.population ?? ''));

  // Location state
  const [villageLat, setVillageLat] = useState<number | null>(
    currentVillage?.latitude ? Number(currentVillage.latitude) : null
  );
  const [villageLng, setVillageLng] = useState<number | null>(
    currentVillage?.longitude ? Number(currentVillage.longitude) : null
  );
  const [mapKey, setMapKey] = useState(0);
  const [latInput, setLatInput] = useState(currentVillage?.latitude?.toString() ?? '');
  const [lngInput, setLngInput] = useState(currentVillage?.longitude?.toString() ?? '');

  // Password reset method toggles (cast to any since types not yet regenerated)
  const [resetEmailEnabled, setResetEmailEnabled] = useState<boolean>(
    (currentVillage as any)?.reset_via_email_enabled ?? true
  );
  const [resetOtpEnabled, setResetOtpEnabled] = useState<boolean>(
    (currentVillage as any)?.reset_via_otp_enabled ?? true
  );

  useEffect(() => {
    if (currentVillage) {
      setName(currentVillage.name);
      setDescription(currentVillage.description ?? '');
      setDistrict(currentVillage.district);
      setState(currentVillage.state);
      setPopulation(String(currentVillage.population ?? ''));
      const la = currentVillage.latitude ? Number(currentVillage.latitude) : null;
      const lo = currentVillage.longitude ? Number(currentVillage.longitude) : null;
      setVillageLat(la);
      setVillageLng(lo);
      setLatInput(la?.toString() ?? '');
      setLngInput(lo?.toString() ?? '');
      setMapKey(k => k + 1);
      setResetEmailEnabled((currentVillage as any).reset_via_email_enabled ?? true);
      setResetOtpEnabled((currentVillage as any).reset_via_otp_enabled ?? true);
    }
  }, [currentVillage?.id]);

  const mapCenter: [number, number] = [
    villageLat ?? DEFAULT_LAT,
    villageLng ?? DEFAULT_LNG,
  ];

  const handleGeolocate = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const la = parseFloat(pos.coords.latitude.toFixed(6));
        const lo = parseFloat(pos.coords.longitude.toFixed(6));
        setVillageLat(la);
        setVillageLng(lo);
        setLatInput(la.toString());
        setLngInput(lo.toString());
        setMapKey(k => k + 1);
      },
      () => toast.error('Could not get your location'),
    );
  };

  const handleManualInput = () => {
    const la = parseFloat(latInput);
    const lo = parseFloat(lngInput);
    if (!isNaN(la) && !isNaN(lo)) {
      setVillageLat(la);
      setVillageLng(lo);
      setMapKey(k => k + 1);
    }
  };

  const handleRemovePin = () => {
    setVillageLat(null);
    setVillageLng(null);
    setLatInput('');
    setLngInput('');
  };

  const updateVillage = useMutation({
    mutationFn: async () => {
      if (!currentVillage) return;
      const { error } = await supabase
        .from('villages')
        .update({
          name,
          description: description || null,
          district,
          state,
          population: population ? parseInt(population) : null,
          latitude: villageLat,
          longitude: villageLng,
        })
        .eq('id', currentVillage.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshVillage?.();
      queryClient.invalidateQueries({ queryKey: ['villages'] });
      toast.success('Village settings saved!');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const saveLocation = useMutation({
    mutationFn: async () => {
      if (!currentVillage) return;
      const { error } = await supabase
        .from('villages')
        .update({ latitude: villageLat, longitude: villageLng })
        .eq('id', currentVillage.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshVillage?.();
      queryClient.invalidateQueries({ queryKey: ['villages'] });
      if (villageLat && villageLng) {
        toast.success('Village location saved! It now shows accurately on the map.');
      } else {
        toast.success('Village pin removed.');
      }
    },
    onError: () => toast.error('Failed to save location'),
  });

  const saveResetMethods = useMutation({
    mutationFn: async () => {
      if (!currentVillage) return;
      if (!resetEmailEnabled && !resetOtpEnabled) {
        throw new Error('At least one password reset method must be enabled.');
      }
      const { error } = await (supabase as any)
        .from('villages')
        .update({
          reset_via_email_enabled: resetEmailEnabled,
          reset_via_otp_enabled: resetOtpEnabled,
        })
        .eq('id', currentVillage.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshVillage?.();
      queryClient.invalidateQueries({ queryKey: ['villages'] });
      toast.success('Password reset settings saved!');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to save reset settings'),
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
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
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
            <Label className="text-sm">Description</Label>
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

      {/* ── Password Recovery Methods ── (Super Admin only) */}
      <div className="vcp-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={16} className="text-primary" />
          <h2 className="font-semibold text-foreground">Password Recovery Methods</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Control which recovery options are shown to users on the "Forgot Password" page. At least one must stay enabled.
        </p>

        {!isSuperAdmin ? (
          <p className="text-xs text-muted-foreground italic">Only Super Admin can change recovery settings.</p>
        ) : (
          <div className="space-y-4">
            {/* Email Link Toggle */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-muted/40 border border-border">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Mail size={15} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Via Email Link</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sends a password reset link to the user's registered email address.
                  </p>
                </div>
              </div>
              <Switch
                checked={resetEmailEnabled}
                onCheckedChange={(val) => {
                  if (!val && !resetOtpEnabled) {
                    toast.error('At least one reset method must be enabled');
                    return;
                  }
                  setResetEmailEnabled(val);
                }}
                className="flex-shrink-0 mt-1"
              />
            </div>

            {/* Mobile OTP Toggle */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-muted/40 border border-border">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MessageSquare size={15} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Via Mobile OTP</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sends a 6-digit OTP to the user's registered mobile number via SMS.
                    Requires an SMS provider (Twilio / MSG91) to be configured.
                  </p>
                </div>
              </div>
              <Switch
                checked={resetOtpEnabled}
                onCheckedChange={(val) => {
                  if (!val && !resetEmailEnabled) {
                    toast.error('At least one reset method must be enabled');
                    return;
                  }
                  setResetOtpEnabled(val);
                }}
                className="flex-shrink-0 mt-1"
              />
            </div>

            {/* Save button */}
            <Button
              className="btn-primary-gradient"
              onClick={() => saveResetMethods.mutate()}
              disabled={saveResetMethods.isPending}
            >
              {saveResetMethods.isPending
                ? <><Loader2 size={14} className="mr-2 animate-spin" />Saving...</>
                : <><Save size={14} className="mr-2" />Save Recovery Settings</>
              }
            </Button>
          </div>
        )}
      </div>

      {/* Village Location Map — editable by admin + super_admin */}
      <div className="vcp-card p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-primary" />
            <h2 className="font-semibold text-foreground">Village Location on Map</h2>
          </div>
          {villageLat && villageLng && (
            <span className="text-xs text-success flex items-center gap-1 bg-success/10 border border-success/20 rounded-full px-2 py-0.5">
              <CheckCircle size={11} /> Location set
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Set the exact location of your village — this pin will show on the Village Map for all residents. <strong>Click</strong> on the map to place, <strong>drag</strong> to move, or <strong>remove</strong> the pin.
        </p>

        {!isAdmin ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            🔒 Only admins can set the village location.
          </div>
        ) : (
          <>
            {/* Coordinate inputs + geolocate */}
            <div className="flex items-end gap-2 mb-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Latitude</Label>
                <Input
                  value={latInput}
                  onChange={e => setLatInput(e.target.value)}
                  onBlur={handleManualInput}
                  placeholder="e.g. 14.4673"
                  className="mt-0.5 h-9 text-sm"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Longitude</Label>
                <Input
                  value={lngInput}
                  onChange={e => setLngInput(e.target.value)}
                  onBlur={handleManualInput}
                  placeholder="e.g. 78.8242"
                  className="mt-0.5 h-9 text-sm"
                />
              </div>
              <Button type="button" variant="outline" className="h-9 text-xs whitespace-nowrap" onClick={handleGeolocate}>
                <Navigation size={12} className="mr-1" /> My Location
              </Button>
              {(villageLat || villageLng) && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 text-xs whitespace-nowrap text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={handleRemovePin}
                >
                  <Trash2 size={12} className="mr-1" /> Remove
                </Button>
              )}
            </div>

            {/* Map */}
            <div className="rounded-xl overflow-hidden border border-border mb-3" style={{ height: 320, position: 'relative' }}>
              <MapContainer
                key={mapKey}
                center={mapCenter}
                zoom={villageLat ? 14 : 5}
                style={{ width: '100%', height: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler onPick={(la, lo) => {
                  setVillageLat(la);
                  setVillageLng(lo);
                  setLatInput(la.toFixed(6));
                  setLngInput(lo.toFixed(6));
                }} />
                {villageLat && villageLng && (
                  <>
                    <RecenterMap lat={villageLat} lng={villageLng} />
                    <Marker
                      position={[villageLat, villageLng]}
                      icon={villagePinIcon}
                      draggable={true}
                      eventHandlers={{
                        dragend(e) {
                          const pos = (e.target as L.Marker).getLatLng();
                          setVillageLat(pos.lat);
                          setVillageLng(pos.lng);
                          setLatInput(pos.lat.toFixed(6));
                          setLngInput(pos.lng.toFixed(6));
                        }
                      }}
                    />
                  </>
                )}
              </MapContainer>

              {/* Hint overlay */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[1000] bg-background/90 backdrop-blur-sm border border-border rounded-full px-3 py-1 text-xs text-muted-foreground pointer-events-none shadow whitespace-nowrap">
                {villageLat && villageLng
                  ? `📍 ${villageLat.toFixed(5)}, ${villageLng.toFixed(5)} — Drag pin to move`
                  : '👆 Click anywhere on the map to place village pin'}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                className="btn-primary-gradient flex-1"
                onClick={() => saveLocation.mutate()}
                disabled={saveLocation.isPending}
              >
                {saveLocation.isPending
                  ? <><Loader2 size={14} className="mr-2 animate-spin" />Saving...</>
                  : villageLat && villageLng
                    ? <><MapPin size={14} className="mr-2" />Save Village Location</>
                    : <><Trash2 size={14} className="mr-2" />Remove Village Pin</>
                }
              </Button>
            </div>
          </>
        )}
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
