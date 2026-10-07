// Data calls. Everything here runs as the signed-in user; RLS decides what is allowed.

import type { SavedSession } from '../games/session';
import type { PlayRow } from './profileStats';
import { storage } from './storage';
import { getSupabase } from './supabase';

export type Profile = { id: string; name: string; handle: string; /** Avatar design code, or null before the player designs one. */ avatar?: string | null };

async function client() {
  const sb = await getSupabase();
  if (!sb) throw new Error('Sign in is not set up.');
  return sb;
}

export async function fetchProfile(id: string): Promise<Profile | null> {
  const { data, error } = await (await client()).from('profiles').select('id, name, handle, avatar').eq('id', id).maybeSingle();
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

/** Save the signed-in player's avatar design. The database only accepts the part code alphabet. */
export async function saveAvatar(id: string, code: string): Promise<boolean> {
  const { error } = await (await client()).from('profiles').update({ avatar: code }).eq('id', id);
  return !error;
}

export type PublicProfile = Profile & { created_at: string };

/** Anyone can open a profile by handle. Name and handle only; never the email. */
export async function fetchProfileByHandle(handle: string): Promise<PublicProfile | null> {
  if (!/^[a-z0-9._]{2,20}$/.test(handle)) return null;
  const { data, error } = await (await client())
    .from('profiles')
    .select('id, name, handle, created_at')
    .eq('handle', handle)
    .maybeSingle();
  if (error) throw error;
  return data;
}

const PLAY_COLS = 'game_id, day_no, found, total, score, secs, created_at';

/** Verified plays anyone can see. Today's daily total is masked by the database. */
export async function fetchPublicPlays(handle: string, limit = 400): Promise<PlayRow[]> {
  const { data, error } = await (await client())
    .from('plays_public')
    .select(PLAY_COLS)
    .eq('handle', handle)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as PlayRow[];
}

export type Challenger = { handle: string; score: number; found: number; secs: number };

/** A challenger's best verified play on this puzzle or daily. Null when they have none or the handle is not valid. */
export async function fetchChallenger(handle: string, game: { id: string } | { day: number }): Promise<Challenger | null> {
  if (!/^[a-z0-9._]{2,20}$/.test(handle)) return null;
  let q = (await client()).from('plays_public').select('handle, score, found, secs').eq('handle', handle);
  q = 'day' in game ? q.eq('day_no', game.day) : q.eq('game_id', game.id).is('day_no', null);
  const { data, error } = await q.order('score', { ascending: false }).limit(1);
  if (error) return null;
  return (data?.[0] as Challenger | undefined) ?? null;
}

/** All of the signed-in player's own plays, verified or not (RLS: own rows only). */
export async function fetchOwnPlays(limit = 400): Promise<PlayRow[]> {
  const { data, error } = await (await client())
    .from('plays')
    .select(`${PLAY_COLS}, verified`)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as PlayRow[];
}

export type BoardRow = { rank: number; handle: string; score: number; secs: number; found: number; total: number | null };
export type MyRank = BoardRow & { players: number };

/** Top verified scores for one daily. Today's totals are masked by the database. */
export async function fetchDailyBoard(day: number, limit = 20): Promise<BoardRow[]> {
  const { data, error } = await (await client()).rpc('daily_board', { p_day: day, p_limit: limit });
  if (error) throw error;
  return data as BoardRow[];
}

export async function fetchDailyRank(day: number, handle: string): Promise<MyRank | null> {
  const { data, error } = await (await client()).rpc('daily_rank', { p_day: day, p_handle: handle });
  if (error) throw error;
  return (data as MyRank[])[0] ?? null;
}

/** Best verified play per player on one puzzle. */
export async function fetchGameBoard(gameId: string, limit = 20): Promise<BoardRow[]> {
  const { data, error } = await (await client()).rpc('game_board', { p_game: gameId, p_limit: limit });
  if (error) throw error;
  return data as BoardRow[];
}

// ---------------------------------------------------------------------------
// Community: follows and discovery. Handles and names only; RLS guards writes.
// ---------------------------------------------------------------------------

export type PlayerRef = { handle: string; name: string };
export type Summary = {
  handle: string;
  name: string;
  created_at: string;
  current_streak: number;
  best_streak: number;
  dailies: number;
  perfect: number;
  followers: number;
  following: number;
};

export async function fetchSummary(handle: string): Promise<Summary | null> {
  const { data, error } = await (await client()).rpc('profile_summary', { p_handle: handle });
  if (error) throw error;
  return (data as Summary[])[0] ?? null;
}

export async function fetchFollowers(handle: string): Promise<PlayerRef[]> {
  const { data, error } = await (await client()).rpc('followers_of', { p_handle: handle, p_limit: 50 });
  if (error) throw error;
  return data as PlayerRef[];
}

export async function fetchFollowing(handle: string): Promise<PlayerRef[]> {
  const { data, error } = await (await client()).rpc('following_of', { p_handle: handle, p_limit: 50 });
  if (error) throw error;
  return data as PlayerRef[];
}

async function idOf(handle: string): Promise<string | null> {
  const { data } = await (await client()).from('profiles').select('id').eq('handle', handle).maybeSingle();
  return data?.id ?? null;
}

export async function isFollowing(me: string, handle: string): Promise<boolean> {
  const target = await idOf(handle);
  if (!target) return false;
  const { data } = await (await client())
    .from('follows')
    .select('followee_id')
    .eq('follower_id', me)
    .eq('followee_id', target)
    .maybeSingle();
  return !!data;
}

export async function follow(me: string, handle: string): Promise<boolean> {
  const target = await idOf(handle);
  if (!target) return false;
  const { error } = await (await client()).from('follows').insert({ follower_id: me, followee_id: target });
  return !error || error.code === '23505';
}

export async function unfollow(me: string, handle: string): Promise<boolean> {
  const target = await idOf(handle);
  if (!target) return false;
  const { error } = await (await client()).from('follows').delete().eq('follower_id', me).eq('followee_id', target);
  return !error;
}

/** Stop someone following you. */
export async function removeFollower(me: string, handle: string): Promise<boolean> {
  const who = await idOf(handle);
  if (!who) return false;
  const { error } = await (await client()).from('follows').delete().eq('follower_id', who).eq('followee_id', me);
  return !error;
}

export async function fetchFollowingBoard(day: number): Promise<BoardRow[]> {
  const { data, error } = await (await client()).rpc('following_board', { p_day: day, p_limit: 50 });
  if (error) throw error;
  return data as BoardRow[];
}

// Circles: a private daily table for a family, class, church or office. Members only; joined by a link.
export type CircleInfo = { code: string; name: string; members: number; is_member: boolean; is_owner: boolean };
export type CircleRow = { rank: number | null; handle: string; name: string; score: number | null; secs: number | null; found: number | null; total: number | null };
export type CircleWeekRow = { rank: number; handle: string; name: string; score: number; days: number };
export const CIRCLE_RE = /^[A-HJ-NP-Z2-9]{6}$/;

export async function fetchCircle(code: string): Promise<CircleInfo | null> {
  if (!CIRCLE_RE.test(code)) return null;
  const { data, error } = await (await client()).rpc('circle_info', { p_code: code });
  if (error) throw error;
  return (data as CircleInfo[] | null)?.[0] ?? null;
}

export async function myCircles(): Promise<Array<Pick<CircleInfo, 'code' | 'name' | 'members' | 'is_owner'>>> {
  const { data, error } = await (await client()).rpc('my_circles');
  if (error) throw error;
  return data ?? [];
}

/** Returns the new circle code, or why it failed. */
export async function createCircle(name: string): Promise<{ code: string } | { error: 'limit' | 'invalid' | 'failed' }> {
  const { data, error } = await (await client()).rpc('create_circle', { p_name: name });
  if (!error && typeof data === 'string') return { code: data };
  if (error?.message.includes('circle limit')) return { error: 'limit' };
  if (error?.code === '23514') return { error: 'invalid' };
  return { error: 'failed' };
}

export async function joinCircle(code: string): Promise<'joined' | 'full' | 'limit' | 'missing' | 'failed'> {
  if (!CIRCLE_RE.test(code)) return 'missing';
  const { data, error } = await (await client()).rpc('join_circle', { p_code: code });
  if (!error) return data ? 'joined' : 'missing';
  if (error.message.includes('circle full')) return 'full';
  if (error.message.includes('circle limit')) return 'limit';
  return 'failed';
}

export async function leaveCircle(code: string): Promise<boolean> {
  const { error } = await (await client()).rpc('leave_circle', { p_code: code });
  return !error;
}

export async function removeFromCircle(code: string, handle: string): Promise<boolean> {
  const { data, error } = await (await client()).rpc('remove_circle_member', { p_code: code, p_handle: handle });
  return !error && !!data;
}

export async function fetchCircleBoard(code: string, day: number): Promise<CircleRow[]> {
  const { data, error } = await (await client()).rpc('circle_board', { p_code: code, p_day: day });
  if (error) throw error;
  return data ?? [];
}

export async function fetchCircleWeek(code: string): Promise<CircleWeekRow[]> {
  const { data, error } = await (await client()).rpc('circle_week', { p_code: code });
  if (error) throw error;
  return data ?? [];
}

export async function searchPlayers(prefix: string): Promise<PlayerRef[]> {
  const q = prefix.trim().toLowerCase().replace(/^@/, '');
  if (!/^[a-z0-9._]{1,20}$/.test(q)) return [];
  const { data, error } = await (await client()).rpc('players_search', { p_prefix: q, p_limit: 20 });
  if (error) throw error;
  return data as PlayerRef[];
}

export async function topPlayers(kind: 'streak' | 'perfect'): Promise<Array<PlayerRef & { value: number }>> {
  const { data, error } = await (await client()).rpc('players_top', { p_kind: kind, p_limit: 10 });
  if (error) throw error;
  return data as Array<PlayerRef & { value: number }>;
}

export async function newPlayers(): Promise<Array<PlayerRef & { created_at: string }>> {
  const { data, error } = await (await client()).rpc('players_new', { p_limit: 10 });
  if (error) throw error;
  return data as Array<PlayerRef & { created_at: string }>;
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
