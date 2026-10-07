// Notifications and badges: what each one says and where it leads. The rows come from the database
// (written by triggers, never by a client); this file only turns them into words.

import { dayNo } from '../engine/daily';

export type NoteKind = 'follow' | 'streak_ask' | 'streak_start' | 'room_invite' | 'nudge' | 'badge';

export type Note = {
  id: number;
  kind: NoteKind;
  /** The other player, when there is one. */
  handle: string | null;
  name: string | null;
  data: { code?: string; game?: string; room?: string; title?: string; day?: number };
  created_at: string;
  unread: boolean;
};

const POINTS = [1000, 5000, 10000, 25000, 50000, 100000];
const STREAKS = [7, 30, 50, 100, 365];

/** Every badge, in the order a profile shows them. Codes are stored; never rename one. */
export const BADGES: ReadonlyArray<{ code: string; label: string; how: string }> = [
  { code: 'first_game', label: 'First game', how: 'Finish a game signed in.' },
  { code: 'perfect_daily', label: 'Perfect daily', how: 'Find every word in a daily.' },
  ...STREAKS.map((n) => ({ code: `streak_${n}`, label: `${n} day streak`, how: `Play the daily ${n} days in a row.` })),
  ...POINTS.map((n) => ({ code: `points_${n}`, label: `${n.toLocaleString('en-US')} points`, how: `Reach ${n.toLocaleString('en-US')} points.` })),
];

export const badgeLabel = (code: string | undefined): string => BADGES.find((b) => b.code === code)?.label ?? 'New badge';

/** Where a game lives: curated puzzles by id, custom ones by their share code. */
const gamePath = (id: string) => (id.startsWith('c-') ? `/p/${id.slice(2).toUpperCase()}` : `/play/${id}`);

/** A room is only worth joining while it is fresh. */
const ROOM_MINUTES = 60;

/** The sentence and the link for one notification. `me` is the reader's own handle. */
export function describe(n: Note, me: string, now = Date.now()): { text: string; to: string } {
  const who = n.name ?? 'A player';
  switch (n.kind) {
    case 'follow':
      return { text: `${who} followed you.`, to: n.handle ? `/u/${n.handle}` : '/players' };
    case 'streak_ask':
      return { text: `${who} wants a streak with you.`, to: '/players#friend-streaks' };
    case 'streak_start':
      return { text: `Your streak with ${who} has started.`, to: '/players#friend-streaks' };
    case 'nudge':
      return { text: `${who} has played today and nudged you.`, to: `/d/${dayNo(new Date(now))}` };
    case 'room_invite': {
      const fresh = now - new Date(n.created_at).getTime() < ROOM_MINUTES * 60_000;
      const base = n.data.game ? gamePath(n.data.game) : '/play';
      return {
        text: `${who} invited you to play ${n.data.title ?? 'a puzzle'} together.`,
        to: fresh && n.data.room ? `${base}?room=${n.data.room}` : base,
      };
    }
    case 'badge':
      return { text: `New badge: ${badgeLabel(n.data.code)}.`, to: `/u/${me}#badges` };
  }
}

/** "now", "5 min", "3 h", "2 d", then the date. */
export function ago(iso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins} min`;
  if (mins < 24 * 60) return `${Math.floor(mins / 60)} h`;
  if (mins < 7 * 24 * 60) return `${Math.floor(mins / (24 * 60))} d`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
