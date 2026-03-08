import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  Heart, MessageCircle, Share2, MapPin, MoreHorizontal,
  Image, Video, Send, Pin, Megaphone, Trash2, Flag,
  Loader2, Plus, X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVillage } from '@/contexts/VillageContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
  const { user, profile, role } = useAuth();
  const { currentVillage } = useVillage();
  const queryClient = useQueryClient();

  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'moderator';

  const createMutation = useMutation({
    mutationFn: async ({ isAnnouncement }: { isAnnouncement?: boolean }) => {
      if (!currentVillage || !user) throw new Error('No village selected');
      const { error } = await (supabase.from('posts') as any).insert({
        village_id: currentVillage.id,
        author_id: user.id,
        content,
        post_type: 'text',
        location_tag: locationTag || null,
        is_announcement: isAnnouncement ?? false,
        is_pinned: isAnnouncement ?? false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent('');
      setLocationTag('');
      setShowLocation(false);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post published!');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create post');
    },
  });

  const handlePost = (isAnnouncement = false) => {
    if (!content.trim()) return toast.error('Write something first');
    createMutation.mutate({ isAnnouncement });
  };

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

          {showLocation && (
            <div className="mt-2 flex items-center gap-2">
              <MapPin size={14} className="text-primary" />
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
              >
                <MapPin size={16} />
              </button>
              <button className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                <Image size={16} />
              </button>
              <button className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                <Video size={16} />
              </button>
            </div>

            <div className="flex gap-2">
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs border-accent text-accent-foreground hover:bg-accent/10"
                  onClick={() => handlePost(true)}
                  disabled={createMutation.isPending}
                >
                  <Megaphone size={13} className="mr-1" />
                  Announce
                </Button>
              )}
              <Button
                size="sm"
                className="btn-primary-gradient text-xs"
                onClick={() => handlePost(false)}
                disabled={createMutation.isPending || !content.trim()}
              >
                {createMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
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

  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'moderator';
  const isAuthor = user?.id === post.author_id;

  // Like mutation
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

  // Comment mutation
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

  // Delete post mutation
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

  // Fetch comments
  const { data: comments = [] } = useQuery({
    queryKey: ['comments', post.id],
    enabled: showComments,
    queryFn: async () => {
      const { data } = await supabase
        .from('comments')
        .select('*, profiles(full_name, avatar_url)')
        .eq('post_id', post.id)
        .eq('is_deleted', false)
        .order('created_at');
      return data ?? [];
    },
  });

  return (
    <div className={cn(
      "feed-card p-4",
      post.is_announcement && "border-l-4 border-l-accent"
    )}>
      {/* Announcement Banner */}
      {post.is_announcement && (
        <div className="flex items-center gap-2 mb-3 text-xs text-accent-foreground bg-accent/15 px-3 py-1.5 rounded-lg font-medium">
          <Megaphone size={13} />
          <span>📢 Official Announcement</span>
          {post.is_pinned && <Pin size={12} className="ml-1" />}
        </div>
      )}

      {/* Post Header */}
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
                <>
                  <span>·</span>
                  <MapPin size={11} />
                  <span>{post.location_tag}</span>
                </>
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
              {(isAuthor || isAdmin) && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => deleteMutation.mutate()}
                >
                  <Trash2 size={14} className="mr-2" />
                  Delete Post
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <Flag size={14} className="mr-2" />
                Report Post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Post Content */}
      <p className="text-sm text-foreground leading-relaxed mb-3">{post.content}</p>

      {/* Media */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className={cn(
          "mb-3 rounded-xl overflow-hidden",
          post.media_urls.length > 1 && "grid grid-cols-2 gap-1"
        )}>
          {post.media_urls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              className="w-full h-48 object-cover"
            />
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

        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors ml-auto">
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

          {/* Add Comment */}
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
              className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ---- Main Feed Page ----
const FeedPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { currentVillage } = useVillage();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts', currentVillage?.id],
    enabled: !!currentVillage,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles(full_name, avatar_url, occupation)
        `)
        .eq('village_id', currentVillage!.id)
        .eq('is_deleted', false)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check which posts the user has liked
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

  if (!currentVillage) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  const isPending = profile?.status === 'pending';

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Village Header */}
      <div className="vcp-card p-4 mb-4 bg-gradient-primary text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
            🏘️
          </div>
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
