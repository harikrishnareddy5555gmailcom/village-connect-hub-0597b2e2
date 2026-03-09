import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVillage } from '@/contexts/VillageContext';
import { MessageSquare, Plus, X, Send, Loader2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const DiscussionsPage: React.FC = () => {
  const { user, role } = useAuth();
  const { currentVillage } = useVillage();
  const queryClient = useQueryClient();
  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'moderator';

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [deleteDiscussionId, setDeleteDiscussionId] = useState<string | null>(null);

  const { data: discussions = [], isLoading } = useQuery({
    queryKey: ['discussions', currentVillage?.id],
    enabled: !!currentVillage,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('discussions')
        .select('*, profiles!discussions_author_id_profiles_fkey(full_name, avatar_url), discussion_replies(id)')
        .eq('village_id', currentVillage!.id)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const { data: replies = [] } = useQuery({
    queryKey: ['discussion-replies', expanded],
    enabled: !!expanded,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('discussion_replies')
        .select('*, profiles!discussion_replies_author_id_profiles_fkey(full_name, avatar_url)')
        .eq('discussion_id', expanded)
        .order('created_at');
      return data ?? [];
    },
  });

  const createDiscussion = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error('Title is required');
      const { error } = await (supabase as any).from('discussions').insert({
        village_id: currentVillage!.id,
        author_id: user!.id,
        title,
        body: body || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setShowForm(false); setTitle(''); setBody('');
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      toast.success('Discussion started!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addReply = useMutation({
    mutationFn: async (discussionId: string) => {
      const text = replyText[discussionId];
      if (!text?.trim()) throw new Error('Write a reply first');
      const { error } = await (supabase as any).from('discussion_replies').insert({
        discussion_id: discussionId,
        author_id: user!.id,
        content: text,
      });
      if (error) throw error;
      setReplyText(r => ({ ...r, [discussionId]: '' }));
    },
    onSuccess: (_, discussionId) => {
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      queryClient.invalidateQueries({ queryKey: ['discussion-replies', discussionId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
            <MessageSquare size={20} className="text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Discussions / చర్చలు</h1>
            <p className="text-xs text-muted-foreground">Start and join village discussions</p>
          </div>
        </div>
        <Button size="sm" className="btn-primary-gradient" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X size={14} className="mr-1" /> : <Plus size={14} className="mr-1" />}
          {showForm ? 'Cancel' : 'New Discussion'}
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="vcp-card p-5 mb-5 animate-fade-in-up">
          <h3 className="font-semibold text-foreground mb-4">Start a Discussion</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Topic / విషయం *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="What do you want to discuss?" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Details (optional)</Label>
              <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Add more context..." className="mt-1 resize-none" rows={3} />
            </div>
            <Button className="btn-primary-gradient w-full" onClick={() => createDiscussion.mutate()} disabled={createDiscussion.isPending}>
              {createDiscussion.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              Post Discussion
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : discussions.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">💬</div>
          <p className="font-medium text-foreground">No discussions yet</p>
          <p className="text-sm text-muted-foreground mt-1">Be the first to start a conversation!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {discussions.map((d: any) => {
            const isOpen = expanded === d.id;
            const replyCount = d.discussion_replies?.length ?? 0;
            return (
              <div key={d.id} className="vcp-card p-4">
                <div className="flex gap-3">
                  <Avatar className="w-9 h-9 flex-shrink-0">
                    <AvatarFallback className="bg-primary/15 text-primary font-bold text-sm">
                      {d.profiles?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">{d.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {d.profiles?.full_name} · {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    {d.body && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{d.body}</p>}

                    <button
                      onClick={() => setExpanded(isOpen ? null : d.id)}
                      className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
                    >
                      {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                    </button>

                    {isOpen && (
                      <div className="mt-3 space-y-2 animate-fade-in-up">
                        {(replies as any[]).map((r: any) => (
                          <div key={r.id} className="flex gap-2">
                            <Avatar className="w-7 h-7 flex-shrink-0">
                              <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-bold">
                                {r.profiles?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2">
                              <p className="text-xs font-semibold text-foreground">{r.profiles?.full_name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{r.content}</p>
                            </div>
                          </div>
                        ))}

                        <div className="flex gap-2 mt-2">
                          <input
                            type="text"
                            value={replyText[d.id] ?? ''}
                            onChange={e => setReplyText(r => ({ ...r, [d.id]: e.target.value }))}
                            placeholder="Write a reply..."
                            className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                            onKeyDown={e => e.key === 'Enter' && addReply.mutate(d.id)}
                          />
                          <button
                            onClick={() => addReply.mutate(d.id)}
                            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                          >
                            <Send size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DiscussionsPage;
