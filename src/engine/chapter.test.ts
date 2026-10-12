import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pools from '../../data/copy.json';
import games from '../../data/games.json';
import { checkChapter, NAME_MAX, type Chapter } from './chapter';

const DIR = 'design/stories';
const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));
const read = (f: string) => JSON.parse(readFileSync(join(DIR, f), 'utf8')) as Chapter;
const roles = pools.culpritWho;
const caseIds = ((Array.isArray(games) ? games : (games as { games: unknown }).games) as { id: string }[]).map((g) => g.id);
const spoon = (): Chapter => read('the-long-spoon.json');

describe('written chapters', () => {
  it.each(files)('%s is a fair fight', (f) => {
    expect(checkChapter(read(f), roles)).toEqual([]);
  });

  it.each(files)('%s is named as its file and told on a case we have', (f) => {
    const c = read(f);
    expect(`${c.id}.json`).toBe(f);
    expect(caseIds).toContain(c.case);
  });
});

describe('checkChapter', () => {
  it('anything that is not a chapter is one problem', () => {
    expect(checkChapter(null, roles)).toEqual(['not a chapter']);
    expect(checkChapter('x', roles)).toEqual(['not a chapter']);
    expect(checkChapter({}, roles).length).toBeGreaterThan(3);
  });

  // The long spoon cut down or grown to n suspects: the culprit and the first n - 1 others, each still cleared once.
  const withSuspects = (n: number): Chapter => {
    const c = spoon();
    const extra = { who: 'the drummer', name: 'Kunle', line: 'Plays at every final.', says: 'I was at practice.' };
    const others = [...c.suspects.filter((s) => s.who !== c.culprit), extra].slice(0, n - 1);
    c.suspects = [...others, c.suspects.find((s) => s.who === c.culprit)!];
    const open = c.steps.slice(0, -1);
    open.forEach((s) => delete s.clears);
    others.forEach((s, i) => (open[i]!.clears = s.who));
    return c;
  };

  it.each([2, 3, 4, 5])('a board of %i suspects is a chapter', (n) => {
    const c = withSuspects(n);
    expect(c.suspects).toHaveLength(n);
    expect(checkChapter(c, roles)).toEqual([]);
  });

  it('a board of 1 is a chapter in any shape but a "who did it"', () => {
    expect(checkChapter(withSuspects(1), roles)).toEqual(['a "who did it" needs 2 suspects or more']);
    const c = { ...withSuspects(1), shape: 'prove-it' as const };
    c.steps[c.steps.length - 1]!.method = 'unmask';
    expect(checkChapter(c, roles)).toEqual([]);
  });

  it('no board of 0 or of 6', () => {
    expect(checkChapter({ ...spoon(), suspects: [] }, roles)).toContain('1 to 5 suspects are needed');
    const c = withSuspects(5);
    c.suspects.push({ who: 'the coach', name: 'Ife', line: 'Picks the team.', says: 'I was on the pitch.' });
    expect(checkChapter(c, roles)).toContain('1 to 5 suspects are needed');
  });

  it('a name fits under a face', () => {
    const c = spoon();
    c.suspects[0]!.name = 'Oluwadamilare';
    expect(checkChapter(c, roles)).toContain(`Oluwadamilare is longer than ${NAME_MAX} letters`);
  });

  it('the opening board is the chapter\'s own, and every solved step pins something to it', () => {
    const c = spoon();
    expect(c.board.pins.map((p) => p.kind)).toEqual(['item', 'note', 'left', 'faces']);
    c.board.pins = [];
    expect(checkChapter(c, roles)).toContain('the opening board holds 1 to 5 pins');
    const d = spoon();
    d.board.pins[0] = { kind: 'item' };
    expect(checkChapter(d, roles)).toContain('a item pin needs its words');
    const e = spoon();
    delete e.steps[1]!.pin;
    expect(checkChapter(e, roles)).toContain('step 2: a pin of 26 letters at most is needed');
    const g = spoon();
    g.steps[1]!.pin = 'Tayo was at the hall';
    expect(checkChapter(g, roles)).toContain('step 2: it names the culprit');
  });

  it('a board can open with no faces at all, on a map or a photo', () => {
    const c = spoon();
    c.board = { pins: [{ kind: 'map', label: 'The market, by row' }] };
    expect(checkChapter(c, roles)).toEqual([]);
  });

  it('written evidence holds its words, as the engine reads them', () => {
    const c = spoon();
    expect(c.steps.filter((s) => s.text).map((s) => s.words!.length)).toEqual([4, 4, 4]);
    c.steps[4]!.words = ['goes', 'name', 'burn', 'spoon'];
    expect(checkChapter(c, roles)).toContain('step 5: the engine does not find spoon');
    const d = spoon();
    d.steps[1]!.text = 'A till roll is numbers.';
    d.steps[1]!.words = ['roll'];
    expect(checkChapter(d, roles)).toContain('step 2: only a hidden-words or a blotter step has a text');
    const e = spoon();
    delete e.steps[2]!.words;
    expect(checkChapter(e, roles)).toContain('step 3: a text needs its words');
  });

  it('a blotter is stored back to front', () => {
    expect(spoon().steps[0]!.text!.startsWith('.neetfif enin')).toBe(true);
  });

  it('nobody new turns up at the end', () => {
    expect(checkChapter({ ...spoon(), culprit: 'the drummer' }, roles)).toContain('the culprit is not one of the suspects');
  });

  it('a suspect is a character the game can draw', () => {
    const c = spoon();
    c.suspects[0]!.who = 'the pilot';
    expect(checkChapter(c, roles)).toContain('the pilot is not a character the game can draw');
  });

  it('every suspect but the culprit is cleared once', () => {
    const c = spoon();
    delete c.steps[1]!.clears;
    expect(checkChapter(c, roles)).toContain('the stall owner is cleared 0 times, not once');
    const d = spoon();
    d.steps[0]!.clears = 'the photographer';
    expect(checkChapter(d, roles)).toContain('the culprit is cleared');
  });

  it('means, motive and chance are each given once', () => {
    const c = spoon();
    delete c.steps[0]!.gives;
    expect(checkChapter(c, roles)).toContain('chance is given 0 times, not once');
  });

  it('a step leads to the next place', () => {
    const c = spoon();
    c.steps[2]!.to = 'The market';
    expect(checkChapter(c, roles)).toContain("step 3: its lead does not go to the next step's place");
    const d = spoon();
    d.steps[2]!.lead = '';
    expect(checkChapter(d, roles)).toContain('step 3: no lead');
  });

  it('nothing names the culprit before the line-up', () => {
    const c = spoon();
    c.steps[3]!.lead = 'Ask Tayo about his lamps.';
    expect(checkChapter(c, roles)).toContain('step 4: it names the culprit');
  });

  it('the line-up is last, and only last', () => {
    const c = spoon();
    c.steps[5]!.method = 'unmask';
    expect(checkChapter(c, roles)).toContain('step 6: the line-up is the last step, and only the last');
  });

  it('the copy rules hold', () => {
    const c = spoon();
    c.ending.after = 'Case closed!';
    expect(checkChapter(c, roles).join(' ')).toMatch(/exclamation/);
  });
});
