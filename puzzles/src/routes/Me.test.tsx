// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { TabBar } from '../components/TabBar';
import { dayNo } from '../engine/daily';
import { games } from '../games/catalog';
import { forgetPartner, PARTNER_KEY } from '../lib/partner';
import { Me } from './Me';

type Profile = { id: string; name: string; handle: string; avatar: string | null };
const world = vi.hoisted(() => ({
  profile: null as Profile | null,
  mine: null as { current: string; owned: string[]; points: number; bonds?: unknown } | null,
  saveOk: true,
  chooseFails: false,
  saved: [] as string[],
  badges: [] as string[],
  plays: [] as unknown[],
}));

vi.mock('../lib/auth', () => ({
  useAuth: () => ({ enabled: true, loading: false, session: world.profile ? {} : null, profile: world.profile, refreshProfile: async () => world.profile }),
}));
vi.mock('../lib/api', async (original) => ({
  ...(await original<typeof import('../lib/api')>()),
  saveAvatar: async (_id: string, code: string) => {
    if (world.saveOk) world.saved.push(code);
    return world.saveOk;
  },
  saveLook: async () => true,
  fetchBadges: async () => world.badges,
  fetchOwnPlays: async () => world.plays,
  fetchPoints: async () => world.mine?.points ?? 0,
  fetchMyPartner: async () => world.mine,
  chooseServerPartner: async (who: string) => {
    if (world.chooseFails) throw new Error('offline');
    const cur = world.mine ?? { current: who, owned: [who], points: 0 };
    world.mine = cur.owned.includes(who) ? { ...cur, current: who } : cur;
    return { current: world.mine.current, owned: world.mine.owned };
  },
}));

const show = () =>
  render(
    <MemoryRouter initialEntries={['/me']}>
      <Me />
    </MemoryRouter>,
  );
const stage = () => screen.getByRole('region', { name: 'Your detective and your pet' });
const line = () => stage().querySelector('[data-stage-line]')?.textContent ?? '';
const ADA: Profile = { id: 'u1', name: 'Ada', handle: 'ada', avatar: null };

beforeEach(() => {
  localStorage.clear();
  forgetPartner();
  world.profile = null;
  world.mine = null;
  world.saveOk = true;
  world.chooseFails = false;
  world.saved = [];
  world.badges = [];
  world.plays = [];
});

describe('You, as a guest', () => {
  it('has a stage of their own: no rank, a way to sign in, and every partner free to swap', () => {
    show();
    expect(within(stage()).getByText('You')).toBeInTheDocument();
    expect(within(stage()).queryByRole('progressbar')).toBeNull();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/welcome?from=%2Fme');
    expect(screen.queryByRole('link', { name: 'Settings' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Agent 404\./ }));
    expect(within(stage()).getByText('Agent 404')).toBeInTheDocument();
    fireEvent.click(within(stage()).getByRole('button', { name: 'Select Agent 404' }));
    return waitFor(() => expect(JSON.parse(localStorage.getItem(PARTNER_KEY)!)).toMatchObject({ current: 'robot', owned: ['robot'] }));
  });

  it('gear with nothing earned: every piece locked and said so, No gear on, and nothing to press', () => {
    show();
    const gear = screen.getByRole('region', { name: 'Detective gear' });
    expect(within(gear).getAllByRole('button')).toHaveLength(6);
    expect(within(gear).getByRole('button', { name: 'No gear. On you.' })).toHaveAttribute('aria-pressed', 'true');
    expect(gear.querySelectorAll('[data-locked]')).toHaveLength(5);
    fireEvent.click(within(gear).getByRole('button', { name: 'Detective coat. Locked. Reach the rank of Inspector.' }));
    expect(line()).toBe('Locked. Reach the rank of Inspector.');
    expect(within(stage()).queryByRole('button', { name: /^Wear / })).toBeNull();
  });

  it('a case closed here opens the badge, and wearing it is kept in this browser', async () => {
    localStorage.setItem('gazecraft-finished', JSON.stringify([games[0]!.id]));
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Badge. Yours.' }));
    fireEvent.click(within(stage()).getByRole('button', { name: 'Wear the badge' }));
    await screen.findByRole('button', { name: 'Badge. On you.' });
    expect(localStorage.getItem('gazecraft-guest-avatar')).toMatch(/d1/);
    // And it comes off again.
    fireEvent.click(screen.getByRole('button', { name: 'No gear. Plain.' }));
    fireEvent.click(within(stage()).getByRole('button', { name: 'Take the gear off' }));
    await screen.findByRole('button', { name: 'No gear. On you.' });
  });

  it('storage that is broken or blocked still draws the stage', () => {
    localStorage.setItem(PARTNER_KEY, '{broken');
    localStorage.setItem('gazecraft-stars', '[[[');
    localStorage.setItem('gazecraft-finished', '7');
    forgetPartner();
    const { container } = show();
    expect(line()).toBe('');
    expect(container.textContent).not.toMatch(/undefined|NaN|null/);
  });
});

