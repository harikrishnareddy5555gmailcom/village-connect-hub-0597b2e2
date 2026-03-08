import React, { createContext, useContext, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/types';

type Village = Database['public']['Tables']['villages']['Row'];

interface VillageContextType {
  currentVillage: Village | null;
  villages: Village[];
  loading: boolean;
  setCurrentVillage: (v: Village) => void;
}

const VillageContext = createContext<VillageContextType | undefined>(undefined);

export const VillageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentVillage, setCurrentVillage] = useState<Village | null>(null);

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

  return (
    <VillageContext.Provider value={{
      currentVillage,
      villages,
      loading: isLoading,
      setCurrentVillage,
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
