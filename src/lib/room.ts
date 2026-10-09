// Live co-op rooms. Everyone in a room plays the same puzzle and sees each other's finds.
// Transport: Supabase Realtime broadcast + presence (free tier). E2E builds use BroadcastChannel so two tabs
// can play together without a server.
// Trust: nothing received is applied as is. Spans go back through the engine on each device (session.teamPick),
// so a room can only ever mark words that really are in the text.
// Ranking: each signed-in player sends their own play log when the game ends; the server replays it for the
// Together board (worker/src/app.ts). Nothing said in the room is used for ranking.

import { getSupabase } from './supabase';

/** A player in the room. Signed in players carry their name and handle; guests are "A friend". */
export type Peer = { id: string; name: string; handle?: string; away?: boolean } & Partial<RoomStats>;
/** What each player reports for the room scoreboard. This is the live view only; the Together board uses the server's replay. */
export type RoomStats = { finds: number; hints: number; /** Seconds per word, from your start to your last find. */ pace: number };
export type RoomHandlers = {
  onFind: (a: number, b: number, from: Peer) => void;
  onPeers: (peers: Peer[]) => void;
  /** Someone new arrived: say so and send them what you have found. */
  onJoin: (who: Peer) => void;
  /** Someone asks for everything found so far (they joined, reconnected or came back to the app). */
  onAsk: () => void;
  onStatus: (s: RoomStatus) => void;
};
export type RoomStatus = 'connecting' | 'live' | 'offline';
export type Room = {
  sendFind: (a: number, b: number) => void;
  sendSync: (spans: Array<[number, number]>) => void;
  /** Ask everyone to send their finds. */
  ask: () => void;
  /** In the background (another app) or back. Shown to the others. */
  setAway: (away: boolean) => void;
  /** Your line on the room scoreboard. */
  setStats: (s: RoomStats) => void;
  leave: () => void;
};

export type Row = Peer & { you?: boolean };

/** Most words, then fastest per word, then fewest hints. No finds yet sorts last. */
export function rankRoom(rows: Row[]): Row[] {
  const pace = (r: Row) => (r.finds ? (r.pace ?? Infinity) : Infinity);
  return [...rows].sort((x, y) => (y.finds ?? 0) - (x.finds ?? 0) || pace(x) - pace(y) || (x.hints ?? 0) - (y.hints ?? 0));
}

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_RE = /^[A-HJ-NP-Z2-9]{6}$/;

export function newRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

const MAX_SPAN = 100_000;
const isIdx = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) < MAX_SPAN;
const cleanName = (n: unknown) => (typeof n === 'string' ? n.replace(/\s+/g, ' ').trim().slice(0, 40) : '') || 'A friend';
const HANDLE_RE = /^[a-z0-9._]{2,20}$/;
const cleanPeer = (p: unknown): Peer | null => {
  const o = p as { id?: unknown; name?: unknown; handle?: unknown; away?: unknown } | null;
  if (!o || typeof o.id !== 'string' || o.id.length > 64) return null;
  const handle = typeof o.handle === 'string' && HANDLE_RE.test(o.handle) ? o.handle : undefined;
  const n = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(Math.round(v), max) : undefined);
  const x = o as { finds?: unknown; hints?: unknown; pace?: unknown };
  return { id: o.id, name: cleanName(o.name), handle, away: o.away === true, finds: n(x.finds, 500), hints: n(x.hints, 500), pace: n(x.pace, 86_400) };
};

/** Validate an incoming message and hand it on. Anything malformed is dropped. */
function receive(h: RoomHandlers, me: Peer, event: string, payload: unknown) {
  const p = payload as { a?: unknown; b?: unknown; spans?: unknown; from?: unknown } | null;
  const from = cleanPeer(p?.from);
  if (!p || !from || from.id === me.id) return;
  if (event === 'ask') h.onAsk();
  if (event === 'find' && isIdx(p.a) && isIdx(p.b)) h.onFind(p.a, p.b, from);
  if (event === 'sync' && Array.isArray(p.spans)) {
    for (const s of p.spans.slice(0, 500)) {
      if (Array.isArray(s) && isIdx(s[0]) && isIdx(s[1])) h.onFind(s[0], s[1], from);
    }
  }
}

