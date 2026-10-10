// @vitest-environment jsdom
import { vi } from 'vitest';
import { clearResume, loadResume, RESUME_MAX, returned, saveResume, withoutAway } from './resume';
import { newSession, type SavedSession } from './session';

const key = (id: string) => `gazecraft-resume-${id}`;
const MIN = 60_000;

/** A game started at `startAt`, with one find 20 seconds in and a hint at 30. */
function game(startAt = 1_000_000): SavedSession {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { msg: _m, ...s } = newSession(startAt);
  return {
    ...s,
    found: [{ key: 'amos', label: 'Amos', span: [6, 9] }],
    hints: 1,
    hinted: ['mark'],
    hintLi: 12,
    lastFindAt: startAt + 20_000,
    log: { events: [{ a: 6, b: 9, t: 20_000 }], hints: [30_000] },
  };
}
/** The same game, left `onFor` ms after it started. */
const left = (startAt: number, onFor: number): SavedSession => ({ ...game(startAt), leftAt: startAt + onFor });

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('withoutAway', () => {
  it('takes time away off the clock, and moves the last find with it', () => {
    const s = game();
    const now = s.startAt + 40_000 + 90 * MIN;
    const back = withoutAway(s, 90 * MIN, now);
    expect(now - back.startAt).toBe(40_000);
    expect(back.lastFindAt! - back.startAt).toBe(20_000);
    expect(back).toMatchObject({ found: s.found, hints: 1, hinted: ['mark'], hintLi: 12, log: s.log });
  });

  it('leaves a game alone when no time was spent away', () => {
    const s = game();
    expect(withoutAway(s, 0, s.startAt + 40_000)).toBe(s);
    expect(withoutAway(s, Number.NaN, s.startAt + 40_000)).toBe(s);
  });

  it('never touches a finished game', () => {
    const s = { ...game(), endAt: 1_050_000 };
    expect(withoutAway(s, 90 * MIN, s.startAt + 100 * MIN)).toBe(s);
  });

  it('keeps the clock at or past the last logged moment, whatever the device clock did', () => {
    const s = game();
    // The device clock went back an hour while away.
    const now = s.startAt - 60 * MIN;
    expect(now - withoutAway(s, -100 * MIN, now).startAt).toBe(30_000);
    // Away longer than the clock says is possible: the clock stops at the last logged moment, not before it.
    const far = withoutAway(s, 500 * MIN, s.startAt + 35_000);
    expect(s.startAt + 35_000 - far.startAt).toBe(30_000);
  });
});

describe('returned', () => {
  it('takes the time since the player left off the clock, and forgets that they left', () => {
    const s = left(1_000_000, 40_000);
    const now = s.startAt + 3 * 24 * 60 * MIN;
    const back = returned(s, now);
    expect(now - back.startAt).toBe(40_000);
    expect('leftAt' in back).toBe(false);
  });

  it('with no word of leaving, the clock ran on: a page that crashed never shortens a time', () => {
    const s = game();
    expect(returned(s, s.startAt + 3 * 60 * MIN)).toBe(s);
  });
});

