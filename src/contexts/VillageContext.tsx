import React, { createContext, useContext, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Village = Database['public']['Tables']['villages']['Row'];

interface VillageContextType {
  currentVillage: Village | null;
  villages: Village[];
  loading: boolean;
  setCurrentVillage: (v: Village) => void;
  refreshVillage: () => Promise<void>;
}

const VillageContext = createContext<VillageContextType | undefined>(undefined);

export const VillageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentVillage, setCurrentVillage] = useState<Village | null>(null);
  const queryClient = useQueryClient();

  const { data: villages = [], isLoading } = useQuery({
    queryKey: ['villages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('villages')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      // Auto-set first village
      if (data?.length && !currentVillage) {
        setCurrentVillage(data[0]);
      }
      return data ?? [];
    },
  });

  const refreshVillage = async () => {
    const result = await queryClient.fetchQuery({
      queryKey: ['villages'],
      queryFn: async () => {
        const { data, error } = await supabase.from('villages').select('*').eq('is_active', true).order('name');
        if (error) throw error;
        return data ?? [];
      },
    });
    if (currentVillage && result) {
      const updated = (result as Village[]).find(v => v.id === currentVillage.id);
      if (updated) setCurrentVillage(updated);
    }
  };

  return (
    <VillageContext.Provider value={{
      currentVillage,
      villages,
      loading: isLoading,
      setCurrentVillage,
      refreshVillage,
    }}>
      {children}
    </VillageContext.Provider>
  );
};

export const useVillage = () => {
  const ctx = useContext(VillageContext);
  if (!ctx) throw new Error('useVillage must be used within VillageProvider');
  return ctx;
};
