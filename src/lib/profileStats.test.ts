import { profileStats, type PlayRow } from './profileStats';

const play = (over: Partial<PlayRow>): PlayRow => ({
  game_id: 'bible',
  day_no: null,
  found: 3,
  total: 30,
  score: 300,
  secs: 60,
  created_at: '2026-09-20T10:00:00Z',
  ...over,
});

describe('points', () => {
  it('adds every daily, the best score per other puzzle, and nothing unverified', () => {
    const s = profileStats(
      [
        play({ day_no: 3, score: 400 }),
        play({ day_no: 4, score: 250 }),
        // The same puzzle three times: only the best counts.
        play({ game_id: 'space', score: 300 }),
        play({ game_id: 'space', score: 900 }),
        play({ game_id: 'space', score: 100 }),
        // Ended early, 2 words in: still worth what it earned.
        play({ game_id: 'bible', found: 2, score: 175 }),
        play({ day_no: 5, score: 5000, verified: false }),
      ],
      10,
    );
    expect(s.points).toBe(400 + 250 + 900 + 175);
  });

  it('is 0 for a new player', () => {
    expect(profileStats([], 10).points).toBe(0);
  });
});

describe('profileStats', () => {
  it('counts dailies, current and best streak', () => {
    const plays = [1, 2, 3, 4, 8, 9, 10].map((d) => play({ day_no: d, created_at: `2026-01-${String(d).padStart(2, '0')}T10:00:00Z` }));
    const s = profileStats(plays, 10);
    expect(s).toMatchObject({ dailies: 7, streak: 3, bestStreak: 4 });
  });

  it('perfect means every word found, and today (total hidden) is never perfect yet', () => {
    const s = profileStats(
      [play({ found: 30, total: 30 }), play({ found: 7, total: 8 }), play({ day_no: 10, found: 9, total: null })],
      10,
    );
    expect(s.perfect).toBe(1);
  });

  it('last 14 days ends today and marks perfect, played and missed days', () => {
    const s = profileStats([play({ day_no: 10, found: 8, total: 8 }), play({ day_no: 9 }), play({ day_no: 2 })], 10);
    expect(s.last14).toHaveLength(14);
    expect(s.last14.at(-1)).toEqual({ day: 10, state: 'perfect' });
    expect(s.last14.at(-2)).toEqual({ day: 9, state: 'played' });
    expect(s.last14[0]).toEqual({ day: -3, state: 'none' });
    expect(s.last14.find((c) => c.day === 2)!.state).toBe('played');
  });

  it('recent is newest first and capped at 10', () => {
    const plays = Array.from({ length: 12 }, (_, i) => play({ created_at: `2026-09-${String(i + 1).padStart(2, '0')}T00:00:00Z` }));
    const s = profileStats(plays, 300);
    expect(s.recent).toHaveLength(10);
    expect(s.recent[0]!.created_at).toBe('2026-09-12T00:00:00Z');
  });

  it('ignores future and invalid day numbers', () => {
    expect(profileStats([play({ day_no: 11 }), play({ day_no: 0 })], 10).dailies).toBe(0);
  });
});
