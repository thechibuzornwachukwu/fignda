// Data calls. Everything here runs as the signed-in user; RLS decides what is allowed.

import type { SavedSession } from '../games/session';
import { storage } from './storage';
import { getSupabase } from './supabase';

export type Profile = { id: string; name: string; handle: string };

async function client() {
  const sb = await getSupabase();
  if (!sb) throw new Error('Sign in is not set up.');
  return sb;
}

export async function fetchProfile(id: string): Promise<Profile | null> {
  const { data, error } = await (await client()).from('profiles').select('id, name, handle').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export type SaveProfileError = 'taken' | 'invalid' | 'failed';

export async function saveProfile(p: Profile, exists: boolean): Promise<SaveProfileError | null> {
  const sb = await client();
  const q = exists
    ? sb.from('profiles').update({ name: p.name, handle: p.handle }).eq('id', p.id)
    : sb.from('profiles').insert(p);
  const { error } = await q;
  if (!error) return null;
  if (error.code === '23505') return 'taken';
  if (error.code === '23514') return 'invalid';
  return 'failed';
}

/** Day numbers of the user's stored dailies. */
export async function fetchDailyDays(): Promise<number[]> {
  const { data, error } = await (await client()).from('plays').select('day_no').not('day_no', 'is', null);
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
  const { data, error } = await (await client()).rpc('merge_guest_plays', { items });
  if (error) throw error;
  return data as number;
}

// ---------------------------------------------------------------------------
// Worker API (/api). Same origin in production; Vite proxies it to `wrangler dev` locally.
// ---------------------------------------------------------------------------

const API = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

async function authHeader(): Promise<Record<string, string>> {
  const sb = await getSupabase();
  const token = (await sb?.auth.getSession())?.data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Whether custom topics are switched on (an AI provider is configured). False if the API is unreachable. */
export async function generateAvailable(): Promise<boolean> {
  try {
    const r = await fetch(`${API}/health`, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return false;
    return ((await r.json()) as { generate?: boolean }).generate === true;
  } catch {
    return false;
  }
}

export type GenerateResult = { ok: true; code: string } | { ok: false; error: string };

export async function generatePuzzle(topic: string): Promise<GenerateResult> {
  try {
    const r = await fetch(`${API}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ topic }),
    });
    const body = (await r.json().catch(() => ({}))) as { code?: string; error?: string };
    return r.ok && body.code ? { ok: true, code: body.code } : { ok: false, error: body.error ?? `http_${r.status}` };
  } catch {
    return { ok: false, error: 'network' };
  }
}

export type PlaySubmission = {
  game: { type: 'daily'; day_no: number } | { type: 'game'; id: string };
  log: { events: Array<{ a: number; b: number; t: number }>; hints: number[]; finish: number };
};

/** Signed-in only. The server replays the log and stores a verified play. */
export async function submitPlay(p: PlaySubmission): Promise<{ ok: boolean; status: number }> {
  const auth = await authHeader();
  if (!auth.Authorization) return { ok: false, status: 401 };
  try {
    const r = await fetch(`${API}/plays`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify(p),
    });
    return { ok: r.ok, status: r.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

export type CustomGame = { id: string; title: string; noun: string; text: string; dict: string[]; code: string };

/** Anyone with the share code can open a custom game. */
export async function fetchCustomGame(code: string): Promise<CustomGame | null> {
  const sb = await getSupabase();
  if (!sb || !/^[A-Za-z2-7]{8}$/.test(code)) return null;
  const { data, error } = await sb.rpc('get_game_by_code', { p_code: code });
  const g = !error && Array.isArray(data) ? data[0] : null;
  return g ? { id: g.id, title: g.title, noun: g.noun, text: g.text, dict: g.dict, code: g.share_code } : null;
}

export async function deleteAccount(): Promise<void> {
  const { error } = await (await client()).rpc('delete_account');
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
