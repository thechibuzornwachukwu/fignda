import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const COMPONENTS = join(ROOT, 'src', 'components');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = walk(COMPONENTS).filter((f) => /\.(tsx?|css)$/.test(f) && !f.includes('.test.'));

function offenders(re: RegExp): string[] {
  return files.flatMap((f) =>
    readFileSync(f, 'utf8')
      .split('\n')
      .flatMap((line, i) => (re.test(line) ? [`${relative(ROOT, f)}:${i + 1}: ${line.trim()}`] : [])),
  );
}

describe('components use tokens only', () => {
  it('has files to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('has no hex colours', () => {
    expect(offenders(/#[0-9a-fA-F]{3,8}\b/)).toEqual([]);
  });

  it('has no rgb/hsl colour literals', () => {
    expect(offenders(/\b(rgba?|hsla?)\(/)).toEqual([]);
  });

  it('has no px border radius', () => {
    expect(offenders(/border-radius:\s*[^;]*\d+px/)).toEqual([]);
  });

  it('has no ms or s durations', () => {
    expect(offenders(/(transition|animation)[^;]*\b\d*\.?\d+m?s\b/)).toEqual([]);
  });

  it('has no dangerouslySetInnerHTML', () => {
    expect(offenders(/dangerouslySetInnerHTML/)).toEqual([]);
  });
});
