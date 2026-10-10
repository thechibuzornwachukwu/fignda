// The sponsor report (SPEC section 5, Sponsor report). Counts in, plain text out. Pure.
// The counts come from the database (`sponsor_report`), never from here. This file only reads and words them.

export type ReportCounts = {
  /** Different signed in players with a verified play, alone or in a room. */
  players: number;
  /** Verified plays alone, plus room plays. */
  plays: number;
  roomPlays: number;
  /** Plays alone that found every word. */
  finished: number;
  shares: number;
};

export type ReportEntry = {
  id: string;
  title: string;
  /** The sponsor's name, when the puzzle carries one. */
  sponsor?: string;
};

export type ReportRange = { from?: string; to?: string };

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A day as the report takes it: YYYY-MM-DD and a real date. */
export function isDay(s: string): boolean {
  if (!DAY_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** A count from the database: a whole number, 0 or more. Big counts can arrive as text. Anything else is 0. */
function count(v: unknown): number {
  const n = typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v;
  return typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 ? n : 0;
}

/** The database's rows by puzzle id. A row with no id is dropped; a count that is not one reads as 0. */
export function countsById(rows: unknown): Map<string, ReportCounts> {
  const out = new Map<string, ReportCounts>();
  if (!Array.isArray(rows)) return out;
  for (const r of rows as Array<Record<string, unknown> | null>) {
    if (!r || typeof r.game_id !== 'string') continue;
    out.set(r.game_id, {
      players: count(r.players),
      plays: count(r.plays),
      roomPlays: count(r.room_plays),
      finished: count(r.finished),
      shares: count(r.shares),
    });
  }
  return out;
}

/** The share of plays alone that found every word, 0 to 100. Null when nobody played alone: never "0%". */
export function finishRate(c: ReportCounts): number | null {
  const solo = c.plays - c.roomPlays;
  if (solo <= 0) return null;
  return Math.round((Math.min(c.finished, solo) / solo) * 100);
}

const num = (n: number) => n.toLocaleString('en-US');

function day(s: string): string {
  return new Date(`${s}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function rangeLine({ from, to }: ReportRange): string {
  if (from && to) return from === to ? day(from) : `${day(from)} to ${day(to)}`;
  if (from) return `From ${day(from)}`;
  if (to) return `Up to ${day(to)}`;
  return 'All time';
}

const row = (label: string, value: string) => `${label.padEnd(13)}${value}`;

const NONE: ReportCounts = { players: 0, plays: 0, roomPlays: 0, finished: 0, shares: 0 };

/** The report as lines of plain text, one block per puzzle in the order given. A puzzle with no row reads as zeros. */
export function reportLines(entries: readonly ReportEntry[], counts: ReadonlyMap<string, ReportCounts>, range: ReportRange = {}): string[] {
  const out = ['Gazecraft sponsor report', rangeLine(range), ''];
  if (entries.length === 0) {
    out.push('No puzzle carries a sponsor yet.');
    return out;
  }
  for (const e of entries) {
    const c = counts.get(e.id) ?? NONE;
    const rate = finishRate(c);
    out.push(e.title);
    if (e.sponsor) out.push(`With ${e.sponsor}`);
    out.push(
      row('Players', num(c.players)),
      row('Plays', c.roomPlays > 0 ? `${num(c.plays)} (${num(c.roomPlays)} in a room)` : num(c.plays)),
      row('Finish rate', rate === null ? 'No plays alone yet' : `${rate}% found every word`),
      row('Shares', num(c.shares)),
      '',
    );
  }
  out.push(
    'Players and plays are signed in players only. Guests play without an account and are not counted.',
    'Finish rate is the share of plays alone that found every word.',
    'Shares count guests too.',
  );
  return out;
}
