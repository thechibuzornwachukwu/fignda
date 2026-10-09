// @vitest-environment jsdom
import { applyRecords, emptyRecords, loadRecords, parseRecords, recordPlay, type PlayFacts } from './records';

const KEY = 'gazecraft-records';
const play = (over: Partial<PlayFacts> = {}): PlayFacts => ({ pack: null, cleanSecs: null, dailyFound: null, longest: null, ...over });

describe('applyRecords', () => {
  it('stores the first value of each kind quietly', () => {
    const { next, broke } = applyRecords(emptyRecords(), play({ pack: 'Bible', cleanSecs: 90, dailyFound: 7, longest: { word: 'Habakkuk', len: 8 } }));
    expect(next).toEqual({ clean: { Bible: 90 }, daily: 7, long: { word: 'Habakkuk', len: 8 } });
    expect(broke).toEqual([]);
  });

  it('a faster clean read in the same pack is a record, a slower or equal one is not', () => {
    const cur = { ...emptyRecords(), clean: { Bible: 90 } };
    expect(applyRecords(cur, play({ pack: 'Bible', cleanSecs: 61 }))).toEqual({
      next: { ...cur, clean: { Bible: 61 } },
      broke: [{ kind: 'clean', pack: 'Bible', secs: 61 }],
    });
    expect(applyRecords(cur, play({ pack: 'Bible', cleanSecs: 90 }))).toEqual({ next: cur, broke: [] });
    expect(applyRecords(cur, play({ pack: 'Bible', cleanSecs: 120 }))).toEqual({ next: cur, broke: [] });
  });

  it('keeps packs apart: a first clean read in another pack is quiet', () => {
    const cur = { ...emptyRecords(), clean: { Bible: 90 } };
    const { next, broke } = applyRecords(cur, play({ pack: 'Football', cleanSecs: 30 }));
    expect(next.clean).toEqual({ Bible: 90, Football: 30 });
    expect(broke).toEqual([]);
  });

  it('a play that was not a clean read, or has no pack, leaves the times alone', () => {
    const cur = { ...emptyRecords(), clean: { Bible: 90 } };
    expect(applyRecords(cur, play({ pack: 'Bible', cleanSecs: null })).next).toEqual(cur);
    expect(applyRecords(cur, play({ pack: null, cleanSecs: 5 })).next).toEqual(cur);
  });

  it('most found in a daily: more is a record, the same or fewer is not', () => {
    const cur = { ...emptyRecords(), daily: 7 };
    expect(applyRecords(cur, play({ dailyFound: 9 }))).toEqual({ next: { ...cur, daily: 9 }, broke: [{ kind: 'daily', found: 9 }] });
    expect(applyRecords(cur, play({ dailyFound: 7 })).broke).toEqual([]);
    expect(applyRecords(cur, play({ dailyFound: 2 })).next.daily).toBe(7);
    expect(applyRecords(cur, play({ dailyFound: null })).next.daily).toBe(7);
  });

  it('longest word: longer is a record, the same length is not', () => {
    const cur = { ...emptyRecords(), long: { word: 'Habakkuk', len: 8 } };
    expect(applyRecords(cur, play({ longest: { word: 'Deuteronomy', len: 11 } })).broke).toEqual([{ kind: 'long', word: 'Deuteronomy', len: 11 }]);
    expect(applyRecords(cur, play({ longest: { word: 'Obadiahs', len: 8 } }))).toEqual({ next: cur, broke: [] });
  });

  it('a game with 0 found, ended at once, sets nothing and beats nothing', () => {
    expect(applyRecords(emptyRecords(), play({ pack: 'Bible', dailyFound: 0 }))).toEqual({ next: emptyRecords(), broke: [] });
    const cur = { clean: { Bible: 90 }, daily: 7, long: { word: 'Amos', len: 4 } };
    expect(applyRecords(cur, play({ pack: 'Bible', dailyFound: 0 }))).toEqual({ next: cur, broke: [] });
  });

  it('ignores facts that are not numbers or words', () => {
    const bad = play({ pack: 'Bible', cleanSecs: NaN, dailyFound: NaN, longest: { word: '', len: NaN } });
    expect(applyRecords(emptyRecords(), bad)).toEqual({ next: emptyRecords(), broke: [] });
    expect(applyRecords(emptyRecords(), play({ pack: 'Bible', cleanSecs: -4, dailyFound: 2.5 })).next).toEqual(emptyRecords());
  });

  it('does not change the records it is given', () => {
    const cur = { clean: { Bible: 90 }, daily: 7, long: null };
    applyRecords(cur, play({ pack: 'Bible', cleanSecs: 10, dailyFound: 9 }));
    expect(cur).toEqual({ clean: { Bible: 90 }, daily: 7, long: null });
  });
});

describe('parseRecords', () => {
  it.each([null, undefined, 'x', 4, [], [1, 2]])('%o is no records', (v) => {
    expect(parseRecords(v)).toEqual(emptyRecords());
  });

  it('drops every field that is malformed and keeps the rest', () => {
    expect(
      parseRecords({ clean: { Bible: 90, Football: 'fast', Music: -1, Film: null }, daily: '7', long: { word: 'Amos' }, extra: 1 }),
    ).toEqual({ clean: { Bible: 90 }, daily: 0, long: null });
    expect(parseRecords({ clean: [1], daily: 6, long: { word: ' ', len: 3 } })).toEqual({ clean: {}, daily: 6, long: null });
  });
});

describe('records store', () => {
  beforeEach(() => localStorage.clear());

  it('starts empty', () => {
    expect(loadRecords()).toEqual(emptyRecords());
  });

  it('reads broken storage as empty, and the next play starts it again', () => {
    localStorage.setItem(KEY, '{not json');
    expect(loadRecords()).toEqual(emptyRecords());
    localStorage.setItem(KEY, '"undefined"');
    expect(loadRecords()).toEqual(emptyRecords());
    expect(recordPlay(play({ dailyFound: 5 }))).toEqual([]);
    expect(loadRecords().daily).toBe(5);
  });

  it('the first finished game sets records quietly, the next better one reports them', () => {
    expect(recordPlay(play({ pack: 'Bible', cleanSecs: 80, longest: { word: 'Amos', len: 4 } }))).toEqual([]);
    expect(recordPlay(play({ pack: 'Bible', cleanSecs: 70, longest: { word: 'Habakkuk', len: 8 } }))).toEqual([
      { kind: 'clean', pack: 'Bible', secs: 70 },
      { kind: 'long', word: 'Habakkuk', len: 8 },
    ]);
    expect(loadRecords()).toEqual({ clean: { Bible: 70 }, daily: 0, long: { word: 'Habakkuk', len: 8 } });
  });

  it('writes nothing when nothing changed', () => {
    recordPlay(play());
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});
