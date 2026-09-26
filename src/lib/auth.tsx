import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { clearLocalCache, deleteAccount, fetchProfile, mergeGuestDailies, type Profile } from './api';
import { getSupabase, needsAuthNow, onSupabaseReady, supabaseEnabled } from './supabase';

type Auth = {
  /** False when Supabase env is not set. Everyone is a guest. */
  enabled: boolean;
  loading: boolean;
  session: Session | null;
  email: string | null;
  profile: Profile | null;
  refreshProfile: () => Promise<Profile | null>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  // Guests with no stored session never load the auth client until a screen asks for it.
  const [loading, setLoading] = useState(() => needsAuthNow());

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
        return;
      }
      try {
        const p = await fetchProfile(s.user.id);
        if (!alive) return;
        setProfile(p);
        // Bring guest dailies into the account. Idempotent, so every sign-in is fine.
        if (p) mergeGuestDailies().catch(() => {});
      } catch {
        if (alive) setProfile(null);
      } finally {
        if (alive) setLoading(false);
      }
    };
    const attach = (supabase: NonNullable<Awaited<ReturnType<typeof getSupabase>>>) => {
      if (!alive || attached) return;
      attached = true;
      supabase.auth.getSession().then(({ data }) => load(data.session));
      const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Defer: Supabase warns against awaiting its API inside this callback.
        setTimeout(() => load(s), 0);
      } else if (event === 'TOKEN_REFRESHED') setSession(s);
      });
      unsubscribe = () => sub.subscription.unsubscribe();
    };
    let attached = false;
    const off = onSupabaseReady(attach);
    if (needsAuthNow()) void getSupabase();
    return () => {
      alive = false;
      off();
      unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session) return null;
    const p = await fetchProfile(session.user.id);
    setProfile(p);
    if (p) mergeGuestDailies().catch(() => {});
    return p;
  }, [session]);

  const signOut = useCallback(async () => {
    // Save any dailies played while signed in before the local copy goes.
    if (profile) await mergeGuestDailies().catch(() => {});
    await (await getSupabase())?.auth.signOut();
    clearLocalCache();
    setSession(null);
    setProfile(null);
  }, [profile]);

  const remove = useCallback(async () => {
    await deleteAccount();
    await signOut();
  }, [signOut]);

  const value = useMemo<Auth>(
    () => ({
      enabled: supabaseEnabled,
      loading,
      session,
      email: session?.user.email ?? null,
      profile,
      refreshProfile,
      signOut,
      deleteAccount: remove,
    }),
    [loading, session, profile, refreshProfile, signOut, remove],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): Auth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
