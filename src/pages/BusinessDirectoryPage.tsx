import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVillage } from '@/contexts/VillageContext';
import {
  Building2, Plus, X, Phone, MapPin, Tag, Search, Loader2,
  CheckCircle, Navigation, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Fix Leaflet default icon in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CATEGORIES = ['Agriculture', 'Grocery', 'Medical', 'Education', 'Transportation', 'Construction', 'Textiles', 'Food & Catering', 'Electronics', 'Other'];

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], 15); }, [lat, lng, map]);
  return null;
}

const DEFAULT_LAT = 17.385;
const DEFAULT_LNG = 78.4867;

const BusinessDirectoryPage: React.FC = () => {
  const { user, role } = useAuth();
  const { currentVillage } = useVillage();
  const queryClient = useQueryClient();
  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'moderator';

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');

  // Form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [bizLat, setBizLat] = useState('');
  const [bizLng, setBizLng] = useState('');
  const [mapKey, setMapKey] = useState(0);

  const villageLat = Number(currentVillage?.latitude) || DEFAULT_LAT;
  const villageLng = Number(currentVillage?.longitude) || DEFAULT_LNG;
  const pickedLat = bizLat ? parseFloat(bizLat) : null;
  const pickedLng = bizLng ? parseFloat(bizLng) : null;
  const mapCenter: [number, number] = [pickedLat ?? villageLat, pickedLng ?? villageLng];

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['businesses', currentVillage?.id],
    enabled: !!currentVillage,
    queryFn: async () => {
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('village_id', currentVillage!.id)
        .order('is_verified', { ascending: false })
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const resetForm = () => {
    setShowForm(false); setName(''); setCategory(''); setDescription('');
    setPhone(''); setAddress(''); setOwnerName(''); setBizLat(''); setBizLng('');
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Business name is required');
      const { error } = await supabase.from('businesses').insert({
        village_id: currentVillage!.id,
        owner_id: user!.id,
        name,
        category: category || 'Other',
        description: description || null,
        phone: phone || null,
        address: address || null,
        owner_name: ownerName || null,
        is_verified: false,
        latitude: bizLat ? parseFloat(bizLat) : null,
        longitude: bizLng ? parseFloat(bizLng) : null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['map-businesses'] });
      toast.success('Business listed! Pending admin verification.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const verifyBusiness = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('businesses').update({ is_verified: true } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      toast.success('Business verified!');
    },
  });

  const filtered = (businesses as any[]).filter((b: any) => {
    const matchSearch = !search || b.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || b.category === filterCat;
    return matchSearch && matchCat;
  });

  const handleGeolocate = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { setBizLat(pos.coords.latitude.toFixed(6)); setBizLng(pos.coords.longitude.toFixed(6)); },
      () => toast.error('Could not get your location'),
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
            <Building2 size={20} className="text-secondary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Business Directory</h1>
            <p className="text-xs text-muted-foreground">Local businesses in {currentVillage?.name}</p>
          </div>
        </div>
        <Button size="sm" className="btn-primary-gradient" onClick={() => { setShowForm(!showForm); setMapKey(k => k + 1); }}>
          {showForm ? <X size={14} className="mr-1" /> : <Plus size={14} className="mr-1" />}
          {showForm ? 'Cancel' : 'List Business'}
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="vcp-card p-5 mb-5 animate-fade-in-up">
          <h3 className="font-semibold text-foreground mb-4">Add Your Business</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <Label className="text-sm">Business Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Business name" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Owner Name</Label>
              <Input value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Owner's name" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Phone</Label>
              <div className="relative mt-1">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Contact number" className="pl-8" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-sm">Address</Label>
              <div className="relative mt-1">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Full address" className="pl-8" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-sm">Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What does your business offer?" className="mt-1 resize-none" rows={2} />
            </div>
          </div>

          {/* Map Location Picker */}
          <div className="border border-border rounded-xl overflow-hidden mb-4">
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b border-border">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-primary" />
                <span className="text-sm font-medium text-foreground">Shop Location on Map</span>
                <span className="text-xs text-muted-foreground">(optional — helps customers find you)</span>
              </div>
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={handleGeolocate}>
                <Navigation size={11} className="mr-1" />Use My Location
              </Button>
            </div>

            {/* Coordinate readout */}
            <div className="flex gap-3 px-4 py-2 bg-muted/30 border-b border-border">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Latitude</Label>
                <Input value={bizLat} onChange={e => setBizLat(e.target.value)} placeholder="e.g. 14.4673" className="mt-0.5 h-8 text-sm" />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Longitude</Label>
                <Input value={bizLng} onChange={e => setBizLng(e.target.value)} placeholder="e.g. 78.8242" className="mt-0.5 h-8 text-sm" />
              </div>
            </div>

            {/* Map */}
            <div style={{ height: 240, position: 'relative' }}>
              <MapContainer
                key={mapKey}
                center={mapCenter}
                zoom={pickedLat ? 15 : 13}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler onPick={(la, lo) => { setBizLat(la.toFixed(6)); setBizLng(lo.toFixed(6)); }} />
                {pickedLat && pickedLng && (
                  <>
                    <RecenterMap lat={pickedLat} lng={pickedLng} />
                    <Marker
                      position={[pickedLat, pickedLng]}
                      draggable={true}
                      eventHandlers={{
                        dragend(e) {
                          const pos = (e.target as L.Marker).getLatLng();
                          setBizLat(pos.lat.toFixed(6));
                          setBizLng(pos.lng.toFixed(6));
                        }
                      }}
                    />
                  </>
                )}
              </MapContainer>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[500] bg-background/90 backdrop-blur-sm border border-border rounded-full px-3 py-1 text-xs text-muted-foreground pointer-events-none shadow">
                {pickedLat && pickedLng
                  ? `📍 Drag pin to fine-tune · ${pickedLat.toFixed(5)}, ${pickedLng.toFixed(5)}`
                  : '👆 Click map to pin your shop location'}
              </div>
            </div>
          </div>

          <Button className="btn-primary-gradient w-full" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
            Submit for Listing
          </Button>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search businesses..." className="pl-8" />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Business Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🏪</div>
          <p className="font-medium text-foreground">No businesses found</p>
          <p className="text-sm text-muted-foreground mt-1">Be the first to list your business!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((b: any) => (
            <div key={b.id} className="vcp-card p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm text-foreground">{b.name}</h4>
                    {b.is_verified && <CheckCircle size={14} className="text-success flex-shrink-0" />}
                  </div>
                  {b.owner_name && <p className="text-xs text-muted-foreground">{b.owner_name}</p>}
                </div>
                <span className="flex items-center gap-1 text-xs bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 border border-border whitespace-nowrap">
                  <Tag size={10} />{b.category}
                </span>
              </div>
              {b.description && <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">{b.description}</p>}
              <div className="space-y-1 text-xs text-muted-foreground">
                {b.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone size={11} className="text-primary" />
                    <a href={`tel:${b.phone}`} className="hover:text-primary">{b.phone}</a>
                  </div>
                )}
                {b.address && (
                  <div className="flex items-center gap-1.5">
                    <MapPin size={11} className="text-primary" />{b.address}
                  </div>
                )}
                {b.latitude && b.longitude && (
                  <a
                    href={`https://www.google.com/maps?q=${b.latitude},${b.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <ExternalLink size={11} />View on Google Maps
                  </a>
                )}
              </div>
              {isAdmin && !b.is_verified && (
                <Button size="sm" variant="outline" className="mt-3 w-full text-xs h-7 border-success text-success hover:bg-success/10"
                  onClick={() => verifyBusiness.mutate(b.id)}>
                  <CheckCircle size={12} className="mr-1" />Verify Business
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BusinessDirectoryPage;
