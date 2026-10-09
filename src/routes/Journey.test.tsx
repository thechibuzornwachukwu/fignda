// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { avatarCode, avatarFor, DEFAULT_AVATAR } from '../avatar/draw';
import { forgetGuestSeed, GUEST_SEED_KEY } from '../avatar/guest';
import { setAvatarCode } from '../avatar/store';
import { POOLS } from '../copy';
import { buildPath, type Path } from '../engine/journey';
import { games } from '../games/catalog';
import { Journey, JOURNEY_AT_KEY, type JourneyGame } from './Journey';

const auth = vi.hoisted(() => ({ profile: null as { id: string; name: string; handle: string } | null }));
vi.mock('../lib/auth', () => ({ useAuth: () => ({ enabled: true, loading: false, profile: auth.profile }) }));

const path = buildPath(games);
const ids = path.chapters.flatMap((c) => c.stops.map((s) => s.id));
const titleOf = (id: string) => games.find((g) => g.id === id)!.title;
const first = path.chapters[0]!;

type Props = Parameters<typeof Journey>[0];
const show = (props: Props = {}) =>
  render(
    <MemoryRouter>
      <Journey {...props} />
    </MemoryRouter>,
  );
const stop = (c: HTMLElement, id: string) => c.querySelector<HTMLElement>(`[data-stop="${id}"]`)!;
const states = (c: HTMLElement) => [...c.querySelectorAll('[data-stop]')].map((el) => el.getAttribute('data-state'));
const text = (c: HTMLElement) => c.textContent ?? '';
const fills = (pool: readonly string[], line: string) => pool.some((t) => new RegExp(`^${t.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\w+\}/g, '.+')}$`).test(line));

beforeEach(() => {
  localStorage.clear();
  auth.profile = null;
  forgetGuestSeed();
});

