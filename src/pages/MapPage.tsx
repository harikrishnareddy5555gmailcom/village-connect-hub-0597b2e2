import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVillage } from '@/contexts/VillageContext';
import { MapPin, AlertTriangle, Building2, Loader2, Layers, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Fix Leaflet default icon broken in Vite/Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom colored icons
const createIcon = (color: string, emoji: string) =>
  L.divIcon({
    className: '',
    html: `<div style="
      background: ${color};
      border: 2px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">
      <span style="transform: rotate(45deg); font-size: 14px; line-height: 1;">${emoji}</span>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -36],
  });

const villageIcon = createIcon('hsl(142 70% 30%)', '🏘️');
const complaintReportedIcon = createIcon('hsl(38 95% 50%)', '⚠️');
const complaintResolvedIcon = createIcon('hsl(142 60% 42%)', '✅');
const complaintProgressIcon = createIcon('hsl(210 80% 50%)', '🔧');
const businessIcon = createIcon('hsl(280 60% 50%)', '🏪');

const STATUS_COLORS: Record<string, string> = {
  reported: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
};

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 14);
  }, [lat, lng, map]);
  return null;
}

const DEFAULT_LAT = 17.385; // Hyderabad area fallback
const DEFAULT_LNG = 78.4867;

const MapPage: React.FC = () => {
  const { currentVillage } = useVillage();
  const [showComplaints, setShowComplaints] = useState(true);
  const [showBusinesses, setShowBusinesses] = useState(true);

  const lat = Number(currentVillage?.latitude) || DEFAULT_LAT;
  const lng = Number(currentVillage?.longitude) || DEFAULT_LNG;

  const { data: complaints = [], isLoading: loadingComplaints } = useQuery({
    queryKey: ['map-complaints', currentVillage?.id],
    enabled: !!currentVillage,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('complaints')
        .select('id, title, category, status, location_tag, created_at')
        .eq('village_id', currentVillage!.id)
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: businesses = [], isLoading: loadingBusinesses } = useQuery({
    queryKey: ['map-businesses', currentVillage?.id],
    enabled: !!currentVillage,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, category, address, phone, is_verified')
        .eq('village_id', currentVillage!.id)
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const isLoading = loadingComplaints || loadingBusinesses;

  // Generate scatter positions around the village center for items without coords
  const getScatterPos = (index: number, total: number, type: 'complaint' | 'business') => {
    const radius = 0.008 + (index % 3) * 0.003;
    const angle = (index / Math.max(total, 1)) * 2 * Math.PI + (type === 'business' ? Math.PI / 4 : 0);
    return {
      lat: lat + radius * Math.cos(angle),
      lng: lng + radius * Math.sin(angle),
    };
  };

  const complaintIcon = (status: string) => {
    if (status === 'resolved') return complaintResolvedIcon;
    if (status === 'in_progress') return complaintProgressIcon;
    return complaintReportedIcon;
  };

  const stats = {
    total: complaints.length + businesses.length,
    complaints: complaints.length,
    businesses: businesses.length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-card border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <MapPin size={20} className="text-primary" />
          <div>
            <h1 className="font-bold text-foreground text-sm">Village Map</h1>
            {currentVillage && (
              <p className="text-xs text-muted-foreground">{currentVillage.name} · {currentVillage.district}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isLoading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-card border-b border-border overflow-x-auto flex-shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-primary inline-block" />
          Village
        </div>
        <div className="w-px h-3 bg-border" />
        <button
          onClick={() => setShowComplaints(v => !v)}
          className={cn(
            "flex items-center gap-1.5 text-xs whitespace-nowrap px-2 py-1 rounded-full border transition-colors",
            showComplaints
              ? "bg-yellow-50 text-yellow-800 border-yellow-200"
              : "text-muted-foreground border-transparent"
          )}
        >
          {showComplaints ? <Eye size={11} /> : <EyeOff size={11} />}
          <AlertTriangle size={11} /> {stats.complaints} Complaints
        </button>
        <button
          onClick={() => setShowBusinesses(v => !v)}
          className={cn(
            "flex items-center gap-1.5 text-xs whitespace-nowrap px-2 py-1 rounded-full border transition-colors",
            showBusinesses
              ? "bg-purple-50 text-purple-800 border-purple-200"
              : "text-muted-foreground border-transparent"
          )}
        >
          {showBusinesses ? <Eye size={11} /> : <EyeOff size={11} />}
          <Building2 size={11} /> {stats.businesses} Businesses
        </button>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          {stats.resolved} resolved
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative min-h-0">
        {!currentVillage ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <MapPin size={40} className="opacity-30" />
            <p className="text-sm">No village selected</p>
          </div>
        ) : (
          <MapContainer
            center={[lat, lng]}
            zoom={14}
            className="w-full h-full"
            style={{ minHeight: '400px' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RecenterMap lat={lat} lng={lng} />

            {/* Village center marker */}
            <Marker position={[lat, lng]} icon={villageIcon}>
              <Popup>
                <div className="p-1">
                  <p className="font-bold text-sm">{currentVillage.name}</p>
                  <p className="text-xs text-gray-500">{currentVillage.district}, {currentVillage.state}</p>
                  {currentVillage.population && (
                    <p className="text-xs mt-1">👥 Population: {currentVillage.population.toLocaleString()}</p>
                  )}
                </div>
              </Popup>
            </Marker>

            {/* Complaint markers */}
            {showComplaints && complaints.map((c, i) => {
              const pos = getScatterPos(i, complaints.length, 'complaint');
              return (
                <Marker key={c.id} position={[pos.lat, pos.lng]} icon={complaintIcon(c.status)}>
                  <Popup>
                    <div className="p-1 min-w-[160px]">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-semibold text-sm leading-tight">{c.title}</p>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">📂 {c.category}</p>
                      {c.location_tag && <p className="text-xs text-gray-500 mb-1">📍 {c.location_tag}</p>}
                      <span className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border",
                        STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-700'
                      )}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Business markers */}
            {showBusinesses && businesses.map((b, i) => {
              const pos = getScatterPos(i, businesses.length, 'business');
              return (
                <Marker key={b.id} position={[pos.lat, pos.lng]} icon={businessIcon}>
                  <Popup>
                    <div className="p-1 min-w-[160px]">
                      <div className="flex items-center gap-1 mb-1">
                        <p className="font-semibold text-sm">{b.name}</p>
                        {b.is_verified && <span title="Verified" className="text-green-600 text-xs">✓</span>}
                      </div>
                      <p className="text-xs text-gray-500 mb-1">🏷️ {b.category}</p>
                      {b.address && <p className="text-xs text-gray-500 mb-1">📍 {b.address}</p>}
                      {b.phone && <p className="text-xs text-gray-500">📞 {b.phone}</p>}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-2 bg-card border-t border-border flex-shrink-0">
        <div className="flex items-center gap-4 overflow-x-auto">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Legend</p>
          {[
            { color: 'hsl(142 70% 30%)', label: 'Village', emoji: '🏘️' },
            { color: 'hsl(38 95% 50%)', label: 'Reported', emoji: '⚠️' },
            { color: 'hsl(210 80% 50%)', label: 'In Progress', emoji: '🔧' },
            { color: 'hsl(142 60% 42%)', label: 'Resolved', emoji: '✅' },
            { color: 'hsl(280 60% 50%)', label: 'Business', emoji: '🏪' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1 whitespace-nowrap">
              <div
                className="w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[8px]"
                style={{ background: item.color }}
              >
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
