// @vitest-environment jsdom
import { loadRecords, mergeRecords } from './records';

beforeEach(() => localStorage.clear());

describe('records from the account', () => {
  it('keeps the better of each: the faster clean read, the longer word, the bigger week', () => {
    localStorage.setItem('gazecraft-records', JSON.stringify({ clean: { Bible: 80, Science: 40 }, daily: 0, long: { word: 'Hebrews', len: 7 }, week: 900 }));
    const r = mergeRecords({ clean: { Bible: 60, Science: 55, Names: 70 }, long: { word: 'lamentations', len: 12 }, best_week: 2400 });
    expect(r).toEqual({ clean: { Bible: 60, Science: 40, Names: 70 }, daily: 0, long: { word: 'lamentations', len: 12 }, week: 2400 });
    expect(loadRecords()).toEqual(r);
  });

  it('nothing goes down, and an answer that is not records changes nothing', () => {
    localStorage.setItem('gazecraft-records', JSON.stringify({ clean: { Bible: 30 }, daily: 0, long: { word: 'Hebrews', len: 7 }, week: 900 }));
    const before = loadRecords();
    for (const bad of [null, undefined, 7, 'x', [], { clean: { Bible: -5, X: 'fast' }, long: { word: '', len: 3 }, best_week: -1 }, { best_week: 100, long: { word: 'Job', len: 3 } }]) {
      expect(mergeRecords(bad)).toEqual(before);
    }
  });
});
