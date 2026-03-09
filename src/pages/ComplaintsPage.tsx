import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVillage } from '@/contexts/VillageContext';
import {
  AlertTriangle, Plus, X, Loader2, CheckCircle2, Clock, Circle,
  MapPin, ChevronDown, ChevronUp, Navigation, Map, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';


// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="
    background:hsl(0,80%,50%);border:2px solid white;border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);width:28px;height:28px;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 8px rgba(0,0,0,0.35);">
    <span style="transform:rotate(45deg);font-size:12px;">⚠️</span>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -32],
});

function MapPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

const STATUS_CONFIG = {
  reported: { label: 'Reported', color: 'bg-warning/15 text-yellow-700 border-warning/30', icon: <Circle size={12} /> },
  in_progress: { label: 'In Progress', color: 'bg-info/15 text-blue-700 border-info/30', icon: <Clock size={12} /> },
  resolved: { label: 'Resolved', color: 'bg-success/15 text-green-700 border-success/30', icon: <CheckCircle2 size={12} /> },
};

const CATEGORIES = ['Road', 'Water Supply', 'Electricity', 'Sanitation', 'Street Light', 'Drainage', 'Tree/Vegetation', 'Other'];

const DEFAULT_LAT = 17.385;
const DEFAULT_LNG = 78.4867;

