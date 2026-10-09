import { rarestFound } from './wordStats';

const stat = (key: string, found: number, players = 100) => ({ key, found, players });

describe('rarestFound', () => {
  it('picks the rarest word the player found', () => {
    const stats = [stat('amos', 90), stat('habakkuk', 8), stat('mark', 30), stat('obadiah', 2)];
    expect(rarestFound(stats, ['amos', 'habakkuk', 'mark'])).toEqual({ key: 'habakkuk', pct: 8 });
  });

  it('says nothing about words the player missed', () => {
    expect(rarestFound([stat('obadiah', 2), stat('amos', 90)], ['amos'])).toEqual({ key: 'amos', pct: 90 });
    expect(rarestFound([stat('obadiah', 2)], ['amos'])).toBeNull();
  });

  it('a common word is still the rarest you found', () => {
    expect(rarestFound([stat('amos', 51)], ['amos'])).toEqual({ key: 'amos', pct: 51 });
    expect(rarestFound([stat('amos', 100), stat('mark', 100)], ['amos', 'mark'])).toEqual({ key: 'amos', pct: 100 });
  });

  it('is empty with nothing found', () => {
    expect(rarestFound([stat('amos', 30)], [])).toBeNull();
  });

  it('never says a share that is not a number, and never over 100%', () => {
    expect(rarestFound([stat('amos', NaN)], ['amos'])).toBeNull();
    expect(rarestFound([stat('amos', 3, NaN)], ['amos'])).toBeNull();
    expect(rarestFound([stat('amos', 0, 0)], ['amos'])).toBeNull();
    expect(rarestFound([stat('amos', -2)], ['amos'])).toBeNull();
    expect(rarestFound([stat('amos', 9, 6)], ['amos'])).toEqual({ key: 'amos', pct: 100 });
    expect(rarestFound([{ key: 'amos' } as never], ['amos'])).toBeNull();
  });

  it('needs enough players for a percentage to mean something', () => {
    expect(rarestFound([stat('amos', 1, 4)], ['amos'])).toBeNull();
    expect(rarestFound([stat('amos', 1, 5)], ['amos'])).toEqual({ key: 'amos', pct: 20 });
  });

  it('never says 0%: the player found it', () => {
    expect(rarestFound([stat('amos', 1, 1000)], ['amos'])).toEqual({ key: 'amos', pct: 1 });
  });

  it('is empty with no stats', () => {
    expect(rarestFound([], ['amos'])).toBeNull();
  });
});
