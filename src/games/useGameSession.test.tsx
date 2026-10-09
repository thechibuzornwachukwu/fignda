// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { getPuzzle } from './catalog';
import { registry } from './registry';
import { useGameSession, type Session } from './session';

const mod = registry['hidden-words'];
const puzzle = getPuzzle('bnote')!;

beforeEach(() => {
  window.scrollTo = () => {};
});

describe('useGameSession onFinish', () => {
  it('is called once when "I\'m done" ends a game at once, with nothing found', () => {
    const onFinish = vi.fn<(s: Session) => void>();
    const { result } = renderHook(() => useGameSession({ mod, puzzle, onFinish }));
    act(() => result.current.finish());
    act(() => result.current.finish());
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0]![0]).toMatchObject({ found: [], hints: 0, wrongs: 0 });
    expect(onFinish.mock.calls[0]![0].endAt).not.toBeNull();
    expect(result.current.finished).toBe(true);
  });

  it('is called once by the last find, and not by the finds before it', () => {
    const onFinish = vi.fn<(s: Session) => void>();
    const { result } = renderHook(() => useGameSession({ mod, puzzle, onFinish }));
    const spans = puzzle.answers.map((a) => a.spans[0]!);
    for (const [a, b] of spans.slice(0, -1)) act(() => result.current.pick(a, b));
    expect(onFinish).not.toHaveBeenCalled();
    const [a, b] = spans.at(-1)!;
    act(() => result.current.pick(a, b));
    act(() => result.current.pick(a, b));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0]![0].found).toHaveLength(puzzle.answers.length);
  });

  it('is called again for a replay, which is a new game', () => {
    const onFinish = vi.fn<(s: Session) => void>();
    const { result } = renderHook(() => useGameSession({ mod, puzzle, onFinish }));
    act(() => result.current.finish());
    act(() => result.current.replay());
    act(() => result.current.finish());
    expect(onFinish).toHaveBeenCalledTimes(2);
  });
});
