// Prints the sponsor report (SPEC section 5, Sponsor report): games started, played to the end, every word found,
// shares, visits to the sponsor and signed in players, for every catalogue puzzle that carries a sponsor.
// Counts only. It reads the database and changes nothing.
// Run: npm run sponsor:report -- [--from 2026-10-01] [--to 2026-10-07] [--game id,id] [--local]

import { countsById, isDay, reportLines, type ReportEntry, type ReportRange } from '../src/engine/sponsorReport';
import { games, getGameDef, sponsorFor } from '../src/games/catalog';
import { args, rows, stop } from './db-rows';

const { flag, value } = args();

const range: ReportRange = { from: value('from'), to: value('to') };
for (const d of [range.from, range.to]) if (d !== undefined && !isDay(d)) stop(`Not a day: ${d}. Use YYYY-MM-DD.`);
if (range.from && range.to && range.from > range.to) stop('--from is after --to.');

// Which puzzles. Sponsored ones by default; `--game` names catalogue puzzles, sponsored or not.
const asked = value('game')?.split(',').map((s) => s.trim()).filter(Boolean);
const defs = asked
  ? asked.map((id) => {
      const def = getGameDef(id);
      if (!def) stop(`No catalogue puzzle with the id ${id}.`);
      return def;
    })
  : games.filter((g) => sponsorFor(g));
const entries: ReportEntry[] = defs.map((g) => ({ id: g.id, title: g.title, sponsor: sponsorFor(g)?.name }));

let found: unknown[] = [];
if (entries.length > 0) {
  // Ids come from the catalogue and days passed `isDay`, and both are checked again here before they reach SQL.
  const ids = entries.map((e) => e.id);
  if (!ids.every((id) => /^[a-z0-9-]{2,40}$/.test(id))) stop('A catalogue id has the wrong shape.');
  const day = (d?: string) => (d ? `'${d}'::date` : 'null');
  found = rows(`select * from public.sponsor_report(array[${ids.map((id) => `'${id}'`).join(', ')}]::text[], ${day(range.from)}, ${day(range.to)});\n`, flag('local'));
}

console.log(reportLines(entries, countsById(found), range).join('\n'));
