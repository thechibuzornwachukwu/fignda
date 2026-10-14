// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { avatarCode, avatarFor, DEFAULT_AVATAR } from '../avatar/draw';
import { forgetGuestSeed, GUEST_SEED_KEY, guestSeed } from '../avatar/guest';
import { setAvatarCode } from '../avatar/store';
import { POOLS } from '../copy';
import { useDelayedWaiting, WAIT_DELAY_MS, WAIT_LINE_MS, WAIT_MIN_MS } from './useDelayedWaiting';
import { Waiting } from './Waiting';

const auth = vi.hoisted(() => ({ profile: null as { id: string; name: string; handle: string } | null }));
vi.mock('../lib/auth', () => ({ useAuth: () => ({ enabled: true, loading: false, profile: auth.profile }) }));

const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers();
  auth.profile = null;
  forgetGuestSeed();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useDelayedWaiting', () => {
  const setup = (active = true) => renderHook(({ on }) => useDelayedWaiting(on), { initialProps: { on: active } });

  it('stays hidden for the first second, then shows', () => {
    const h = setup();
    expect(h.result.current).toBe(false);
    tick(WAIT_DELAY_MS - 1);
    expect(h.result.current).toBe(false);
    tick(1);
    expect(h.result.current).toBe(true);
  });

  it('never shows when the answer comes in under a second', () => {
    const h = setup();
    tick(WAIT_DELAY_MS - 1);
    h.rerender({ on: false });
    tick(10_000);
    expect(h.result.current).toBe(false);
  });

  it('stays at least 600ms when the answer comes just after it appears', () => {
    const h = setup();
    tick(WAIT_DELAY_MS);
    tick(50);
    h.rerender({ on: false });
    expect(h.result.current).toBe(true);
    tick(WAIT_MIN_MS - 50 - 1);
    expect(h.result.current).toBe(true);
    tick(1);
    expect(h.result.current).toBe(false);
  });

  it('hides at once when it has already been up longer than the minimum', () => {
    const h = setup();
    tick(WAIT_DELAY_MS + WAIT_MIN_MS + 5000);
    h.rerender({ on: false });
    tick(0);
    expect(h.result.current).toBe(false);
  });

  it('keeps showing when work starts again inside the minimum', () => {
    const h = setup();
    tick(WAIT_DELAY_MS + 100);
    h.rerender({ on: false });
    tick(100);
    h.rerender({ on: true });
    tick(5000);
    expect(h.result.current).toBe(true);
  });

  it('is hidden when nothing is running', () => {
    const h = setup(false);
    tick(10_000);
    expect(h.result.current).toBe(false);
  });
});

