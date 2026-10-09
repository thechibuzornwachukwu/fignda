import gamesFile from '../../data/games.json';
import { buildHiddenWords } from './hiddenWords';
import { dayProfile, dayStats, typicalCount } from './variableDay';

const catalogue = (gamesFile as unknown as { dailyPool: string[]; games: Array<{ id: string; text: string; dict: string[] }> });
const pool = catalogue.dailyPool.map((id) => buildHiddenWords(catalogue.games.find((g) => g.id === id)!));

describe('typicalCount', () => {
  it('is the median', () => {
    expect(typicalCount([8, 11, 5])).toBe(8);
    expect(typicalCount([9, 1, 7, 3, 5])).toBe(5);
  });
  it('averages the middle two and rounds halves up', () => {
    expect(typicalCount([4, 6])).toBe(5);
    expect(typicalCount([4, 7])).toBe(6);
  });
  it('is 0 for nothing', () => {
    expect(typicalCount([])).toBe(0);
  });
  it('does not change the list it is given', () => {
    const c = [3, 1, 2];
    typicalCount(c);
    expect(c).toEqual([3, 1, 2]);
  });
});

describe('dayProfile', () => {
  it('counts the answers the engine found', () => {
    const p = buildHiddenWords({ text: 'Pat omitted a most odd note.', dict: ['atom', 'amos', 'zebra'] });
    expect(dayProfile(p)).toEqual({ total: 2, longWord: false, deepWord: false });
  });
  it('sees a long word and a deep word', () => {
    const long = buildHiddenWords({ text: 'We saw an extra ordinary thing.', dict: ['extraordinary'] });
    expect(dayProfile(long)).toMatchObject({ total: 1, longWord: true });
    const deep = buildHiddenWords({ text: 'Oh, I go, a tot of fun.', dict: ['igoat'] });
    expect(dayProfile(deep)).toMatchObject({ total: 1, deepWord: true, longWord: false });
  });
});

describe('dayStats', () => {
  it('puts today against the daily pool', () => {
    const counts = pool.map((p) => p.answers.length);
    const s = dayStats(pool[0]!, pool);
    expect(s.total).toBe(counts[0]);
    expect(s.typical).toBe(typicalCount(counts));
    expect(s.typical).toBeGreaterThan(0);
  });
});
