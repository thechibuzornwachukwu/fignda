import { readdirSync, readFileSync } from 'node:fs';
import pools from '../../data/copy.json';
import { balanceOf, checkChapter, type Chapter } from '../engine/chapter';

// Tests are given the fixtures in place of src/games/stories, so its list is read as written.
const list = readFileSync('src/games/stories.ts', 'utf8');

const files = readdirSync('design/stories').filter((f) => f.endsWith('.json'));
const read = (f: string) => JSON.parse(readFileSync(`design/stories/${f}`, 'utf8')) as Chapter;

describe('the cases the game ships', () => {
  it('are every file in design/stories', () => {
    for (const f of files) expect(list).toContain(`design/stories/${f}`);
    expect([...list.matchAll(/design\/stories\/[^']+\.json/g)].length).toBe(files.length);
  });

  it.each(files)('%s is a fair fight as far as it is written', (f) => {
    expect(checkChapter(read(f), pools.culpritWho)).toEqual([]);
  });

  it.each(files)('%s has its story file, and a finished one is balanced', (f) => {
    const c = read(f);
    expect(readdirSync('design/stories')).toContain(`${c.id}.md`);
    if (!c.writing) expect(balanceOf(c)).toEqual([]);
  });
});
