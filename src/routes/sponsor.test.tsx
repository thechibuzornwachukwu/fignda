// @vitest-environment jsdom
// The "With NAME" mark (SPEC section 5, With NAME): one field on a puzzle, shown on the game row, the daily card
// and the link preview. The result and the share card are in GameResults.test.tsx and cards.test.ts.
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { dayNo } from '../engine/daily';
import { dailyIdFor, games, getGameDef, getPuzzle, sponsorFor } from '../games/catalog';
import { pageFor } from '../seo/pages';
import { Games } from './Games';

// Every puzzle is with Chi Farms, so today's daily is too, whichever one it is. One field is broken on purpose.
vi.mock('../../data/games.json', async (original) => {
  const real = (await original<{ default: { games: Array<{ id: string }> } }>()).default;
  const sponsor = (id: string) => (id === 'afrobeats' ? { name: 'A', url: 'https://chifarms.example' } : { name: 'Chi Farms', url: 'https://www.chifarms.example/shop' });
  return { default: { ...real, games: real.games.map((g) => ({ ...g, sponsor: sponsor(g.id) })) } };
});
vi.mock('../lib/auth', () => ({ useAuth: () => ({ enabled: true, loading: false, profile: null, session: null }) }));
vi.mock('../avatar/store', () => ({ avatarCodeOf: () => undefined, subscribeAvatars: () => () => {} }));
vi.mock('../lib/api', async (original) => ({
  ...(await original<typeof import('../lib/api')>()),
  generateAvailable: () => Promise.resolve(true),
  myGameInvites: () => Promise.resolve([]),
  fetchDailyDays: () => Promise.resolve([]),
  fetchOwnPlays: () => Promise.resolve([]),
}));

const ORIGIN = 'https://gazecraft.example';

function showGames() {
  localStorage.clear();
  return render(
    <MemoryRouter initialEntries={['/play']}>
      <Games />
    </MemoryRouter>,
  );
}

describe('With NAME', () => {
  it('reads the field through one rule', () => {
    expect(sponsorFor(getGameDef('bible')!)).toEqual({ name: 'Chi Farms', url: 'https://www.chifarms.example/shop', host: 'chifarms.example' });
    expect(sponsorFor(getGameDef('afrobeats')!)).toBeUndefined();
  });

  it('a puzzle that is not in the catalogue never carries it', () => {
    expect(sponsorFor({ id: 'c-abcdefgh', sponsor: { name: 'Chi Farms' } })).toBeUndefined();
  });

  it('shows on a case card on the path, under the title', () => {
    const { container } = showGames();
    const path = screen.getByRole('region', { name: 'Your path' });
    const marks = [...container.querySelectorAll('[data-case-sponsor]')];
    expect(marks).toHaveLength(games.length - 1);
    for (const m of marks) expect(m.textContent).toBe('With Chi Farms');
    expect(within(path).getByRole('heading', { level: 3, name: /The classic/ }).closest('[data-case]')!.querySelector('[data-case-sponsor]')).not.toBeNull();
    // The list of games is gone: the path is the way in.
    expect(screen.queryByRole('region', { name: 'All games' })).toBeNull();
  });

  it('a field that fails the rule shows nothing', () => {
    showGames();
    const card = screen.getByRole('heading', { level: 3, name: /Party at ours/ }).closest('[data-case]')!;
    expect(card.querySelector('[data-case-sponsor]')).toBeNull();
    expect(card).not.toHaveTextContent(/With /);
  });

  it('shows on the daily card when today is a sponsored puzzle', () => {
    const { container } = showGames();
    const card = container.querySelector(`a[href="/d/${dayNo()}"]`)!;
    expect(card).toHaveTextContent('With Chi Farms');
  });

  it('is in the link preview of the puzzle and of the daily', () => {
    const game = pageFor('/play/bible', ORIGIN);
    expect(game.description).toMatch(/ With Chi Farms\.$/);
    expect(game.imageAlt).toMatch(/ With Chi Farms\.$/);
    expect(game.body).toContain('With Chi Farms.');
    const daily = pageFor(`/d/${dayNo()}`, ORIGIN);
    expect(daily.description).toMatch(/ With Chi Farms\.$/);
    expect(daily.body).toContain('With Chi Farms.');
  });

  it('a puzzle with no sponsor, or a broken one, says nothing in its preview', () => {
    const page = pageFor('/play/afrobeats', ORIGIN);
    expect(`${page.title} ${page.description} ${page.imageAlt} ${page.body}`).not.toMatch(/\bWith\b/);
  });

  it('changes nothing about the puzzle: the same answers, in the same order', () => {
    const id = dailyIdFor(dayNo());
    expect(getPuzzle(id)!.answers.map((a) => a.label)).toEqual(getGameDef(id)!.expectedAnswers);
  });
});
