import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVillage } from '@/contexts/VillageContext';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Building2, AlertTriangle, Loader2, Eye, EyeOff, Move, Trash2, Save, X, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Fix Leaflet default icon broken in Vite/Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createIcon = (color: string, emoji: string) =>
  L.divIcon({
    className: '',
    html: `<div style="
      background:${color};border:2px solid white;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);width:32px;height:32px;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);">
      <span style="transform:rotate(45deg);font-size:14px;line-height:1;">${emoji}</span>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -36],
  });

const createDraggableIcon = (color: string, emoji: string) =>
  L.divIcon({
    className: '',
    html: `<div style="
      background:${color};border:3px solid white;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);width:38px;height:38px;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 3px 12px rgba(0,0,0,0.4);cursor:grab;">
      <span style="transform:rotate(45deg);font-size:16px;line-height:1;">${emoji}</span>
    </div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -42],
  });

const villageIcon = createIcon('hsl(142,70%,30%)', '🏘️');
const villageDraggableIcon = createDraggableIcon('hsl(142,70%,30%)', '🏘️');
const businessIcon = createIcon('hsl(280,60%,50%)', '🏪');
const complaintReportedIcon = createIcon('hsl(38,95%,50%)', '⚠️');
const complaintProgressIcon = createIcon('hsl(210,80%,50%)', '🔧');
const complaintResolvedIcon = createIcon('hsl(142,60%,42%)', '✅');

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], 14); }, [lat, lng, map]);
  return null;
}

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

const DEFAULT_LAT = 17.385;
const DEFAULT_LNG = 78.4867;

