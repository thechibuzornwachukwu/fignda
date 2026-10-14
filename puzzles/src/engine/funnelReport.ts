// The guest funnel (BUILD_PLAN 2g1): games started and finished by everyone, against new accounts, day by day.
// It is the number any change to guest mode has to move. Rows in, plain text out. Pure.

export type FunnelDay = {
  /** UTC day, YYYY-MM-DD. */
  day: string;
  /** New games opened, guests included. */
  starts: number;
  /** Games played to the end. */
  ends: number;
  /** New accounts that day. */
  accounts: number;
};

export const FUNNEL_DAYS_DEFAULT = 14;
export const FUNNEL_DAYS_MAX = 365;

/** How many days to report: a whole number from 1 to a year. Anything else is the default. */
export function funnelDays(raw: string | undefined): number {
  const n = raw !== undefined && /^\d{1,3}$/.test(raw) ? Number(raw) : FUNNEL_DAYS_DEFAULT;
  return n >= 1 && n <= FUNNEL_DAYS_MAX ? n : FUNNEL_DAYS_DEFAULT;
}

/** One read-only query: a row for every one of the last `days` UTC days, today last, zeros included. */
export function funnelSql(days: number): string {
  const back = Math.min(FUNNEL_DAYS_MAX, Math.max(1, Math.floor(Number.isFinite(days) ? days : FUNNEL_DAYS_DEFAULT))) - 1;
  const counted = (kind: string) => `coalesce((select sum(c.n) from public.puzzle_counts c where c.day = d.day and c.kind = '${kind}'), 0)::bigint`;
  return [
    `with d as (select generate_series((now() at time zone 'utc')::date - ${back}, (now() at time zone 'utc')::date, interval '1 day')::date as day)`,
    `select to_char(d.day, 'YYYY-MM-DD') as day, ${counted('start')} as starts, ${counted('end')} as ends,`,
    `  (select count(*) from public.profiles p where (p.created_at at time zone 'utc')::date = d.day) as accounts`,
    'from d order by d.day;',
    '',
  ].join('\n');
}

function count(v: unknown): number {
  const n = typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v;
  return typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 ? n : 0;
}

/** The database's rows, oldest day first. A row with no day is dropped; a count that is not one reads as 0. */
export function funnelRows(rows: unknown): FunnelDay[] {
  if (!Array.isArray(rows)) return [];
  const out: FunnelDay[] = [];
  for (const r of rows as Array<Record<string, unknown> | null>) {
    if (!r || typeof r.day !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(r.day)) continue;
    out.push({ day: r.day.slice(0, 10), starts: count(r.starts), ends: count(r.ends), accounts: count(r.accounts) });
  }
  return out.sort((a, b) => a.day.localeCompare(b.day));
}

/** New accounts for every 100 games started, to 1 decimal place. Null when no game was started. */
export function per100(accounts: number, starts: number): number | null {
  return starts > 0 ? Math.round((accounts / starts) * 1000) / 10 : null;
}

const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((Math.min(part, whole) / whole) * 100)}%` : '');

function shortDay(s: string): string {
  return new Date(`${s}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/** The funnel as lines of plain text: one row a day, then the totals and the one number to watch. */
export function funnelLines(days: readonly FunnelDay[]): string[] {
  const out = ['Gazecraft guest funnel', days.length ? `${shortDay(days[0]!.day)} to ${shortDay(days[days.length - 1]!.day)}` : 'No days', ''];
  const cols = (a: string, b: string, c: string, d: string, e: string) => `${a.padEnd(8)}${b.padStart(9)}${c.padStart(10)}${d.padStart(7)}${e.padStart(10)}`;
  out.push(cols('Day', 'Started', 'Finished', '', 'Accounts'));
  for (const d of days) out.push(cols(shortDay(d.day), d.starts.toLocaleString('en-US'), d.ends.toLocaleString('en-US'), pct(d.ends, d.starts), d.accounts.toLocaleString('en-US')));
  const sum = (k: 'starts' | 'ends' | 'accounts') => days.reduce((n, d) => n + d[k], 0);
  const starts = sum('starts');
  const accounts = sum('accounts');
  out.push(cols('Total', starts.toLocaleString('en-US'), sum('ends').toLocaleString('en-US'), pct(sum('ends'), starts), accounts.toLocaleString('en-US')), '');
  const rate = per100(accounts, starts);
  out.push(rate === null ? 'No game was started in these days, so there is no rate to give.' : `${rate} new accounts for every 100 games started.`);
  out.push('Games count everyone, guests included, from 10 Oct 2026. They are counted in the browser and not checked.');
  out.push('A player who starts 5 games is 5 starts, so this is a rate to compare week with week, not a share of people.');
  return out;
}
