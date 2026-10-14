import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pools from '../../data/copy.json';
import { accountStars, accountThatStands, chapterProgress, checkChapter, claimPick, claimStars, quarterOf, SCENE_H, SCENE_W, sweepHint, sweepResult, tornOf, tornStars, tornWrongs, trailOf, trailStars, trailWrongs, LINEUP_TRIES, lineupStars, NAME_MAX, pickStep, pickWrongs, stepPuzzle, type Chapter } from './chapter';
import { buildHiddenWords } from './hiddenWords';
import { buildMirror } from './mirror';
import { buildSums } from './sums';

const DIR = 'design/stories';
const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));
const read = (f: string) => JSON.parse(readFileSync(join(DIR, f), 'utf8')) as Chapter;
const roles = pools.culpritWho;
const spoon = (): Chapter => read('the-long-spoon.json');

describe('written chapters', () => {
  it.each(files)('%s is a fair fight', (f) => {
    expect(checkChapter(read(f), roles)).toEqual([]);
  });

  it.each(files)('%s is named as its file, and has its place in a casebook', (f) => {
    const c = read(f);
    expect(`${c.id}.json`).toBe(f);
    expect(c.casebook).toBe('lantern-row');
    expect(Number.isInteger(c.number) && c.number! >= 1).toBe(true);
  });

  it('no 2 chapters share a place in a casebook', () => {
    const places = files.map((f) => `${read(f).casebook}#${read(f).number}`);
    expect(new Set(places).size).toBe(places.length);
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
    const extra = { who: 'the drummer', name: 'Ben', look: 'masculine' as const, line: 'Plays at every final.', says: 'I was at practice.' };
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
    // A "prove it" has nobody to pick from a line, so it closes on the accounts.
    const c = { ...withSuspects(1), shape: 'prove-it' as const };
    const last = c.steps[c.steps.length - 1]!;
    last.method = 'accounts';
    last.accounts = [{ text: 'It was borrowed.', struckBy: 1 }, { text: 'It was taken.', stands: true }, { text: 'It was lost.', struckBy: 2 }];
    expect(checkChapter(c, roles)).toEqual([]);
    last.method = 'unmask';
    delete last.accounts;
    expect(checkChapter(c, roles)).toEqual(['step 6: a case closes on its last step, and only there: the line-up or the accounts']);
  });

  it('no board of 0 or of 6', () => {
    expect(checkChapter({ ...spoon(), suspects: [] }, roles)).toContain('1 to 5 suspects are needed');
    const c = withSuspects(5);
    c.suspects.push({ who: 'the coach', name: 'Ivy', look: 'feminine', line: 'Picks the team.', says: 'I was on the pitch.' });
    expect(checkChapter(c, roles)).toContain('1 to 5 suspects are needed');
  });

  it('a name fits under a face', () => {
    const c = spoon();
    c.suspects[0]!.name = 'Maximiliana';
    expect(checkChapter(c, roles)).toContain(`Maximiliana is longer than ${NAME_MAX} letters`);
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
    g.steps[1]!.pin = 'Theo was at the hall';
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

  it('a suspect says how they are drawn', () => {
    const c = spoon();
    delete (c.suspects[2] as { look?: string }).look;
    expect(checkChapter(c, roles)).toContain('the caretaker needs a look: feminine or masculine');
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
    c.steps[3]!.lead = 'Ask Theo about his lamps.';
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

describe('stepPuzzle', () => {
  it('a written step is played on its own evidence', () => {
    const c = spoon();
    expect(stepPuzzle(c, 1)).toMatchObject({ type: 'mirror', dict: ['seven', 'forty', 'lights', 'nine'] });
    expect(buildMirror(stepPuzzle(c, 1)!).answers.map((a) => a.key).sort()).toEqual(['forty', 'lights', 'nine', 'seven']);
    expect(buildHiddenWords(stepPuzzle(c, 5)!).answers.map((a) => a.key).sort()).toEqual(['before', 'burn', 'goes', 'name']);
  });

  it('a sums step is a row the engine makes, the same every time, and the 2nd is longer than the 1st', () => {
    const c = spoon();
    const first = stepPuzzle(c, 2)!;
    const second = stepPuzzle(c, 4)!;
    expect(first.type).toBe('buried-sums');
    expect(stepPuzzle(c, 2)).toEqual(first);
    expect(buildSums(first).answers.length).toBeGreaterThan(0);
    expect(second.text.length).toBeGreaterThan(first.text.length);
    expect(second.text).not.toBe(first.text);
  });

  it('the line-up, a step that is not there and unwritten evidence have no board', () => {
    const c = spoon();
    expect(stepPuzzle(c, 6)).toBeNull();
    expect(stepPuzzle(c, 0)).toBeNull();
    expect(stepPuzzle(c, 9)).toBeNull();
    delete c.steps[2]!.text;
    expect(stepPuzzle(c, 3)).toBeNull();
  });
});

describe('chapterProgress', () => {
  it('steps open in order, and a gap stops the count', () => {
    const c = spoon();
    expect(chapterProgress(c, {})).toEqual({ solved: 0, cleared: [], given: [] });
    expect(chapterProgress(c, { 1: 1 })).toEqual({ solved: 1, cleared: [], given: ['chance'] });
    expect(chapterProgress(c, { 1: 3, 3: 3 }).solved).toBe(1);
  });

  it('the lead is given, the clearing is earned with 2 stars', () => {
    const c = spoon();
    expect(chapterProgress(c, { 1: 1, 2: 1 })).toEqual({ solved: 2, cleared: [], given: ['chance'] });
    expect(chapterProgress(c, { 1: 1, 2: 2 }).cleared).toEqual(['the stall owner']);
    expect(chapterProgress(c, { 1: 3, 2: 3, 3: 2, 4: 3, 5: 1 })).toEqual({ solved: 5, cleared: ['the stall owner', 'the baker', 'the caretaker'], given: ['chance', 'means', 'motive'] });
  });
});

describe('lineupStars', () => {
  it('3 at once, 2 after a wrong name, 1 when the tries ran out', () => {
    expect([0, 1, 2, 5].map(lineupStars)).toEqual([3, 2, 1, 1]);
    expect(LINEUP_TRIES).toBe(2);
  });
});

describe('which account fits', () => {
  const box = (): Chapter => read('the-open-box.json');

  it('The open box weighs 3 accounts in its last step, and 1 stands', () => {
    const c = box();
    const last = c.steps[c.steps.length - 1]!;
    expect(last.method).toBe('accounts');
    expect(last.accounts).toHaveLength(3);
    expect(accountThatStands(last)).toBe(2);
    expect(accountThatStands(c.steps[0])).toBe(-1);
    // It has no board of letters or digits.
    expect(stepPuzzle(c, c.steps.length)).toBeNull();
  });

  it('an account falls to something already found, never to something still to come', () => {
    const c = box();
    c.steps[5]!.accounts![0]!.struckBy = 6;
    expect(checkChapter(c, roles)).toContain('step 6: an account that falls is struck by a step before this one');
    const d = box();
    delete d.steps[5]!.accounts![1]!.struckBy;
    expect(checkChapter(d, roles)).toContain('step 6: an account that falls is struck by a step before this one');
  });

  it('exactly 1 account stands, there are 3, and only this method has them', () => {
    const c = box();
    c.steps[5]!.accounts![0]!.stands = true;
    expect(checkChapter(c, roles)).toContain('step 6: exactly 1 account stands');
    const d = box();
    d.steps[5]!.accounts!.pop();
    expect(checkChapter(d, roles)).toContain('step 6: 3 accounts are needed, each in words');
    const e = box();
    e.steps[0]!.accounts = e.steps[5]!.accounts;
    expect(checkChapter(e, roles)).toContain('step 1: only a "which account fits" step has accounts');
  });

  it('3 stars at once, 2 after a wrong pick, 1 after 2', () => {
    expect([0, 1, 2, 3].map(accountStars)).toEqual([3, 2, 1, 1]);
  });

  it('every written chapter is open to players, in the order of the casebook', async () => {
    const { chapters } = await import('../games/chapters');
    expect(files.some((f) => read(f).draft)).toBe(false);
    expect(chapters.map((c) => c.id)).toEqual(['the-long-spoon', 'the-open-box', 'the-early-bus', 'the-year-that-is-missing', 'the-light-in-the-hall', 'the-2-signs', 'the-other-spoon', 'who-carries-the-cards']);
  });

  it('a case closes on its last step and nowhere else', () => {
    const c = box();
    c.steps[2]!.method = 'accounts';
    c.steps[2]!.accounts = c.steps[5]!.accounts;
    expect(checkChapter(c, roles)).toContain('step 3: a case closes on its last step, and only there: the line-up or the accounts');
  });
});

describe('could it be done', () => {
  const bus = (): Chapter => read('the-early-bus.json');

  it('The early bus tests 1 claim against 2 facts already found, and 1 of them decides', () => {
    const c = bus();
    const step = c.steps[3]!;
    expect(step.method).toBe('claim');
    expect(step.claim!.facts.map((f) => f.from)).toEqual([1, 2]);
    expect(step.claim!.facts.filter((f) => f.decides)).toHaveLength(1);
    // It has no board of letters or digits, and it is not where the case closes.
    expect(stepPuzzle(c, 4)).toBeNull();
    expect(c.steps[5]!.method).toBe('accounts');
  });

  it('a "prove it" names its 1 suspect from the brief, and any other shape still may not', () => {
    const c = bus();
    expect(c.suspects).toHaveLength(1);
    expect(c.steps.some((s) => /Kwame/.test(`${s.lead} ${s.fact}`))).toBe(true);
    expect(checkChapter(c, roles)).toEqual([]);
    expect(checkChapter({ ...c, shape: 'nothing-was-taken' }, roles)).toContain('step 3: it names the culprit');
  });

  it('a fact comes from a step before, exactly 1 decides, there are 2, and only this method has a claim', () => {
    const c = bus();
    c.steps[3]!.claim!.facts[1]!.from = 4;
    expect(checkChapter(c, roles)).toContain('step 4: a fact comes from a step before this one');
    const d = bus();
    d.steps[3]!.claim!.facts[0]!.decides = true;
    expect(checkChapter(d, roles)).toContain('step 4: exactly 1 fact decides');
    const e = bus();
    e.steps[3]!.claim!.facts.pop();
    expect(checkChapter(e, roles)).toContain('step 4: a claim needs what is said, 2 facts and whether it could be done');
    const f = bus();
    f.steps[0]!.claim = f.steps[3]!.claim;
    expect(checkChapter(f, roles)).toContain('step 1: only a "could it be done" step has a claim');
    const g = bus();
    g.steps[3]!.claim!.says = 'Nobody could!';
    expect(checkChapter(g, roles)).toContain('step 4: a claim breaks the copy rules');
  });

  it('3 stars at once, 2 after a wrong verdict, 1 after 2', () => {
    expect([0, 1, 2, 3].map(claimStars)).toEqual([3, 2, 1, 1]);
  });
});

describe('a step answered by picking', () => {
  const accounts = pickStep(read('the-open-box.json').steps[5])!;
  const claim = pickStep(read('the-early-bus.json').steps[3])!;

  it('knows the right pick, out of how many, and the wrong picks allowed', () => {
    expect(accounts).toMatchObject({ right: 2, options: 3, tries: 2 });
    // The 2nd fact decides, and it could be done.
    expect(claim).toMatchObject({ right: claimPick(1, true), options: 4, tries: 2 });
    expect(pickStep(read('the-long-spoon.json').steps[0])).toBeNull();
    expect(pickStep(undefined)).toBeNull();
  });

  it('counts the wrong picks before the right one, or every try spent', () => {
    expect(pickWrongs(accounts, [2])).toBe(0);
    expect(pickWrongs(accounts, [0, 2])).toBe(1);
    expect(pickWrongs(accounts, [0, 1])).toBe(2);
    expect(pickWrongs(claim, [claimPick(1, true)])).toBe(0);
    expect(pickWrongs(claim, [claimPick(0, true), claimPick(1, false)])).toBe(2);
  });

  it('refuses a list nobody could have made', () => {
    for (const picks of [[], [0], [2, 0], [0, 0], [0, 1, 2], [3], [-1], [0.5, 2]]) expect(pickWrongs(accounts, picks), picks.join()).toBe(-1);
    expect(pickWrongs(claim, [4])).toBe(-1);
  });
});

describe('walk it back, the trail', () => {
  const year = (): Chapter => read('the-year-that-is-missing.json');

  it('is made of the chapter itself: its places in order, and its finds handed back out of order', () => {
    const t = trailOf(year(), 5)!;
    expect(t.places).toEqual(['The minutes shelf', 'The request desk', "The caretaker's desk", 'The atlas shelf']);
    expect(t.finds.map((f) => f.pin).sort()).toEqual(['2011: green, 46 cm tall', 'Gone by Tuesday, 10.05', 'Too tall for the bag', 'Under an atlas cover'].sort());
    expect(t.finds.map((f) => f.place)).not.toEqual([0, 1, 2, 3]);
    expect(trailOf(year(), 5)).toEqual(t);
    for (const f of t.finds) expect(year().steps[f.place]!.pin).toBe(f.pin);
  });

  it('needs 3 finds behind it, each at a place of its own', () => {
    expect(trailOf(year(), 3)).toBeNull();
    const c = year();
    c.steps[1]!.place = c.steps[0]!.place;
    expect(trailOf(c, 5)).toBeNull();
    const d = year();
    d.steps[1]!.method = 'trail';
    expect(checkChapter(d, roles)).toContain('step 2: a trail needs 3 finds or more behind it, each at a place of its own');
  });

  it('a find gets 1 pick, and a wrong place costs a star and nothing else', () => {
    const t = trailOf(year(), 5)!;
    const right = t.finds.map((f) => f.place);
    expect(trailWrongs(t, right)).toBe(0);
    expect(trailWrongs(t, right.map((p) => (p + 1) % 4))).toBe(4);
    for (const picks of [[], right.slice(1), [...right, 0], [4, 0, 1, 2], [0.5, 0, 1, 2]]) expect(trailWrongs(t, picks)).toBe(-1);
    expect([0, 1, 2, 4].map(trailStars)).toEqual([3, 2, 1, 1]);
  });
});

describe('the missing step', () => {
  const signs = (): Chapter => read('the-2-signs.json');

  it('The 2 signs has 3 events with 1 gap between them, and 1 of 3 things fits it', () => {
    const c = signs();
    const k = c.steps[2]!.chain!;
    expect(c.steps[2]!.method).toBe('chain');
    expect(k.events).toHaveLength(3);
    expect(k.gap).toBe(1);
    expect(pickStep(c.steps[2])).toMatchObject({ right: 1, options: 3, tries: 2 });
    expect(stepPuzzle(c, 3)).toBeNull();
    // A case where nothing was taken asks its own question at the line-up.
    expect(c.ask).toBe('Who changed the 2 signs?');
  });

  it('the gap is in between, exactly 1 thing fits, and only this method has a chain', () => {
    const c = signs();
    c.steps[2]!.chain!.gap = 3;
    expect(checkChapter(c, roles)).toContain('step 3: the gap is between 2 events');
    const d = signs();
    d.steps[2]!.chain!.options[0]!.fits = true;
    expect(checkChapter(d, roles)).toContain('step 3: exactly 1 thing fits the gap');
    const e = signs();
    e.steps[2]!.chain!.events.pop();
    expect(checkChapter(e, roles)).toContain('step 3: a chain needs 3 events and 3 things that could fill the gap');
    const f = signs();
    f.steps[0]!.chain = f.steps[2]!.chain;
    expect(checkChapter(f, roles)).toContain('step 1: only a "missing step" step has a chain');
  });
});

describe('sweep the room', () => {
  const hall = (): Chapter => read('the-light-in-the-hall.json');
  const room = () => hall().steps[0]!.room!;

  it('The light in the hall opens on the drawn hall: 6 pieces of evidence among the room', () => {
    const c = hall();
    expect(c.steps[0]!.method).toBe('sweep');
    expect(room().scene).toBe('the-hall');
    expect(room().things.filter((t) => t.evidence)).toHaveLength(6);
    expect(stepPuzzle(c, 1)).toBeNull();
  });

  it.each(['the-hall', 'the-sale-room'])('the game shows the same %s the sketch holds', (scene) => {
    const sketch = readFileSync(`design/sketches/${scene}.html`, 'utf8').match(/<svg[\s\S]*<\/svg>/)![0];
    expect(readFileSync(`src/scenes/${scene}.svg`, 'utf8')).toContain(sketch);
  });

  it('a tap on evidence is found, a tap on the room is a wrong one, and each thing is tapped once', () => {
    const r = room();
    const evidence = r.things.flatMap((t, i) => (t.evidence ? [i] : []));
    const clock = r.things.findIndex((t) => t.name === 'The clock');
    expect(sweepResult(r, evidence)).toEqual({ found: 6, total: 6, wrongs: 0 });
    expect(sweepResult(r, [clock, evidence[0]!])).toEqual({ found: 1, total: 6, wrongs: 1 });
    expect(sweepResult(r, [])).toEqual({ found: 0, total: 6, wrongs: 0 });
    for (const picks of [[0, 0], [-1], [r.things.length], [0.5]]) expect(sweepResult(r, picks)).toBeNull();
  });

  it('a tip-off points at the quarter of the room with the next thing missed, never at the thing', () => {
    const r = room();
    expect([quarterOf([0, 0, 10, 10]), quarterOf([SCENE_W - 10, 0, 10, 10]), quarterOf([0, SCENE_H - 10, 10, 10]), quarterOf([SCENE_W - 10, SCENE_H - 10, 10, 10])]).toEqual([0, 1, 2, 3]);
    // The torch on the piano is first, top right.
    expect(sweepHint(r, new Set())).toBe(1);
    expect(sweepHint(r, new Set(r.things.flatMap((t, i) => (t.evidence ? [i] : []))))).toBe(-1);
  });

  it('a room holds 5 to 7 pieces of evidence, 6 ordinary things at least, and everything inside the drawing', () => {
    const c = hall();
    c.steps[0]!.room!.things.forEach((t) => delete t.evidence);
    expect(checkChapter(c, roles)).toContain('step 1: a room holds 5 to 7 pieces of evidence');
    const d = hall();
    d.steps[0]!.room!.things = d.steps[0]!.room!.things.filter((t) => t.evidence);
    expect(checkChapter(d, roles)).toContain('step 1: a room has 6 ordinary things at least, to look past');
    const e = hall();
    e.steps[0]!.room!.things[0]!.box = [1180, 0, 40, 40];
    expect(checkChapter(e, roles)).toContain('step 1: every thing sits inside the drawing');
    const f = hall();
    f.steps[1]!.room = f.steps[0]!.room;
    expect(checkChapter(f, roles)).toContain('step 2: only a "sweep the room" step has a room');
  });
});

describe('the torn page', () => {
  const spoon2 = (): Chapter => read('the-other-spoon.json');

  it('tears every line near its middle, hands the right halves back out of order, and puts each back whole', () => {
    const c = spoon2();
    const t = tornOf(c, 2)!;
    expect(c.steps[1]!.method).toBe('torn');
    expect(t.lefts).toHaveLength(4);
    t.lefts.forEach((l, k) => expect(l + t.rights[t.order[k]!]).toBe(c.steps[1]!.page![k]));
    expect(t.order).not.toEqual([0, 1, 2, 3]);
    expect(tornOf(c, 2)).toEqual(t);
    expect(t.edges.every((e) => e.length === 5 && e.every((n) => n >= 0 && n <= 3))).toBe(true);
    expect(stepPuzzle(c, 2)).toBeNull();
  });

  it('a line gets 1 pick, and a wrong half costs a star and nothing else', () => {
    const t = tornOf(spoon2(), 2)!;
    expect(tornWrongs(t, t.order)).toBe(0);
    expect(tornWrongs(t, t.order.map((p) => (p + 1) % 4))).toBe(4);
    for (const picks of [[], t.order.slice(1), [...t.order, 0], [9, 0, 1, 2]]) expect(tornWrongs(t, picks)).toBe(-1);
    expect([0, 1, 2].map(tornStars)).toEqual([3, 2, 1]);
  });

  it('a torn page has 3 to 6 lines that can be torn and read, and only this method has one', () => {
    const c = spoon2();
    c.steps[1]!.page = ['Too short', 'Lot 20, entered on Tuesday at 10'];
    expect(checkChapter(c, roles)).toContain('step 2: a torn page has 3 to 6 lines of 10 to 40 letters');
    const d = spoon2();
    d.steps[0]!.page = d.steps[1]!.page;
    expect(checkChapter(d, roles)).toContain('step 1: only a "torn page" step has a page');
  });
});

describe('Lantern Row', () => {
  const book = files.map(read);

  it('is 8 cases, numbered 1 to 8, that run through all 5 shapes', () => {
    expect(book.map((c) => c.number).sort((a, b) => a! - b!)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(new Set(book.map((c) => c.shape))).toEqual(new Set(['who-did-it', 'nothing-was-taken', 'prove-it', 'where-is-it', 'what-is-it-really']));
  });

  it('nobody is the culprit twice, and the last case uses a method from each one before it', () => {
    const culprits = book.map((c) => c.culprit);
    expect(new Set(culprits).size).toBe(culprits.length);
    const last = book.find((c) => c.number === 8)!;
    expect(new Set(last.steps.map((s) => s.method))).toEqual(new Set(['buried-sums', 'torn', 'chain', 'claim', 'hidden-words', 'trail', 'line-up']));
  });

  it('no 2 cases next to each other share a shape or a number of suspects', () => {
    const order = [...book].sort((a, b) => a.number! - b.number!);
    order.slice(1).forEach((c, i) => {
      expect(c.shape, c.id).not.toBe(order[i]!.shape);
      expect(c.suspects.length, c.id).not.toBe(order[i]!.suspects.length);
    });
  });
});