export async function joinRoom(code: string, me: Peer, h: RoomHandlers): Promise<Room | null> {
  if (!ROOM_RE.test(code)) return null;
  return import.meta.env.VITE_E2E === '1' ? localRoom(code, me, h) : realtimeRoom(code, me, h);
}

async function realtimeRoom(code: string, me: Peer, h: RoomHandlers): Promise<Room | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  h.onStatus('connecting');
  const ch = sb.channel(`room:${code}`, { config: { broadcast: { self: false }, presence: { key: me.id } } });
  let away = false;
  let stats: RoomStats = { finds: 0, hints: 0, pace: 0 };
  const peers = () =>
    Object.entries(ch.presenceState<Record<string, unknown>>())
      .map(([id, metas]) => cleanPeer({ ...metas[0], id }))
      .filter((p): p is Peer => !!p && p.id !== me.id);
  const track = () => void ch.track({ name: me.name, handle: me.handle, away, ...stats });
  const send = (event: string, payload: object = {}) => void ch.send({ type: 'broadcast', event, payload: { ...payload, from: me } });
  for (const event of ['find', 'sync', 'ask']) ch.on('broadcast', { event }, ({ payload }) => receive(h, me, event, payload));
  ch.on('presence', { event: 'sync' }, () => h.onPeers(peers()))
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      const who = cleanPeer({ ...(newPresences[0] as object | undefined), id: key });
      if (who && key !== me.id) h.onJoin(who);
    })
    .subscribe((status) => {
      // Runs again after every reconnect (phones drop the socket in the background). Each time: be seen again
      // and ask everyone for their finds, so nothing found while we were away is lost.
      if (status === 'SUBSCRIBED') {
        h.onStatus('live');
        track();
        send('ask');
      } else h.onStatus('offline');
    });
  return {
    sendFind: (a, b) => send('find', { a, b }),
    sendSync: (spans) => send('sync', { spans }),
    ask: () => {
      // Back from the background: make sure the socket is up, then ask.
      if (!sb.realtime.isConnected()) sb.realtime.connect();
      send('ask');
    },
    setAway: (a) => {
      away = a;
      track();
    },
    setStats: (st) => {
      stats = st;
      track();
    },
    leave: () => void sb.removeChannel(ch),
  };
}

/** Test transport: same messages over BroadcastChannel, with hello/here/bye standing in for presence. */
function localRoom(code: string, me: Peer, h: RoomHandlers): Room {
  const bc = new BroadcastChannel(`gazecraft-room-${code}`);
  const others = new Map<string, Peer>();
  let away = false;
  let stats: RoomStats = { finds: 0, hints: 0, pace: 0 };
  const post = (event: string, payload: object = {}) => bc.postMessage({ event, payload: { ...payload, from: { ...me, away, ...stats } } });
  bc.onmessage = (e: MessageEvent<{ event: string; payload: unknown }>) => {
    const { event, payload } = e.data ?? {};
    const from = cleanPeer((payload as { from?: unknown } | null)?.from);
    if (!from || from.id === me.id) return;
    if (event === 'hello' || event === 'here' || event === 'state') {
      const fresh = !others.has(from.id);
      others.set(from.id, from);
      h.onPeers([...others.values()]);
      if (event === 'hello') post('here');
      if (fresh && event !== 'state') h.onJoin(from);
    } else if (event === 'bye') {
      others.delete(from.id);
      h.onPeers([...others.values()]);
    } else receive(h, me, event, payload);
  };
  h.onStatus('live');
  post('hello');
  return {
    sendFind: (a, b) => post('find', { a, b }),
    sendSync: (spans) => post('sync', { spans }),
    ask: () => post('ask'),
    setAway: (a) => {
      away = a;
      post('state');
    },
    setStats: (st) => {
      stats = st;
      post('state');
    },
    leave: () => {
      post('bye');
      bc.close();
    },
  };
}
