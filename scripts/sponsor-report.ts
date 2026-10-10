// Prints the sponsor report (SPEC section 5, Sponsor report): players, plays, finish rate and shares for every
// catalogue puzzle that carries a sponsor. Counts only. It reads the database and changes nothing.
// Run: npm run sponsor:report -- [--from 2026-10-01] [--to 2026-10-07] [--game id,id] [--local]

import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { countsById, isDay, reportLines, type ReportEntry, type ReportRange } from '../src/engine/sponsorReport';
import { games, getGameDef, sponsorFor } from '../src/games/catalog';

/** Says what is wrong in one line and ends. No stack: these are the owner's typing mistakes, not bugs. */
function stop(message: string): never {
  console.error(message);
  process.exit(1);
}

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
function value(name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return undefined;
  const v = args[i + 1];
  if (!v || v.startsWith('--')) stop(`--${name} needs a value.`);
  return v;
}

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

let rows: unknown = [];
if (entries.length > 0) {
  // Ids come from the catalogue and days passed `isDay`, and both are checked again here before they reach SQL.
  const ids = entries.map((e) => e.id);
  if (!ids.every((id) => /^[a-z0-9-]{2,40}$/.test(id))) stop('A catalogue id has the wrong shape.');
  const day = (d?: string) => (d ? `'${d}'::date` : 'null');
  const sql = `select * from public.sponsor_report(array[${ids.map((id) => `'${id}'`).join(', ')}]::text[], ${day(range.from)}, ${day(range.to)});\n`;

  const dir = mkdtempSync(join(tmpdir(), 'gazecraft-report-'));
  const file = join(dir, 'report.sql');
  try {
    writeFileSync(file, sql);
    const out = execSync(`npx supabase db query ${flag('local') ? '--local' : '--linked'} --output-format json -f "${file}"`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    // The CLI prints notices around the JSON.
    const json = out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1);
    rows = (JSON.parse(json) as { rows?: unknown }).rows;
  } catch (e) {
    // What the CLI said, then the likely reason: before the migration is live, the function does not exist yet.
    const said = (e as { stdout?: unknown }).stdout;
    if (typeof said === 'string' && said.trim()) console.error(said.trim());
    stop('The database did not answer. Has `npx supabase db push` been run?');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  if (!Array.isArray(rows)) stop('The database did not answer with rows. Has `npx supabase db push` been run?');
}

console.log(reportLines(entries, countsById(rows), range).join('\n'));