const MapPage: React.FC = () => {
  const { currentVillage, refreshVillage } = useVillage();
  const { role } = useAuth();
  const queryClient = useQueryClient();

  const [showBusinesses, setShowBusinesses] = useState(true);
  const [showComplaints, setShowComplaints] = useState(true);
  const [complaintStatusFilter, setComplaintStatusFilter] = useState<'all' | 'reported' | 'in_progress' | 'resolved'>('all');

  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'moderator';
  const [editingPin, setEditingPin] = useState(false);
  const [pendingLat, setPendingLat] = useState<number | null>(null);
  const [pendingLng, setPendingLng] = useState<number | null>(null);

  const lat = Number(currentVillage?.latitude) || DEFAULT_LAT;
  const lng = Number(currentVillage?.longitude) || DEFAULT_LNG;

  const { data: businesses = [], isLoading: loadingBusinesses } = useQuery({
    queryKey: ['map-businesses', currentVillage?.id],
    enabled: !!currentVillage,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, category, address, phone, is_verified, latitude, longitude')
        .eq('village_id', currentVillage!.id)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: complaints = [], isLoading: loadingComplaints } = useQuery({
    queryKey: ['map-complaints', currentVillage?.id],
    enabled: !!currentVillage,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('complaints')
        .select('id, title, category, status, location_tag, latitude, longitude')
        .eq('village_id', currentVillage!.id)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveLocation = useMutation({
    mutationFn: async ({ newLat, newLng }: { newLat: number | null; newLng: number | null }) => {
      if (!currentVillage) return;
      const { error } = await supabase
        .from('villages')
        .update({ latitude: newLat, longitude: newLng })
        .eq('id', currentVillage.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshVillage?.();
      queryClient.invalidateQueries({ queryKey: ['villages'] });
      toast.success('Village location saved!');
      setEditingPin(false);
      setPendingLat(null);
      setPendingLng(null);
    },
    onError: () => toast.error('Failed to save location'),
  });

  const handleStartEdit = () => {
    setPendingLat(currentVillage?.latitude ? Number(currentVillage.latitude) : null);
    setPendingLng(currentVillage?.longitude ? Number(currentVillage.longitude) : null);
    setEditingPin(true);
  };

  const handleCancelEdit = () => {
    setEditingPin(false);
    setPendingLat(null);
    setPendingLng(null);
  };

  const handleRemovePin = () => {
    saveLocation.mutate({ newLat: null, newLng: null });
  };

  const handleSavePin = () => {
    saveLocation.mutate({ newLat: pendingLat, newLng: pendingLng });
  };

  const isLoading = loadingBusinesses || loadingComplaints;

  const displayLat = editingPin ? (pendingLat ?? lat) : lat;
  const displayLng = editingPin ? (pendingLng ?? lng) : lng;
  const hasLocation = !!(currentVillage?.latitude && currentVillage?.longitude);

  const mappedBusinesses = businesses.filter(b => b.latitude && b.longitude);
  const mappedComplaints = complaints
    .filter((c: any) => c.latitude && c.longitude)
    .filter((c: any) => complaintStatusFilter === 'all' || c.status === complaintStatusFilter);

  const complaintIcon = (status: string) => {
    if (status === 'resolved') return complaintResolvedIcon;
    if (status === 'in_progress') return complaintProgressIcon;
    return complaintReportedIcon;
  };


  return (
    <div className="flex flex-col" style={{ height: '100%', minHeight: 0 }}>

      {/* Header */}
      <div className="px-4 py-3 bg-card border-b border-border flex items-center justify-between flex-shrink-0" style={{ position: 'relative', zIndex: 10 }}>
        <div className="flex items-center gap-2">
          <MapPin size={20} className="text-primary" />
          <div>
            <h1 className="font-bold text-foreground text-sm">Village Map</h1>
            {currentVillage && (
              <p className="text-xs text-muted-foreground">{currentVillage.name} · {currentVillage.district}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
          {hasLocation ? (
            <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
              📍 Location set
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground bg-muted border border-border rounded-full px-2 py-0.5">
              📍 Approx. location
            </span>
          )}
          {isAdmin && !editingPin && (
            <button
              onClick={handleStartEdit}
              className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 hover:bg-primary/20 transition-colors"
              title="Move/remove village pin"
            >
              <Move size={10} /> Edit Pin
            </button>
          )}
        </div>
      </div>

      {/* Admin pin editing toolbar */}
      {editingPin && (
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b border-primary/20 flex-shrink-0" style={{ position: 'relative', zIndex: 10 }}>
          <Move size={13} className="text-primary flex-shrink-0" />
          <p className="text-xs text-primary font-medium flex-1">
            {pendingLat ? 'Drag the pin or click map to move it' : 'Click on the map to place the village pin'}
          </p>
          {hasLocation && (
            <button
              onClick={handleRemovePin}
              disabled={saveLocation.isPending}
              className="flex items-center gap-1 text-[10px] text-destructive border border-destructive/30 rounded-full px-2 py-0.5 hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={10} /> Remove
            </button>
          )}
          <button
            onClick={handleSavePin}
            disabled={saveLocation.isPending || !pendingLat || !pendingLng}
            className="flex items-center gap-1 text-[10px] bg-primary text-primary-foreground rounded-full px-2 py-0.5 hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saveLocation.isPending ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
            Save
          </button>
          <button
            onClick={handleCancelEdit}
            className="flex items-center gap-1 text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5 hover:bg-muted transition-colors"
          >
            <X size={10} /> Cancel
          </button>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-card border-b border-border overflow-x-auto flex-shrink-0" style={{ position: 'relative', zIndex: 10 }}>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-primary inline-block" />
          Village Centre
        </div>
        <div className="w-px h-3 bg-border" />
        <button
          onClick={() => setShowComplaints(v => !v)}
          className={cn(
            "flex items-center gap-1.5 text-xs whitespace-nowrap px-2 py-1 rounded-full border transition-colors",
            showComplaints ? "bg-yellow-50 text-yellow-800 border-yellow-200" : "text-muted-foreground border-transparent"
          )}
        >
          {showComplaints ? <Eye size={11} /> : <EyeOff size={11} />}
          <AlertTriangle size={11} className="ml-0.5" /> {mappedComplaints.length} Complaints
        </button>
        {/* Complaint status sub-filters — only visible when complaints are shown */}
        {showComplaints && (
          <>
            <div className="w-px h-3 bg-border" />
            {(['all', 'reported', 'in_progress', 'resolved'] as const).map(s => {
              const labels = { all: 'All', reported: '⚠️', in_progress: '🔧', resolved: '✅' };
              const active = complaintStatusFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setComplaintStatusFilter(s)}
                  className={cn(
                    "text-[10px] whitespace-nowrap px-2 py-0.5 rounded-full border transition-colors",
                    active ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border hover:border-primary/40"
                  )}
                >
                  {labels[s]} {s !== 'all' ? '' : ''}
                </button>
              );
            })}
            <div className="w-px h-3 bg-border" />
          </>
        )}
        <button
          onClick={() => setShowBusinesses(v => !v)}
          className={cn(
            "flex items-center gap-1.5 text-xs whitespace-nowrap px-2 py-1 rounded-full border transition-colors",
            showBusinesses ? "bg-purple-50 text-purple-800 border-purple-200" : "text-muted-foreground border-transparent"
          )}
        >
          {showBusinesses ? <Eye size={11} /> : <EyeOff size={11} />}
          <Building2 size={11} className="ml-0.5" /> {mappedBusinesses.length} Businesses
        </button>
        <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap">
          <Info size={10} />
          Only pinned
        </div>
      </div>


      {/* Map */}
      <div className="flex-1" style={{ minHeight: 0, position: 'relative', zIndex: 0 }}>
        {!currentVillage ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <MapPin size={40} className="opacity-30" />
            <p className="text-sm">No village selected</p>
          </div>
        ) : (
          <MapContainer
            center={[displayLat, displayLng]}
            zoom={14}
            style={{ width: '100%', height: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RecenterMap lat={displayLat} lng={displayLng} />

            {editingPin && (
              <MapClickHandler onPick={(la, lo) => {
                setPendingLat(la);
                setPendingLng(lo);
              }} />
            )}

            {/* Village centre pin — always visible */}
            {(editingPin ? (pendingLat && pendingLng) : true) && (
              <Marker
                position={[
                  editingPin ? (pendingLat ?? displayLat) : displayLat,
                  editingPin ? (pendingLng ?? displayLng) : displayLng,
                ]}
                icon={editingPin ? villageDraggableIcon : villageIcon}
                draggable={editingPin}
                eventHandlers={editingPin ? {
                  dragend(e) {
                    const pos = (e.target as L.Marker).getLatLng();
                    setPendingLat(pos.lat);
                    setPendingLng(pos.lng);
                  }
                } : {}}
              >
                <Popup>
                  <div className="p-1">
                    <p className="font-bold text-sm">{currentVillage.name}</p>
                    <p className="text-xs text-gray-500">{currentVillage.district}, {currentVillage.state}</p>
                    {currentVillage.population && (
                      <p className="text-xs mt-1">👥 {currentVillage.population.toLocaleString()} residents</p>
                    )}
                    {editingPin ? (
                      <p className="text-xs text-blue-600 mt-1">🖱️ Drag to move pin</p>
                    ) : hasLocation ? (
                      <p className="text-xs text-green-600 mt-1">📍 Exact location</p>
                    ) : (
                      <p className="text-xs text-orange-500 mt-1">📍 Approximate location</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Businesses — only those with real GPS coordinates */}
            {showBusinesses && mappedBusinesses.map((b) => (
              <Marker
                key={b.id}
                position={[Number(b.latitude), Number(b.longitude)]}
                icon={businessIcon}
              >
                <Popup>
                  <div className="p-1 min-w-[160px]">
                    <div className="flex items-center gap-1 mb-1">
                      <p className="font-semibold text-sm">{b.name}</p>
                      {b.is_verified && <span className="text-green-600 text-xs">✓</span>}
                    </div>
                    <p className="text-xs text-gray-500 mb-1">🏷️ {b.category}</p>
                    {b.address && <p className="text-xs text-gray-500 mb-1">📍 {b.address}</p>}
                    {b.phone && <p className="text-xs text-gray-500 mb-1">📞 {b.phone}</p>}
                    <a
                      href={`https://www.google.com/maps?q=${b.latitude},${b.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 underline mt-1 block"
                    >
                      Open in Google Maps
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Complaints — only those with real GPS coordinates */}
            {showComplaints && mappedComplaints.map((c: any) => (
              <Marker
                key={c.id}
                position={[Number(c.latitude), Number(c.longitude)]}
                icon={complaintIcon(c.status)}
              >
                <Popup>
                  <div className="p-1 min-w-[160px]">
                    <p className="font-semibold text-sm leading-tight mb-1">{c.title}</p>
                    <p className="text-xs text-gray-500 mb-1">📂 {c.category}</p>
                    {c.location_tag && <p className="text-xs text-gray-500 mb-1">📍 {c.location_tag}</p>}
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${
                      c.status === 'resolved' ? 'bg-green-50 text-green-700 border-green-200' :
                      c.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}>
                      {c.status.replace('_', ' ')}
                    </span>
                    <a
                      href={`https://www.google.com/maps?q=${c.latitude},${c.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 underline mt-1 block"
                    >
                      View on Google Maps
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-2 bg-card border-t border-border flex-shrink-0" style={{ position: 'relative', zIndex: 10 }}>
        <div className="flex items-center gap-4 overflow-x-auto">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Legend</p>
          {[
            { color: 'hsl(142,70%,30%)', label: 'Village', emoji: '🏘️' },
            { color: 'hsl(38,95%,50%)', label: 'Reported', emoji: '⚠️' },
            { color: 'hsl(210,80%,50%)', label: 'In Progress', emoji: '🔧' },
            { color: 'hsl(142,60%,42%)', label: 'Resolved', emoji: '✅' },
            { color: 'hsl(280,60%,50%)', label: 'Business', emoji: '🏪' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1 whitespace-nowrap">
              <div className="w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[8px]"
                style={{ background: item.color }}>
                {item.emoji}
              </div>
              <span className="text-[10px] text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapPage;

