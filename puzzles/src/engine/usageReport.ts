// Usage per feature per week (BUILD_PLAN set 9), for the owner: how many players used each feature, against
// the week's players. A feature under 2% of weekly players for 4 weeks in a row is flagged: it moves behind "More".
// Counts only, from the database. Rows in, plain text out. Pure.

/** Each feature, and the SQL that lists who used it in the week `w` (a Monday, UTC) as `user_id`s. */
export const FEATURES: ReadonlyArray<{ key: string; name: string; sql: string }> = [
  { key: 'path', name: 'The path', sql: `select c.user_id from public.clue_plays c where (date_trunc('week', c.created_at at time zone 'utc'))::date = w.week` },
  { key: 'whole', name: 'Whole puzzles', sql: `select p.user_id from public.plays p where p.verified and p.day_no is null and (date_trunc('week', p.created_at at time zone 'utc'))::date = w.week` },
  { key: 'rooms', name: 'Play together', sql: `select r.user_id from public.room_plays r where (date_trunc('week', r.ended_at at time zone 'utc'))::date = w.week` },
  { key: 'make', name: 'Make', sql: `select g.owner_id from public.games g where g.kind = 'custom' and g.topic_key is null and (date_trunc('week', g.created_at at time zone 'utc'))::date = w.week` },
  { key: 'circles', name: 'Circles', sql: `select m.user_id from public.circle_members m where (date_trunc('week', m.joined_at at time zone 'utc'))::date = w.week` },
  { key: 'follows', name: 'Following', sql: `select f.follower_id from public.follows f where (date_trunc('week', f.created_at at time zone 'utc'))::date = w.week` },
  { key: 'streaks', name: 'Friend streaks', sql: `select s.asked_by from public.friend_streaks s where (date_trunc('week', s.created_at at time zone 'utc'))::date = w.week` },
  { key: 'league', name: 'Leagues', sql: `select l.user_id from public.league_seats l where l.week = w.week` },
  { key: 'shares', name: 'Sharing', sql: `select s.user_id from public.shares s where (date_trunc('week', s.created_at at time zone 'utc'))::date = w.week` },
];

/** Under this share of weekly players, for this many weeks in a row: behind "More". */
export const QUIET_SHARE = 0.02;
export const QUIET_WEEKS = 4;
export const USAGE_WEEKS_DEFAULT = 8;
export const USAGE_WEEKS_MAX = 104;

export type UsageWeek = { week: string; players: number; used: Record<string, number> };

/** How many weeks to report: a whole number from 1 to 2 years. Anything else is the default. */
export function usageWeeks(raw: string | undefined): number {
  const n = raw !== undefined && /^\d{1,3}$/.test(raw) ? Number(raw) : USAGE_WEEKS_DEFAULT;
  return n >= 1 && n <= USAGE_WEEKS_MAX ? n : USAGE_WEEKS_DEFAULT;
}

/** One read-only query: a row a week, the last `weeks` Mondays, this week last, zeros included. */
export function usageSql(weeks: number): string {
  const back = Math.min(USAGE_WEEKS_MAX, Math.max(1, Math.floor(Number.isFinite(weeks) ? weeks : USAGE_WEEKS_DEFAULT))) - 1;
  const players = FEATURES.filter((f) => f.key === 'path' || f.key === 'whole' || f.key === 'rooms').map((f) => f.sql).join(' union ');
  const cols = FEATURES.map((f) => `  (select count(distinct x.u) from (${f.sql}) as x(u) where x.u is not null) as "${f.key}"`).join(',\n');
  return [
    `with w as (select generate_series(date_trunc('week', now() at time zone 'utc')::date - ${back * 7}, date_trunc('week', now() at time zone 'utc')::date, interval '7 days')::date as week)`,
    `select to_char(w.week, 'YYYY-MM-DD') as week,`,
    `  (select count(distinct x.u) from (${players}) as x(u) where x.u is not null) as players,`,
    `${cols}`,
    'from w order by w.week;',
    '',
  ].join('\n');
}

const count = (v: unknown): number => {
  const n = typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v;
  return typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 ? n : 0;
};

/** The database's rows, oldest week first. A row with no week is dropped; a count that is not one reads as 0. */
export function usageRows(rows: unknown): UsageWeek[] {
  if (!Array.isArray(rows)) return [];
  const out: UsageWeek[] = [];
  for (const r of rows as Array<Record<string, unknown> | null>) {
    if (!r || typeof r.week !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(r.week)) continue;
    out.push({ week: r.week.slice(0, 10), players: count(r.players), used: Object.fromEntries(FEATURES.map((f) => [f.key, count(r[f.key])])) });
  }
  return out.sort((a, b) => a.week.localeCompare(b.week));
}

/** The features under 2% of weekly players in each of the last 4 weeks with players. Too few weeks: none. */
export function quietFeatures(weeks: readonly UsageWeek[]): string[] {
  const last = weeks.filter((w) => w.players > 0).slice(-QUIET_WEEKS);
  if (last.length < QUIET_WEEKS) return [];
  return FEATURES.filter((f) => last.every((w) => (w.used[f.key] ?? 0) / w.players < QUIET_SHARE)).map((f) => f.name);
}

/** The report as lines: a row a week, then the features to move behind "More". */
export function usageLines(weeks: readonly UsageWeek[]): string[] {
  if (weeks.length === 0) return ['No weeks to show.'];
  const head = ['Week', 'Players', ...FEATURES.map((f) => f.name)];
  const body = weeks.map((w) => [w.week, String(w.players), ...FEATURES.map((f) => {
    const n = w.used[f.key] ?? 0;
    return w.players > 0 ? `${n} (${Math.round((Math.min(n, w.players) / w.players) * 100)}%)` : String(n);
  })]);
  const widths = head.map((h, i) => Math.max(h.length, ...body.map((r) => r[i]!.length)));
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i]!)).join('  ').trimEnd();
  const quiet = quietFeatures(weeks);
  return [
    line(head),
    ...body.map(line),
    '',
    quiet.length ? `Under 2% of weekly players for ${QUIET_WEEKS} weeks, move behind More: ${quiet.join(', ')}.` : `Nothing under 2% of weekly players for ${QUIET_WEEKS} weeks.`,
  ];
}
