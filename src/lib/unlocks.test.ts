import { FEATURES, countOf, isFirstVisit, readHistory, readKept, sizeOf, unlockedList, unlocks } from './unlocks';

const none = { finished: 0, verified: 0, dailies: 0, plays: 0 };

describe('unlocks', () => {
  it('a first visit shows nothing extra', () => {
    const u = unlocks(none);
    expect(isFirstVisit(u)).toBe(true);
    expect(unlockedList(u)).toEqual([]);
  });

  it('boards appear after the first finished game', () => {
    const u = unlocks({ ...none, finished: 1, plays: 1 });
    expect(unlockedList(u)).toEqual(['boards']);
    expect(isFirstVisit(u)).toBe(false);
  });

  it('badges and points appear after the first verified play, not an unverified one', () => {
    expect(unlocks({ ...none, finished: 2, plays: 2 }).points).toBe(false);
    expect(unlocks({ ...none, finished: 2, plays: 2 }).badges).toBe(false);
    const u = unlocks({ ...none, finished: 1, plays: 1, verified: 1 });
    expect(u.badges).toBe(true);
    expect(u.points).toBe(true);
  });

  it('circles and friend streaks appear after the third daily', () => {
    expect(unlocks({ ...none, dailies: 2 }).circles).toBe(false);
    expect(unlocks({ ...none, dailies: 2 }).friendStreaks).toBe(false);
    const u = unlocks({ ...none, dailies: 3 });
    expect(u.circles).toBe(true);
    expect(u.friendStreaks).toBe(true);
  });

  it('Make a puzzle appears after 5 plays', () => {
    expect(unlocks({ ...none, plays: 4 }).make).toBe(false);
    expect(unlocks({ ...none, plays: 5 }).make).toBe(true);
  });

  it('a single play unlocks only what 1 play scores', () => {
    const u = unlocks({ finished: 1, verified: 1, dailies: 1, plays: 1 });
    expect(unlockedList(u)).toEqual(['boards', 'badges', 'points']);
  });

  it('a returning player with history sees everything', () => {
    const u = unlocks({ finished: 40, verified: 38, dailies: 30, plays: 40 });
    expect(unlockedList(u)).toEqual([...FEATURES]);
  });

  it('what was shown once stays, whatever the counts say now', () => {
    const u = unlocks(none, ['make', 'circles']);
    expect(u.make).toBe(true);
    expect(u.circles).toBe(true);
    expect(u.boards).toBe(false);
  });

  it.each([[null], [undefined], ['x'], [7], [[]], [{}], [{ finished: 'many' }], [{ finished: NaN, dailies: -3, plays: Infinity, verified: null }]])(
    'missing or malformed history %j is a first visit',
    (raw) => {
      expect(isFirstVisit(unlocks(raw))).toBe(true);
      expect(isFirstVisit(unlocks(raw, raw))).toBe(true);
    },
  );

  it.each([[null], [undefined], ['make'], [3], [{}], [{ make: true }], [['nope', 4, null]]])('malformed stored unlocks %j keep nothing', (raw) => {
    expect(readKept(raw)).toEqual([]);
    expect(isFirstVisit(unlocks(none, raw))).toBe(true);
  });

  it('reads only whole, positive, finite counts', () => {
    expect(readHistory({ finished: 2.9, verified: '3', dailies: 1, plays: -1 })).toEqual({ finished: 2, verified: 0, dailies: 1, plays: 0 });
    expect(countOf(Infinity)).toBe(0);
    expect(countOf(NaN)).toBe(0);
    expect(countOf(undefined)).toBe(0);
  });

  it('keeps known names from a mixed stored list', () => {
    expect(readKept(['make', 'gold', 'boards', 'make'])).toEqual(['boards', 'make']);
  });

  it('sizeOf never trusts a value to be a list', () => {
    expect(sizeOf(undefined)).toBe(0);
    expect(sizeOf(null)).toBe(0);
    expect(sizeOf('abc')).toBe(0);
    expect(sizeOf([])).toBe(0);
    expect(sizeOf([1])).toBe(1);
  });
});
