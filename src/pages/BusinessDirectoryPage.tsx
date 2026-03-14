import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVillage } from '@/contexts/VillageContext';
import {
  Building2, Plus, X, Phone, MapPin, Tag, Search, Loader2,
  CheckCircle, Navigation, ExternalLink, Map, Trash2, ImagePlus,
  Pencil, Camera, Link2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { compressImages } from '@/lib/imageCompression';
import MediaLightbox, { MediaItem } from '@/components/MediaLightbox';

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

// ---- Business Form (shared by create & edit) ----
interface BizFormData {
  name: string; ownerName: string; category: string;
  description: string; phone: string; address: string;
  bizLat: string; bizLng: string;
}
const emptyForm: BizFormData = { name: '', ownerName: '', category: '', description: '', phone: '', address: '', bizLat: '', bizLng: '' };

const BusinessDirectoryPage: React.FC = () => {
  const { user, role, profile } = useAuth();
  const { currentVillage } = useVillage();
  const queryClient = useQueryClient();
  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'moderator';
  // Only admin/super_admin can delete businesses (not moderator)
  const canDeleteBusiness = role === 'admin' || role === 'super_admin';

  const [showForm, setShowForm] = useState(false);
  const [editingBiz, setEditingBiz] = useState<any | null>(null);
  const [form, setForm] = useState<BizFormData>(emptyForm);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [deleteBusinessId, setDeleteBusinessId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ items: MediaItem[]; index: number } | null>(null);
  const [mapKey, setMapKey] = useState(0);

  // Image upload state
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setField = (k: keyof BizFormData) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const villageLat = Number(currentVillage?.latitude) || DEFAULT_LAT;
  const villageLng = Number(currentVillage?.longitude) || DEFAULT_LNG;
  const pickedLat = form.bizLat ? parseFloat(form.bizLat) : null;
  const pickedLng = form.bizLng ? parseFloat(form.bizLng) : null;
  const mapCenter: [number, number] = [pickedLat ?? villageLat, pickedLng ?? villageLng];

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['businesses', currentVillage?.id],
    enabled: !!currentVillage,
    queryFn: async () => {
      const { data } = await supabase
        .from('businesses')
        .select('*, profiles!businesses_owner_id_fkey(full_name, avatar_url)')
        .eq('village_id', currentVillage!.id)
        .order('is_verified', { ascending: false })
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const resetForm = () => {
    setShowForm(false); setEditingBiz(null); setForm(emptyForm);
    imagePreviews.forEach(u => URL.revokeObjectURL(u));
    setImageFiles([]); setImagePreviews([]);
  };

  const startEdit = (b: any) => {
    setEditingBiz(b);
    setForm({
      name: b.name, ownerName: b.owner_name ?? '', category: b.category,
      description: b.description ?? '', phone: b.phone ?? '',
      address: b.address ?? '',
      bizLat: b.latitude ? String(b.latitude) : '',
      bizLng: b.longitude ? String(b.longitude) : '',
    });
    setImageFiles([]); setImagePreviews([]);
    setShowForm(false);
    setMapKey(k => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 5 - imageFiles.length);
    if (!files.length) return;
    const valid = files.filter(f => f.size <= 10 * 1024 * 1024);
    if (valid.length < files.length) toast.error('Some files exceed 10MB and were skipped');
    setImageFiles(prev => [...prev, ...valid].slice(0, 5));
    setImagePreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (i: number) => {
    URL.revokeObjectURL(imagePreviews[i]);
    setImageFiles(f => f.filter((_, idx) => idx !== i));
    setImagePreviews(p => p.filter((_, idx) => idx !== i));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (!imageFiles.length) return [];
    setUploadingImages(true);
    const compressed = await compressImages(imageFiles, 'post');
    const urls: string[] = [];
    for (const file of compressed) {
      const path = `${user!.id}/businesses/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
      const { error } = await supabase.storage.from('post-media').upload(path, file, { upsert: false });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from('post-media').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    setUploadingImages(false);
    return urls;
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Business name is required');
      const newImageUrls = await uploadImages();
      const { error } = await supabase.from('businesses').insert({
        village_id: currentVillage!.id,
        owner_id: user!.id,
        name: form.name,
        category: form.category || 'Other',
        description: form.description || null,
        phone: form.phone || null,
        address: form.address || null,
        owner_name: form.ownerName || null,
        is_verified: false,
        latitude: form.bizLat ? parseFloat(form.bizLat) : null,
        longitude: form.bizLng ? parseFloat(form.bizLng) : null,
        image_urls: newImageUrls,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      toast.success('Business listed! Pending admin verification.');
    },
    onError: (e: Error) => { setUploadingImages(false); toast.error(e.message); },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingBiz || !form.name.trim()) throw new Error('Business name is required');
      const newImageUrls = await uploadImages();
      const existingUrls: string[] = editingBiz.image_urls ?? [];
      const { error } = await supabase.from('businesses').update({
        name: form.name,
        category: form.category || 'Other',
        description: form.description || null,
        phone: form.phone || null,
        address: form.address || null,
        owner_name: form.ownerName || null,
        latitude: form.bizLat ? parseFloat(form.bizLat) : null,
        longitude: form.bizLng ? parseFloat(form.bizLng) : null,
        image_urls: [...existingUrls, ...newImageUrls],
      } as any).eq('id', editingBiz.id);
      if (error) throw error;
    },
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      toast.success('Business updated!');
    },
    onError: (e: Error) => { setUploadingImages(false); toast.error(e.message); },
  });

  const verifyBusiness = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('businesses').update({ is_verified: true } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['businesses'] }); toast.success('Business verified!'); },
  });

  const deleteBusiness = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('businesses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      setDeleteBusinessId(null);
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      toast.success('Business removed');
    },
    onError: (e: Error) => toast.error(e.message),
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
      pos => { setField('bizLat')(pos.coords.latitude.toFixed(6)); setField('bizLng')(pos.coords.longitude.toFixed(6)); },
      () => toast.error('Could not get your location'),
    );
  };

  const canEdit = (b: any) => isAdmin || b.owner_id === user?.id;

  const isMutating = createMutation.isPending || editMutation.isPending || uploadingImages;

  // ---- Shared form UI ----
  const renderForm = (isEdit: boolean) => (
    <div className={cn("vcp-card p-5 mb-5 animate-fade-in-up", isEdit && "border-2 border-primary/30")}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">{isEdit ? 'Edit Business' : 'Add Your Business'}</h3>
        <Button size="sm" variant="ghost" onClick={resetForm}><X size={14} /></Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <Label className="text-sm">Business Name *</Label>
          <Input value={form.name} onChange={e => setField('name')(e.target.value)} placeholder="Business name" className="mt-1" />
        </div>
        <div>
          <Label className="text-sm">Owner Name</Label>
          <div className="relative mt-1">
            <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={form.ownerName} onChange={e => setField('ownerName')(e.target.value)} placeholder="Owner's name" className="pl-8" />
          </div>
        </div>
        <div>
          <Label className="text-sm">Category</Label>
          <Select value={form.category} onValueChange={setField('category')}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm">Phone</Label>
          <div className="relative mt-1">
            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={form.phone} onChange={e => setField('phone')(e.target.value)} placeholder="Contact number" className="pl-8" />
          </div>
        </div>
        <div className="sm:col-span-2">
          <Label className="text-sm">Address</Label>
          <div className="relative mt-1">
            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={form.address} onChange={e => setField('address')(e.target.value)} placeholder="Full address" className="pl-8" />
          </div>
        </div>
        <div className="sm:col-span-2">
          <Label className="text-sm">Description</Label>
          <Textarea value={form.description} onChange={e => setField('description')(e.target.value)} placeholder="What does your business offer?" className="mt-1 resize-none" rows={2} />
        </div>
      </div>

      {/* Photos upload */}
      <div className="mb-4">
        <Label className="text-sm mb-2 block">Business Photos</Label>
        <div className="flex flex-wrap gap-2">
          {/* Existing photos (edit mode) */}
          {isEdit && (editingBiz?.image_urls ?? []).map((url: string, i: number) => (
            <div key={url} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-border">
              <img src={url} alt="" className="w-full h-full object-cover cursor-pointer"
                onClick={() => setLightbox({ items: (editingBiz.image_urls ?? []).map((u: string) => ({ url: u, type: 'image' as const })), index: i })} />
            </div>
          ))}
          {/* New previews */}
          {imagePreviews.map((src, i) => (
            <div key={i} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-border">
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} className="text-white" />
              </button>
            </div>
          ))}
          {/* Add button */}
          {imageFiles.length < 5 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            >
              <Camera size={18} />
              <span className="text-xs">Add</span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">Up to 5 photos · Auto-compressed</p>
      </div>

      {/* Map Location Picker */}
      <div className="border border-border rounded-xl overflow-hidden mb-4">
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-primary" />
            <span className="text-sm font-medium text-foreground">Shop Location</span>
            <span className="text-xs text-muted-foreground">(optional)</span>
          </div>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={handleGeolocate}>
            <Navigation size={11} className="mr-1" />Use My Location
          </Button>
        </div>
        <div className="flex gap-3 px-4 py-2 bg-muted/30 border-b border-border">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Latitude</Label>
            <Input value={form.bizLat} onChange={e => setField('bizLat')(e.target.value)} placeholder="e.g. 14.4673" className="mt-0.5 h-8 text-sm" />
          </div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Longitude</Label>
            <Input value={form.bizLng} onChange={e => setField('bizLng')(e.target.value)} placeholder="e.g. 78.8242" className="mt-0.5 h-8 text-sm" />
          </div>
        </div>
        <div style={{ height: 220, position: 'relative' }}>
          <MapContainer
            key={mapKey}
            center={mapCenter}
            zoom={pickedLat ? 15 : 13}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          >
            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapClickHandler onPick={(la, lo) => { setField('bizLat')(la.toFixed(6)); setField('bizLng')(lo.toFixed(6)); }} />
            {pickedLat && pickedLng && (
              <>
                <RecenterMap lat={pickedLat} lng={pickedLng} />
                <Marker
                  position={[pickedLat, pickedLng]}
                  draggable={true}
                  eventHandlers={{
                    dragend(e) {
                      const pos = (e.target as L.Marker).getLatLng();
                      setField('bizLat')(pos.lat.toFixed(6));
                      setField('bizLng')(pos.lng.toFixed(6));
                    }
                  }}
                />
              </>
            )}
          </MapContainer>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[500] bg-background/90 backdrop-blur-sm border border-border rounded-full px-3 py-1 text-xs text-muted-foreground pointer-events-none shadow">
            {pickedLat && pickedLng ? `📍 ${pickedLat.toFixed(4)}, ${pickedLng.toFixed(4)}` : '👆 Click map to pin location'}
          </div>
        </div>
      </div>

      <Button
        className="btn-primary-gradient w-full"
        onClick={() => isEdit ? editMutation.mutate() : createMutation.mutate()}
        disabled={isMutating}
      >
        {isMutating && <Loader2 size={14} className="mr-2 animate-spin" />}
        {isEdit ? 'Save Changes' : 'Submit for Listing'}
      </Button>
    </div>
  );

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
        <Button size="sm" className="btn-primary-gradient" onClick={() => { setShowForm(!showForm); setEditingBiz(null); setForm(emptyForm); setMapKey(k => k + 1); }}>
          {showForm ? <X size={14} className="mr-1" /> : <Plus size={14} className="mr-1" />}
          {showForm ? 'Cancel' : 'List Business'}
        </Button>
      </div>

      {/* Create Form */}
      {showForm && !editingBiz && renderForm(false)}

      {/* Edit Form */}
      {editingBiz && renderForm(true)}

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
          {filtered.map((b: any) => {
            const bizImages: MediaItem[] = (b.image_urls ?? []).map((u: string) => ({ url: u, type: 'image' as const }));
            return (
              <div key={b.id} className="vcp-card overflow-hidden">
                {/* Photo strip */}
                {bizImages.length > 0 && (
                  <div className={cn(
                    "relative overflow-hidden",
                    bizImages.length === 1 ? "h-44" : "h-36 grid gap-0.5",
                    bizImages.length === 2 && "grid-cols-2",
                    bizImages.length >= 3 && "grid-cols-3",
                  )}>
                    {bizImages.slice(0, 3).map((item, i) => (
                      <div
                        key={i}
                        className="relative overflow-hidden cursor-pointer group"
                        style={{ height: bizImages.length === 1 ? '100%' : undefined }}
                        onClick={() => setLightbox({ items: bizImages, index: i })}
                      >
                        <img src={item.url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                        {i === 2 && bizImages.length > 3 && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">+{bizImages.length - 3}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-start gap-2.5">
                      {/* Owner avatar */}
                      {b.profiles && (
                        <Avatar className="w-8 h-8 flex-shrink-0 mt-0.5">
                          <AvatarImage src={b.profiles?.avatar_url ?? ''} />
                          <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                            {b.profiles?.full_name?.charAt(0) ?? '?'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-semibold text-sm text-foreground">{b.name}</h4>
                          {b.is_verified && <CheckCircle size={13} className="text-success flex-shrink-0" />}
                        </div>
                        {b.owner_name && <p className="text-xs text-muted-foreground">{b.owner_name}</p>}
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-xs bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 border border-border whitespace-nowrap flex-shrink-0">
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
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <ExternalLink size={11} />View on Google Maps
                      </a>
                    )}
                  </div>

                  {/* Creator info */}
                  {b.profiles && (
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
                      <span>Added by</span>
                      <span className="font-medium text-foreground">{b.profiles.full_name}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    {canEdit(b) && (
                      <Button size="sm" variant="outline" className="flex-1 text-xs h-7"
                        onClick={() => startEdit(b)}>
                        <Pencil size={12} className="mr-1" />Edit
                      </Button>
                    )}
                    {isAdmin && !b.is_verified && (
                      <Button size="sm" variant="outline" className="flex-1 text-xs h-7 border-success text-success hover:bg-success/10"
                        onClick={() => verifyBusiness.mutate(b.id)}>
                        <CheckCircle size={12} className="mr-1" />Verify
                      </Button>
                    )}
                    {canDeleteBusiness && (
                      <Button size="sm" variant="outline" className="text-xs h-7 border-destructive text-destructive hover:bg-destructive/10 px-2"
                        onClick={() => setDeleteBusinessId(b.id)}>
                        <Trash2 size={12} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* All Businesses Map */}
      {!isLoading && businesses.length > 0 && (() => {
        const mappedBizs = (businesses as any[]).filter((b: any) => b.latitude && b.longitude);
        if (mappedBizs.length === 0) return null;
        const centerLat = mappedBizs.reduce((s: number, b: any) => s + Number(b.latitude), 0) / mappedBizs.length;
        const centerLng = mappedBizs.reduce((s: number, b: any) => s + Number(b.longitude), 0) / mappedBizs.length;
        return (
          <div className="vcp-card overflow-hidden mt-6">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/40">
              <Map size={15} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">Businesses on Map</span>
              <span className="ml-auto text-xs text-muted-foreground">{mappedBizs.length} location{mappedBizs.length !== 1 ? 's' : ''} pinned</span>
            </div>
            <div style={{ height: 360, position: 'relative' }}>
              <MapContainer
                center={[centerLat, centerLng]} zoom={14}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {mappedBizs.map((b: any) => (
                  <Marker key={b.id} position={[Number(b.latitude), Number(b.longitude)]}>
                    <Popup>
                      <div style={{ minWidth: 140 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{b.name} {b.is_verified && '✓'}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>{b.category}</div>
                        {b.owner_name && <div style={{ fontSize: 11, color: '#6b7280' }}>{b.owner_name}</div>}
                        {b.phone && <a href={`tel:${b.phone}`} style={{ fontSize: 11, color: '#2563eb', display: 'block', marginTop: 4 }}>{b.phone}</a>}
                        {b.address && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{b.address}</div>}
                        <a href={`https://www.google.com/maps?q=${b.latitude},${b.longitude}`} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 11, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <ExternalLink size={10} />Open in Maps
                        </a>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        );
      })()}

      {/* Lightbox */}
      {lightbox && <MediaLightbox items={lightbox.items} initialIndex={lightbox.index} onClose={() => setLightbox(null)} />}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteBusinessId} onOpenChange={open => !open && setDeleteBusinessId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Business?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this business listing.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteBusinessId && deleteBusiness.mutate(deleteBusinessId)}
              disabled={deleteBusiness.isPending}
            >
              {deleteBusiness.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BusinessDirectoryPage;
