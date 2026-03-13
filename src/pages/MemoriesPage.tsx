import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Camera, MapPin, Trash2, X, Loader2, ImagePlus, BookHeart, Play, Video } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVillage } from '@/contexts/VillageContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { compressImages } from '@/lib/imageCompression';
import MediaLightbox, { MediaItem } from '@/components/MediaLightbox';

interface Memory {
  id: string;
  caption: string | null;
  image_urls: string[];
  location_tag: string | null;
  created_at: string;
  author_id: string;
  profiles: { full_name: string; avatar_url: string | null } | null;
}

// Detect if a URL is a video by extension
function isVideo(url: string) {
  return /\.(mp4|mov|webm|ogg|m4v)(\?|$)/i.test(url);
}

function toMediaItems(urls: string[]): MediaItem[] {
  return urls.map(url => ({ url, type: isVideo(url) ? 'video' : 'image' }));
}

const MemoriesPage: React.FC = () => {
  const { user, profile, role } = useAuth();
  const { currentVillage } = useVillage();
  const qc = useQueryClient();

  const [caption, setCaption] = useState('');
  const [locationTag, setLocationTag] = useState('');
  const [showLocation, setShowLocation] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<{ url: string; type: 'image' | 'video' }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<{ items: MediaItem[]; index: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'moderator';

  const { data: memories = [], isLoading } = useQuery({
    queryKey: ['memories', currentVillage?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('memories')
        .select('*, profiles!memories_author_id_fkey(full_name, avatar_url)')
        .eq('village_id', currentVillage!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Memory[];
    },
    enabled: !!currentVillage?.id,
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 6 - mediaFiles.length);
    if (!files.length) return;
    const valid = files.filter(f => f.size <= 50 * 1024 * 1024);
    if (valid.length < files.length) toast.error('Some files exceed 50MB limit and were skipped');

    const newPreviews = valid.map(f => ({
      url: URL.createObjectURL(f),
      type: f.type.startsWith('video/') ? 'video' as const : 'image' as const,
    }));
    setMediaFiles(prev => [...prev, ...valid].slice(0, 6));
    setMediaPreviews(prev => [...prev, ...newPreviews].slice(0, 6));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeMedia = (i: number) => {
    URL.revokeObjectURL(mediaPreviews[i].url);
    setMediaFiles(f => f.filter((_, idx) => idx !== i));
    setMediaPreviews(p => p.filter((_, idx) => idx !== i));
  };

  const uploadMedia = async (): Promise<string[]> => {
    const urls: string[] = [];
    const imageFiles = mediaFiles.filter(f => f.type.startsWith('image/'));
    const videoFiles = mediaFiles.filter(f => f.type.startsWith('video/'));

    // Compress images
    const compressed = await compressImages(imageFiles, 'memory');
    for (const file of compressed) {
      const ext = 'webp';
      const path = `${user!.id}/memories/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('memory-gallery').upload(path, file, { upsert: false });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from('memory-gallery').getPublicUrl(path);
      urls.push(data.publicUrl);
    }

    // Upload videos raw
    for (const file of videoFiles) {
      const ext = file.name.split('.').pop() ?? 'mp4';
      const path = `${user!.id}/memories/vid-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('memory-gallery').upload(path, file, {
        upsert: false,
        contentType: file.type,
      });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from('memory-gallery').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!mediaFiles.length && !caption.trim()) throw new Error('Add at least one photo/video or a caption');
      setUploading(true);
      const mediaUrls = await uploadMedia();
      setUploading(false);
      const { error } = await (supabase as any).from('memories').insert({
        village_id: currentVillage!.id,
        author_id: user!.id,
        caption: caption.trim() || null,
        image_urls: mediaUrls,
        location_tag: locationTag.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setCaption('');
      setLocationTag('');
      setShowLocation(false);
      mediaPreviews.forEach(p => URL.revokeObjectURL(p.url));
      setMediaFiles([]);
      setMediaPreviews([]);
      qc.invalidateQueries({ queryKey: ['memories'] });
      toast.success('Memory shared! 📸');
    },
    onError: (e: Error) => { setUploading(false); toast.error(e.message); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('memories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['memories'] }); toast.success('Memory removed'); },
  });

  const isPending = addMutation.isPending || uploading;

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BookHeart size={24} className="text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Village Memories</h1>
          <p className="text-muted-foreground text-sm">Share moments & milestones / గ్రామ జ్ఞాపకాలు</p>
        </div>
      </div>

      {/* Add Memory Card */}
      <div className="vcp-card p-4">
        <div className="flex gap-3">
          <Avatar className="w-9 h-9 flex-shrink-0">
            <AvatarImage src={profile?.avatar_url ?? ''} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <textarea
              placeholder="Share a village memory, celebration or special moment... 🎉"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              className="w-full resize-none bg-muted/50 rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground border-0 outline-none focus:ring-1 focus:ring-primary/50 min-h-[70px]"
            />

            {/* Media Previews */}
            {mediaPreviews.length > 0 && (
              <div className={cn("mt-2 gap-1.5", mediaPreviews.length === 1 ? "flex" : "grid grid-cols-3")}>
                {mediaPreviews.map((item, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden bg-black">
                    {item.type === 'video' ? (
                      <div className="w-full h-24 flex items-center justify-center bg-muted/60">
                        <Video size={24} className="text-primary" />
                        <span className="text-xs text-muted-foreground ml-1.5">Video</span>
                      </div>
                    ) : (
                      <img src={item.url} alt="" className="w-full h-24 object-cover" />
                    )}
                    <button
                      onClick={() => removeMedia(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {mediaPreviews.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                📦 Images will be compressed · Videos uploaded as-is
              </p>
            )}

            {showLocation && (
              <div className="mt-2 flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                <MapPin size={14} className="text-primary flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Add location..."
                  value={locationTag}
                  onChange={e => setLocationTag(e.target.value)}
                  className="flex-1 text-sm bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground"
                />
                <button onClick={() => setShowLocation(false)}><X size={14} className="text-muted-foreground" /></button>
              </div>
            )}

            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-1">
                <button
                  onClick={() => setShowLocation(!showLocation)}
                  className={cn("p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors", showLocation && "text-primary bg-primary/10")}
                  title="Add location"
                >
                  <MapPin size={16} />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={mediaPreviews.length >= 6}
                  className={cn("p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors", mediaPreviews.length >= 6 && "opacity-40 cursor-not-allowed")}
                  title="Add photos or videos (max 6)"
                >
                  <ImagePlus size={16} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
              <Button
                size="sm"
                className="btn-primary-gradient text-xs"
                onClick={() => addMutation.mutate()}
                disabled={isPending || (!caption.trim() && mediaFiles.length === 0)}
              >
                {isPending
                  ? <><Loader2 size={13} className="animate-spin mr-1" />{uploading ? 'Uploading...' : 'Sharing...'}</>
                  : <><Camera size={13} className="mr-1" />Share Memory</>}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <MediaLightbox
          items={lightbox.items}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* Memories Grid */}
      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => <div key={i} className="vcp-card h-64 animate-pulse" />)
      ) : memories.length === 0 ? (
        <div className="vcp-card p-12 text-center">
          <Camera size={40} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No memories shared yet. Be the first!</p>
          <p className="text-muted-foreground/60 text-xs mt-1">ఇంకా జ్ఞాపకాలు పంచుకోలేదు</p>
        </div>
      ) : (
        <div className="space-y-4">
          {memories.map(memory => {
            const mediaItems = toMediaItems(memory.image_urls);
            return (
              <div key={memory.id} className="vcp-card p-4">
                {/* Author */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={memory.profiles?.avatar_url ?? ''} />
                      <AvatarFallback className="bg-primary/15 text-primary font-bold text-sm">
                        {memory.profiles?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{memory.profiles?.full_name ?? 'Unknown'}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDistanceToNow(new Date(memory.created_at), { addSuffix: true })}</span>
                        {memory.location_tag && (
                          <><span>·</span><MapPin size={11} /><span>{memory.location_tag}</span></>
                        )}
                      </div>
                    </div>
                  </div>
                  {(user?.id === memory.author_id || isAdmin) && (
                    <button
                      onClick={() => deleteMutation.mutate(memory.id)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                      title="Delete memory"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {memory.caption && (
                  <p className="text-sm text-foreground leading-relaxed mb-3">{memory.caption}</p>
                )}

                {/* Media Grid */}
                {mediaItems.length > 0 && (
                  <div className={cn(
                    "rounded-xl overflow-hidden",
                    mediaItems.length === 1 && "aspect-video",
                    mediaItems.length === 2 && "grid grid-cols-2 gap-0.5",
                    mediaItems.length >= 3 && "grid grid-cols-3 gap-0.5",
                  )}>
                    {mediaItems.map((item, i) => (
                      <div
                        key={i}
                        className={cn(
                          "relative overflow-hidden cursor-pointer group",
                          mediaItems.length === 1 ? "h-full" : "h-40",
                          "bg-muted"
                        )}
                        onClick={() => setLightbox({ items: mediaItems, index: i })}
                      >
                        {item.type === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center bg-black/80 relative">
                            <video
                              src={item.url}
                              className="w-full h-full object-cover opacity-60"
                              muted
                              preload="metadata"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:bg-white transition-colors">
                                <Play size={20} className="text-black ml-0.5" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={item.url}
                            alt=""
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MemoriesPage;