const ComplaintsPage: React.FC = () => {
  const { user, profile, role } = useAuth();
  const { currentVillage } = useVillage();
  const queryClient = useQueryClient();
  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'moderator';

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [pinLat, setPinLat] = useState<number | null>(null);
  const [pinLng, setPinLng] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const mapCenterLat = currentVillage?.latitude ? Number(currentVillage.latitude) : DEFAULT_LAT;
  const mapCenterLng = currentVillage?.longitude ? Number(currentVillage.longitude) : DEFAULT_LNG;

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['complaints', currentVillage?.id, filterStatus],
    enabled: !!currentVillage,
    queryFn: async () => {
      let q = (supabase as any)
        .from('complaints')
        .select('*, profiles!complaints_reporter_id_fkey(full_name, mobile_number)')
        .eq('village_id', currentVillage!.id)
        .order('created_at', { ascending: false });
      if (filterStatus !== 'all') q = q.eq('status', filterStatus);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setTitle(''); setDescription(''); setCategory(''); setLocation('');
    setPinLat(null); setPinLng(null); setShowMapPicker(false);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !description.trim()) throw new Error('Fill all required fields');
      const { error } = await (supabase as any).from('complaints').insert({
        village_id: currentVillage!.id,
        reporter_id: user!.id,
        title,
        description,
        category: category || 'Other',
        location_tag: location || null,
        latitude: pinLat,
        longitude: pinLng,
        status: 'reported',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      toast.success('Complaint submitted!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, reporterId, complaintTitle }: { id: string; status: string; reporterId: string; complaintTitle: string }) => {
      const { error } = await (supabase as any).from('complaints').update({ status }).eq('id', id);
      if (error) throw error;
      // Send notification to reporter
      const statusLabel = status === 'in_progress' ? 'In Progress' : status === 'resolved' ? 'Resolved' : 'Reported';
      await (supabase as any).from('notifications').insert({
        user_id: reporterId,
        village_id: currentVillage!.id,
        type: 'complaint_update',
        title: 'Complaint Status Updated',
        message: `Your complaint "${complaintTitle}" is now marked as ${statusLabel}.`,
        reference_id: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      toast.success('Status updated & reporter notified');
    },
  });

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPinLat(pos.coords.latitude);
        setPinLng(pos.coords.longitude);
        setShowMapPicker(true);
        toast.success('Location detected!');
      },
      () => toast.error('Could not get your location')
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-warning/15 rounded-xl flex items-center justify-center">
            <AlertTriangle size={20} className="text-warning" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Complaints / ఫిర్యాదులు</h1>
            <p className="text-xs text-muted-foreground">Report issues to your village admin</p>
          </div>
        </div>
        <Button size="sm" className="btn-primary-gradient" onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}>
          {showForm ? <X size={14} className="mr-1" /> : <Plus size={14} className="mr-1" />}
          {showForm ? 'Cancel' : 'New Complaint'}
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="vcp-card p-5 mb-5 animate-fade-in-up">
          <h3 className="font-semibold text-foreground mb-4">Submit a Complaint</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief issue title..." className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Location name (optional)</Label>
                <div className="relative mt-1">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Street / Area name" className="pl-8" />
                </div>
              </div>
            </div>

            {/* Map pin section */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Map size={14} className="text-primary" />
                    Pin exact location on map
                    <span className="text-[10px] text-muted-foreground font-normal bg-muted px-1.5 py-0.5 rounded-full">optional</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {pinLat ? `📍 Pinned at ${pinLat.toFixed(5)}, ${pinLng?.toFixed(5)}` : 'Help admins find the exact spot'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    className="flex items-center gap-1 text-xs text-primary border border-primary/30 rounded-full px-2 py-1 hover:bg-primary/10 transition-colors"
                  >
                    <Navigation size={11} /> My Location
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(v => !v)}
                    className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-1 hover:bg-primary/20 transition-colors"
                  >
                    <Map size={11} /> {showMapPicker ? 'Hide Map' : 'Pick on Map'}
                  </button>
                  {pinLat && (
                    <button
                      type="button"
                      onClick={() => { setPinLat(null); setPinLng(null); }}
                      className="flex items-center gap-1 text-xs text-destructive border border-destructive/30 rounded-full px-2 py-1 hover:bg-destructive/10 transition-colors"
                    >
                      <X size={11} /> Clear
                    </button>
                  )}
                </div>
              </div>

              {showMapPicker && (
                <div className="rounded-lg overflow-hidden border border-border" style={{ height: 220 }}>
                  <MapContainer
                    center={[pinLat ?? mapCenterLat, pinLng ?? mapCenterLng]}
                    zoom={15}
                    style={{ width: '100%', height: '100%' }}
                    zoomControl={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapPicker onPick={(la, lo) => { setPinLat(la); setPinLng(lo); }} />
                    {pinLat && pinLng && (
                      <Marker position={[pinLat, pinLng]} icon={pinIcon} />
                    )}
                  </MapContainer>
                </div>
              )}
              {showMapPicker && !pinLat && (
                <p className="text-xs text-muted-foreground text-center">👆 Tap anywhere on the map to drop a pin</p>
              )}
            </div>

            <div>
              <Label className="text-sm">Description *</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe the issue in detail..."
                className="mt-1 resize-none"
                rows={3}
              />
            </div>
            <Button className="btn-primary-gradient w-full" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 size={14} className="mr-2 animate-spin" /> : null}
              Submit Complaint
            </Button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'reported', 'in_progress', 'resolved'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
              filterStatus === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-primary/50'
            )}
          >
            {s === 'all' ? 'All' : STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label}
          </button>
        ))}
      </div>

      {/* Complaints List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : complaints.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">✅</div>
          <p className="font-medium text-foreground">No complaints found</p>
          <p className="text-sm text-muted-foreground mt-1">Your village is doing great!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c: any) => {
            const statusCfg = STATUS_CONFIG[c.status as keyof typeof STATUS_CONFIG];
            const isExpanded = expanded === c.id;
            const hasPin = !!(c.latitude && c.longitude);
            return (
              <div key={c.id} className="vcp-card p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-warning/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle size={16} className="text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">{c.title}</h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {c.category && <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{c.category}</span>}
                          {c.location_tag && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin size={10} />{c.location_tag}
                            </span>
                          )}
                          {hasPin && (
                            <a
                              href={`https://www.google.com/maps?q=${c.latitude},${c.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary flex items-center gap-1 hover:underline"
                            >
                              <MapPin size={10} /> View on map
                            </a>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <span className={`flex items-center gap-1 border rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${statusCfg?.color}`}>
                        {statusCfg?.icon}{statusCfg?.label}
                      </span>
                    </div>

                    <button
                      onClick={() => setExpanded(isExpanded ? null : c.id)}
                      className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
                    >
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {isExpanded ? 'Hide details' : 'View details'}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-3 animate-fade-in-up">
                        <p className="text-sm text-muted-foreground leading-relaxed">{c.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Avatar className="w-5 h-5">
                            <AvatarFallback className="text-[10px] bg-muted">{c.profiles?.full_name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span>Reported by {c.profiles?.full_name}</span>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-2 pt-1">
                            {(['reported', 'in_progress', 'resolved'] as const).map(s => (
                              <button
                                key={s}
                                onClick={() => updateStatus.mutate({ id: c.id, status: s, reporterId: c.reporter_id, complaintTitle: c.title })}
                                disabled={c.status === s || updateStatus.isPending}
                                className={cn(
                                  'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                                  c.status === s
                                    ? STATUS_CONFIG[s].color + ' cursor-default'
                                    : 'border-border text-muted-foreground hover:border-primary/50'
                                )}
                              >
                                {STATUS_CONFIG[s].label}
                              </button>
                            ))}
                          </div>
                        )}
                        {isAdmin && (
                          <div className="pt-2 border-t border-border mt-2">
                            <button
                              onClick={() => setDeleteComplaintId(c.id)}
                              className="flex items-center gap-1 text-xs text-destructive hover:underline"
                            >
                              <Trash2 size={12} /> Delete complaint
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteComplaintId} onOpenChange={open => !open && setDeleteComplaintId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Complaint?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this complaint. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteComplaintId && deleteComplaintMutation.mutate(deleteComplaintId)}
              disabled={deleteComplaintMutation.isPending}
            >
              {deleteComplaintMutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ComplaintsPage;
