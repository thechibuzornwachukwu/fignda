// Live co-op rooms. Everyone in a room plays the same puzzle and sees each other's finds.
// Transport: Supabase Realtime broadcast + presence (free tier). E2E builds use BroadcastChannel so two tabs
// can play together without a server.
// Trust: nothing received is applied as is. Spans go back through the engine on each device (session.teamPick),
// so a room can only ever mark words that really are in the text. Rooms are unranked: no plays are sent.

import { getSupabase } from './supabase';

export type Peer = { id: string; name: string };
export type RoomHandlers = {
  onFind: (a: number, b: number, from: Peer) => void;
  onPeers: (peers: Peer[]) => void;
  /** Someone new arrived: send them what you have found. */
  onJoin: (who: Peer) => void;
};
export type Room = {
  sendFind: (a: number, b: number) => void;
  sendSync: (spans: Array<[number, number]>) => void;
  leave: () => void;
};

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_RE = /^[A-HJ-NP-Z2-9]{6}$/;

export function newRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

const MAX_SPAN = 100_000;
const isIdx = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) < MAX_SPAN;
const cleanName = (n: unknown) => (typeof n === 'string' ? n.replace(/\s+/g, ' ').trim().slice(0, 40) : '') || 'A friend';
const cleanPeer = (p: unknown): Peer | null => {
  const o = p as { id?: unknown; name?: unknown } | null;
  return o && typeof o.id === 'string' && o.id.length <= 64 ? { id: o.id, name: cleanName(o.name) } : null;
};

/** Validate an incoming message and hand it on. Anything malformed is dropped. */
function receive(h: RoomHandlers, me: Peer, event: string, payload: unknown) {
  const p = payload as { a?: unknown; b?: unknown; spans?: unknown; from?: unknown } | null;
  const from = cleanPeer(p?.from);
  if (!p || !from || from.id === me.id) return;
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
  const ch = sb.channel(`room:${code}`, { config: { broadcast: { self: false }, presence: { key: me.id } } });
  const peers = () =>
    Object.entries(ch.presenceState<{ name?: string }>())
      .map(([id, metas]) => ({ id, name: cleanName(metas[0]?.name) }))
      .filter((p) => p.id !== me.id);
  ch.on('broadcast', { event: 'find' }, ({ payload }) => receive(h, me, 'find', payload))
    .on('broadcast', { event: 'sync' }, ({ payload }) => receive(h, me, 'sync', payload))
    .on('presence', { event: 'sync' }, () => h.onPeers(peers()))
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      if (key !== me.id) h.onJoin({ id: key, name: cleanName((newPresences[0] as { name?: string } | undefined)?.name) });
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') void ch.track({ name: me.name });
    });
  const send = (event: string, payload: object) => void ch.send({ type: 'broadcast', event, payload: { ...payload, from: me } });
  return {
    sendFind: (a, b) => send('find', { a, b }),
    sendSync: (spans) => send('sync', { spans }),
    leave: () => void sb.removeChannel(ch),
  };
}

/** Test transport: same messages over BroadcastChannel, with hello/here/bye standing in for presence. */
function localRoom(code: string, me: Peer, h: RoomHandlers): Room {
  const bc = new BroadcastChannel(`fignda-room-${code}`);
  const others = new Map<string, Peer>();
  const post = (event: string, payload: object = {}) => bc.postMessage({ event, payload: { ...payload, from: me } });
  bc.onmessage = (e: MessageEvent<{ event: string; payload: unknown }>) => {
    const { event, payload } = e.data ?? {};
    const from = cleanPeer((payload as { from?: unknown } | null)?.from);
    if (!from || from.id === me.id) return;
    if (event === 'hello' || event === 'here') {
      const fresh = !others.has(from.id);
      others.set(from.id, from);
      h.onPeers([...others.values()]);
      if (event === 'hello') post('here');
      if (fresh) h.onJoin(from);
    } else if (event === 'bye') {
      others.delete(from.id);
      h.onPeers([...others.values()]);
    } else receive(h, me, event, payload);
  };
  post('hello');
  return {
    sendFind: (a, b) => post('find', { a, b }),
    sendSync: (spans) => post('sync', { spans }),
    leave: () => {
      post('bye');
      bc.close();
    },
  };
}