describe('Journey', () => {
  it('no progress: the first stop is next, every other stop is locked, in path order', () => {
    const { container } = show();
    expect([...container.querySelectorAll('[data-stop]')].map((el) => el.getAttribute('data-stop'))).toEqual(ids);
    expect(states(container)).toEqual(['next', ...ids.slice(1).map(() => 'locked')]);
    expect(container.querySelector('[data-journey]')!.getAttribute('data-journey')).toBe('going');
    expect(screen.getByRole('heading', { level: 2, name: 'Your path' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(path.chapters.map((c) => c.title));
    expect(text(container)).toContain(`0 of ${ids.length} stops`);
  });

  it('states come from the progress given: done, next, locked', () => {
    const [a, b, c] = ids as [string, string, string];
    const { container } = show({ done: [a, b], stars: { [a]: 3, [b]: 1 } });
    expect(states(container).slice(0, 4)).toEqual(['done', 'done', 'next', 'locked']);

    const doneLink = within(stop(container, a)).getByRole('link');
    expect(doneLink).toHaveAttribute('href', `/play/${a}`);
    expect(doneLink).toHaveAccessibleName(`${titleOf(a)}. Done. 3 of 3 stars. Play again.`);
    expect(doneLink).not.toHaveAttribute('aria-current');

    const nextLink = within(stop(container, c)).getByRole('link');
    expect(nextLink).toHaveAttribute('href', `/play/${c}`);
    expect(nextLink).toHaveAttribute('aria-current', 'step');
    expect(nextLink.textContent).toContain(`${titleOf(c)}. Next stop.`);
    // The avatar stands on the next stop, and only there.
    expect(container.querySelectorAll('[data-stop] svg[viewBox="0 0 100 100"], [data-state="next"] svg').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
    expect(text(container)).toContain(`2 of ${ids.length} stops`);
    expect(screen.getByRole('progressbar', { name: 'Path progress' })).toHaveAttribute('aria-valuenow', String(Math.round((2 / ids.length) * 100)));
  });

  it('locked stops are not links, and say why', () => {
    const { container } = show({ done: [] });
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', `/play/${ids[0]}`);
    const locked = stop(container, ids[1]!);
    expect(locked.querySelector('a')).toBeNull();
    const body = locked.querySelector('[aria-disabled="true"]')!;
    expect(body.textContent).toContain(`${titleOf(ids[1]!)}. Locked.`);
    expect(body.textContent).toContain(`Finish ${titleOf(ids[0]!)} to open this.`);
    expect(locked.querySelector('svg.lucide-lock')).not.toBeNull();
  });

  it('a stop finished out of order shows done and can be replayed', () => {
    const far = ids[ids.length - 2]!;
    const { container } = show({ done: [far] });
    expect(stop(container, far).getAttribute('data-state')).toBe('done');
    expect(within(stop(container, far)).getByRole('link')).toHaveAttribute('href', `/play/${far}`);
    expect(stop(container, ids[0]!).getAttribute('data-state')).toBe('next');
  });

  it('the last stop of a chapter is the big one, and says so', () => {
    const { container } = show();
    const big = [...container.querySelectorAll('[data-big]')].map((el) => el.getAttribute('data-stop'));
    expect(big).toEqual(path.chapters.map((c) => c.stops[c.stops.length - 1]!.id));
    expect(stop(container, big[0]!).textContent).toContain('Last stop of the chapter.');
    expect(stop(container, ids[0]!).textContent).not.toContain('Last stop');
  });

  it('a cleared chapter shows its badge with a line from the pool', () => {
    const { container } = show({ done: first.stops.map((s) => s.id) });
    const chapter = container.querySelector<HTMLElement>(`[data-chapter="${first.id}"]`)!;
    expect(chapter.getAttribute('data-state')).toBe('done');
    const badge = chapter.querySelector('[data-chapter-badge]')!;
    expect(fills(POOLS.chapterDone, badge.textContent!)).toBe(true);
    expect(badge.textContent).toContain(first.title);
    expect(container.querySelectorAll('[data-chapter-badge]')).toHaveLength(1);
    expect(container.querySelector(`[data-chapter="${path.chapters[1]!.id}"]`)!.getAttribute('data-state')).toBe('open');
    expect(container.querySelector(`[data-chapter="${path.chapters[2]!.id}"]`)!.getAttribute('data-state')).toBe('locked');
  });

  it('all done: a calm finished state, every stop a replay link, no next stop', () => {
    const { container } = show({ done: ids });
    expect(container.querySelector('[data-journey]')!.getAttribute('data-journey')).toBe('complete');
    const note = container.querySelector('[data-journey-note="complete"]')!;
    expect(POOLS.journeyDone).toContain(note.querySelector('p')!.textContent);
    expect(note.querySelector('svg')).not.toBeNull();
    expect(states(container).every((s) => s === 'done')).toBe(true);
    expect(screen.getAllByRole('link')).toHaveLength(ids.length);
    expect(container.querySelector('[aria-current]')).toBeNull();
    expect(container.querySelector('[aria-disabled]')).toBeNull();
    expect(screen.getByRole('progressbar', { name: 'Path progress' })).toHaveAttribute('data-closed', 'true');
  });

  it('history from before the path: finished ids and starred ids in the browser both count as done', () => {
    localStorage.setItem('gazecraft-finished', JSON.stringify([ids[0]]));
    localStorage.setItem('gazecraft-stars', JSON.stringify({ [ids[1]!]: 2 }));
    const { container } = show();
    expect(states(container).slice(0, 3)).toEqual(['done', 'done', 'next']);
    expect(within(stop(container, ids[1]!)).getByRole('img', { name: '2 of 3 stars' })).toBeInTheDocument();
  });

  it('a puzzle removed from the catalogue is skipped and never blocks the path', () => {
    const gone = ids[1]!;
    const left = games.filter((g) => g.id !== gone);
    // The path was built while the puzzle still existed.
    const { container } = show({ catalogue: left, path, done: [ids[0]!, gone] });
    expect(stop(container, gone)).toBeNull();
    expect(container.querySelectorAll('[data-stop]')).toHaveLength(ids.length - 1);
    expect(stop(container, ids[0]!).getAttribute('data-state')).toBe('done');
    expect(stop(container, ids[2]!).getAttribute('data-state')).toBe('next');
    expect(text(container)).toContain(`1 of ${ids.length - 1} stops`);
  });

  it('draws the line between stops: solid where walked, dotted ahead, hidden from screen readers', () => {
    const { container } = show({ done: [ids[0]!] });
    const chapter = container.querySelector(`[data-chapter="${first.id}"]`)!;
    const svg = chapter.querySelector('svg[preserveAspectRatio="none"]')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    const lines = [...svg.querySelectorAll('path')];
    expect(lines).toHaveLength(first.stops.length - 1);
    expect(lines[0]!.getAttribute('data-line')).toBe('walked');
    expect(lines[0]!.getAttribute('stroke-dasharray')).toBeNull();
    expect(lines[1]!.getAttribute('data-line')).toBe('ahead');
    expect(lines[1]!.getAttribute('stroke-dasharray')).not.toBeNull();
  });

  it('is a list of links in order', () => {
    const { container } = show({ done: ids });
    const lists = container.querySelectorAll('ol');
    expect(lists).toHaveLength(path.chapters.length);
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(ids.map((id) => `/play/${id}`));
    for (const li of container.querySelectorAll('ol > *')) expect(li.tagName).toBe('LI');
  });

  it('remembers the stop the player stands on, and hops the avatar there once from the last one', () => {
    const [a, b] = ids as [string, string];
    const before = show({ done: [] });
    expect(localStorage.getItem(JOURNEY_AT_KEY)).toBe(a);
    expect(before.container.querySelector('[data-hop]')).toBeNull();
    before.unmount();

    const after = show({ done: [a], stars: { [a]: 2 } });
    expect(stop(after.container, b).querySelector('[data-hop]')!.getAttribute('data-hop')).toBe('arc');
    // Stars pop on the stop just finished, nowhere else.
    expect(stop(after.container, a).querySelector('[data-stars]')!.hasAttribute('data-pop')).toBe(true);
    expect(localStorage.getItem(JOURNEY_AT_KEY)).toBe(b);
    after.unmount();

    const again = show({ done: [a], stars: { [a]: 2 } });
    expect(again.container.querySelector('[data-hop]')).toBeNull();
    expect(again.container.querySelector('[data-pop]')).toBeNull();
  });
});

describe('Journey: empty and missing', () => {
  it.each([
    ['an empty catalogue', { catalogue: [] }],
    ['no catalogue', { catalogue: null }],
    ['a path with no chapters', { path: { chapters: [] } }],
    ['a path whose puzzles are all gone', { catalogue: [] as JourneyGame[], path }],
  ] as Array<[string, Props]>)('%s: one line from the pool, no stops, no crash', (_, props) => {
    const { container } = show(props);
    expect(container.querySelector('[data-journey]')!.getAttribute('data-journey')).toBe('empty');
    expect(POOLS.journeyEmpty).toContain(container.querySelector('[data-journey-note="empty"]')!.textContent);
    expect(container.querySelectorAll('[data-stop]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-chapter]')).toHaveLength(0);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'Your path' })).toBeInTheDocument();
  });

  it('a malformed path falls back to one built from the catalogue', () => {
    const { container } = show({ path: {} as Path });
    expect(container.querySelectorAll('[data-stop]')).toHaveLength(ids.length);
  });

  it('a chapter left with no stops is not drawn, and the next chapter carries on', () => {
    const gone = new Set(first.stops.map((s) => s.id));
    const { container } = show({ catalogue: games.filter((g) => !gone.has(g.id)), path });
    expect(container.querySelector(`[data-chapter="${first.id}"]`)).toBeNull();
    expect(container.querySelectorAll('[data-chapter]')).toHaveLength(path.chapters.length - 1);
    expect(screen.queryByRole('heading', { level: 3, name: first.title })).toBeNull();
    expect(states(container)[0]).toBe('next');
    expect(container.querySelector('[data-stop]')!.getAttribute('data-stop')).toBe(path.chapters[1]!.stops[0]!.id);
    for (const list of container.querySelectorAll('ol')) expect(list.children.length).toBeGreaterThan(0);
  });

  it('a chapter left with 1 stop draws the stop and no line', () => {
    const keep = first.stops[0]!.id;
    const gone = new Set(first.stops.slice(1).map((s) => s.id));
    const { container } = show({ catalogue: games.filter((g) => !gone.has(g.id)), path });
    const chapter = container.querySelector(`[data-chapter="${first.id}"]`)!;
    expect(chapter.querySelectorAll('[data-stop]')).toHaveLength(1);
    expect(chapter.querySelector('svg[preserveAspectRatio="none"]')).toBeNull();
    expect(stop(container, keep).hasAttribute('data-big')).toBe(true);
  });

  it.each([
    ['nothing saved', () => {}],
    ['broken JSON', () => (localStorage.setItem('gazecraft-finished', '{not json'), localStorage.setItem('gazecraft-stars', '[[['))],
    ['the wrong shapes', () => (localStorage.setItem('gazecraft-finished', '{"a":1}'), localStorage.setItem('gazecraft-stars', '["bible", 7]'))],
    ['bad values', () => (localStorage.setItem('gazecraft-finished', '[1, null, {}]'), localStorage.setItem('gazecraft-stars', `{"${ids[0]}":"3","${ids[1]}":9,"${ids[2]}":null}`))],
    ['a bad saved stop', () => localStorage.setItem(JOURNEY_AT_KEY, '<script>')],
  ] as Array<[string, () => void]>)('browser storage with %s: the path starts at the first stop', (_, seed) => {
    seed();
    const { container } = show();
    expect(states(container)).toEqual(['next', ...ids.slice(1).map(() => 'locked')]);
    expect(container.querySelector('[data-stars]')).toBeNull();
    expect(text(container)).not.toMatch(/undefined|NaN|null/);
  });

  it('storage that throws: the path still draws', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    try {
      const { container } = show();
      expect(states(container)[0]).toBe('next');
      expect(container.querySelector('[data-state="next"] svg')).not.toBeNull();
    } finally {
      get.mockRestore();
      set.mockRestore();
    }
  });

  it('null progress means none', () => {
    const { container } = show({ done: null, stars: null });
    expect(states(container)[0]).toBe('next');
  });

  it('a done stop with no stars on record shows done with no stars, and a clean name', () => {
    const [a, b, c] = ids as [string, string, string];
    const { container } = show({ done: [a, b, c], stars: { [b]: undefined, [c]: Number.NaN } });
    for (const id of [a, b, c]) {
      expect(stop(container, id).getAttribute('data-state')).toBe('done');
      expect(stop(container, id).querySelector('[data-stars]')).toBeNull();
      expect(within(stop(container, id)).getByRole('link')).toHaveAccessibleName(`${titleOf(id)}. Done. Play again.`);
    }
    expect(text(container)).not.toMatch(/undefined|NaN|null/);
  });

  it('a puzzle with no title falls back to its id, never a blank', () => {
    const list = games.map((g) => (g.id === ids[0] ? { ...g, title: '' } : g));
    const { container } = show({ catalogue: list });
    expect(within(stop(container, ids[0]!)).getByRole('link').textContent).toContain(`${ids[0]}. Next stop.`);
  });

  it('guest with no avatar yet: a starter stands on the next stop, the same one each visit', () => {
    const one = show();
    const seed = localStorage.getItem(GUEST_SEED_KEY)!;
    expect(seed).toMatch(/^[a-z0-9]{4,16}$/);
    const drawn = one.container.querySelector('[data-state="next"] svg')!;
    expect(drawn.getAttribute('aria-hidden')).toBe('true');
    expect(drawn.children.length).toBeGreaterThan(0);
    const html = drawn.innerHTML;
    one.unmount();
    forgetGuestSeed();
    const two = show();
    expect(two.container.querySelector('[data-state="next"] svg')!.innerHTML).toBe(html);
  });

  it('signed in: a starter from the handle until the avatar loads, then the player’s own', async () => {
    const handle = 'ada_journey1';
    auth.profile = { id: 'u1', name: 'Ada', handle };
    const { container } = show();
    const before = container.querySelector('[data-state="next"] svg')!.innerHTML;
    expect(before.length).toBeGreaterThan(0);
    const mine = { ...DEFAULT_AVATAR, ...avatarFor('someone else entirely'), back: (avatarFor(handle).back + 1) % 4 };
    const { act } = await import('@testing-library/react');
    act(() => setAvatarCode(handle, avatarCode(mine)));
    expect(container.querySelector('[data-state="next"] svg')!.innerHTML).not.toBe(before);
  });
});

