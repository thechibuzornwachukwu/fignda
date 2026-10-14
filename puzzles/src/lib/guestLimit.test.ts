// @vitest-environment jsdom
import { GUEST_GAMES, GUEST_PLAYED_KEY, guestBlocked, guestPlayed, markGuestPlayed, playKey } from './guestLimit';

beforeEach(() => localStorage.clear());

describe('the guest limit', () => {
  it('a game is counted under its day, its clue or its id', () => {
    expect(playKey('bible', 12)).toBe('d12');
    expect(playKey('bible', undefined, 2)).toBe('bible~2');
    expect(playKey('bible')).toBe('bible');
  });

  it('2 games, then a new one is blocked, and one already played stays open', () => {
    expect(GUEST_GAMES).toBe(2);
    expect(guestBlocked('bible~1')).toBe(false);
    markGuestPlayed('bible~1');
    expect(guestBlocked('bible~2')).toBe(false);
    markGuestPlayed('bible~2');
    expect(guestBlocked('bible')).toBe(true);
    expect(guestBlocked('d7')).toBe(true);
    expect(guestBlocked('bible~1')).toBe(false);
    expect(guestBlocked('bible~2')).toBe(false);
  });

  it('the same game twice is one game', () => {
    markGuestPlayed('bible~1');
    markGuestPlayed('bible~1');
    expect(guestPlayed()).toEqual(['bible~1']);
    expect(guestBlocked('science')).toBe(false);
  });

  it('broken storage blocks nobody', () => {
    for (const bad of ['{broken', '"x"', '{"a":1}', '[1,null,{}]']) {
      localStorage.setItem(GUEST_PLAYED_KEY, bad);
      expect(guestPlayed()).toEqual([]);
      expect(guestBlocked('bible')).toBe(false);
    }
  });
});