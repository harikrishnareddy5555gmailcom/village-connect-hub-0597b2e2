import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVillage } from '@/contexts/VillageContext';
import { Users, Search, Briefcase, Phone, BadgeCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Member {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  occupation: string | null;
  bio: string | null;
  skills: string[] | null;
  mobile_number: string | null;
  status: string;
  created_at: string;
}

const MembersPage: React.FC = () => {
  const { currentVillage } = useVillage();
  const [search, setSearch] = useState('');
  const [occupationFilter, setOccupationFilter] = useState('all');

  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ['members', currentVillage?.id],
    enabled: !!currentVillage,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, occupation, bio, skills, mobile_number, status, created_at')
        .eq('village_id', currentVillage!.id)
        .eq('status', 'active')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Member[];
    },
  });

  // Distinct occupations for filter dropdown
  const occupations = useMemo(() => {
    const set = new Set<string>();
    members.forEach(m => { if (m.occupation) set.add(m.occupation); });
    return Array.from(set).sort();
  }, [members]);

  const filtered = useMemo(() => {
    return members.filter(m => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        m.full_name?.toLowerCase().includes(q) ||
        m.occupation?.toLowerCase().includes(q) ||
        m.bio?.toLowerCase().includes(q) ||
        m.skills?.some(s => s.toLowerCase().includes(q));
      const matchOccupation = occupationFilter === 'all' || m.occupation === occupationFilter;
      return matchSearch && matchOccupation;
    });
  }, [members, search, occupationFilter]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center flex-shrink-0">
          <Users size={20} className="text-secondary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Members Directory</h1>
          <p className="text-xs text-muted-foreground">
            {isLoading ? 'Loading…' : `${filtered.length} active member${filtered.length !== 1 ? 's' : ''} in ${currentVillage?.name}`}
          </p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, occupation, skill…"
            className="pl-8"
          />
        </div>
        <Select value={occupationFilter} onValueChange={setOccupationFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Briefcase size={13} className="mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Occupations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Occupations</SelectItem>
            {occupations.map(occ => (
              <SelectItem key={occ} value={occ}>{occ}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">👥</div>
          <p className="font-medium text-foreground">No members found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search || occupationFilter !== 'all' ? 'Try adjusting your filters' : 'No active members yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(member => (
            <MemberCard key={member.user_id} member={member} />
          ))}
        </div>
      )}
    </div>
  );
};

const MemberCard: React.FC<{ member: Member }> = ({ member }) => {
  const initials = member.full_name
    ?.split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'U';

  const joinedYear = new Date(member.created_at).getFullYear();

  return (
    <div className="vcp-card p-4 flex gap-3 hover:shadow-card-hover transition-shadow">
      {/* Avatar */}
      <div className="flex-shrink-0">
        <Avatar className="w-14 h-14 ring-2 ring-primary/10">
          <AvatarImage src={member.avatar_url ?? ''} alt={member.full_name} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1 mb-0.5">
          <h3 className="font-semibold text-sm text-foreground leading-tight truncate">{member.full_name}</h3>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0 mt-0.5">{joinedYear}</span>
        </div>

        {member.occupation && (
          <div className="flex items-center gap-1 mb-1.5">
            <Briefcase size={11} className="text-primary flex-shrink-0" />
            <span className="text-xs text-muted-foreground truncate">{member.occupation}</span>
          </div>
        )}

        {member.bio && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-1.5">{member.bio}</p>
        )}

        {/* Skills */}
        {member.skills && member.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {member.skills.slice(0, 4).map(skill => (
              <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                {skill}
              </Badge>
            ))}
            {member.skills.length > 4 && (
              <span className="text-[10px] text-muted-foreground self-center">
                +{member.skills.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Phone — optional */}
        {member.mobile_number && (
          <a
            href={`tel:${member.mobile_number}`}
            className="flex items-center gap-1 mt-1.5 text-[10px] text-primary hover:underline"
          >
            <Phone size={10} />
            {member.mobile_number}
          </a>
        )}
      </div>
    </div>
  );
};

export default MembersPage;
