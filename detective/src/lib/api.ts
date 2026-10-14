// Data calls. Everything here runs as the signed-in player; RLS decides what is allowed.

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
    : sb.from('profiles').insert({ id: p.id, name: p.name, handle: p.handle });
  const { error } = await q;
  if (!error) return null;
  if (error.code === '23505') return 'taken';
  if (error.code === '23514') return 'invalid';
  return 'failed';
}

/** Whether a handle is already somebody's. Name and handle only; never the email. */
export async function fetchProfileByHandle(handle: string): Promise<Profile | null> {
  if (!/^[a-z0-9._]{2,20}$/.test(handle)) return null;
  const { data, error } = await (await client()).from('profiles').select('id, name, handle').eq('handle', handle).maybeSingle();
  if (error) throw error;
  return data;
}

export type CaseRow = { rank: number; handle: string; score: number; stars: number; steps: number };

/** The board of a case: each player's best checked score on each step, added up. Most points first. */
export async function fetchChapterBoard(chapter: string): Promise<CaseRow[]> {
  const { data, error } = await (await client()).rpc('chapter_board', { p_chapter: chapter });
  if (error) throw error;
  const rows = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
  return rows
    .filter((r) => typeof r.handle === 'string')
    .map((r, i) => ({ rank: i + 1, handle: r.handle as string, score: Number(r.score) || 0, stars: Number(r.stars) || 0, steps: Number(r.steps) || 0 }));
}

/** Your steps of cases done on any device, with the best stars of each. */
export async function fetchChapterProgress(): Promise<Array<{ chapter: string; step: number; stars: number }>> {
  const { data, error } = await (await client()).rpc('my_chapter_progress');
  if (error) throw error;
  return (data ?? []) as Array<{ chapter: string; step: number; stars: number }>;
}

const API = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

async function authHeader(): Promise<Record<string, string>> {
  const sb = await getSupabase();
  const token = (await sb?.auth.getSession())?.data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type PlaySubmission = {
  /** A step of a case, counted from 1. `named`: the line-up only. `picked`: a step answered by picking only. */
  game: { type: 'case'; id: string; step: number; named?: string[]; picked?: number[] };
  log: { events: Array<{ a: number; b: number; t: number }>; hints: number[]; finish: number };
};

/** Send a finished step to be checked and kept on the account. Signed in only. */
export async function submitPlay(p: PlaySubmission): Promise<{ ok: boolean; status: number }> {
  const auth = await authHeader();
  if (!auth.Authorization) return { ok: false, status: 401 };
  try {
    const r = await fetch(`${API}/plays`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth }, body: JSON.stringify(p) });
    return { ok: r.ok, status: r.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

export async function deleteAccount(): Promise<void> {
  const { error } = await (await client()).rpc('delete_account');
  if (error) throw error;
}

/** Sign out clears the session and this browser's data, except the theme. */
export function clearLocalCache(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('lantern-') && k !== 'lantern-theme') keys.push(k);
    }
    keys.forEach((k) => storage.remove(k));
  } catch {
    /* storage unavailable */
  }
}
