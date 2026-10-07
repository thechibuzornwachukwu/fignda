import { rarestFound } from './wordStats';

const stat = (key: string, found: number, players = 100) => ({ key, found, players });

describe('rarestFound', () => {
  it('picks the rarest word the player found', () => {
    const stats = [stat('amos', 90), stat('habakkuk', 8), stat('mark', 30), stat('obadiah', 2)];
    expect(rarestFound(stats, ['amos', 'habakkuk', 'mark'])).toEqual({ key: 'habakkuk', pct: 8 });
  });

  it('says nothing about words the player missed, or common ones', () => {
    expect(rarestFound([stat('obadiah', 2), stat('amos', 90)], ['amos'])).toBeNull();
    expect(rarestFound([stat('amos', 51)], ['amos'])).toBeNull();
    expect(rarestFound([stat('amos', 50)], ['amos'])).toEqual({ key: 'amos', pct: 50 });
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
