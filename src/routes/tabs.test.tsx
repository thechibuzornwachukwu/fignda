// @vitest-environment jsdom
// The 4 tabs: one header each, less at once, and a deliberate line wherever there is nothing to show.
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { dayNo } from '../engine/daily';
import { games } from '../games/catalog';
import { Games } from './Games';
import { Leaderboard } from './Leaderboard';
import { Players } from './Players';
import { Profile } from './Profile';

type Me = { id: string; handle: string; name: string } | null;
const world = vi.hoisted(() => ({
  me: null as Me,
  api: {} as Record<string, (...a: unknown[]) => Promise<unknown>>,
}));

vi.mock('../lib/auth', () => ({
  useAuth: () => ({ enabled: true, loading: false, profile: world.me, session: world.me ? { user: { id: world.me.id } } : null }),
}));
vi.mock('../avatar/store', () => ({ avatarCodeOf: () => undefined, subscribeAvatars: () => () => {} }));
vi.mock('../lib/api', async (original) => {
  const real = await original<typeof import('../lib/api')>();
  const names = [
    'generateAvailable',
    'myGameInvites',
    'fetchDailyDays',
    'fetchOwnPlays',
    'fetchPublicPlays',
    'fetchProfileByHandle',
    'fetchBadges',
    'fetchFollowers',
    'fetchFollowing',
    'isFollowing',
    'myFriendStreaks',
    'myCircles',
    'fetchCircleBoard',
    'fetchDailyBoard',
    'fetchDailyRank',
    'fetchFollowingBoard',
    'suggestedPlayers',
    'searchPlayers',
    'topPlayers',
    'newPlayers',
  ];
  const fakes = Object.fromEntries(names.map((n) => [n, (...a: unknown[]) => world.api[n]!(...a)]));
  return { ...real, ...fakes };
});

const ok =
  <T,>(v: T) =>
  () =>
    Promise.resolve(v);
const fail = () => Promise.reject(new Error('offline'));

/** Everything answers with nothing: a brand new place. */
function emptyWorld() {
  world.me = null;
  world.api = {
    generateAvailable: ok(true),
    myGameInvites: ok([]),
    fetchDailyDays: ok([]),
    fetchOwnPlays: ok([]),
    fetchPublicPlays: ok([]),
    fetchProfileByHandle: ok(null),
    fetchBadges: ok([]),
    fetchFollowers: ok([]),
    fetchFollowing: ok([]),
    isFollowing: ok(false),
    myFriendStreaks: ok([]),
    myCircles: ok([]),
    fetchCircleBoard: ok([]),
    fetchDailyBoard: ok([]),
    fetchDailyRank: ok(null),
    fetchFollowingBoard: ok([]),
    suggestedPlayers: ok([]),
    searchPlayers: ok([]),
    topPlayers: ok([]),
    newPlayers: ok([]),
  };
}

const ADA = { id: 'u1', handle: 'ada', name: 'Ada' };
const play = (i: number, verified = true) => ({ game_id: `g${i}`, day_no: null, found: 3, total: 5, score: 300, secs: 60, created_at: '2026-10-01T10:00:00Z', verified });

