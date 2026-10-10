// The sponsor report (SPEC section 5, Sponsor report). Counts in, plain text out. Pure.
// The counts come from the database (`sponsor_report`), never from here. This file only reads and words them.

export type ReportCounts = {
  /** New games opened. Everyone, guests included. */
  starts: number;
  /** Games played to the end with at least 1 word found. */
  ends: number;
  /** Games that ended with every word found. */
  fulls: number;
  shares: number;
  /** Different signed in players with a verified play, alone or in a room. */
  players: number;
};

export type ReportEntry = {
  id: string;
  title: string;
  /** The sponsor's name, when the puzzle carries one. */
  sponsor?: string;
};

export type ReportRange = { from?: string; to?: string };

/** The first day games and shares were counted. A range that starts before it is missing what came earlier. */
export const COUNTED_FROM = '2026-10-10';

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
      starts: count(r.starts),
      ends: count(r.ends),
      fulls: count(r.fulls),
      shares: count(r.shares),
      players: count(r.players),
    });
  }
  return out;
}

/** `part` of `whole` as 0 to 100. Null when there is no whole: never "0%" of nothing. Never over 100. */
export function share(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((Math.min(part, whole) / whole) * 100) : null;
}

/** The share of games started that were played to the end. */
export const finishRate = (c: ReportCounts): number | null => share(c.ends, c.starts);

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

const row = (label: string, value: string) => `${label.padEnd(19)}${value}`;
const withShare = (n: number, pct: number | null, of = '') => (pct === null ? num(n) : `${num(n)} (${pct}%${of})`);

const NONE: ReportCounts = { starts: 0, ends: 0, fulls: 0, shares: 0, players: 0 };

/** The report as lines of plain text, one block per puzzle in the order given. A puzzle with no row reads as zeros. */
export function reportLines(entries: readonly ReportEntry[], counts: ReadonlyMap<string, ReportCounts>, range: ReportRange = {}): string[] {
  const out = ['Gazecraft sponsor report', rangeLine(range), ''];
  if (entries.length === 0) {
    out.push('No puzzle carries a sponsor yet.');
    return out;
  }
  for (const e of entries) {
    const c = counts.get(e.id) ?? NONE;
    out.push(e.title);
    if (e.sponsor) out.push(`With ${e.sponsor}`);
    out.push(
      row('Games started', num(c.starts)),
      row('Played to the end', withShare(c.ends, finishRate(c))),
      row('Found every word', withShare(c.fulls, share(c.fulls, c.ends), ' of those')),
      row('Shares', num(c.shares)),
      row('Signed in players', num(c.players)),
      '',
    );
  }
  out.push('Games and shares count everyone, guests included. Played to the end means at least 1 word found.');
  out.push('Signed in players are different accounts with a play the server checked.');
  if (!range.from || range.from < COUNTED_FROM) out.push(`Games and shares are counted from ${day(COUNTED_FROM)}. Nothing before that day is in them.`);
  return out;
}
