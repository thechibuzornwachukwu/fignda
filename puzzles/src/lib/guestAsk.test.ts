// @vitest-environment jsdom
import { POOLS } from '../copy';
import { guestAsk, markRunTold, PLACE_MIN_PLAYERS, RUN_ASK, runTold } from './guestAsk';

const facts = { today: true, streak: 1, runTold: false, place: null };

describe('guestAsk', () => {
  it('says nothing special away from today’s daily', () => {
    expect(guestAsk({ ...facts, today: false, streak: 9, place: { place: 2, players: 40 } })).toBeNull();
  });

  it('says the place the score would take on today’s board', () => {
    expect(guestAsk({ ...facts, place: { place: 14, players: 60 } })).toEqual({ pool: 'guestPlace', vars: { n: 14, m: 60 }, run: false });
  });

  it('says no place on a board too small to mean anything, or before the server answers', () => {
    expect(guestAsk({ ...facts, place: { place: 1, players: PLACE_MIN_PLAYERS - 1 } })).toBeNull();
    expect(guestAsk({ ...facts, place: { place: 1, players: PLACE_MIN_PLAYERS } })).not.toBeNull();
    expect(guestAsk({ ...facts, place: null })).toBeNull();
    expect(guestAsk({ ...facts })).toBeNull();
  });

  it.each([
    [{ place: 0, players: 60 }],
    [{ place: 61, players: 60 }],
    [{ place: 1.5, players: 60 }],
    [{ place: Number.NaN, players: 60 }],
    [{ place: 3, players: Number.POSITIVE_INFINITY }],
  ])('never prints a place that cannot be one: %o', (place) => {
    expect(guestAsk({ ...facts, place })).toBeNull();
  });

  it(`says where the run lives at ${RUN_ASK} days, before the place, and only until it has been said`, () => {
    const place = { place: 14, players: 60 };
    expect(guestAsk({ ...facts, streak: RUN_ASK - 1, place })?.pool).toBe('guestPlace');
    expect(guestAsk({ ...facts, streak: RUN_ASK, place })).toEqual({ pool: 'guestRun', vars: { n: RUN_ASK }, run: true });
    expect(guestAsk({ ...facts, streak: 12 })?.pool).toBe('guestRun');
    expect(guestAsk({ ...facts, streak: 12, runTold: true, place })?.pool).toBe('guestPlace');
    expect(guestAsk({ ...facts, streak: 12, runTold: true })).toBeNull();
  });

  it('has lines to say, with the numbers in them and no guilt', () => {
    for (const line of POOLS.guestPlace) expect(line).toMatch(/\{n\}.*\{m\}/);
    for (const line of POOLS.guestRun) expect(line).toMatch(/\{n\}/);
    for (const line of [...POOLS.guestPlace, ...POOLS.guestRun]) expect(line).not.toMatch(/[—!]|lose|losing|lost|miss out|last chance|hurry/i);
  });
});

describe('the run line is said once', () => {
  beforeEach(() => localStorage.clear());

  it('remembers in this browser', () => {
    expect(runTold()).toBe(false);
    markRunTold();
    expect(runTold()).toBe(true);
  });

  it('unreadable storage reads as not said', () => {
    localStorage.setItem('gazecraft-run-told', 'yes');
    expect(runTold()).toBe(false);
  });
});
