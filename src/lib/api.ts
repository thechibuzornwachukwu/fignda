// Data calls. Everything here runs as the signed-in user; RLS decides what is allowed.

import type { SavedSession } from '../games/session';
import type { PlayRow } from './profileStats';
import { storage } from './storage';
import type { Note } from './notifications';
import type { WordStat } from './wordStats';
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

/** The look kept with the avatar (BUILD_PLAN 3b). Its owner only: `profile_private` has no other reader. Null: never answered. */
export async function fetchLook(id: string): Promise<string | null> {
  const { data, error } = await (await client()).from('profile_private').select('look').eq('user_id', id).maybeSingle();
  if (error) throw error;
  return typeof data?.look === 'string' ? data.look : null;
}

/** Save the look. The database only accepts the 3 answers or null. */
export async function saveLook(id: string, look: string | null): Promise<boolean> {
  const { error } = await (await client()).from('profile_private').upsert({ user_id: id, look }, { onConflict: 'user_id' });
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

const PLAY_COLS = 'game_id, day_no, found, total, score, secs, created_at, clean';

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

export type TeamRow = { rank: number; words: number; total: number; secs: number; players: Array<PlayerRef & { finds: number }> };

/** Teams on one puzzle: rooms of two or more signed-in players, each with their own replayed finds. */
export async function fetchTogetherBoard(gameId: string, limit = 20): Promise<TeamRow[]> {
  const { data, error } = await (await client()).rpc('together_board', { p_game: gameId, p_limit: limit });
  if (error) throw error;
  return (data ?? []) as TeamRow[];
}

/** How many verified players found each word of a daily. Empty for today until you have played it. */
export async function fetchWordStats(day: number): Promise<WordStat[]> {
  const { data, error } = await (await client()).rpc('daily_word_stats', { p_day: day });
  if (error) throw error;
  return (data ?? []) as WordStat[];
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

export type Suggested = PlayerRef & { plays: number; followers: number; mutuals: number };

/** Everyone registered, all time, minus you and the people you follow. Friends of friends first. */
export async function suggestedPlayers(limit = 12): Promise<Suggested[]> {
  const { data, error } = await (await client()).rpc('players_suggested', { p_limit: limit });
  if (error) throw error;
  return data ?? [];
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

// Friend streaks: two players, one streak. It grows on each day both have a verified daily.
export type FriendStreak = PlayerRef & { state: 'active' | 'incoming' | 'outgoing'; streak: number; you_today: boolean; them_today: boolean };

export async function myFriendStreaks(): Promise<FriendStreak[]> {
  const { data, error } = await (await client()).rpc('my_friend_streaks');
  if (error) throw error;
  return (data ?? []) as FriendStreak[];
}

/** Ask a player, or say yes if they asked first. */
export async function askFriendStreak(handle: string): Promise<'asked' | 'started' | 'exists' | 'limit' | 'failed'> {
  const { data, error } = await (await client()).rpc('friend_streak_ask', { p_handle: handle });
  if (!error) return data as 'asked' | 'started' | 'exists';
  return error.message.includes('limit') ? 'limit' : 'failed';
}

/** End a streak, take back an ask, or say no. */
export async function endFriendStreak(handle: string): Promise<boolean> {
  const { data, error } = await (await client()).rpc('friend_streak_end', { p_handle: handle });
  return !error && !!data;
}

/** Your reusable streak link code. Whoever opens the link and says yes starts a streak with you. */
export async function myStreakLink(): Promise<string | null> {
  const { data, error } = await (await client()).rpc('my_streak_link');
  return !error && typeof data === 'string' ? data : null;
}

export const STREAK_LINK_RE = /^[A-HJ-NP-Z2-9]{8}$/;

export async function streakLinkInfo(code: string): Promise<PlayerRef | null> {
  if (!STREAK_LINK_RE.test(code)) return null;
  const { data, error } = await (await client()).rpc('streak_link_info', { p_code: code });
  if (error) throw error;
  return (data as PlayerRef[] | null)?.[0] ?? null;
}

export async function joinStreakLink(code: string): Promise<'started' | 'exists' | 'self' | 'limit' | 'failed'> {
  const { data, error } = await (await client()).rpc('friend_streak_join', { p_code: code });
  if (!error) return data as 'started' | 'exists' | 'self';
  return error.message.includes('limit') ? 'limit' : 'failed';
}

export type GameInvite = PlayerRef & { game_id: string; title: string; room_code: string; created_at: string };

/** Invites into rooms from the last hour. */
export async function myGameInvites(): Promise<GameInvite[]> {
  const { data, error } = await (await client()).rpc('my_game_invites');
  if (error) throw error;
  return (data ?? []) as GameInvite[];
}

// Notifications and badges. Rows are written by database triggers; clients only read and mark read.
export async function fetchNotifications(limit = 30): Promise<Note[]> {
  const { data, error } = await (await client()).rpc('my_notifications', { p_limit: limit });
  if (error) throw error;
  return (data ?? []) as Note[];
}

export async function fetchUnread(): Promise<number> {
  const { data, error } = await (await client()).rpc('unread_notifications');
  if (error) throw error;
  return (data as number) ?? 0;
}

export async function markNotificationsRead(): Promise<void> {
  await (await client()).rpc('read_notifications');
}

/** Badge codes a player has earned, oldest first. */
export async function fetchBadges(handle: string): Promise<string[]> {
  const { data, error } = await (await client()).rpc('badges_of', { p_handle: handle });
  if (error) throw error;
  return ((data ?? []) as Array<{ code: string }>).map((b) => b.code);
}

export async function searchPlayers(prefix: string): Promise<PlayerRef[]> {
  const q = prefix.trim().toLowerCase().replace(/^@/, '');
  if (!/^[a-z0-9._]{1,20}$/.test(q)) return [];
  const { data, error } = await (await client()).rpc('players_search', { p_prefix: q, p_limit: 20 });
  if (error) throw error;
  return data as PlayerRef[];
}

export async function topPlayers(kind: 'streak' | 'perfect' | 'points'): Promise<Array<PlayerRef & { value: number }>> {
  const { data, error } =
    kind === 'points'
      ? await (await client()).rpc('players_points', { p_limit: 10 })
      : await (await client()).rpc('players_top', { p_kind: kind, p_limit: 10 });
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
      const m = k?.match(/^gazecraft-daily-(\d+)$/);
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

/** `retryAfter`: seconds from the `Retry-After` header on a 429, when the server sent one. */
export type GenerateResult = { ok: true; code: string } | { ok: false; error: string; retryAfter?: number };

/** `signal` stops the request (Cancel, the 5 minute cap, leaving the page). A stopped request answers `aborted`. */
export async function generatePuzzle(topic: string, signal?: AbortSignal): Promise<GenerateResult> {
  try {
    const r = await fetch(`${API}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ topic }),
      signal,
    });
    const body = (await r.json().catch(() => ({}))) as { code?: string; error?: string };
    if (r.ok && body.code) return { ok: true, code: body.code };
    const secs = Number(r.headers.get('Retry-After'));
    return { ok: false, error: r.status === 429 ? 'rate_limited' : (body.error ?? `http_${r.status}`), ...(r.status === 429 && secs > 0 ? { retryAfter: secs } : {}) };
  } catch {
    return { ok: false, error: signal?.aborted ? 'aborted' : 'network' };
  }
}

// Background making. The server answers at once with a job; the slow work happens inside `runGenerateJob`,
// an ordinary long request. Ask `getGenerateJob` every 5 seconds. If it says `run`, nobody is working on the
// job (the page that started it has gone): call `runGenerateJob` again.
/** `code` is null until the job is done, `error` is null unless it failed, `run` is true only while it waits unattended. */
export type GenerateJob = { id: string; state: 'waiting' | 'done' | 'failed'; code: string | null; error: string | null; run: boolean };
export type GenerateJobResult = { ok: true; job: GenerateJob } | { ok: false; error: string; /** Seconds, on a 429. */ retryAfter?: number };

const GUEST_KEY = 'gazecraft-guest';

/** A random key this browser keeps, so two guests behind one address do not share a job. Not an identity. */
function guestKey(): string {
  let k = storage.get(GUEST_KEY);
  if (!k || !/^[A-Za-z0-9_-]{8,64}$/.test(k)) {
    k = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
    storage.set(GUEST_KEY, k);
  }
  return k;
}

async function jobCall(path: string, init: RequestInit, auth: Record<string, string>): Promise<GenerateJobResult> {
  try {
    const r = await fetch(`${API}${path}`, { ...init, headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...auth } });
    const body = (await r.json().catch(() => ({}))) as Partial<GenerateJob> & { error?: string };
    if (r.ok && body.id && body.state) {
      return { ok: true, job: { id: body.id, state: body.state, code: body.code ?? null, error: body.error ?? null, run: body.run === true } };
    }
    const after = Number(r.headers.get('Retry-After'));
    return { ok: false, error: body.error ?? `http_${r.status}`, ...(after > 0 ? { retryAfter: after } : {}) };
  } catch {
    return { ok: false, error: 'network' };
  }
}

/** Ask for a puzzle. Answers at once. One job at a time: a second ask returns the first job, whatever its topic. */
export async function startGenerate(topic: string): Promise<GenerateJobResult> {
  const auth = await authHeader();
  const body = { topic, background: true, ...(auth.Authorization ? {} : { guest: guestKey() }) };
  return jobCall('/generate', { method: 'POST', body: JSON.stringify(body) }, auth);
}

/** Where a job stands. Cheap; ask every 5 seconds. */
export async function getGenerateJob(id: string): Promise<GenerateJobResult> {
  return jobCall(`/generate/${encodeURIComponent(id)}`, { method: 'GET' }, await authHeader());
}

/**
 * Do the work for a job and answer when it is over (1 to 5 minutes). Safe to call more than once: only one
 * caller does the work, the others get the state back at once. Pass a signal to stop waiting; the job itself
 * is picked up again by the next call.
 */
export async function runGenerateJob(id: string, signal?: AbortSignal): Promise<GenerateJobResult> {
  return jobCall(`/generate/${encodeURIComponent(id)}/run`, { method: 'GET', signal }, await authHeader());
}

export type PlaySubmission = {
  game: { type: 'daily'; day_no: number } | { type: 'game'; id: string };
  log: { events: Array<{ a: number; b: number; t: number }>; hints: number[]; finish: number };
  /** Room code when the game was played together. Goes to the Together board only. */
  room?: string;
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

async function postApi(path: string, body: unknown): Promise<{ ok: boolean; status: number; error?: string }> {
  const auth = await authHeader();
  if (!auth.Authorization) return { ok: false, status: 401 };
  try {
    const r = await fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth }, body: JSON.stringify(body) });
    const out = (await r.json().catch(() => ({}))) as { error?: string };
    return { ok: r.ok, status: r.status, error: out.error };
  } catch {
    return { ok: false, status: 0 };
  }
}

export type MadePuzzle = { ok: true; code: string } | { ok: false; error: string; words?: string[] };

/** Publish your own puzzle. The server runs the engine over it again before saving. */
export async function publishPuzzle(p: { title: string; noun: string; text: string; words: string[] }): Promise<MadePuzzle> {
  const auth = await authHeader();
  if (!auth.Authorization) return { ok: false, error: 'sign_in_required' };
  try {
    const r = await fetch(`${API}/puzzles`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth }, body: JSON.stringify(p) });
    const body = (await r.json().catch(() => ({}))) as { code?: string; error?: string; words?: string[] };
    return r.ok && body.code ? { ok: true, code: body.code } : { ok: false, error: body.error ?? `http_${r.status}`, words: body.words };
  } catch {
    return { ok: false, error: 'network' };
  }
}

export type MyPuzzle = { code: string; title: string; words: number; created_at: string; plays: number; ups: number; downs: number };

export async function myPuzzles(): Promise<MyPuzzle[]> {
  const { data, error } = await (await client()).rpc('my_puzzles');
  if (error) throw error;
  return (data ?? []) as MyPuzzle[];
}

export type PuzzleRating = { ups: number; downs: number; mine: boolean | null; maker: string | null; own: boolean };

export async function fetchPuzzleRating(code: string): Promise<PuzzleRating | null> {
  const { data, error } = await (await client()).rpc('puzzle_rating', { p_code: code });
  if (error) return null;
  return (data as PuzzleRating[] | null)?.[0] ?? null;
}

export async function ratePuzzle(code: string, up: boolean): Promise<boolean> {
  const { data, error } = await (await client()).rpc('rate_puzzle', { p_code: code, p_up: up });
  return !error && !!data;
}

/** Report a puzzle that is not yours. One per player per puzzle; `again` when you had reported it before. */
export async function reportPuzzle(code: string): Promise<{ ok: boolean; status: number; error: string | null; again: boolean }> {
  const auth = await authHeader();
  if (!auth.Authorization) return { ok: false, status: 401, error: 'sign_in_required', again: false };
  try {
    const r = await fetch(`${API}/puzzles/${encodeURIComponent(code)}/report`, { method: 'POST', headers: auth });
    const out = (await r.json().catch(() => ({}))) as { error?: string; again?: boolean };
    return { ok: r.ok, status: r.status, error: out.error ?? null, again: out.again === true };
  } catch {
    return { ok: false, status: 0, error: 'network', again: false };
  }
}

/** Clean reads on a public profile: every daily, and each other puzzle once. Today's daily joins when the day ends. */
export async function fetchCleanReads(handle: string): Promise<number> {
  const { data, error } = await (await client()).rpc('clean_reads_of', { p_handle: handle });
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}

// The owner page. The server answers 404 to everyone who is not an owner, so `null` means "not for you".
export type HiddenPuzzle = {
  code: string;
  title: string;
  noun: string;
  text: string;
  dict: string[];
  maker: string | null;
  safety: 'passed' | 'failed' | 'unchecked';
  reports: number;
  created_at: string;
  hidden_at: string;
};

/** Hidden puzzles, newest first; an empty list when there are none. Null when you are not an owner. */
export async function fetchHiddenPuzzles(): Promise<HiddenPuzzle[] | null> {
  const auth = await authHeader();
  if (!auth.Authorization) return null;
  try {
    const r = await fetch(`${API}/owner/puzzles`, { headers: auth });
    if (!r.ok) return null;
    const list = ((await r.json().catch(() => ({}))) as { puzzles?: HiddenPuzzle[] | null }).puzzles;
    return Array.isArray(list) ? list : [];
  } catch {
    return null;
  }
}

/** Open a hidden puzzle again. Its old reports stop counting toward hiding it. */
export const restorePuzzle = (code: string) => postApi(`/owner/puzzles/${encodeURIComponent(code)}/restore`, {});

/** Delete a hidden puzzle for good, with its plays and thumbs. */
export const removePuzzle = (code: string) => postApi(`/owner/puzzles/${encodeURIComponent(code)}/remove`, {});

/** Ask a player you follow into your room. */
export const inviteToRoom = (handle: string, game: string, room: string) => postApi('/invite', { handle, game, room });

/** Nudge a streak friend who has not played today. One a day. */
export const nudgeFriend = (handle: string) => postApi('/nudge', { handle });

export type CustomGame = { id: string; title: string; noun: string; text: string; dict: string[]; code: string };

const customGames = new Map<string, Promise<CustomGame | null>>();

/**
 * Anyone with the share code can open a custom game. One request per code: the route gate (which shows the
 * waiting screen) and the game screen share the answer. A miss is forgotten, so a retry asks again.
 */
export function fetchCustomGame(code: string): Promise<CustomGame | null> {
  let p = customGames.get(code);
  if (!p) {
    p = loadCustomGame(code).catch(() => null);
    customGames.set(code, p);
    void p.then((g) => {
      if (!g) setTimeout(() => customGames.delete(code), 2000);
    });
  }
  return p;
}

async function loadCustomGame(code: string): Promise<CustomGame | null> {
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

/** Sign out clears the session and this browser's Gazecraft data, except the theme. */
export function clearLocalCache(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('gazecraft-') && k !== 'gazecraft-theme') keys.push(k);
    }
    keys.forEach((k) => storage.remove(k));
  } catch {
    /* storage unavailable */
  }
}
