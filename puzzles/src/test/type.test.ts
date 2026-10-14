import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// BUILD_PLAN 3a: every text style on the 4 tabs comes from src/styles/type.module.css.
// A size written in one of these files is a one-off, and this fails on it.
const ROOT = join(__dirname, '..', '..');
const TABS = ['Games', 'Leaderboard', 'Players', 'Profile', 'Me'].map((n) => join(ROOT, 'src', 'routes', `${n}.module.css`));
const FILES = [...TABS, join(ROOT, 'src', 'components', 'PageHeader.module.css')];

/** Lines that set a size: `font-size`, or the `font` shorthand with a number in it. Comments do not count. */
function rawSizes(css: string): string[] {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n')
    .flatMap((line, i) => (/(^|[\s;{])font-size\s*:/.test(line) || /(^|[\s;{])font\s*:[^;]*\d/.test(line) ? [`${i + 1}: ${line.trim()}`] : []));
}

describe('the tabs take their type from type.module.css', () => {
  it('spots a raw size, and leaves a composed step alone', () => {
    expect(rawSizes('.a {\n  font-size: 15px;\n}')).toEqual(['2: font-size: 15px;']);
    expect(rawSizes('.a { font-size:0.45em }')).toHaveLength(1);
    expect(rawSizes('.a { font: 700 14px/1 x; }')).toHaveLength(1);
    expect(rawSizes(".a {\n  composes: small from '../styles/type.module.css';\n  font-weight: 700;\n  font-family: inherit;\n}")).toEqual([]);
    expect(rawSizes('/* font-size: 12px */')).toEqual([]);
  });

  it.each(FILES.map((f) => [relative(ROOT, f).replace(/\\/g, '/'), f] as const))('%s has no raw font size', (_name, file) => {
    expect(rawSizes(readFileSync(file, 'utf8'))).toEqual([]);
  });

  it('every step these files compose exists', () => {
    const steps = new Set([...readFileSync(join(ROOT, 'src', 'styles', 'type.module.css'), 'utf8').matchAll(/^\.([a-zA-Z0-9]+)\s*\{/gm)].map((m) => m[1]));
    const used = FILES.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/composes:\s*([a-zA-Z0-9]+)\s+from\s+'[^']*type\.module\.css'/g)].map((m) => m[1]!));
    expect(used.length).toBeGreaterThan(0);
    expect(used.filter((u) => !steps.has(u))).toEqual([]);
  });
});
