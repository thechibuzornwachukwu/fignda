import { dayNo } from '../engine/daily';
import { ago, BADGES, badgeLabel, describe as say, type Note } from './notifications';

const NOW = Date.UTC(2026, 9, 8, 12);
const note = (over: Partial<Note>): Note => ({
  id: 1,
  kind: 'follow',
  handle: 'ada',
  name: 'Ada',
  data: {},
  created_at: new Date(NOW - 5 * 60_000).toISOString(),
  unread: true,
  ...over,
});

describe('notification text and links', () => {
  it.each([
    [{ kind: 'follow' }, 'Ada followed you.', '/u/ada'],
    [{ kind: 'streak_ask' }, 'Ada wants a streak with you.', '/players#friend-streaks'],
    [{ kind: 'streak_start' }, 'Your streak with Ada has started.', '/players#friend-streaks'],
    [{ kind: 'nudge' }, 'Ada has played today and nudged you.', `/d/${dayNo(new Date(NOW))}`],
    [{ kind: 'badge', handle: null, name: null, data: { code: 'streak_7' } }, 'New badge: 7 day streak.', '/me#badges'],
    [{ kind: 'badge', handle: null, name: null, data: { code: 'points_1000' } }, 'New badge: 1,000 points.', '/me#badges'],
  ] as const)('%o', (over, text, to) => {
    expect(say(note(over as Partial<Note>), NOW)).toEqual({ text, to });
  });

  it('a fresh room invite opens the room; an old one opens the puzzle', () => {
    const data = { game: 'lagos', room: 'ABCDEF', title: 'Aunty Mary' };
    expect(say(note({ kind: 'room_invite', data }), NOW)).toEqual({
      text: 'Ada invited you to play Aunty Mary together.',
      to: '/play/lagos?room=ABCDEF',
    });
    const old = note({ kind: 'room_invite', data, created_at: new Date(NOW - 2 * 3600_000).toISOString() });
    expect(say(old, NOW).to).toBe('/play/lagos');
    // Player-made puzzles open by their code.
    expect(say(note({ kind: 'room_invite', data: { ...data, game: 'c-abcdefgh' } }), NOW).to).toBe('/p/ABCDEFGH?room=ABCDEF');
  });

  it('a player whose account is gone still reads as a sentence', () => {
    expect(say(note({ handle: null, name: null }), NOW)).toEqual({ text: 'A player followed you.', to: '/players' });
  });
});

describe('badges', () => {
  it('codes are unique and an unknown code still has a name', () => {
    expect(new Set(BADGES.map((b) => b.code)).size).toBe(BADGES.length);
    expect(badgeLabel('nope')).toBe('New badge');
    expect(badgeLabel('first_game')).toBe('First game');
  });
});

describe('ago', () => {
  it.each([
    [20_000, 'now'],
    [5 * 60_000, '5 min'],
    [3 * 3600_000, '3 h'],
    [2 * 86_400_000, '2 d'],
    [20 * 86_400_000, '18 Sept'],
  ])('%i ms', (ms, want) => {
    expect(ago(new Date(NOW - ms).toISOString(), NOW)).toBe(want);
  });
});
