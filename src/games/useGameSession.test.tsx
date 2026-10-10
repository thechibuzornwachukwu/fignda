// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { getPuzzle } from './catalog';
import { registry } from './registry';
import copyPools from '../../data/copy.json';
import { replay } from '../../worker/src/replay';
import { secondsOf, useGameSession, type Session } from './session';

const mod = registry['hidden-words'];
const puzzle = getPuzzle('bnote')!;
const spans = puzzle.answers.map((a) => a.spans[0]!);
const MIN = 60_000;

beforeEach(() => {
  window.scrollTo = () => {};
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

/** The tab goes to the background, or comes back. */
function show(state: 'hidden' | 'visible') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('useGameSession save and resume', () => {
  const KEY = 'gazecraft-resume-bnote';
  const open = (opts: { resumeId?: string; dailyN?: number; onStart?: () => void } = { resumeId: 'bnote' }) =>
    renderHook(() => useGameSession({ mod, puzzle, ...opts }));

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-10T09:00:00Z'));
    show('visible');
  });

  it('leaving keeps the finds, the hints and the clock, and time away is not on the clock', () => {
    const first = open();
    vi.advanceTimersByTime(8000);
    act(() => first.result.current.pick(...spans[0]!));
    vi.advanceTimersByTime(4000);
    act(() => first.result.current.hint());
    vi.advanceTimersByTime(3000);
    first.unmount();

    vi.advanceTimersByTime(26 * 60 * MIN);
    const again = open();
    const s = again.result.current.s;
    expect(s.found.map((f) => f.key)).toEqual([puzzle.answers[0]!.key]);
    expect(s).toMatchObject({ hints: 1, endAt: null });
    expect(s.hintLi).toBeGreaterThanOrEqual(0);
    expect(secondsOf(s, Date.now())).toBe(15);
    expect(again.result.current.finished).toBe(false);
  });

  it('a game left before anything was found keeps its clock too', () => {
    const first = open();
    vi.advanceTimersByTime(40_000);
    first.unmount();
    vi.advanceTimersByTime(5 * MIN);
    expect(secondsOf(open().result.current.s, Date.now())).toBe(40);
  });

  it('the clock stops while the tab is in the background', () => {
    const { result } = open();
    vi.advanceTimersByTime(10_000);
    act(() => show('hidden'));
    vi.advanceTimersByTime(45 * MIN);
    act(() => show('visible'));
    vi.advanceTimersByTime(5000);
    expect(secondsOf(result.current.s, Date.now())).toBe(15);
  });

  it('a tab closed in the background comes back where it stopped', () => {
    const first = open();
    vi.advanceTimersByTime(10_000);
    act(() => first.result.current.pick(...spans[0]!));
    act(() => show('hidden'));
    vi.advanceTimersByTime(3 * MIN);
    // The browser drops the page: no further event, the component is simply gone.
    first.unmount();
    vi.advanceTimersByTime(60 * MIN);
    show('visible');
    const s = open().result.current.s;
    expect(s.found).toHaveLength(1);
    expect(secondsOf(s, Date.now())).toBe(10);
  });

  it('the server accepts a game played in 2 sittings, and times it by time on the puzzle', () => {
    const first = open();
    for (const [a, b] of spans.slice(0, 2)) {
      vi.advanceTimersByTime(5000);
      act(() => first.result.current.pick(a, b));
    }
    first.unmount();
    vi.advanceTimersByTime(48 * 60 * MIN);

    const again = open();
    for (const [a, b] of spans.slice(2)) {
      vi.advanceTimersByTime(5000);
      act(() => again.result.current.pick(a, b));
    }
    const s = again.result.current.s;
    expect(again.result.current.finished).toBe(true);
    const secs = spans.length * 5;
    expect(secondsOf(s, Date.now())).toBe(secs);
    const r = replay(puzzle, { events: s.log!.events, hints: s.log!.hints, finish: s.endAt! - s.startAt }, false);
    expect(r).toMatchObject({ ok: true, found: spans.length, secs, clean: true });
  });

  it('a finished game is not kept: the next visit starts clean', () => {
    const first = open();
    act(() => first.result.current.pick(...spans[0]!));
    act(() => first.result.current.finish());
    first.unmount();
    expect(localStorage.getItem(KEY)).toBeNull();
    const s = open().result.current.s;
    expect(s).toMatchObject({ found: [], endAt: null });
  });

  it('time away after the end changes nothing', () => {
    const { result } = open();
    vi.advanceTimersByTime(7000);
    act(() => result.current.finish());
    const ended = result.current.s;
    act(() => show('hidden'));
    vi.advanceTimersByTime(30 * MIN);
    act(() => show('visible'));
    expect(result.current.s).toBe(ended);
  });

  it('"Play again" starts clean and that new game is the one kept', () => {
    const first = open();
    act(() => first.result.current.pick(...spans[0]!));
    act(() => first.result.current.finish());
    vi.advanceTimersByTime(9000);
    act(() => first.result.current.replay());
    vi.advanceTimersByTime(2000);
    first.unmount();
    const s = open().result.current.s;
    expect(s.found).toEqual([]);
    expect(secondsOf(s, Date.now())).toBe(2);
  });

  it('a find the puzzle no longer hides is dropped, and the rest is kept', () => {
    const first = open();
    act(() => first.result.current.pick(...spans[0]!));
    first.unmount();
    const kept = JSON.parse(localStorage.getItem(KEY)!) as Session;
    kept.found.push({ key: 'notaword', label: 'Notaword', span: [0, 7] });
    localStorage.setItem(KEY, JSON.stringify(kept));
    expect(open().result.current.s.found.map((f) => f.key)).toEqual([puzzle.answers[0]!.key]);
  });

  it('without an id nothing is kept: a room game starts clean', () => {
    const first = open({});
    act(() => first.result.current.pick(...spans[0]!));
    act(() => show('hidden'));
    vi.advanceTimersByTime(10 * MIN);
    act(() => show('visible'));
    // A room shares one clock with everyone in it: time away stays on it.
    expect(secondsOf(first.result.current.s, Date.now())).toBe(600);
    first.unmount();
    expect(Object.keys(localStorage)).toEqual([]);
    expect(open({}).result.current.s.found).toEqual([]);
  });

  it('the daily clock counts time on the puzzle too, and the daily is kept in its own place', () => {
    const first = open({ dailyN: 283, resumeId: 'bnote' });
    vi.advanceTimersByTime(10_000);
    act(() => first.result.current.pick(...spans[0]!));
    act(() => show('hidden'));
    vi.advanceTimersByTime(20 * MIN);
    act(() => show('visible'));
    expect(secondsOf(first.result.current.s, Date.now())).toBe(10);
    vi.advanceTimersByTime(5000);
    first.unmount();
    vi.advanceTimersByTime(20 * MIN);
    expect(Object.keys(localStorage)).toEqual(['gazecraft-daily-283']);
    const s = open({ dailyN: 283 }).result.current.s;
    expect(s.found).toHaveLength(1);
    expect(secondsOf(s, Date.now())).toBe(15);
  });

  it('a finished daily stays finished, with its time as it was', () => {
    const first = open({ dailyN: 283 });
    vi.advanceTimersByTime(30_000);
    act(() => first.result.current.finish());
    first.unmount();
    vi.advanceTimersByTime(3 * 60 * MIN);
    const again = open({ dailyN: 283 });
    expect(again.result.current.finished).toBe(true);
    expect(secondsOf(again.result.current.s, Date.now())).toBe(30);
    expect(again.result.current.s.msg).toBe('');
  });

  it('a page that goes without a word keeps the clock running: a crash never shortens a time', () => {
    const first = open();
    vi.advanceTimersByTime(10_000);
    act(() => first.result.current.pick(...spans[0]!));
    // No hide, no unload: the stored game is as the last pick left it.
    vi.advanceTimersByTime(30 * MIN);
    const s = open().result.current.s;
    expect(s.found).toHaveLength(1);
    expect(secondsOf(s, Date.now())).toBe(10 + 30 * 60);
  });

  it('a game carried on says so once, in one line from the pool', () => {
    const first = open();
    act(() => first.result.current.pick(...spans[0]!));
    first.unmount();
    const again = open();
    expect(copyPools.resumed).toContain(again.result.current.s.msg);
    // The line is for the screen. It is never stored.
    expect(localStorage.getItem(KEY)).not.toContain(again.result.current.s.msg);
  });

  it('a game with nothing found yet comes back with its clock and no line', () => {
    const first = open();
    vi.advanceTimersByTime(20_000);
    first.unmount();
    expect(open().result.current.s.msg).toBe('');
  });

  it('a new game is counted once: not when it is carried on, and again for "Play again"', () => {
    const onStart = vi.fn();
    const first = open({ resumeId: 'bnote', onStart });
    expect(onStart).toHaveBeenCalledTimes(1);
    act(() => first.result.current.pick(...spans[0]!));
    first.unmount();
    const again = open({ resumeId: 'bnote', onStart });
    expect(onStart).toHaveBeenCalledTimes(1);
    act(() => again.result.current.finish());
    act(() => again.result.current.replay());
    expect(onStart).toHaveBeenCalledTimes(2);
  });
});
