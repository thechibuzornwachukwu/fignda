// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import { POOLS } from '../copy';
import type { GenerateResult } from '../lib/api';
import { CustomTopic } from './CustomTopic';

const api = vi.hoisted(() => ({
  calls: [] as Array<{ topic: string; signal: AbortSignal; answer: (r: GenerateResult) => void }>,
}));

vi.mock('../lib/auth', () => ({ useAuth: () => ({ enabled: true, loading: false, profile: null }) }));
vi.mock('../lib/api', () => ({
  generateAvailable: () => Promise.resolve(true),
  // Like the real one: a stopped request answers "aborted".
  generatePuzzle: (topic: string, signal: AbortSignal) =>
    new Promise<GenerateResult>((answer) => {
      api.calls.push({ topic, signal, answer });
      signal.addEventListener('abort', () => answer({ ok: false, error: 'aborted' }));
    }),
}));

const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
/** The answer lands. Timers that are already due (the screen closing) run; nothing else moves on. */
const answer = async (r: GenerateResult) => {
  await act(async () => api.calls.at(-1)!.answer(r));
  await tick(0);
};

function Where() {
  return <span data-testid="where">{useLocation().pathname}</span>;
}

async function open() {
  const view = render(
    <MemoryRouter initialEntries={['/play']}>
      <Where />
      <Routes>
        <Route path="/play" element={<CustomTopic />} />
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );
  await tick(0);
  const input = screen.getByLabelText('Or any topic') as HTMLInputElement;
  fireEvent.change(input, { target: { value: 'Football' } });
  return { ...view, input };
}

const create = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Create puzzle' }));
  await tick(0);
};
const where = () => screen.getByTestId('where').textContent;
const waiting = () => document.querySelector('[data-waiting="full"]');
const line = () => screen.getByRole('alert').textContent;

beforeEach(() => {
  vi.useFakeTimers();
  api.calls.length = 0;
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('CustomTopic wait', () => {
  it('an answer in under 1 second opens the puzzle and the waiting screen never appears', async () => {
    await open();
    await create();
    await tick(900);
    expect(waiting()).toBeNull();
    await answer({ ok: true, code: 'ABCDEFGH' });
    expect(waiting()).toBeNull();
    expect(where()).toBe('/p/ABCDEFGH');
  });

  it('shows after 1 second with the avatar, a making line and Cancel, and takes focus', async () => {
    await open();
    await create();
    expect(waiting()).toBeNull();
    await tick(1000);
    expect(waiting()).not.toBeNull();
    expect(waiting()!.querySelector('svg')!.getAttribute('width')).toBe('88');
    expect(POOLS.waitingMake).toContain(screen.getByRole('status').textContent);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(document.activeElement).toBe(waiting());
    // The old button text and the line under the input are gone.
    expect(screen.queryByText('Creating...')).toBeNull();
    expect(line()).toBe('');
  });

  it('an answer just after it appears waits out the 600ms, then opens the puzzle', async () => {
    await open();
    await create();
    await tick(1100);
    await answer({ ok: true, code: 'ABCDEFGH' });
    expect(waiting()).not.toBeNull();
    expect(where()).toBe('/play');
    await tick(498);
    expect(where()).toBe('/play');
    await tick(2);
    expect(where()).toBe('/p/ABCDEFGH');
  });

  it('double tap and Enter twice send 1 request', async () => {
    const { input } = await open();
    const form = input.closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    fireEvent.click(screen.getByRole('button', { name: 'Create puzzle' }));
    await tick(0);
    fireEvent.submit(form);
    await tick(2000);
    fireEvent.submit(form);
    await tick(0);
    expect(api.calls).toHaveLength(1);
    expect(api.calls[0]!.topic).toBe('Football');
  });

  it('Cancel stops the request, closes at once, keeps the topic and returns focus to the input', async () => {
    const { input } = await open();
    await create();
    await tick(1050);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await tick(0);
    expect(api.calls[0]!.signal.aborted).toBe(true);
    expect(waiting()).toBeNull();
    expect(input.value).toBe('Football');
    expect(document.activeElement).toBe(input);
    expect(line()).toBe('');
    await tick(10 * 60 * 1000);
    expect(where()).toBe('/play');
    expect(line()).toBe('');

    // And the player can ask again.
    await create();
    expect(api.calls).toHaveLength(2);
  });

  it('failure: the screen closes, the topic stays, the genFail line shows', async () => {
    const { input } = await open();
    await create();
    await tick(3000);
    await answer({ ok: false, error: 'generate_failed' });
    expect(waiting()).toBeNull();
    expect(POOLS.genFail).toContain(line());
    expect(input.value).toBe('Football');
    expect(document.activeElement).toBe(input);
    expect(where()).toBe('/play');
  });

  it.each([
    [45, '1 minute'],
    [61, '2 minutes'],
    [1800, '30 minutes'],
    [3600, '1 hour'],
    [5400, '2 hours'],
    [undefined, 'a little while'],
  ])('limit reached: Retry-After %s reads "%s"', async (retryAfter, when) => {
    const { input } = await open();
    await create();
    await answer({ ok: false, error: 'rate_limited', retryAfter });
    expect(waiting()).toBeNull();
    expect(POOLS.genLimit.map((l) => l.replace('{t}', when))).toContain(line());
    expect(input.value).toBe('Football');
  });

  it('offline before asking: no request, the offline line, the topic kept', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { input } = await open();
    await create();
    expect(api.calls).toHaveLength(0);
    expect(POOLS.genOffline).toContain(line());
    expect(input.value).toBe('Football');
  });

  it('signal lost mid wait: the screen closes with the offline line', async () => {
    const { input } = await open();
    await create();
    await tick(4000);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await answer({ ok: false, error: 'network' });
    expect(waiting()).toBeNull();
    expect(POOLS.genOffline).toContain(line());
    expect(input.value).toBe('Football');
  });

  it('a network failure while online is the genFail line', async () => {
    await open();
    await create();
    await answer({ ok: false, error: 'network' });
    expect(POOLS.genFail).toContain(line());
  });

  it('past 5 minutes the request is stopped and the failure line shows', async () => {
    const { input } = await open();
    await create();
    await tick(5 * 60 * 1000 - 1);
    expect(waiting()).not.toBeNull();
    expect(api.calls[0]!.signal.aborted).toBe(false);
    await tick(1);
    expect(api.calls[0]!.signal.aborted).toBe(true);
    await tick(0);
    expect(waiting()).toBeNull();
    expect(POOLS.genFail).toContain(line());
    expect(input.value).toBe('Football');
  });

  it('leaving during the wait stops the request, and a late answer goes nowhere', async () => {
    const view = await open();
    await create();
    await tick(2000);
    const call = api.calls[0]!;
    view.unmount();
    expect(call.signal.aborted).toBe(true);
    await act(async () => call.answer({ ok: true, code: 'ABCDEFGH' }));
    await tick(5000);
    expect(document.querySelector('[data-waiting]')).toBeNull();
  });

  it('an empty topic asks for one and sends nothing', async () => {
    const { input } = await open();
    fireEvent.change(input, { target: { value: '   ' } });
    await create();
    expect(api.calls).toHaveLength(0);
    expect(line()).toBe('Give us something to hide words in first.');
  });
});
