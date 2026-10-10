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
const first = path.cases[0]!;
const second = path.cases[1]!;
const ids = first.clues.map((s) => s.id);
const all = path.cases.flatMap((c) => c.clues.map((s) => s.id));
// A case with clues to spare, put first: the first case on the real path is a short one.
const long = path.cases.find((c) => c.clues.length >= 5)!;
const longFirst: Path = { cases: [long, ...path.cases.filter((c) => c !== long)] };
const longIds = long.clues.map((s) => s.id);
const titleOf = (id: string) => games.find((g) => g.id === id)!.title;

type Props = Parameters<typeof Journey>[0];
const show = (props: Props = {}) =>
  render(
    <MemoryRouter>
      <Journey {...props} />
    </MemoryRouter>,
  );
const clue = (c: HTMLElement, id: string) => c.querySelector<HTMLElement>(`[data-clue="${id}"]`)!;
const box = (c: HTMLElement, id: string) => c.querySelector<HTMLElement>(`[data-case="${id}"]`)!;
const states = (c: HTMLElement) => [...c.querySelectorAll('[data-clue]')].map((el) => el.getAttribute('data-state'));
const caseStates = (c: HTMLElement) => [...c.querySelectorAll('[data-case]')].map((el) => el.getAttribute('data-state'));
const text = (c: HTMLElement) => c.textContent ?? '';
const fills = (pool: readonly string[], line: string) => pool.some((t) => new RegExp(`^${t.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\w+\}/g, '.+')}$`).test(line));

beforeEach(() => {
  localStorage.clear();
  auth.profile = null;
  forgetGuestSeed();
});

