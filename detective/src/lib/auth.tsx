import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { clearLocalCache, deleteAccount, fetchProfile, type Profile } from './api';
import { forgetPartner } from './partner';
import { syncProgress } from './progress';
import { storage } from './storage';
import { getSupabase, needsAuthNow, onSupabaseReady, supabaseEnabled } from './supabase';

type Auth = {
  /** False when sign in is not set up. Everyone is a guest, and progress stays in this browser. */
  enabled: boolean;
  loading: boolean;
  /** A session is here and its profile is being fetched. Until it settles, nobody knows if this is a new player. */
  checking: boolean;
  session: Session | null;
  email: string | null;
  profile: Profile | null;
  refreshProfile: () => Promise<Profile | null>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

/** The last profile seen in this browser. A refresh shows the player at once, not "Sign in" for a moment. */
const PROFILE_KEY = 'lantern-profile';

function cachedProfile(): Profile | null {
  const p = storage.getJSON<Partial<Profile>>(PROFILE_KEY);
  return p && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.handle === 'string' ? { id: p.id, name: p.name, handle: p.handle } : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // Only with a stored session: a kept profile with no session behind it is nobody.
  const [profile, setProfileState] = useState<Profile | null>(() => (needsAuthNow() ? cachedProfile() : null));
  const setProfile = useCallback((p: Profile | null) => {
    setProfileState(p);
    if (p) storage.setJSON(PROFILE_KEY, p);
    else storage.remove(PROFILE_KEY);
  }, []);
  // Guests with no stored session never load the auth client until a screen asks for it.
  const [loading, setLoading] = useState(() => needsAuthNow());
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!supabaseEnabled) return;
    let alive = true;
    let unsubscribe = () => {};
    const load = async (s: Session | null) => {
      if (!alive) return;
      setSession(s);
      if (!s) {
        setProfile(null);
        setLoading(false);
        setChecking(false);
        return;
      }
      setChecking(true);
      try {
        const p = await fetchProfile(s.user.id);
        if (!alive) return;
        setProfile(p);
        // Steps done on another device come down.
        if (p) syncProgress().catch(() => {});
      } catch {
        if (alive) setProfile(null);
      } finally {
        if (alive) {
          setLoading(false);
          setChecking(false);
        }
      }
    };
    let attached = false;
    const attach = (supabase: NonNullable<Awaited<ReturnType<typeof getSupabase>>>) => {
      if (!alive || attached) return;
      attached = true;
      supabase.auth.getSession().then(({ data }) => load(data.session));
      const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
        // Defer: Supabase warns against awaiting its API inside this callback.
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') setTimeout(() => load(s), 0);
        else if (event === 'TOKEN_REFRESHED') setSession(s);
      });
      unsubscribe = () => sub.subscription.unsubscribe();
    };
    const off = onSupabaseReady(attach);
    if (needsAuthNow()) void getSupabase();
    return () => {
      alive = false;
      off();
      unsubscribe();
    };
  }, [setProfile]);

  const refreshProfile = useCallback(async () => {
    if (!session) return null;
    const p = await fetchProfile(session.user.id);
    setProfile(p);
    return p;
  }, [session, setProfile]);

  const signOut = useCallback(async () => {
    await (await getSupabase())?.auth.signOut();
    clearLocalCache();
    forgetPartner();
    setSession(null);
    setProfile(null);
  }, [setProfile]);

  const remove = useCallback(async () => {
    await deleteAccount();
    await signOut();
  }, [signOut]);

  const value = useMemo<Auth>(
    () => ({ enabled: supabaseEnabled, loading, checking, session, email: session?.user.email ?? null, profile, refreshProfile, signOut, deleteAccount: remove }),
    [loading, checking, session, profile, refreshProfile, signOut, remove],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): Auth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
