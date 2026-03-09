import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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
  email?: string;
  gender?: string;
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
  const mountedRef = useRef(true);

  const fetchProfile = async (userId: string) => {
    try {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).single(),
        supabase.from('user_roles').select('role').eq('user_id', userId),
      ]);
      if (!mountedRef.current) return;

      setProfile(profileRes.data ?? null);

      const rolesData = rolesRes.data as Array<{ role: AppRole }> | null;
      const roleOrder: Record<AppRole, number> = { super_admin: 1, admin: 2, moderator: 3, user: 4 };
      const topRole = rolesData && rolesData.length > 0
        ? [...rolesData].sort((a, b) => (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99))[0].role
        : null;
      setRole(topRole);
    } catch {
      if (!mountedRef.current) return;
      setProfile(null);
      setRole(null);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    mountedRef.current = true;

    // Safety timeout — never stay stuck loading beyond 8s
    const timeout = setTimeout(() => {
      if (mountedRef.current) setLoading(false);
    }, 8000);

    // Step 1: Restore session from storage first (synchronous path)
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mountedRef.current) return;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        // Fetch profile then mark loading done
        fetchProfile(initialSession.user.id).finally(() => {
          if (mountedRef.current) {
            clearTimeout(timeout);
            setLoading(false);
          }
        });
      } else {
        clearTimeout(timeout);
        setLoading(false);
      }
    });

    // Step 2: Listen for subsequent auth changes (sign in / sign out / token refresh)
    // IMPORTANT: Do NOT await anything inside this callback — it causes deadlocks
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mountedRef.current) return;

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setRole(null);
          setLoading(false);
          return;
        }

        if (newSession?.user) {
          // Fire-and-forget profile fetch — do NOT await here
          fetchProfile(newSession.user.id).finally(() => {
            if (mountedRef.current) setLoading(false);
          });
        }
      }
    );

    return () => {
      mountedRef.current = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async ({ fullName, mobileNumber, password, email, gender }: SignUpData) => {
    try {
      const authEmail = email && email.trim() ? email.trim() : `${mobileNumber}@villageconnect.app`;
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            mobile_number: mobileNumber,
            gender: gender ?? null,
            ...(email && email.trim() ? { real_email: email.trim() } : {}),
          },
        },
      });
      // After sign up, update gender + privacy on the profile
      if (!error && signUpData?.user && gender) {
        const isFemale = gender === 'Female';
        await supabase
          .from('profiles')
          .update({
            gender,
            show_mobile: !isFemale,
            show_email: !isFemale,
          } as any)
          .eq('user_id', signUpData.user.id);
      }
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