describe('Journey', () => {
  it('no progress: a card per case in path order, the first open with its first clue next, the rest locked', () => {
    const { container } = show();
    expect([...container.querySelectorAll('[data-case]')].map((el) => el.getAttribute('data-case'))).toEqual(path.cases.map((c) => c.id));
    expect(caseStates(container)).toEqual(['open', ...path.cases.slice(1).map(() => 'locked')]);
    // Only the case being worked draws its clues.
    expect([...container.querySelectorAll('[data-clue]')].map((el) => el.getAttribute('data-clue'))).toEqual(ids);
    expect(states(container)).toEqual(['next', ...ids.slice(1).map(() => 'locked')]);
    expect(container.querySelector('[data-journey]')!.getAttribute('data-journey')).toBe('going');
    expect(screen.getByRole('heading', { level: 2, name: 'Your path' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(path.cases.map((c) => titleOf(c.id)));
    expect(text(container)).toContain(`0 of ${all.length} clues`);
  });

  it('a case says how many clues are left, never how long', () => {
    const { container } = show({ done: ids.slice(0, -1) });
    expect(text(box(container, first.id))).toContain('1 clue left');
    expect(text(box(container, second.id))).toContain(`${second.clues.length} clues left`);
    expect(text(container)).not.toMatch(/minute|\bmin\b|second/i);
  });

  it('states come from the progress given: done, next, locked', () => {
    const [a, b, c] = longIds as [string, string, string];
    const { container } = show({ path: longFirst, done: [a, b], stars: { [a]: 3, [b]: 1 } });
    expect(states(container).slice(0, 4)).toEqual(['done', 'done', 'next', 'locked']);

    const doneLink = within(clue(container, a)).getByRole('link');
    expect(doneLink).toHaveAttribute('href', `/play/${long.id}/1`);
    expect(doneLink).toHaveAccessibleName('Clue 1. Done. 3 of 3 stars. Play again.');
    expect(doneLink).not.toHaveAttribute('aria-current');

    const nextLink = within(clue(container, c)).getByRole('link');
    expect(nextLink).toHaveAttribute('href', `/play/${long.id}/3`);
    expect(nextLink).toHaveAttribute('aria-current', 'step');
    expect(nextLink.textContent).toContain('Clue 3. Next clue.');
    expect(container.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
    expect(text(container)).toContain(`2 of ${all.length} clues`);
    expect(screen.getByRole('progressbar', { name: 'Path progress' })).toHaveAttribute('aria-valuenow', String(Math.round((2 / all.length) * 100)));
  });

  it('locked clues and locked cases are not links, and say why', () => {
    const { container } = show({ done: [] });
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', `/play/${first.id}/1`);
    const locked = clue(container, ids[1]!);
    expect(locked.querySelector('a')).toBeNull();
    const body = locked.querySelector('[aria-disabled="true"]')!;
    expect(body.textContent).toContain('Clue 2. Locked.');
    expect(body.textContent).toContain('Finish clue 1 to open this.');
    expect(locked.querySelector('svg.lucide-lock')).not.toBeNull();

    const later = box(container, second.id);
    expect(later.querySelector('a')).toBeNull();
    expect(later.querySelector('[data-clue]')).toBeNull();
    expect(later.querySelector('[data-case-lock] svg.lucide-lock')).not.toBeNull();
    expect(later.querySelector('[data-case-lock]')!.textContent).toBe(`Locked. Finish ${titleOf(first.id)} to open this.`);
  });

  it('the last clue of a case is the whole puzzle: the big one, and says so', () => {
    const { container } = show();
    const big = [...container.querySelectorAll('[data-big]')].map((el) => el.getAttribute('data-clue'));
    expect(big).toEqual([first.id]);
    expect(clue(container, first.id).textContent).toContain('Unmasking. Locked. The last clue of the case.');
    expect(clue(container, ids[0]!).textContent).not.toContain('last clue');

    const there = show({ done: ids.slice(0, -1) });
    const link = within(clue(there.container, first.id)).getByRole('link');
    expect(link).toHaveAttribute('href', `/play/${first.id}`);
    expect(link.textContent).toContain('Unmasking. Next clue. The last clue of the case. Play.');
  });

  it('a whole-puzzle score from before closes the case, passages and all', () => {
    const { container } = show({ done: [first.id], stars: { [first.id]: 2 } });
    expect(caseStates(container).slice(0, 3)).toEqual(['done', 'open', 'locked']);
    expect(box(container, first.id).querySelector('[data-clue]')).toBeNull();
    expect(states(container)[0]).toBe('next');
    expect(container.querySelector('[data-clue]')!.getAttribute('data-clue')).toBe(second.clues[0]!.id);
    expect(text(container)).toContain(`${first.clues.length} of ${all.length} clues`);
  });

  it('a closed case shows its badge with a line from the pool, its stars, and a link to play it again', () => {
    const { container } = show({ done: ids, stars: { [first.id]: 3 } });
    const closed = box(container, first.id);
    expect(closed.getAttribute('data-state')).toBe('done');
    const badge = closed.querySelector('[data-case-badge]')!;
    expect(fills(POOLS.caseDone, badge.textContent!)).toBe(true);
    expect(badge.textContent).toContain(titleOf(first.id));
    expect(container.querySelectorAll('[data-case-badge]')).toHaveLength(1);
    const again = within(closed).getByRole('link');
    expect(again).toHaveAttribute('href', `/play/${first.id}`);
    expect(again).toHaveAccessibleName(`${titleOf(first.id)}. Closed. Play again.`);
    expect(within(closed).getByRole('img', { name: '3 of 3 stars' })).toBeInTheDocument();
    expect(text(closed)).not.toMatch(/clues? left/);
  });

  it('all done: a calm finished state, every case a replay link, no next clue', () => {
    const { container } = show({ done: all });
    expect(container.querySelector('[data-journey]')!.getAttribute('data-journey')).toBe('complete');
    const note = container.querySelector('[data-journey-note="complete"]')!;
    expect(POOLS.journeyDone).toContain(note.querySelector('p')!.textContent);
    expect(note.querySelector('svg')).not.toBeNull();
    expect(caseStates(container).every((s) => s === 'done')).toBe(true);
    expect(container.querySelectorAll('[data-clue]')).toHaveLength(0);
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(path.cases.map((c) => `/play/${c.id}`));
    expect(container.querySelector('[aria-current]')).toBeNull();
    expect(container.querySelector('[aria-disabled]')).toBeNull();
    expect(screen.getByRole('progressbar', { name: 'Path progress' })).toHaveAttribute('data-closed', 'true');
  });

  it('history from before the path: finished puzzles and starred clues in the browser both count as done', () => {
    localStorage.setItem('gazecraft-finished', JSON.stringify([first.id]));
    localStorage.setItem('gazecraft-stars', JSON.stringify({ [second.clues[0]!.id]: 2 }));
    const { container } = show();
    expect(caseStates(container).slice(0, 2)).toEqual(['done', 'open']);
    expect(states(container).slice(0, 2)).toEqual(['done', 'next']);
    expect(within(clue(container, second.clues[0]!.id)).getByRole('img', { name: '2 of 3 stars' })).toBeInTheDocument();
  });

  it('a puzzle removed from the catalogue takes its case with it and never blocks the path', () => {
    const left = games.filter((g) => g.id !== first.id);
    // The path was built while the puzzle still existed.
    const { container } = show({ catalogue: left, path });
    expect(box(container, first.id)).toBeNull();
    expect(container.querySelectorAll('[data-case]')).toHaveLength(path.cases.length - 1);
    expect(screen.queryByRole('heading', { level: 3, name: titleOf(first.id) })).toBeNull();
    expect(box(container, second.id).getAttribute('data-state')).toBe('open');
    expect(container.querySelector('[data-clue]')!.getAttribute('data-clue')).toBe(second.clues[0]!.id);
    expect(text(container)).toContain(`0 of ${all.length - first.clues.length} clues`);
  });

  it('draws the line between clues: solid where walked, dotted ahead, hidden from screen readers', () => {
    const { container } = show({ done: [ids[0]!] });
    const svg = box(container, first.id).querySelector('svg[preserveAspectRatio="none"]')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    const lines = [...svg.querySelectorAll('path')];
    expect(lines).toHaveLength(first.clues.length - 1);
    expect(lines[0]!.getAttribute('data-line')).toBe('walked');
    expect(lines[0]!.getAttribute('stroke-dasharray')).toBeNull();
    expect(lines[1]!.getAttribute('data-line')).toBe('ahead');
    expect(lines[1]!.getAttribute('stroke-dasharray')).not.toBeNull();
  });

  it('the clues are a list of links in order', () => {
    const { container } = show({ done: ids.slice(0, -1) });
    expect(container.querySelectorAll('ol')).toHaveLength(1);
    const want = first.clues.map((s) => (s.n ? `/play/${first.id}/${s.n}` : `/play/${first.id}`));
    expect(within(box(container, first.id)).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(want);
    for (const li of container.querySelectorAll('ol > *')) expect(li.tagName).toBe('LI');
  });

  it('remembers the clue the player stands on, and hops the avatar there once from the last one', () => {
    const [a, b] = ids as [string, string];
    const before = show({ done: [] });
    expect(localStorage.getItem(JOURNEY_AT_KEY)).toBe(a);
    expect(before.container.querySelector('[data-hop]')).toBeNull();
    before.unmount();

    const after = show({ done: [a], stars: { [a]: 2 } });
    expect(clue(after.container, b).querySelector('[data-hop]')!.getAttribute('data-hop')).toBe('arc');
    // Stars pop on the clue just finished, nowhere else.
    expect(clue(after.container, a).querySelector('[data-stars]')!.hasAttribute('data-pop')).toBe(true);
    expect(localStorage.getItem(JOURNEY_AT_KEY)).toBe(b);
    after.unmount();

    const again = show({ done: [a], stars: { [a]: 2 } });
    expect(again.container.querySelector('[data-hop]')).toBeNull();
    expect(again.container.querySelector('[data-pop]')).toBeNull();
  });

  it('a case just closed: the avatar drops onto the next case, and the closed one pops its stars', () => {
    localStorage.setItem(JOURNEY_AT_KEY, first.id);
    const { container } = show({ done: ids, stars: { [first.id]: 3 } });
    expect(clue(container, second.clues[0]!.id).querySelector('[data-hop]')!.getAttribute('data-hop')).toBe('drop');
    expect(box(container, first.id).querySelector('[data-stars]')!.hasAttribute('data-pop')).toBe(true);
  });
});

describe('Journey: empty and missing', () => {
  it.each([
    ['an empty catalogue', { catalogue: [] }],
    ['no catalogue', { catalogue: null }],
    ['a path with no cases', { path: { cases: [] } }],
    ['a path whose puzzles are all gone', { catalogue: [] as JourneyGame[], path }],
  ] as Array<[string, Props]>)('%s: one line from the pool, no clues, no crash', (_, props) => {
    const { container } = show(props);
    expect(container.querySelector('[data-journey]')!.getAttribute('data-journey')).toBe('empty');
    expect(POOLS.journeyEmpty).toContain(container.querySelector('[data-journey-note="empty"]')!.textContent);
    expect(container.querySelectorAll('[data-clue]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-case]')).toHaveLength(0);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'Your path' })).toBeInTheDocument();
  });

  it('a malformed path falls back to one built from the catalogue', () => {
    const { container } = show({ path: {} as Path });
    expect(container.querySelectorAll('[data-case]')).toHaveLength(path.cases.length);
  });

  it('a case of 1 clue draws the clue and no line', () => {
    const one: Path = { cases: [{ id: first.id, clues: [{ id: first.id, puzzle: first.id, n: 0 }] }] };
    const { container } = show({ path: one });
    expect(container.querySelectorAll('[data-clue]')).toHaveLength(1);
    expect(container.querySelector('svg[preserveAspectRatio="none"]')).toBeNull();
    expect(clue(container, first.id).hasAttribute('data-big')).toBe(true);
    expect(text(container)).toContain('1 clue left');
  });

  it.each([
    ['nothing saved', () => {}],
    ['broken JSON', () => (localStorage.setItem('gazecraft-finished', '{not json'), localStorage.setItem('gazecraft-stars', '[[['))],
    ['the wrong shapes', () => (localStorage.setItem('gazecraft-finished', '{"a":1}'), localStorage.setItem('gazecraft-stars', '["bible", 7]'))],
    ['bad values', () => (localStorage.setItem('gazecraft-finished', '[1, null, {}]'), localStorage.setItem('gazecraft-stars', `{"${ids[0]}":"3","${ids[1]}":9,"${ids[2]}":null}`))],
    ['a bad saved clue', () => localStorage.setItem(JOURNEY_AT_KEY, '<script>')],
  ] as Array<[string, () => void]>)('browser storage with %s: the path starts at the first clue', (_, seed) => {
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

  it('a done clue with no stars on record shows done with no stars, and a clean name', () => {
    const [a, b, c] = longIds as [string, string, string];
    const { container } = show({ path: longFirst, done: [a, b, c], stars: { [b]: undefined, [c]: Number.NaN } });
    [a, b, c].forEach((id, i) => {
      expect(clue(container, id).getAttribute('data-state')).toBe('done');
      expect(clue(container, id).querySelector('[data-stars]')).toBeNull();
      expect(within(clue(container, id)).getByRole('link')).toHaveAccessibleName(`Clue ${i + 1}. Done. Play again.`);
    });
    expect(text(container)).not.toMatch(/undefined|NaN|null/);
  });

  it('a puzzle with no title falls back to its id, never a blank', () => {
    const list = games.map((g) => (g.id === first.id ? { ...g, title: '' } : g));
    show({ catalogue: list });
    expect(screen.getAllByRole('heading', { level: 3 })[0]!.textContent).toBe(first.id);
  });

  it('guest with no avatar yet: a starter stands on the next clue, the same one each visit', () => {
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

  it('lime is the next clue and the done tick, nothing else', () => {
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
    for (const t of ['--journey-clue:', '--journey-clue-big:', '--journey-sway:', '--journey-pitch:', '--journey-label:']) expect(base).toContain(t);
  });

  it('a long title wraps', () => {
    expect(css).toMatch(/\.name\s*\{[^}]*overflow-wrap:\s*anywhere/);
  });
});
