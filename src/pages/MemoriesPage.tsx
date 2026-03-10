import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Camera, MapPin, Send, Trash2, X, Loader2, ImagePlus, BookHeart, Heart, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVillage } from '@/contexts/VillageContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { compressImages } from '@/lib/imageCompression';

interface Memory {
  id: string;
  caption: string | null;
  image_urls: string[];
  location_tag: string | null;
  created_at: string;
  author_id: string;
  profiles: { full_name: string; avatar_url: string | null } | null;
}

const MemoriesPage: React.FC = () => {
  const { user, profile, role } = useAuth();
  const { currentVillage } = useVillage();
  const qc = useQueryClient();

  const [caption, setCaption] = useState('');
  const [locationTag, setLocationTag] = useState('');
  const [showLocation, setShowLocation] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 6);
    if (!files.length) return;

    // Validate file sizes (max 10MB each)
    const valid = files.filter(f => f.size <= 10 * 1024 * 1024);
    if (valid.length < files.length) {
      toast.error('Some files exceed 10MB limit and were skipped');
    }

    setImageFiles(prev => [...prev, ...valid].slice(0, 6));
    const previews = valid.map(f => URL.createObjectURL(f));
    setImagePreviews(prev => [...prev, ...previews].slice(0, 6));

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (i: number) => {
    URL.revokeObjectURL(imagePreviews[i]);
    setImageFiles(f => f.filter((_, idx) => idx !== i));
    setImagePreviews(p => p.filter((_, idx) => idx !== i));
  };

  const uploadImages = async (): Promise<string[]> => {
    // Compress all images first
    const compressed = await compressImages(imageFiles, 'memory');
    const urls: string[] = [];

    for (const file of compressed) {
      const path = `${user!.id}/memories/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
      const { error } = await supabase.storage.from('memory-gallery').upload(path, file, { upsert: false });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from('memory-gallery').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!imageFiles.length && !caption.trim()) throw new Error('Add at least one image or a caption');
      setUploading(true);
      const imageUrls = await uploadImages();
      setUploading(false);
      const { error } = await (supabase as any).from('memories').insert({
        village_id: currentVillage!.id,
        author_id: user!.id,
        caption: caption.trim() || null,
        image_urls: imageUrls,
        location_tag: locationTag.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setCaption('');
      setLocationTag('');
      setShowLocation(false);
      imageFiles.forEach((_, i) => URL.revokeObjectURL(imagePreviews[i]));
      setImageFiles([]);
      setImagePreviews([]);
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

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className={cn("mt-2 gap-1.5", imagePreviews.length === 1 ? "flex" : "grid grid-cols-3")}>
                {imagePreviews.map((src, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden">
                    <img src={src} alt="" className="w-full h-24 object-cover" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload hint */}
            {imageFiles.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                📦 Images will be auto-compressed for faster upload
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
                  disabled={imagePreviews.length >= 6}
                  className={cn("p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors", imagePreviews.length >= 6 && "opacity-40 cursor-not-allowed")}
                  title="Add photos (max 6, 10MB each)"
                >
                  <ImagePlus size={16} />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
              </div>
              <Button
                size="sm"
                className="btn-primary-gradient text-xs"
                onClick={() => addMutation.mutate()}
                disabled={isPending || (!caption.trim() && imageFiles.length === 0)}
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
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <img src={lightboxSrc} alt="" className="max-w-full max-h-full rounded-xl object-contain" />
          <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setLightboxSrc(null)}>
            <X size={28} />
          </button>
        </div>
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
          {memories.map(memory => (
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

              {/* Caption */}
              {memory.caption && (
                <p className="text-sm text-foreground leading-relaxed mb-3">{memory.caption}</p>
              )}

              {/* Images */}
              {memory.image_urls.length > 0 && (
                <div className={cn(
                  "rounded-xl overflow-hidden cursor-pointer",
                  memory.image_urls.length === 1 && "aspect-video",
                  memory.image_urls.length === 2 && "grid grid-cols-2 gap-0.5",
                  memory.image_urls.length >= 3 && "grid grid-cols-3 gap-0.5",
                )}>
                  {memory.image_urls.map((url, i) => (
                    <div
                      key={i}
                      className={cn("relative overflow-hidden", memory.image_urls.length === 1 ? "h-full" : "h-40")}
                      onClick={() => setLightboxSrc(url)}
                    >
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MemoriesPage;