describe('Waiting', () => {
  const avatar = (c: HTMLElement) => c.querySelector('svg')!;

  it('full: avatar at 88, 3 hidden dots, one status line from the pool, and nothing else', () => {
    const { container } = render(<Waiting />);
    expect(avatar(container).getAttribute('width')).toBe('88');
    expect(avatar(container).getAttribute('aria-hidden')).toBe('true');
    const dots = container.querySelector('[aria-hidden="true"]:not(svg)')!;
    expect(dots.children).toHaveLength(3);
    const status = screen.getAllByRole('status');
    expect(status).toHaveLength(1);
    expect(POOLS.waiting).toContain(status[0]!.textContent);
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.firstElementChild!.getAttribute('data-waiting')).toBe('full');
  });

  it('inline: avatar at 40', () => {
    const { container } = render(<Waiting size="inline" />);
    expect(avatar(container).getAttribute('width')).toBe('40');
    expect(container.firstElementChild!.getAttribute('data-waiting')).toBe('inline');
  });

  it('reads from the pool it is given', () => {
    render(<Waiting pool="waitingMake" />);
    expect(POOLS.waitingMake).toContain(screen.getByRole('status').textContent);
  });

  it('Cancel is a text button that calls back', () => {
    const onCancel = vi.fn();
    render(<Waiting onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('changes the line every 20 seconds, never sooner, never the same line twice in a row', () => {
    render(<Waiting pool="waitingMake" />);
    const status = screen.getByRole('status');
    let prev = status.textContent;
    tick(WAIT_LINE_MS - 1);
    expect(status.textContent).toBe(prev);
    for (let i = 0; i < 12; i++) {
      tick(i === 0 ? 1 : WAIT_LINE_MS);
      expect(status.textContent).not.toBe(prev);
      expect(POOLS.waitingMake).toContain(status.textContent);
      prev = status.textContent;
      tick(WAIT_LINE_MS - 1);
      expect(status.textContent).toBe(prev);
      tick(1);
      prev = status.textContent;
    }
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('guest: a starter avatar from a seed saved in the browser, the same one each time', () => {
    const first = render(<Waiting />);
    const seed = localStorage.getItem(GUEST_SEED_KEY)!;
    expect(seed).toMatch(/^[a-z0-9]{4,16}$/);
    const drawn = avatar(first.container).innerHTML;
    first.unmount();

    // A new visit: the page has forgotten, the browser has not.
    forgetGuestSeed();
    const again = render(<Waiting />);
    expect(localStorage.getItem(GUEST_SEED_KEY)).toBe(seed);
    expect(avatar(again.container).innerHTML).toBe(drawn);
    expect(guestSeed()).toBe(seed);
  });

  it('guest: a bad saved seed is replaced, and blocked storage still gives one stable seed', () => {
    localStorage.setItem(GUEST_SEED_KEY, '<script>');
    const seed = guestSeed();
    expect(seed).toMatch(/^[a-z0-9]{4,16}$/);
    expect(localStorage.getItem(GUEST_SEED_KEY)).toBe(seed);

    forgetGuestSeed();
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    try {
      expect(guestSeed()).toBe(guestSeed());
    } finally {
      get.mockRestore();
      set.mockRestore();
    }
  });

  it('signed in: the starter shows until the avatar code loads, then swaps at the same size', () => {
    const handle = 'ada_waiting1';
    auth.profile = { id: 'u1', name: 'Ada', handle };
    const { container } = render(<Waiting />);
    const before = avatar(container);
    expect(before.getAttribute('width')).toBe('88');
    const starter = before.innerHTML;

    const mine = { ...DEFAULT_AVATAR, ...avatarFor('someone else entirely'), back: (avatarFor(handle).back + 1) % 4 };
    act(() => setAvatarCode(handle, avatarCode(mine)));
    const after = avatar(container);
    expect(after.innerHTML).not.toBe(starter);
    expect(after.getAttribute('width')).toBe('88');
    expect(after.getAttribute('height')).toBe('88');
    expect(after.getAttribute('viewBox')).toBe(before.getAttribute('viewBox'));
    expect(after.parentElement!.className).toBe(before.parentElement!.className);
  });

  it('takes focus on open and gives it back on close', () => {
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    const { container, unmount } = render(<Waiting takeFocus onCancel={() => {}} />);
    expect(document.activeElement).toBe(container.firstElementChild);
    unmount();
    expect(document.activeElement).toBe(input);
    input.remove();
  });

  it('leaves focus alone unless asked', () => {
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    render(<Waiting />);
    expect(document.activeElement).toBe(input);
    input.remove();
  });

  it('cover: Escape cancels and Tab stays on Cancel', () => {
    const onCancel = vi.fn();
    const { container } = render(<Waiting cover takeFocus onCancel={onCancel} />);
    const root = container.firstElementChild as HTMLElement;
    expect(fireEvent.keyDown(root, { key: 'Tab' })).toBe(false);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.keyDown(root, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('not covering: keys are left to the page', () => {
    const onCancel = vi.fn();
    const { container } = render(<Waiting size="inline" cover onCancel={onCancel} />);
    const root = container.firstElementChild as HTMLElement;
    expect(fireEvent.keyDown(root, { key: 'Tab' })).toBe(true);
    fireEvent.keyDown(root, { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
  });
});

describe('Waiting styles', () => {
  const css = readFileSync(join(__dirname, 'Waiting.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const tokens = readFileSync(join(__dirname, '..', 'styles', 'tokens.css'), 'utf8');

  it('dots are --muted and nothing is lime', () => {
    expect(css).toMatch(/\.dot\s*\{[^}]*background:\s*var\(--muted\)/);
    expect(css).not.toMatch(/--accent|--bar|--cell/);
  });

  it('motion comes from tokens, moves only transform, and stops under reduced motion', () => {
    expect(css).toMatch(/animation:\s*bob var\(--dur-bob\) var\(--ease-loop\)/);
    expect(css).toMatch(/animation:\s*hop var\(--dur-bounce\) var\(--ease-loop\)/);
    expect(css).not.toMatch(/\d+m?s\b/);
    const frames = css.match(/@keyframes[\s\S]*?\n\}/g) ?? [];
    expect(frames).toHaveLength(2);
    for (const f of frames) for (const prop of f.match(/[a-z-]+(?=\s*:)/g) ?? []) expect(prop).toBe('transform');
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{\s*\.bob,\s*\.dot\s*\{\s*animation:\s*none/);
  });

  it('the tokens exist and are 0 under reduced motion', () => {
    const [base, reduced] = tokens.split('@media (prefers-reduced-motion: reduce)') as [string, string];
    for (const t of ['--dur-bob', '--dur-bounce', '--dur-bounce-step']) {
      expect(base).toMatch(new RegExp(`${t}: \\d+ms`));
      expect(reduced.slice(0, reduced.indexOf('html, body'))).toContain(`${t}: 0ms`);
    }
    expect(base).toContain('--ease-loop:');
  });

  it('a long line wraps', () => {
    expect(css).toMatch(/\.line\s*\{[^}]*overflow-wrap:\s*anywhere/);
  });
});
