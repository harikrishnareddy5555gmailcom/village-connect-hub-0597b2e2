import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVillage } from '@/contexts/VillageContext';
import { Settings, Globe, Save, Loader2, MapPin, Users, Navigation, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

// Fix Leaflet icons in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
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
  const { role } = useAuth();
  const { currentVillage, refreshVillage } = useVillage();
  const queryClient = useQueryClient();
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin' || isSuperAdmin;

  const [name, setName] = useState(currentVillage?.name ?? '');
  const [description, setDescription] = useState(currentVillage?.description ?? '');
  const [district, setDistrict] = useState(currentVillage?.district ?? '');
  const [state, setState] = useState(currentVillage?.state ?? '');
  const [population, setPopulation] = useState(String(currentVillage?.population ?? ''));

  // Location state
  const [villageLat, setVillageLat] = useState(currentVillage?.latitude?.toString() ?? '');
  const [villageLng, setVillageLng] = useState(currentVillage?.longitude?.toString() ?? '');
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    if (currentVillage) {
      setName(currentVillage.name);
      setDescription(currentVillage.description ?? '');
      setDistrict(currentVillage.district);
      setState(currentVillage.state);
      setPopulation(String(currentVillage.population ?? ''));
      setVillageLat(currentVillage.latitude?.toString() ?? '');
      setVillageLng(currentVillage.longitude?.toString() ?? '');
      setMapKey(k => k + 1);
    }
  }, [currentVillage?.id]);

  const pickedLat = villageLat ? parseFloat(villageLat) : null;
  const pickedLng = villageLng ? parseFloat(villageLng) : null;
  const mapCenter: [number, number] = [
    pickedLat ?? DEFAULT_LAT,
    pickedLng ?? DEFAULT_LNG,
  ];

  const handleGeolocate = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setVillageLat(pos.coords.latitude.toFixed(6));
        setVillageLng(pos.coords.longitude.toFixed(6));
      },
      () => toast.error('Could not get your location'),
    );
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
          latitude: villageLat ? parseFloat(villageLat) : null,
          longitude: villageLng ? parseFloat(villageLng) : null,
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
        .update({
          latitude: villageLat ? parseFloat(villageLat) : null,
          longitude: villageLng ? parseFloat(villageLng) : null,
        })
        .eq('id', currentVillage.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshVillage?.();
      queryClient.invalidateQueries({ queryKey: ['villages'] });
      toast.success('Village location saved! It now shows accurately on the map.');
    },
    onError: () => toast.error('Failed to save location'),
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

      {/* Village Location Map — editable by admin + super_admin */}
      <div className="vcp-card p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-primary" />
            <h2 className="font-semibold text-foreground">Village Location on Map</h2>
          </div>
          {pickedLat && pickedLng && (
            <span className="text-xs text-success flex items-center gap-1 bg-success/10 border border-success/20 rounded-full px-2 py-0.5">
              <CheckCircle size={11} /> Location set
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Set the exact location of your village — this pin will show on the Village Map for all residents and helps everyone find businesses and complaints accurately.
        </p>

        {!isAdmin ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            🔒 Only admins can set the village location.
          </div>
        ) : (
          <>
            {/* Coordinate inputs + geolocate */}
            <div className="flex items-end gap-3 mb-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Latitude</Label>
                <Input
                  value={villageLat}
                  onChange={e => setVillageLat(e.target.value)}
                  placeholder="e.g. 14.4673"
                  className="mt-0.5 h-9 text-sm"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Longitude</Label>
                <Input
                  value={villageLng}
                  onChange={e => setVillageLng(e.target.value)}
                  placeholder="e.g. 78.8242"
                  className="mt-0.5 h-9 text-sm"
                />
              </div>
              <Button type="button" variant="outline" className="h-9 text-xs whitespace-nowrap" onClick={handleGeolocate}>
                <Navigation size={12} className="mr-1" /> My Location
              </Button>
            </div>

            {/* Map */}
            <div className="rounded-xl overflow-hidden border border-border mb-3" style={{ height: 300, position: 'relative' }}>
              <MapContainer
                key={mapKey}
                center={mapCenter}
                zoom={pickedLat ? 14 : 5}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler onPick={(la, lo) => {
                  setVillageLat(la.toFixed(6));
                  setVillageLng(lo.toFixed(6));
                }} />
                {pickedLat && pickedLng && (
                  <>
                    <RecenterMap lat={pickedLat} lng={pickedLng} />
                    <Marker position={[pickedLat, pickedLng]} />
                  </>
                )}
              </MapContainer>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[1000] bg-background/90 backdrop-blur-sm border border-border rounded-full px-3 py-1 text-xs text-muted-foreground pointer-events-none shadow">
                {pickedLat && pickedLng
                  ? `📍 ${pickedLat.toFixed(5)}, ${pickedLng.toFixed(5)}`
                  : '👆 Click anywhere on the map to set village location'}
              </div>
            </div>

            <Button
              className="btn-primary-gradient w-full"
              onClick={() => saveLocation.mutate()}
              disabled={saveLocation.isPending || (!villageLat && !villageLng)}
            >
              {saveLocation.isPending
                ? <><Loader2 size={14} className="mr-2 animate-spin" />Saving...</>
                : <><MapPin size={14} className="mr-2" />Save Village Location</>}
            </Button>
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