describe('Journey styles', () => {
  const css = readFileSync(join(__dirname, 'Journey.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const tokens = readFileSync(join(__dirname, '..', 'styles', 'tokens.css'), 'utf8');

  it('uses tokens only: no hex, no ms, no px radius', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/\d+m?s\b/);
    expect(css).not.toMatch(/border-radius:\s*\d+px/);
  });

  it('lime is the next stop and the done tick, nothing else', () => {
    const lime = css.match(/[^{}]*\{[^}]*var\(--accent(-ink)?\)[^}]*\}/g) ?? [];
    expect(lime).toHaveLength(2);
    expect(lime.some((r) => /\[data-state='next'\] \.disc/.test(r))).toBe(true);
    expect(lime.some((r) => /^\s*\.disc\s*\{/.test(r))).toBe(true);
  });

  it('only transform and opacity move, nothing grows from scale 0, and it all stops under reduced motion', () => {
    expect(css).toMatch(/animation:\s*hop var\(--dur-hop\) var\(--ease-out\)/);
    const frames = css.match(/@keyframes[\s\S]*?\n\}/g) ?? [];
    expect(frames).toHaveLength(2);
    for (const f of frames) for (const prop of f.match(/[a-z-]+(?=\s*:)/g) ?? []) expect(['transform', 'opacity']).toContain(prop);
    expect(css).not.toMatch(/scale\(0(\.[0-7]\d*)?\)/);
    expect(css).not.toMatch(/transition:\s*all/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{\s*\.rider\[data-hop\]\s*\{\s*animation:\s*none/);
  });

  it('the tokens exist and are 0 under reduced motion', () => {
    const [base, reduced] = tokens.split('@media (prefers-reduced-motion: reduce)') as [string, string];
    for (const t of ['--dur-hop', '--dur-star', '--dur-star-step']) {
      expect(base).toMatch(new RegExp(`${t}: \\d+ms`));
      expect(reduced.slice(0, reduced.indexOf('html, body'))).toContain(`${t}: 0ms`);
    }
    for (const t of ['--journey-stop:', '--journey-stop-big:', '--journey-sway:', '--journey-pitch:', '--journey-label:']) expect(base).toContain(t);
  });

  it('a long title wraps', () => {
    expect(css).toMatch(/\.name\s*\{[^}]*overflow-wrap:\s*anywhere/);
  });
});
