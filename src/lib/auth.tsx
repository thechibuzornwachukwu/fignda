import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { clearLocalCache, deleteAccount, fetchProfile, mergeGuestDailies, type Profile } from './api';
import { moveGuestToAccount } from './firstMinute';
import { disableReminder } from './push';
import { getSupabase, needsAuthNow, onSupabaseReady, supabaseEnabled } from './supabase';

type Auth = {
  /** False when Supabase env is not set. Everyone is a guest. */
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
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
        // Bring guest dailies into the account. Idempotent, so every sign-in is fine.
        if (p) mergeGuestDailies().catch(() => {});
        // And the character and look a guest built here. A moved character is read back so Settings shows it.
        if (p && (await moveGuestToAccount(p).catch(() => false)) && alive) setProfile(await fetchProfile(s.user.id));
      } catch {
        if (alive) setProfile(null);
      } finally {
        if (alive) {
          setLoading(false);
          setChecking(false);
        }
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
    let p = await fetchProfile(session.user.id);
    if (p && (await moveGuestToAccount(p).catch(() => false))) p = (await fetchProfile(session.user.id).catch(() => p)) ?? p;
    // Awaited: the screen that follows a new profile reads the plays, and a reload must not cut the merge short.
    if (p) await mergeGuestDailies().catch(() => {});
    setProfile(p);
    return p;
  }, [session]);

  const signOut = useCallback(async () => {
    // Save any dailies played while signed in before the local copy goes.
    if (profile) await mergeGuestDailies().catch(() => {});
    // This browser's reminder belongs to the player leaving.
    await disableReminder().catch(() => {});
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
      checking,
      session,
      email: session?.user.email ?? null,
      profile,
      refreshProfile,
      signOut,
      deleteAccount: remove,
    }),
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