describe('the kept game', () => {
  it('comes back with its finds, its hints and its clock where it stopped', () => {
    const s = left(1_000_000, 40_000);
    saveResume('bible', s);
    const now = s.startAt + 3 * 24 * 60 * MIN;
    const back = loadResume('bible', now)!;
    expect(back.found).toEqual(s.found);
    expect(back).toMatchObject({ hints: 1, hinted: ['mark'], hintLi: 12, log: s.log, endAt: null });
    expect(now - back.startAt).toBe(40_000);
  });

  it('is kept per puzzle, one record each', () => {
    saveResume('bible', game());
    saveResume('nigeria', game());
    expect(loadResume('lagos', 1_050_000)).toBeNull();
    expect(loadResume('bible', 1_050_000)).not.toBeNull();
    expect(Object.keys(localStorage).sort()).toEqual([key('bible'), key('nigeria')]);
  });

  it('is gone once cleared, and the others stay', () => {
    saveResume('bible', game());
    saveResume('nigeria', game());
    clearResume('bible');
    clearResume('never-kept');
    expect(loadResume('bible', 1_050_000)).toBeNull();
    expect(loadResume('nigeria', 1_050_000)).not.toBeNull();
  });

  it('never drops a game in normal play: the whole catalogue and its passages fit', () => {
    for (let i = 0; i < 80; i++) saveResume(`g${i}`, left(1_000_000, i));
    for (let i = 0; i < 80; i++) expect(loadResume(`g${i}`, 2_000_000)).not.toBeNull();
  });

  it(`past ${RESUME_MAX} the game left longest ago goes first, and one being played is never the one to go`, () => {
    for (let i = 0; i < RESUME_MAX; i++) saveResume(`g${i}`, left(1_000_000, 1000 + i));
    // Coming back to the oldest makes it the newest.
    saveResume('g0', left(1_000_000, 900_000));
    saveResume('fresh', left(1_000_000, 500));
    expect(Object.keys(localStorage)).toHaveLength(RESUME_MAX);
    expect(loadResume('g0', 2_000_000)).not.toBeNull();
    expect(loadResume('g1', 2_000_000)).toBeNull();
    expect(loadResume('g2', 2_000_000)).not.toBeNull();
    // The newest save is kept even though it was left earliest.
    expect(loadResume('fresh', 2_000_000)).not.toBeNull();
  });

  it('when storage is full it makes room from the oldest games and keeps the one being played', () => {
    saveResume('old', left(1_000_000, 10));
    saveResume('older', left(900_000, 10));
    const real = Storage.prototype.setItem;
    let refusals = 1;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (k === key('bible') && refusals-- > 0) throw new DOMException('full', 'QuotaExceededError');
      real.call(this, k, v);
    });
    saveResume('bible', game());
    expect(loadResume('bible', 2_000_000)).not.toBeNull();
    expect(loadResume('older', 2_000_000)).toBeNull();
    expect(loadResume('old', 2_000_000)).not.toBeNull();
  });

  it('storage that takes nothing at all is no saved game and no endless loop', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    saveResume('bible', game());
    expect(loadResume('bible', 2_000_000)).toBeNull();
  });

  it.each([
    ['broken JSON', '{not json'],
    ['a list', '[1, 2]'],
    ['a word', '"bible"'],
    ['null', 'null'],
    ['a game with no start', '{"found":[],"endAt":null}'],
    ['a game with no finds list', '{"startAt":1,"endAt":null,"found":"amos"}'],
    ['a find that is not one', '{"startAt":1,"endAt":null,"found":[null]}'],
    ['a leaving time that is not one', JSON.stringify({ ...game(), leftAt: 'noon' })],
    ['an end that is not a time', JSON.stringify({ ...game(), endAt: 'done' })],
  ])('%s in storage is no saved game', (_name, raw) => {
    localStorage.setItem(key('bible'), raw);
    expect(loadResume('bible', 2_000_000)).toBeNull();
    // And saving over it works.
    saveResume('bible', game());
    expect(loadResume('bible', 2_000_000)).not.toBeNull();
  });

  it('a finished game is kept with its result, as it ended', () => {
    const done = { ...game(), endAt: 1_050_000, resultTitle: 'Sharp', sent: true };
    saveResume('bible', done);
    expect(loadResume('bible', 9_000_000)).toEqual(done);
  });

  it('when room is needed a finished game goes before any game still being played', () => {
    saveResume('finished', { ...game(5_000_000), endAt: 5_050_000 });
    saveResume('old', left(1_000_000, 10));
    const real = Storage.prototype.setItem;
    let refusals = 1;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (k === key('bible') && refusals-- > 0) throw new DOMException('full', 'QuotaExceededError');
      real.call(this, k, v);
    });
    saveResume('bible', game());
    expect(loadResume('finished', 9_000_000)).toBeNull();
    expect(loadResume('old', 9_000_000)).not.toBeNull();
  });

  it('one bad record does not lose the good ones', () => {
    localStorage.setItem(key('bad'), '{not json');
    saveResume('bible', game());
    expect(loadResume('bible', 1_050_000)).not.toBeNull();
    expect(loadResume('bad', 1_050_000)).toBeNull();
  });
});