function open(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/play" element={<Games />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/players" element={<Players />} />
        <Route path="/u/:handle" element={<Profile />} />
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Nothing on the page reads like a missing value. */
function expectNoHoles() {
  const text = document.body.textContent ?? '';
  expect(text).not.toMatch(/undefined|NaN|Invalid Date|\bnull\b|0 of 0/);
}

const title = () => screen.getByRole('heading', { level: 1 }).textContent;

beforeEach(() => emptyWorld());

describe('Games', () => {
  it('a first visit shows the daily and the games list only', async () => {
    open('/play');
    expect(title()).toBe('Cases');
    expect(screen.getByRole('link', { name: /Daily #\d+/ })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'All games' })).getAllByRole('link').length).toBeGreaterThan(0);
    // Give the any-topic check time to answer: it still must not show.
    await Promise.resolve();
    expect(screen.queryByLabelText('Or any topic')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Make a puzzle' })).toBeNull();
    expect(screen.queryByRole('link', { name: "See today's board" })).toBeNull();
    expect(screen.queryByText(/of the last 7 days/)).toBeNull();
    expectNoHoles();
  });

  it('unreadable storage is a first visit, not a crash', () => {
    localStorage.setItem('gazecraft-unlocks', '{not json');
    localStorage.setItem('gazecraft-finished', '"all of them"');
    localStorage.setItem(`gazecraft-daily-${dayNo()}`, 'null');
    open('/play');
    expect(screen.queryByRole('link', { name: 'Make a puzzle' })).toBeNull();
    expect(screen.getByText('Play today')).toBeInTheDocument();
    expectNoHoles();
  });

  it('a saved daily with no list of finds says 0, never undefined', () => {
    localStorage.setItem(`gazecraft-daily-${dayNo()}`, JSON.stringify({ endAt: 5, startAt: 1 }));
    open('/play');
    expect(screen.getByText('Done for today. You found 0. New puzzle at midnight.')).toBeInTheDocument();
    expectNoHoles();
  });

  it('a filter that matches nothing falls back to every game', () => {
    open('/play?f=Nothing');
    expect(within(screen.getByRole('region', { name: 'All games' })).getAllByRole('link').length).toBeGreaterThanOrEqual(games.length);
  });

  it('the direct link shows any topic before it is unlocked, and keeps it', async () => {
    open('/play#any-topic');
    expect(await screen.findByLabelText('Or any topic')).toBeInTheDocument();
    expect(localStorage.getItem('gazecraft-unlocks')).toContain('make');
  });

  it('one finished game brings the way to the board', () => {
    localStorage.setItem('gazecraft-finished', JSON.stringify([games[0]!.id]));
    open('/play');
    expect(screen.getByRole('link', { name: "See today's board" })).toHaveAttribute('href', '/leaderboard');
    expect(screen.queryByRole('link', { name: 'Make a puzzle' })).toBeNull();
  });

  it('5 plays bring Make a puzzle and any topic', async () => {
    localStorage.setItem('gazecraft-finished', JSON.stringify(games.slice(0, 5).map((g) => g.id)));
    open('/play');
    expect(screen.getByRole('link', { name: 'Make a puzzle' })).toHaveAttribute('href', '/make');
    expect(await screen.findByLabelText('Or any topic')).toBeInTheDocument();
  });

  it('a returning player on a new device sees what their stored plays unlock', async () => {
    world.me = ADA;
    world.api.fetchOwnPlays = ok([1, 2, 3, 4, 5, 6].map((i) => play(i)));
    open('/play');
    expect(await screen.findByRole('link', { name: 'Make a puzzle' })).toBeInTheDocument();
  });

  it('a signed in player whose plays do not load still gets the daily and the list', async () => {
    world.me = ADA;
    world.api.fetchOwnPlays = fail;
    world.api.fetchDailyDays = fail;
    world.api.myGameInvites = fail;
    open('/play');
    await Promise.resolve();
    expect(screen.getByRole('link', { name: /Daily #\d+/ })).toBeInTheDocument();
    expectNoHoles();
  });
});

describe('Leaders', () => {
  it('a guest sees everyone, no switch, and a line when nobody is ranked', async () => {
    open('/leaderboard');
    expect(title()).toBe('Ranks');
    expect(await screen.findByText(/No verified scores yet today\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Be the first' })).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Your circles' })).toBeNull();
    expect(screen.getByText(/Guest scores stay on this device/)).toBeInTheDocument();
    expectNoHoles();
  });

  it('a board that did not load says so', async () => {
    world.api.fetchDailyBoard = fail;
    open('/leaderboard');
    expect(await screen.findByText('The board did not load. Try again in a moment.')).toBeInTheDocument();
  });

  it('a reply that is not a list is an empty board', async () => {
    world.api.fetchDailyBoard = ok(null);
    open('/leaderboard');
    expect(await screen.findByText(/No verified scores yet today\./)).toBeInTheDocument();
  });

  it('a single ranked player is a board of 1', async () => {
    world.api.fetchDailyBoard = ok([{ rank: 1, handle: 'ada', score: 700, secs: 80, found: 7, total: null }]);
    open('/leaderboard');
    const board = await screen.findByRole('list', { name: 'Top scores' });
    expect(within(board).getAllByRole('listitem')).toHaveLength(1);
    expect(board).toHaveTextContent('7 found');
    expectNoHoles();
  });

  it('signed in with no circle and nobody followed: opens on Everyone, and Circle is not offered yet', async () => {
    world.me = ADA;
    open('/leaderboard');
    expect(await screen.findByRole('radio', { name: 'Everyone' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByRole('radio', { name: 'Circle' })).toBeNull();
    expect(screen.getByRole('radio', { name: 'Following' })).toBeInTheDocument();
  });

  it('following someone: opens on Following, with a line when none of them has played', async () => {
    world.me = ADA;
    world.api.fetchFollowing = ok([{ handle: 'bisi', name: 'Bisi' }]);
    open('/leaderboard');
    expect(await screen.findByRole('radio', { name: 'Following' })).toHaveAttribute('aria-checked', 'true');
    expect(await screen.findByText(/Nobody you follow has a verified score here yet\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Find players' })).toBeInTheDocument();
  });

  it('in a circle: opens on Circle, counts who has still to play, and links the circle', async () => {
    world.me = ADA;
    world.api.fetchFollowing = ok([{ handle: 'bisi', name: 'Bisi' }]);
    world.api.myCircles = ok([{ code: 'ABCDEF', name: 'Obi family', members: 2, is_owner: true }]);
    world.api.fetchCircleBoard = ok([
      { rank: 1, handle: 'ada', name: 'Ada', score: 700, secs: 80, found: 7, total: null },
      { rank: null, handle: 'bisi', name: 'Bisi', score: null, secs: null, found: null, total: null },
    ]);
    open('/leaderboard');
    expect(await screen.findByRole('radio', { name: 'Circle' })).toHaveAttribute('aria-checked', 'true');
    expect(await screen.findByText(/1 still to play\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Obi family' })).toHaveAttribute('href', '/c/ABCDEF');
    expect(screen.getByRole('link', { name: 'Your circles' })).toHaveAttribute('href', '/circles');
    expectNoHoles();
  });

  it('a circle where nobody has played yet gets a line and the way to play', async () => {
    world.me = ADA;
    world.api.myCircles = ok([{ code: 'ABCDEF', name: 'Obi family', members: 1, is_owner: true }]);
    world.api.fetchCircleBoard = ok([{ rank: null, handle: 'ada', name: 'Ada', score: null, secs: null, found: null, total: null }]);
    open('/leaderboard');
    expect(await screen.findByText(/Nobody in Obi family has a verified score here yet\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Play today's daily" })).toBeInTheDocument();
  });

  it('the address wins over the default, and a circle board with no circle offers one', async () => {
    world.me = ADA;
    world.api.fetchFollowing = ok([{ handle: 'bisi', name: 'Bisi' }]);
    open('/leaderboard?board=circle');
    expect(await screen.findByText(/You are not in a circle yet\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start one' })).toHaveAttribute('href', '/circles');
    expect(screen.getByRole('radio', { name: 'Circle' })).toHaveAttribute('aria-checked', 'true');
  });

  it('when the lookups fail it lands on Everyone', async () => {
    world.me = ADA;
    world.api.fetchFollowing = fail;
    world.api.myCircles = fail;
    open('/leaderboard');
    expect(await screen.findByRole('radio', { name: 'Everyone' })).toHaveAttribute('aria-checked', 'true');
  });
});

describe('Players', () => {
  it('a guest in an empty place: one line per list, no lone heading, and the way to sign in', async () => {
    open('/players');
    expect(title()).toBe('Squad');
    expect(await screen.findByText('Nobody else has joined yet. Invite a friend and they will show up here.')).toBeInTheDocument();
    expect(await screen.findByText("No streaks yet. Play today's daily to start one.")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/signin?next=%2Fplayers');
    expect(screen.queryByRole('region', { name: 'Friend streaks' })).toBeNull();
    // Points wait for a first verified play.
    expect(screen.queryByRole('radio', { name: 'Points' })).toBeNull();
    expectNoHoles();
  });

  it('leads with one section, and the top lists are one more', async () => {
    open('/players');
    await screen.findByText(/Nobody else has joined yet/);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['People to follow', 'Top players']);
  });

  it('lists that did not load say so, and never claim to be empty', async () => {
    world.api.suggestedPlayers = fail;
    world.api.topPlayers = fail;
    open('/players');
    expect(await screen.findAllByText('This list did not load. Try again in a moment.')).toHaveLength(2);
    expect(screen.queryByText(/Nobody else has joined yet/)).toBeNull();
  });

  it('rows with missing fields are dropped or filled, never printed as undefined', async () => {
    world.api.suggestedPlayers = ok([null, { handle: 'bisi', name: '', plays: undefined, mutuals: null }, { name: 'No handle' }]);
    world.api.topPlayers = ok([{ handle: 'ada', name: 'Ada', value: undefined }]);
    open('/players');
    const list = await screen.findByRole('region', { name: 'People to follow' });
    expect(await within(list).findAllByRole('listitem')).toHaveLength(1);
    expect(list).toHaveTextContent('New here');
    expect(await screen.findByText('0 days')).toBeInTheDocument();
    expectNoHoles();
  });

  it('a single player in a list reads in the singular', async () => {
    world.api.topPlayers = ok([{ handle: 'ada', name: 'Ada', value: 1 }]);
    open('/players');
    expect(await screen.findByText('1 day')).toBeInTheDocument();
  });

  it('signed in and new: friend streaks wait, unless the link asks for them', async () => {
    world.me = ADA;
    const first = open('/players');
    await screen.findByText(/You follow everyone here/);
    expect(screen.queryByRole('region', { name: 'Friend streaks' })).toBeNull();
    first.unmount();
    open('/players#friend-streaks');
    const region = await screen.findByRole('region', { name: 'Friend streaks' });
    expect(await within(region).findByText(/A streak you share with a friend/)).toBeInTheDocument();
  });

  it('a player already in a friend streak sees it whatever the count says', async () => {
    world.me = ADA;
    world.api.myFriendStreaks = ok([{ handle: 'bisi', name: 'Bisi', state: 'active', streak: 1, you_today: false, them_today: false }]);
    open('/players');
    const region = await screen.findByRole('region', { name: 'Friend streaks' });
    expect(region).toHaveTextContent('1 day');
  });
});

describe('You', () => {
  const profile = { id: 'u1', handle: 'ada', name: 'Ada', created_at: '2026-03-04T00:00:00Z' };

  it('your own page says You, with Settings as the one action', async () => {
    world.me = ADA;
    world.api.fetchProfileByHandle = ok(profile);
    open('/u/ada');
    expect(title()).toBe('You');
    expect(await screen.findByRole('heading', { name: 'Ada' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Settings' })).toHaveLength(1);
  });

  it('a new player gets a welcome and one thing to do, not a wall of zeros', async () => {
    world.me = ADA;
    world.api.fetchProfileByHandle = ok(profile);
    open('/u/ada');
    expect(await screen.findByRole('heading', { name: 'Your run starts with one puzzle.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Play today's daily" })).toBeInTheDocument();
    expect(screen.queryByText('Points')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Badges' })).toBeNull();
    expect(screen.getByText('Nobody yet. Share your profile to get followers.')).toBeInTheDocument();
    expectNoHoles();
  });

  it("a signed out viewer sees another player's page and is asked to sign in to follow", async () => {
    world.api.fetchProfileByHandle = ok(profile);
    open('/u/ada');
    expect(title()).toBe('Player');
    expect(await screen.findByRole('heading', { name: 'Ada is new here.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Follow' })).toHaveAttribute('href', '/signin?next=%2Fu%2Fada');
    expect(screen.queryByRole('link', { name: 'Settings' })).toBeNull();
  });

  it('plays that are not verified yet show the run, and hold back points and badges', async () => {
    world.me = ADA;
    world.api.fetchProfileByHandle = ok(profile);
    world.api.fetchOwnPlays = ok([play(1, false)]);
    open('/u/ada');
    expect(await screen.findByText('Best streak')).toBeInTheDocument();
    expect(screen.queryByText('Points')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Badges' })).toBeNull();
    expectNoHoles();
  });

  it('one verified play brings points and badges', async () => {
    world.me = ADA;
    world.api.fetchProfileByHandle = ok(profile);
    world.api.fetchOwnPlays = ok([play(1)]);
    world.api.fetchBadges = ok(['first_game']);
    open('/u/ada');
    expect(await screen.findByText('Points')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Badges' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recent' })).toBeInTheDocument();
    expectNoHoles();
  });

  it('plays that did not load say so, and do not pass for a new player', async () => {
    world.me = ADA;
    world.api.fetchProfileByHandle = ok(profile);
    world.api.fetchOwnPlays = fail;
    world.api.fetchBadges = fail;
    open('/u/ada');
    expect(await screen.findByText('Your plays did not load. Try again in a moment.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Your run starts with one puzzle.' })).toBeNull();
  });

  it('a player who does not exist and a page that did not load are told apart', async () => {
    const first = open('/u/nobody');
    expect(await screen.findByRole('heading', { name: 'No player called @nobody.' })).toBeInTheDocument();
    first.unmount();
    world.api.fetchProfileByHandle = fail;
    open('/u/ada');
    expect(await screen.findByRole('heading', { name: 'This page did not load.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Play' })).toHaveAttribute('href', '/play');
  });

  it('a profile with no name or date falls back to the handle and drops the date', async () => {
    world.api.fetchProfileByHandle = ok({ id: 'u1', handle: 'ada', name: '', created_at: null });
    open('/u/ada');
    expect(await screen.findByRole('heading', { name: '@ada' })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Playing since/);
    expectNoHoles();
  });
});
