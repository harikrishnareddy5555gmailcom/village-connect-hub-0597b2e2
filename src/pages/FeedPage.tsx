import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  Heart, MessageCircle, Share2, MapPin, MoreHorizontal,
  Image, Send, Pin, Megaphone, Trash2, Flag,
  Loader2, X, ImagePlus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVillage } from '@/contexts/VillageContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ---- Types ----
interface PostWithAuthor {
  id: string;
  content: string;
  post_type: string;
  media_urls: string[] | null;
  location_tag: string | null;
  is_pinned: boolean;
  is_announcement: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author_id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    occupation: string | null;
  } | null;
  liked_by_user?: boolean;
}

// ---- Create Post Component ----
const CreatePost: React.FC = () => {
  const [content, setContent] = useState('');
  const [locationTag, setLocationTag] = useState('');
  const [showLocation, setShowLocation] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, profile, role } = useAuth();
  const { currentVillage } = useVillage();
  const queryClient = useQueryClient();

  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'moderator';

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 4); // max 4 images
    if (!files.length) return;
    setImageFiles(prev => [...prev, ...files].slice(0, 4));
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setImagePreviews(prev => [...prev, ...newPreviews].slice(0, 4));
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImageFiles(f => f.filter((_, i) => i !== index));
    setImagePreviews(p => p.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (!imageFiles.length) return [];
    const urls: string[] = [];
    for (const file of imageFiles) {
      const ext = file.name.split('.').pop();
      const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('post-media').upload(path, file, { upsert: false });
      if (error) throw new Error(`Upload failed: ${error.message}`);
      const { data: urlData } = supabase.storage.from('post-media').getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    return urls;
  };

  const createMutation = useMutation({
    mutationFn: async ({ isAnnouncement }: { isAnnouncement?: boolean }) => {
      if (!currentVillage || !user) throw new Error('No village selected');
      setUploading(true);
      const mediaUrls = await uploadImages();
      setUploading(false);
      const { error } = await (supabase.from('posts') as any).insert({
        village_id: currentVillage.id,
        author_id: user.id,
        content,
        post_type: mediaUrls.length > 0 ? 'image' : 'text',
        location_tag: locationTag || null,
        is_announcement: isAnnouncement ?? false,
        is_pinned: isAnnouncement ?? false,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent('');
      setLocationTag('');
      setShowLocation(false);
      setImageFiles([]);
      setImagePreviews([]);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post published!');
    },
    onError: (err: Error) => {
      setUploading(false);
      toast.error(err.message || 'Failed to create post');
    },
  });

  const handlePost = (isAnnouncement = false) => {
    if (!content.trim() && imageFiles.length === 0) return toast.error('Write something or add an image');
    createMutation.mutate({ isAnnouncement });
  };

  const isPending = createMutation.isPending || uploading;

  return (
    <div className="vcp-card p-4 mb-4">
      <div className="flex gap-3">
        <Avatar className="w-9 h-9 flex-shrink-0">
          <AvatarImage src={profile?.avatar_url ?? ''} />
          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Textarea
            placeholder="Share something with your village... / మీ గ్రామంతో ఏదైనా పంచుకోండి..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="resize-none border-0 bg-muted/50 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/50 text-sm min-h-[80px]"
          />

          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <div className={cn(
              "mt-2 gap-1.5",
              imagePreviews.length === 1 ? "flex" : "grid grid-cols-2"
            )}>
              {imagePreviews.map((src, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden">
                  <img src={src} alt="" className="w-full h-32 object-cover" />
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

          {showLocation && (
            <div className="mt-2 flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
              <MapPin size={14} className="text-primary flex-shrink-0" />
              <input
                type="text"
                placeholder="Add location tag..."
                value={locationTag}
                onChange={(e) => setLocationTag(e.target.value)}
                className="flex-1 text-sm bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground"
              />
              <button onClick={() => setShowLocation(false)}>
                <X size={14} className="text-muted-foreground" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-1">
              <button
                onClick={() => setShowLocation(!showLocation)}
                className={cn(
                  "p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors",
                  showLocation && "text-primary bg-primary/10"
                )}
                title="Add location"
              >
                <MapPin size={16} />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={imagePreviews.length >= 4}
                className={cn(
                  "p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors",
                  imagePreviews.length >= 4 && "opacity-40 cursor-not-allowed"
                )}
                title="Add image (max 4)"
              >
                <ImagePlus size={16} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />
            </div>

            <div className="flex gap-2">
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs border-accent text-accent-foreground hover:bg-accent/10"
                  onClick={() => handlePost(true)}
                  disabled={isPending}
                >
                  <Megaphone size={13} className="mr-1" />
                  Announce
                </Button>
              )}
              <Button
                size="sm"
                className="btn-primary-gradient text-xs"
                onClick={() => handlePost(false)}
                disabled={isPending || (!content.trim() && imageFiles.length === 0)}
              >
                {isPending ? (
                  <><Loader2 size={13} className="animate-spin mr-1" />{uploading ? 'Uploading...' : 'Posting...'}</>
                ) : (
                  <><Send size={13} className="mr-1" />Post</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---- Post Card Component ----
const PostCard: React.FC<{ post: PostWithAuthor }> = React.memo(({ post }) => {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'moderator';
  const isAuthor = user?.id === post.author_id;

  const likeMutation = useMutation({
    mutationFn: async () => {
      const sb = supabase as any;
      if (post.liked_by_user) {
        await sb.from('likes').delete().eq('post_id', post.id).eq('user_id', user!.id);
      } else {
        await sb.from('likes').insert({ post_id: post.id, user_id: user!.id });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      if (!commentText.trim()) throw new Error('Empty comment');
      const { error } = await (supabase as any).from('comments').insert({
        post_id: post.id,
        author_id: user!.id,
        content: commentText,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['comments', post.id] });
      toast.success('Comment added');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from('posts').update({ is_deleted: true }).eq('id', post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post removed');
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', post.id],
    enabled: showComments,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('comments')
        .select('*, profiles!comments_author_id_profiles_fkey(full_name, avatar_url)')
        .eq('post_id', post.id)
        .eq('is_deleted', false)
        .order('created_at');
      return data ?? [];
    },
  });

  const mediaUrls = post.media_urls ?? [];

  return (
    <>
      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <img src={lightboxSrc} alt="" className="max-w-full max-h-full rounded-xl object-contain" />
          <button className="absolute top-4 right-4 text-white/80 hover:text-white">
            <X size={28} />
          </button>
        </div>
      )}

      <div className={cn(
        "feed-card p-4",
        post.is_announcement && "border-l-4 border-l-accent"
      )}>
        {post.is_announcement && (
          <div className="flex items-center gap-2 mb-3 text-xs text-accent-foreground bg-accent/15 px-3 py-1.5 rounded-lg font-medium">
            <Megaphone size={13} />
            <span>📢 Official Announcement</span>
            {post.is_pinned && <Pin size={12} className="ml-1" />}
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <Avatar className="w-9 h-9">
              <AvatarImage src={post.profiles?.avatar_url ?? ''} />
              <AvatarFallback className="bg-primary/15 text-primary font-bold text-sm">
                {post.profiles?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm text-foreground">{post.profiles?.full_name ?? 'Unknown'}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                {post.location_tag && (
                  <><span>·</span><MapPin size={11} /><span>{post.location_tag}</span></>
                )}
              </div>
            </div>
          </div>

          {(isAuthor || isAdmin) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground p-1 rounded">
                  <MoreHorizontal size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate()}>
                  <Trash2 size={14} className="mr-2" />Delete Post
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Flag size={14} className="mr-2" />Report Post
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Content */}
        <p className="text-sm text-foreground leading-relaxed mb-3">{post.content}</p>

        {/* Image Grid */}
        {mediaUrls.length > 0 && (
          <div className={cn(
            "mb-3 rounded-xl overflow-hidden",
            mediaUrls.length === 1 && "aspect-video",
            mediaUrls.length === 2 && "grid grid-cols-2 gap-0.5",
            mediaUrls.length === 3 && "grid grid-cols-2 gap-0.5",
            mediaUrls.length >= 4 && "grid grid-cols-2 gap-0.5"
          )}>
            {mediaUrls.slice(0, 4).map((url, i) => (
              <div
                key={i}
                className={cn(
                  "relative overflow-hidden cursor-pointer",
                  mediaUrls.length === 1 && "h-full",
                  mediaUrls.length >= 2 && "h-44",
                  mediaUrls.length === 3 && i === 0 && "row-span-2 h-full",
                )}
                onClick={() => setLightboxSrc(url)}
              >
                <img
                  src={url}
                  alt=""
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
                {i === 3 && mediaUrls.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">+{mediaUrls.length - 4}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center gap-1 pt-3 border-t border-border">
          <button
            onClick={() => likeMutation.mutate()}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
              post.liked_by_user
                ? "text-destructive bg-destructive/10"
                : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            )}
          >
            <Heart size={16} className={post.liked_by_user ? "fill-destructive" : ""} />
            <span className="font-medium">{post.likes_count}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <MessageCircle size={16} />
            <span className="font-medium">{post.comments_count}</span>
          </button>

          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors ml-auto"
            onClick={async () => {
              const text = `${post.profiles?.full_name ?? 'Someone'} posted: ${post.content.slice(0, 120)}${post.content.length > 120 ? '…' : ''}`;
              if (navigator.share) {
                try { await navigator.share({ title: 'Village Connect', text }); } catch {}
              } else {
                await navigator.clipboard.writeText(text);
                toast.success('Copied to clipboard!');
              }
            }}
            title="Share post"
          >
            <Share2 size={16} />
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-3 pt-3 border-t border-border space-y-3">
            {comments.map((comment: any) => (
              <div key={comment.id} className="flex gap-2">
                <Avatar className="w-7 h-7 flex-shrink-0">
                  <AvatarFallback className="text-xs bg-muted text-muted-foreground font-bold">
                    {comment.profiles?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2">
                  <p className="text-xs font-semibold text-foreground">{comment.profiles?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{comment.content}</p>
                </div>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                onKeyDown={(e) => e.key === 'Enter' && commentMutation.mutate()}
              />
              <button
                onClick={() => commentMutation.mutate()}
                disabled={!commentText.trim() || commentMutation.isPending}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
});
PostCard.displayName = 'PostCard';

// ---- Main Feed Page ----
const FeedPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { currentVillage, loading: villageLoading } = useVillage();

  const { data: posts = [], isLoading, error } = useQuery({
    queryKey: ['posts', currentVillage?.id],
    enabled: !!currentVillage?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('posts')
        .select(`*, profiles!posts_author_id_profiles_fkey(full_name, avatar_url, occupation)`)
        .eq('village_id', currentVillage!.id)
        .eq('is_deleted', false)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (user && data) {
        const { data: userLikes } = await (supabase as any)
          .from('likes')
          .select('post_id')
          .eq('user_id', user.id);
        const likedIds = new Set((userLikes as Array<{ post_id: string }> | null)?.map(l => l.post_id) ?? []);
        return (data as any[]).map(p => ({ ...p, liked_by_user: likedIds.has(p.id) }));
      }
      return data ?? [];
    },
  });

  // Show loader only while village is loading, not indefinitely
  if (villageLoading && !currentVillage) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!currentVillage) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="text-4xl">🏘️</div>
        <p className="text-muted-foreground text-sm">No village configured yet.</p>
      </div>
    );
  }

  const isPending = profile?.status === 'pending';

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Village Header */}
      <div className="vcp-card p-4 mb-4 bg-gradient-primary text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🏘️</div>
          <div>
            <h2 className="font-bold text-lg">{currentVillage.name}</h2>
            <p className="text-primary-foreground/80 text-xs">
              {currentVillage.district} · {currentVillage.state} · Pop. ~{currentVillage.population?.toLocaleString()}
            </p>
          </div>
        </div>
        {currentVillage.description && (
          <p className="text-primary-foreground/75 text-xs mt-3 leading-relaxed line-clamp-2">
            {currentVillage.description}
          </p>
        )}
      </div>

      {/* Pending Approval Banner */}
      {isPending && (
        <div className="vcp-card p-4 mb-4 border-l-4 border-l-warning bg-warning/5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="font-semibold text-sm text-foreground">Account Pending Approval</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your account is awaiting admin approval. You can browse the feed but cannot post yet.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create Post */}
      {profile?.status === 'active' && <CreatePost />}

      {/* Error state */}
      {error && (
        <div className="vcp-card p-4 mb-4 border-l-4 border-l-destructive bg-destructive/5 text-sm text-destructive">
          Failed to load posts. Please refresh and make sure you're logged in.
        </div>
      )}

      {/* Posts Feed */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="vcp-card p-4">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted rounded animate-pulse w-32" />
                  <div className="h-2 bg-muted rounded animate-pulse w-24" />
                  <div className="h-12 bg-muted rounded animate-pulse mt-2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="vcp-card p-12 text-center">
          <div className="text-4xl mb-4">🌾</div>
          <h3 className="font-semibold text-foreground mb-2">No posts yet</h3>
          <p className="text-muted-foreground text-sm">
            Be the first to share something with {currentVillage.name}!
          </p>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in">
          {posts.map((post) => (
            <PostCard key={post.id} post={post as PostWithAuthor} />
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedPage;
