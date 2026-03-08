import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type AppRole = 'super_admin' | 'admin' | 'moderator' | 'user';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signUp: (data: SignUpData) => Promise<{ error: Error | null }>;
  signIn: (mobile: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

interface SignUpData {
  fullName: string;
  mobileNumber: string;
  password: string;
}

const defaultAuthContext: AuthContextType = {
  user: null,
  session: null,
  profile: null,
  role: null,
  loading: true,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).single(),
        supabase.from('user_roles').select('role').eq('user_id', userId),
      ]);

      setProfile(profileRes.data ?? null);

      const rolesData = rolesRes.data as Array<{ role: AppRole }> | null;
      const roleOrder: Record<AppRole, number> = { super_admin: 1, admin: 2, moderator: 3, user: 4 };
      const topRole = rolesData && rolesData.length > 0
        ? [...rolesData].sort((a, b) => (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99))[0].role
        : null;
      setRole(topRole);
    } catch {
      setProfile(null);
      setRole(null);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    let mounted = true;
    let loadingResolved = false;

    const resolveLoading = () => {
      if (mounted && !loadingResolved) {
        loadingResolved = true;
        setLoading(false);
      }
    };

    // Safety timeout — never stay stuck loading beyond 5s
    const timeout = setTimeout(resolveLoading, 5000);

    // Listen for auth state changes (INITIAL_SESSION fires first with current session)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
          setRole(null);
        }
        // Resolve loading on INITIAL_SESSION or SIGNED_IN/OUT
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          resolveLoading();
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async ({ fullName, mobileNumber, password }: SignUpData) => {
    try {
      const fakeEmail = `${mobileNumber}@villageconnect.app`;
      const { error } = await supabase.auth.signUp({
        email: fakeEmail,
        password,
        options: { data: { full_name: fullName, mobile_number: mobileNumber } },
      });
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signIn = async (mobile: string, password: string) => {
    try {
      const fakeEmail = `${mobile}@villageconnect.app`;
      const { error } = await supabase.auth.signInWithPassword({ email: fakeEmail, password });
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, role, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
