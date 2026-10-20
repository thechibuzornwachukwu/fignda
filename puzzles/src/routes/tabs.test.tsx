// @vitest-environment jsdom
// The 4 tabs: one header each, less at once, and a deliberate line wherever there is nothing to show.
import { render, screen, within, cleanup, fireEvent, waitFor } from '@testing-library/react';
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
    'fetchGameBoard',
    'fetchMyLeague',
    'joinLeague',
    'leaveLeague',
    'fetchDailyRank',
    'fetchFollowingBoard',
    'suggestedPlayers',
    'searchPlayers',
    'squadFeed',
    'fetchNotifications',
    'markNotificationsRead',
    'fetchUnread',
    'cheer',
    'fetchFriendsBoard',
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
    fetchGameBoard: ok([]),
    fetchMyLeague: ok(null),
    squadFeed: ok([]),
    fetchNotifications: ok([]),
    markNotificationsRead: ok(undefined),
    fetchUnread: ok(0),
    cheer: ok(1),
    fetchFriendsBoard: ok([]),
    joinLeague: ok(undefined),
    leaveLeague: ok(undefined),
    fetchDailyRank: ok(null),
    fetchFollowingBoard: ok([]),
    suggestedPlayers: ok([]),
    searchPlayers: ok([]),
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
  it('a first visit shows the crew and the path, and no daily and no list of games', async () => {
    open('/play');
    expect(title()).toBe('Your Puzzles');
    expect(screen.queryByRole('link', { name: /Daily #\d+/ })).toBeNull();
    expect(within(screen.getByRole('region', { name: 'Your path' })).getAllByRole('link').length).toBeGreaterThan(0);
    expect(screen.queryByRole('region', { name: 'All games' })).toBeNull();
    expect(screen.getByRole('link', { name: /Change your look and your pet/ })).toHaveAttribute('href', '/me');
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
    expect(screen.queryByText('Play today')).toBeNull();
    expect(screen.getByRole('region', { name: 'Your path' })).toBeInTheDocument();
    expectNoHoles();
  });

  it('a daily played before leaves no card on Cases', () => {
    localStorage.setItem(`gazecraft-daily-${dayNo()}`, JSON.stringify({ endAt: 5, startAt: 1 }));
    open('/play');
    expect(screen.queryByText(/Done for today/)).toBeNull();
    expectNoHoles();
  });

  it('an old filter in the address changes nothing: there is no list to filter', () => {
    open('/play?f=Nothing');
    expect(title()).toBe('Your Puzzles');
    expect(screen.queryByRole('group', { name: 'Filter games' })).toBeNull();
    expect(screen.getByRole('region', { name: 'Your path' })).toBeInTheDocument();
  });

  it('Cases is the daily and the path: no week, no board link, and Make only once it is unlocked', () => {
    localStorage.setItem('gazecraft-finished', JSON.stringify([games[0]!.id]));
    open('/play');
    expect(screen.queryByRole('link', { name: "See today's board" })).toBeNull();
    expect(screen.queryByText(/of the last 7 days/)).toBeNull();
    expect(screen.queryByRole('link', { name: 'Make a puzzle' })).toBeNull();
  });

  it('5 plays bring Make a puzzle, and there is no any-topic box: Make is the one way to make one', async () => {
    localStorage.setItem('gazecraft-finished', JSON.stringify(games.slice(0, 5).map((g) => g.id)));
    open('/play');
    expect(screen.getByRole('link', { name: 'Make a puzzle' })).toHaveAttribute('href', '/make');
    expect(screen.queryByLabelText('Or any topic')).toBeNull();
  });

  it('a returning player on a new device sees what their stored plays unlock', async () => {
    world.me = ADA;
    world.api.fetchOwnPlays = ok([1, 2, 3, 4, 5, 6].map((i) => play(i)));
    open('/play');
    expect(await screen.findByRole('link', { name: 'Make a puzzle' })).toBeInTheDocument();
  });

  it('a signed in player whose plays do not load still gets the path', async () => {
    world.me = ADA;
    world.api.fetchOwnPlays = fail;
    world.api.fetchDailyDays = fail;
    world.api.myGameInvites = fail;
    open('/play');
    await Promise.resolve();
    expect(screen.getByRole('region', { name: 'Your path' })).toBeInTheDocument();
    expectNoHoles();
  });
});

describe('Leaders', () => {
  it('Ranks is the board of the case the player is on: its best scores, and the way to play it', async () => {
    world.me = ADA;
    world.api.fetchMyLeague = ok(null);
    world.api.fetchGameBoard = ok([
      { rank: 1, handle: 'bisi', score: 1650, secs: 95, found: 12, total: 12 },
      { rank: 2, handle: 'ada', score: 900, secs: 300, found: 8, total: 12 },
    ]);
    open('/leaderboard?board=pack');
    expect(title()).toBe('Your League');
    const board = await screen.findByRole('list', { name: 'Top scores' });
    const rows = within(board).getAllByRole('listitem');
    expect(rows.map((r) => r.textContent)).toEqual(['01@bisi12/121:351,650', '02@adaYou8/125:00900']);
    expect(screen.getByRole('link', { name: 'Play it' }).getAttribute('href')).toMatch(/^\/play\/[a-z0-9-]+$/);
    expectNoHoles();
  });

  it('there is no daily on Ranks: no day, no switch, no way to one', async () => {
    open('/leaderboard?day=3&board=following');
    await screen.findByText('Nobody is on it yet. Finish the whole puzzle signed in and you are.');
    expect(document.body.textContent).not.toMatch(/daily|dailies|Today ·/i);
    expect(screen.queryByRole('button', { name: 'Previous day' })).toBeNull();
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(document.querySelector('a[href^="/d/"]')).toBeNull();
  });

  it('a guest sees the board and the way to get on it', async () => {
    open('/leaderboard');
    expect(await screen.findByText('Nobody is on it yet. Finish the whole puzzle signed in and you are.')).toBeInTheDocument();
    expect(screen.getByText(/Guest scores stay on this device/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/signin?next=%2Fleaderboard');
    expectNoHoles();
  });

  it('a board that did not load says so, and a reply that is not a list is an empty board', async () => {
    world.api.fetchGameBoard = fail;
    open('/leaderboard');
    expect(await screen.findByText('The board did not load. Try again in a moment.')).toBeInTheDocument();
    cleanup();
    world.api.fetchGameBoard = ok(null);
    open('/leaderboard');
    expect(await screen.findByText('Nobody is on it yet. Finish the whole puzzle signed in and you are.')).toBeInTheDocument();
    expectNoHoles();
  });

  it('loading shows rows of the board, not a blank', () => {
    world.api.fetchGameBoard = () => new Promise(() => {});
    open('/leaderboard');
    expect(screen.getByRole('link', { name: 'Play it' })).toBeInTheDocument();
    expect(document.querySelector('[aria-busy="true"], [data-skeleton]')).not.toBeNull();
  });
});

describe('Players', () => {
  it('a guest: the top players feed, people to follow in it, and search behind an icon', async () => {
    world.api.suggestedPlayers = ok([{ handle: 'bisi', name: 'Bisi', plays: 0, followers: 0, mutuals: 0 }]);
    open('/players');
    expect(title()).toBe('Your People');
    expect(await screen.findByText('No medals won this month yet.')).toBeInTheDocument();
    const strip = screen.getByRole('region', { name: 'People to follow' });
    expect(within(strip).getByRole('link', { name: 'Sign in to follow Bisi' })).toHaveAttribute('href', '/signin?next=%2Fu%2Fbisi');
    // Icons, not words, for every action here.
    const find = screen.getByRole('link', { name: 'Find people' });
    expect(find).toHaveAttribute('href', '/players#find');
    expect(find.textContent).toBe('');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('radio', { name: 'Your people' })).toBeNull();
    expectNoHoles();
  });

  it('one feed of cards: medals won and what happened to you, newest first; a medal of a friend can be cheered, yours shows its cheers', async () => {
    world.me = { id: 'u1', handle: 'me', name: 'Me' } as Me;
    world.api.squadFeed = ok([
      { handle: 'ada', name: 'Ada', code: 'streak_30', earned_at: '2026-10-19T10:00:00Z', cheers: 2, cheered: false, mine: false },
      { handle: 'me', name: 'Me', code: 'rare_eye', earned_at: '2026-10-18T10:00:00Z', cheers: 1, cheered: false, mine: true },
      { handle: 'bo', name: 'Bo', code: 'nope', earned_at: '2026-10-19T09:00:00Z', cheers: 0, cheered: false, mine: false },
    ]);
    world.api.fetchNotifications = ok([
      { id: 1, kind: 'follow', handle: 'kemi', name: 'Kemi', data: {}, created_at: '2026-10-19T11:00:00Z', unread: true },
      { id: 2, kind: 'badge', handle: null, name: null, data: { code: 'rare_eye' }, created_at: '2026-10-18T10:00:00Z', unread: false },
    ]);
    const cheered = vi.fn(ok(3));
    world.api.cheer = cheered;
    const read = vi.fn(ok(undefined));
    world.api.markNotificationsRead = read;
    open('/players');
    const feed = within(await screen.findByRole('region', { name: 'Feed' }));
    await feed.findByText('Kemi followed you.');
    // An unknown medal and the note that repeats your own medal are left out.
    const cards = feed.getAllByRole('article').map((a) => a.textContent ?? '');
    expect(cards).toHaveLength(3);
    expect(cards[0]).toMatch(/^Kemi followed you/);
    expect(cards[1]).toMatch(/^Ada.*30 day run/);
    expect(cards[2]).toMatch(/^You.*Rare eye/);
    expect(read).toHaveBeenCalled();
    // A follow is answered from the card, by an icon.
    expect(feed.getByRole('button', { name: 'Follow Kemi' }).textContent).toBe('');
    expect(feed.getByLabelText('1 cheer')).toBeInTheDocument();
    const button = feed.getByRole('button', { name: 'Cheer Ada, 2 cheers' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button);
    await waitFor(() => expect(feed.getByRole('button', { name: 'Cheer Ada, 3 cheers' })).toHaveAttribute('aria-pressed', 'true'));
    expect(cheered).toHaveBeenCalledWith('ada', 'streak_30', true);
  });

  it('a feed that did not load says so, and never claims to be quiet', async () => {
    world.api.squadFeed = fail;
    open('/players');
    expect(await screen.findByText('The feed did not load. Try again in a moment.')).toBeInTheDocument();
    expect(screen.queryByText(/No medals won/)).toBeNull();
  });

  it('suggestions with missing fields are dropped, never printed as undefined', async () => {
    world.api.suggestedPlayers = ok([null, { handle: 'bisi', name: '', plays: undefined, mutuals: null }, { name: 'No handle' }]);
    open('/players');
    const strip = await screen.findByRole('region', { name: 'People to follow' });
    expect(within(strip).getAllByRole('listitem')).toHaveLength(1);
    expect(strip).toHaveTextContent('@bisi');
    expectNoHoles();
  });

  it('signed in and new: friend streaks wait, unless the link asks for them', async () => {
    world.me = ADA;
    const first = open('/players');
    await screen.findByRole('region', { name: 'Feed' });
    // Nobody to suggest: the section is left out, not shown empty.
    expect(screen.queryByText(/You follow everyone here/)).toBeNull();
    expect(screen.queryByRole('heading', { level: 2, name: 'People to follow' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Friend streaks' })).toBeNull();
    first.unmount();
    open('/players#friend-streaks');
    const region = await screen.findByRole('region', { name: 'Friend streaks' });
    expect(await within(region).findByText(/A streak you share with a friend/)).toBeInTheDocument();
  });

  it('circles wait for the first daily, unless the link asks for them', async () => {
    world.me = ADA;
    const first = open('/players');
    await screen.findByRole('region', { name: 'Feed' });
    expect(screen.queryByRole('region', { name: 'Circles' })).toBeNull();
    first.unmount();
    open('/players#circles');
    const region = await screen.findByRole('region', { name: 'Circles' });
    expect(await within(region).findByText(/A circle is a private daily table/)).toBeInTheDocument();
    expect(within(region).getByRole('link', { name: 'Start a circle' })).toHaveAttribute('href', '/circles');
  });

  it('a player in a circle sees it on Squad whatever the count says, with the way to its board', async () => {
    world.me = ADA;
    world.api.myCircles = ok([{ code: 'ABCDEF', name: 'Obi family', members: 1, is_owner: true }, null, { code: 'GHIJKL', name: '', members: undefined }]);
    open('/players');
    const region = await screen.findByRole('region', { name: 'Circles' });
    expect(within(region).getByRole('link', { name: /Obi family/ })).toHaveAttribute('href', '/c/ABCDEF');
    expect(region).toHaveTextContent('1 player');
    expect(within(region).getByRole('link', { name: /Your circle/ })).toHaveAttribute('href', '/c/GHIJKL');
    expectNoHoles();
  });

  it('circles that did not load say so when they were asked for', async () => {
    world.me = ADA;
    world.api.myCircles = fail;
    open('/players#circles');
    const region = await screen.findByRole('region', { name: 'Circles' });
    expect(await within(region).findByText('This list did not load. Try again in a moment.')).toBeInTheDocument();
  });

  it('a player already in a friend streak sees it whatever the count says', async () => {
    world.me = ADA;
    world.api.myFriendStreaks = ok([{ handle: 'bisi', name: 'Bisi', state: 'active', streak: 1, you_today: false, them_today: false }]);
    open('/players');
    const region = await screen.findByRole('region', { name: 'Friend streaks' });
    expect(region).toHaveTextContent('1 day');
  });
});

describe('A player\'s page', () => {
  const profile = { id: 'u1', handle: 'ada', name: 'Ada', created_at: '2026-03-04T00:00:00Z' };

  it('your own page is the public one: it says Player, and its one action leads back to You', async () => {
    world.me = ADA;
    world.api.fetchProfileByHandle = ok(profile);
    open('/u/ada');
    expect(title()).toBe('Player');
    expect(await screen.findByRole('heading', { name: 'Ada' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to You' })).toHaveAttribute('href', '/me');
    expect(screen.queryByRole('link', { name: 'Settings' })).toBeNull();
  });

  it('a page on its way is a skeleton of the page, not a blank', () => {
    world.api.fetchProfileByHandle = () => new Promise(() => {});
    const { container } = open('/u/ada');
    expect(container.querySelectorAll('[data-skeleton][aria-busy="true"]').length).toBeGreaterThan(0);
  });

  it('a new player gets a welcome and one thing to do, not a wall of zeros', async () => {
    world.me = ADA;
    world.api.fetchProfileByHandle = ok(profile);
    open('/u/ada');
    expect(await screen.findByRole('heading', { name: 'Your run starts with one puzzle.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open a case' })).toHaveAttribute('href', '/play');
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

describe('the league on Your League', () => {
  const LEAGUE = {
    tier: 1,
    players: 7,
    rows: [
      { place: 1, handle: 'bisi', name: 'Bisi', points: 2400, me: false },
      { place: 2, handle: 'ada', name: 'Ada', points: 900, me: true },
      { place: 6, handle: 'chidi', name: 'Chidi', points: 0, me: false },
    ],
  };

  it('Friends: you and the people you follow on the points of this week; alone, the way to find people', async () => {
    world.me = ADA;
    world.api.fetchFriendsBoard = ok([
      { place: 1, handle: 'kemi', name: 'Kemi', points: 1200, me: false },
      { place: 2, handle: 'ada', name: 'Ada', points: 900, me: true },
    ]);
    open('/leaderboard?board=friends');
    const board = await screen.findByRole('list', { name: 'Friends this week' });
    expect(within(board).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['01@kemi1,200', '02@adaYou900']);
    expect(screen.getByRole('radio', { name: 'Friends' })).toHaveAttribute('aria-checked', 'true');
    cleanup();
    world.api.fetchFriendsBoard = ok([{ place: 1, handle: 'ada', name: 'Ada', points: 0, me: true }]);
    open('/leaderboard?board=friends');
    expect(await screen.findByRole('link', { name: 'Find people' })).toHaveAttribute('href', '/players#find');
  });

  it('signed in, Your League opens on the league: the tier, the table, the top 5 marked up and nothing marked down', async () => {
    world.me = ADA;
    world.api.fetchMyLeague = ok(LEAGUE);
    open('/leaderboard');
    expect(await screen.findByRole('heading', { level: 2, name: 'Silver league' })).toBeInTheDocument();
    const rows = within(screen.getByRole('list', { name: 'This week' })).getAllByRole('listitem');
    expect(rows.map((r) => r.hasAttribute('data-up'))).toEqual([true, true, false]);
    expect(rows[1]).toHaveAttribute('data-mine');
    expect(document.body.textContent).not.toMatch(/down|drop|relegat/i);
    expect(screen.getByRole('radio', { name: 'This week' })).toHaveAttribute('aria-checked', 'true');
    expectNoHoles();
  });

  it('a player who left sees the way back in, and a league that did not load says so', async () => {
    world.me = ADA;
    world.api.fetchMyLeague = ok(null);
    open('/leaderboard');
    expect(await screen.findByRole('button', { name: 'Join the league' })).toBeInTheDocument();
    cleanup();
    world.api.fetchMyLeague = fail;
    open('/leaderboard');
    expect(await screen.findByText('The league did not load. Try again in a moment.')).toBeInTheDocument();
  });

  it('a guest has the board of the pack and no league', async () => {
    world.api.fetchMyLeague = ok(LEAGUE);
    open('/leaderboard');
    await screen.findByText(/Guest scores stay on this device/);
    expect(screen.queryByRole('radio', { name: 'This week' })).toBeNull();
    expect(screen.queryByRole('heading', { name: /league/ })).toBeNull();
  });
});
