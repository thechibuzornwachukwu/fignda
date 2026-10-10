// One read-only query against the live database (or the local one), for the owner's reports.
// The SQL goes through a file so no shell ever has to quote it.

import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Says what is wrong in one line and ends. No stack: these are the owner's typing mistakes, not bugs. */
export function stop(message: string): never {
  console.error(message);
  process.exit(1);
}

/** The rows the query returns. Ends with one line when the database does not answer. */
export function rows(sql: string, local: boolean): unknown[] {
  const dir = mkdtempSync(join(tmpdir(), 'gazecraft-report-'));
  const file = join(dir, 'report.sql');
  let out: unknown;
  try {
    writeFileSync(file, sql);
    const text = execSync(`npx supabase db query ${local ? '--local' : '--linked'} --output-format json -f "${file}"`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    // The CLI prints notices around the JSON.
    out = (JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as { rows?: unknown }).rows;
  } catch (e) {
    // What the CLI said, then the likely reason: a migration that is not live yet.
    const said = (e as { stdout?: unknown }).stdout;
    if (typeof said === 'string' && said.trim()) console.error(said.trim());
    stop('The database did not answer. Has `npx supabase db push` been run?');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  if (!Array.isArray(out)) stop('The database did not answer with rows. Has `npx supabase db push` been run?');
  return out;
}

/** Command line arguments: `--name value` and `--flag`. */
export function args(argv: readonly string[] = process.argv.slice(2)) {
  return {
    flag: (name: string) => argv.includes(`--${name}`),
    value(name: string): string | undefined {
      const i = argv.indexOf(`--${name}`);
      if (i < 0) return undefined;
      const v = argv[i + 1];
      if (!v || v.startsWith('--')) stop(`--${name} needs a value.`);
      return v;
    },
  };
}
