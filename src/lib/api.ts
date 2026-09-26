// Data calls. Everything here runs as the signed-in user; RLS decides what is allowed.

import type { SavedSession } from '../games/session';
import { storage } from './storage';
import { supabase } from './supabase';

export type Profile = { id: string; name: string; handle: string };

function client() {
  if (!supabase) throw new Error('Sign in is not set up.');
  return supabase;
}

export async function fetchProfile(id: string): Promise<Profile | null> {
  const { data, error } = await client().from('profiles').select('id, name, handle').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export type SaveProfileError = 'taken' | 'invalid' | 'failed';

export async function saveProfile(p: Profile, exists: boolean): Promise<SaveProfileError | null> {
  const q = exists
    ? client().from('profiles').update({ name: p.name, handle: p.handle }).eq('id', p.id)
    : client().from('profiles').insert(p);
  const { error } = await q;
  if (!error) return null;
  if (error.code === '23505') return 'taken';
  if (error.code === '23514') return 'invalid';
  return 'failed';
}

/** Day numbers of the user's stored dailies. */
export async function fetchDailyDays(): Promise<number[]> {
  const { data, error } = await client().from('plays').select('day_no').not('day_no', 'is', null);
  if (error) throw error;
  return data.map((r) => r.day_no as number);
}

/** Finished dailies in this browser, newest first. */
export function localDailies(limit = 60): Array<{ day_no: number; s: SavedSession }> {
  const out: Array<{ day_no: number; s: SavedSession }> = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const m = k?.match(/^fignda-daily-(\d+)$/);
      if (!m) continue;
      const s = storage.getJSON<SavedSession>(k!);
      if (s && s.endAt != null && Array.isArray(s.found)) out.push({ day_no: Number(m[1]), s });
    }
  } catch {
    /* storage unavailable */
  }
  return out.sort((a, b) => b.day_no - a.day_no).slice(0, limit);
}

/**
 * Guest merge. Sends finished local dailies; the server stores them unverified,
 * picks the game and total itself and recomputes the score. Safe to repeat.
 */
export async function mergeGuestDailies(): Promise<number> {
  const items = localDailies().map(({ day_no, s }) => ({
    day_no,
    found: s.found.length,
    hints: s.hints,
    misses: s.misses,
    secs: Math.max(0, Math.floor(((s.endAt ?? s.startAt) - s.startAt) / 1000)),
  }));
  if (!items.length) return 0;
  const { data, error } = await client().rpc('merge_guest_plays', { items });
  if (error) throw error;
  return data as number;
}

export async function deleteAccount(): Promise<void> {
  const { error } = await client().rpc('delete_account');
  if (error) throw error;
}

/** Sign out clears the session and this browser's Fignda data, except the theme. */
export function clearLocalCache(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('fignda-') && k !== 'fignda-theme') keys.push(k);
    }
    keys.forEach((k) => storage.remove(k));
  } catch {
    /* storage unavailable */
  }
}