describe('You, signed in', () => {
  it('settings is a gear with a name, the rank shows, and a locked partner says how far away it is', async () => {
    world.profile = ADA;
    world.mine = { current: 'cat', owned: ['cat'], points: 1240, bonds: { cat: 4 } };
    show();
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
    await screen.findByRole('button', { name: 'Detective X. With you, 4 cases.' });
    expect(line()).toBe('');
    expect(within(stage()).getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Detective X. With you, 4 cases.' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Detective Tobs. Locked. 3,000 points.' }));
    expect(line()).toBe('Locked. 1,760 points to go.');
    expect(within(stage()).queryByRole('button', { name: /^Select / })).toBeNull();
  });

  it('holding every partner: none is locked, and the last bond mark says nothing more is coming', async () => {
    world.profile = ADA;
    world.mine = { current: 'dog', owned: ['cat', 'dino', 'dog', 'robot'], points: 25000, bonds: { dog: 12, cat: 1 } };
    show();
    await screen.findByRole('button', { name: 'Detective X. Yours, 1 case.' });
    expect(line()).toBe('');
    expect(screen.getByRole('region', { name: 'Pets' }).querySelectorAll('[data-locked]')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Detective X. Yours, 1 case.' })).toBeInTheDocument();
  });

  it('a save that fails says so, keeps what was being tried, and changes nothing', async () => {
    world.profile = ADA;
    world.mine = { current: 'cat', owned: ['cat'], points: 0 };
    world.saveOk = false;
    localStorage.setItem('gazecraft-finished', JSON.stringify([games[0]!.id]));
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Badge. Yours.' }));
    fireEvent.click(within(stage()).getByRole('button', { name: 'Wear the badge' }));
    expect(await screen.findByText('That did not save. Try again.')).toBeInTheDocument();
    expect(within(stage()).getByRole('button', { name: 'Wear the badge' })).toBeInTheDocument();
    expect(world.saved).toEqual([]);
    expect(screen.getByRole('button', { name: 'No gear. On you.' })).toBeInTheDocument();
  });

  it('a very long name and an odd one are drawn as written, never as markup', async () => {
    world.profile = { ...ADA, name: '<b>Oluwanitele</b> Omojesu-Adebayo-Okonkwo the Third of Lagos Island' };
    world.mine = { current: 'cat', owned: ['cat'], points: 0 };
    const { container } = show();
    expect(await within(stage()).findByText(world.profile.name)).toBeInTheDocument();
    expect(container.querySelector('b')).toBeNull();
  });
});

describe('You holds everything about you', () => {

  it('a guest has no badges, and nothing of the old word game: no records, no daily', () => {
    localStorage.setItem('gazecraft-records', JSON.stringify({ clean: { Bible: 75 }, daily: 9, long: { word: 'Lamentations', len: 12 } }));
    show();
    expect(screen.queryByRole('heading', { name: 'Your records' })).toBeNull();
    expect(document.body.textContent).not.toMatch(/Longest word|Most found|Lamentations|daily/i);
    expect(screen.queryByRole('heading', { name: 'Badges' })).toBeNull();
    expect(document.body.textContent).not.toMatch(/undefined|NaN|\bnull\b/);
  });
  it('signed in with a badge: a medal for each kind, the earned one struck and the rest as outlines, and the way to the public page', async () => {
    world.profile = ADA;
    world.badges = ['first_game'];
    show();
    const badges = await screen.findByRole('region', { name: 'Badges' });
    await waitFor(() => expect(within(badges).getAllByRole('listitem')).toHaveLength(4));
    expect(within(badges).getByRole('button', { name: /^First step\. Earned\./ })).toBeInTheDocument();
    expect(within(badges).getAllByRole('button', { name: /Not earned yet\./ })).toHaveLength(3);
    // A medal says what it is. Nothing under it explains it.
    expect(badges.textContent).not.toMatch(/Not earned|Finish a|Reach |in a row/);
    expect(badges).toHaveAttribute('id', 'badges');
    expect(screen.getByRole('link', { name: 'See your public page' })).toHaveAttribute('href', '/u/ada');
  });

  it('signed in and new: badges wait for a first verified play', async () => {
    world.profile = ADA;
    show();
    await act(async () => {});
    expect(screen.queryByRole('heading', { name: 'Badges' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Detective gear' })).toBeInTheDocument();
  });

  it('badges on their way are a skeleton, and a lookup that fails leaves the medals to aim for', async () => {
    world.profile = ADA;
    world.plays = [{ verified: true }];
    world.badges = null as unknown as string[];
    show();
    const badges = await screen.findByRole('region', { name: 'Badges' });
    await waitFor(() => expect(within(badges).getAllByRole('listitem')).toHaveLength(4));
    expect(badges.querySelector('[data-skeleton]')).toBeNull();
  });
});

describe('the dock’s Play button', () => {
  const dock = () =>
    render(
      <MemoryRouter initialEntries={['/play']}>
        <TabBar />
      </MemoryRouter>,
    );
  const play = () => screen.getByRole('navigation', { name: 'Tabs' }).querySelector('[data-play]')!;
  it('order is Cases, You, Play, Squad, Ranks, and Play opens the next clue', () => {
    dock();
    expect(within(screen.getByRole('navigation', { name: 'Tabs' })).getAllByRole('link').map((a) => a.textContent)).toEqual(['Cases', 'You', 'Play', 'Squad', 'Ranks']);
    expect(play().getAttribute('data-play')).toBe('clue');
    expect(play().getAttribute('href')).toMatch(/^\/play\/[a-z0-9-]+\/1$/);
    expect(play()).toHaveAccessibleName('Play the next clue');
  });

  it('it never leads to a daily, played or not, and broken storage is never a dead button', () => {
    localStorage.setItem(`gazecraft-daily-${dayNo()}`, '{broken');
    localStorage.setItem('gazecraft-finished', '{broken');
    dock();
    expect(play().getAttribute('href')).toMatch(/^\/play\/[a-z0-9-]+\/1$/);
  });
  it('guests have a You tab of their own, not a sign in link', () => {
    dock();
    expect(screen.getByRole('link', { name: 'You' })).toHaveAttribute('href', '/me');
  });

  it('with every case closed it is a tick back to Cases', () => {
    localStorage.setItem('gazecraft-finished', JSON.stringify(games.map((g) => g.id)));
    dock();
    expect(play().getAttribute('data-play')).toBe('done');
    expect(play().getAttribute('href')).toBe('/play');
    expect(play()).toHaveAttribute('data-done', 'true');
  });
});
