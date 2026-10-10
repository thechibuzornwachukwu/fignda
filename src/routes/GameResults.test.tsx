// @vitest-environment jsdom
import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GameResults } from './GameResults';

type Props = ComponentProps<typeof GameResults>;

const base: Props = {
  title: 'Good run.',
  line: 'The ones you missed are shaded below.',
  score: 420,
  found: 5,
  total: 8,
  secs: 95,
  canReplay: true,
  onReplay: () => {},
  onShare: () => {},
  onText: async () => '',
  guest: false,
};

function show(over: Partial<Props> = {}) {
  const { container } = render(
    <MemoryRouter>
      <GameResults {...base} {...over} />
    </MemoryRouter>,
  );
  return [...container.querySelectorAll('section > div:first-child > p')].map((p) => p.textContent);
}

describe('GameResults', () => {
  it('shows every line it is given, in order', () => {
    const lines = show({
      stars: 3,
      starsUp: 'New best here: 3 of 3 stars.',
      skills: ['A clean read. No hints, no wrong picks.', 'IGOAT ran across 4 words. You followed it.'],
      records: ['Your fastest clean read in Bible: 1:15.'],
      rare: 'Only 8% found Habakkuk. You did.',
      day: 'Today hid 11. Most days hide 8.',
      streak: '4 days in a row.',
      done: 'That is today done. See you tomorrow.',
    });
    expect(lines).toEqual([
      'The ones you missed are shaded below.',
      'New best here: 3 of 3 stars.',
      'A clean read. No hints, no wrong picks.',
      'IGOAT ran across 4 words. You followed it.',
      'Your fastest clean read in Bible: 1:15.',
      'Only 8% found Habakkuk. You did.',
      'Today hid 11. Most days hide 8.',
      '4 days in a row.',
      'That is today done. See you tomorrow.',
    ]);
  });

  it('a game ended at once with 0 found shows the title, the line and the stats, and nothing else', () => {
    const lines = show({ title: 'Next time.', found: 0, score: 0, secs: 0, skills: [], records: [], stars: 0, starsUp: '', rare: '', day: '' });
    expect(lines).toEqual(['The ones you missed are shaded below.']);
    expect(screen.getByRole('heading', { name: 'Next time.' })).toBeInTheDocument();
    expect(screen.getByText('0/8')).toBeInTheDocument();
    expect(screen.getByText('0:00')).toBeInTheDocument();
  });

  it('lines that were never passed leave no empty paragraph', () => {
    expect(show()).toEqual(['The ones you missed are shaded below.']);
    expect(show({ skills: undefined, records: undefined, rare: undefined, day: undefined })).toEqual([base.line]);
  });

  it('drops blank lines and says no line twice', () => {
    expect(show({ skills: ['', '  ', 'Every word, and no hints.', 'Every word, and no hints.'], records: [''] })).toEqual([
      base.line,
      'Every word, and no hints.',
    ]);
  });

  it('shows the stars a catalogue puzzle earned, and pops them only when they went up', () => {
    expect(show({ stars: 2 })).toEqual([base.line, '']);
    const row = screen.getByRole('img', { name: '2 of 3 stars' });
    expect(row).toHaveAttribute('data-stars', '2');
    expect(row).not.toHaveAttribute('data-pop');
    show({ stars: 3, starsUp: 'New best here: 3 of 3 stars.' });
    expect(screen.getByRole('img', { name: '3 of 3 stars' })).toHaveAttribute('data-pop');
  });

  it.each([0, undefined, NaN, -2])('%s stars is no stars row', (stars) => {
    expect(show({ stars, starsUp: 'New best here: 3 of 3 stars.' })).toEqual([base.line]);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('never prints a hole', () => {
    const { container } = render(
      <MemoryRouter>
        <GameResults {...base} found={0} total={0} score={0} secs={0} />
      </MemoryRouter>,
    );
    expect(container.textContent).not.toMatch(/undefined|NaN|null|\{\w*\}/);
  });

  it('a sponsored puzzle says who it is with, last, and links the sponsor in a new tab', () => {
    const lines = show({ done: 'That is today done. See you tomorrow.', sponsor: { line: 'With Chi Farms', url: 'https://chifarms.example/', host: 'chifarms.example' } });
    expect(lines).toEqual([base.line, 'That is today done. See you tomorrow.', 'With Chi Farms · chifarms.example']);
    const link = screen.getByRole('link', { name: 'chifarms.example' });
    expect(link).toHaveAttribute('href', 'https://chifarms.example/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'sponsored noopener');
  });

  it('a sponsor with no link is a name and nothing to tap', () => {
    expect(show({ sponsor: { line: 'With Chi Farms' } })).toEqual([base.line, 'With Chi Farms']);
    expect(screen.queryByRole('link', { name: /chifarms/ })).toBeNull();
  });

  it.each([undefined, { line: '' }, { line: '', url: 'https://chifarms.example/', host: 'chifarms.example' }])('sponsor %o adds no line', (sponsor) => {
    expect(show({ sponsor })).toEqual([base.line]);
  });

  it('keeps the leaderboard link beside the result line', () => {
    show({ boardPath: '/leaderboard/bible' });
    expect(screen.getByRole('link', { name: 'See the leaderboard' })).toHaveAttribute('href', '/leaderboard/bible');
  });
});

describe('GameResults on a sitting', () => {
  it('leads with the way on, which takes the one accent from Share', () => {
    show({ next: { to: '/play/bible/3', label: 'Next passage' } });
    const next = screen.getByRole('link', { name: 'Next passage' });
    expect(next).toHaveAttribute('href', '/play/bible/3');
    const actions = next.parentElement!;
    expect(actions.firstElementChild).toBe(next);
    const accents = [...actions.children].filter((el) => /accent/i.test(el.className));
    expect(accents).toEqual([next]);
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
  });

  it('with no next sitting, Share keeps the accent', () => {
    show();
    expect(screen.queryByRole('link', { name: 'Next passage' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Share' }).className).toMatch(/accent/i);
  });
});

describe('GameResults for a guest', () => {
  it('says the plain ask, or the line it is given in its place', () => {
    const { unmount } = render(
      <MemoryRouter>
        <GameResults {...base} guest />
      </MemoryRouter>,
    );
    expect(screen.getByText(/You are playing as a guest/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Keep this score' })).toBeInTheDocument();
    unmount();
    render(
      <MemoryRouter>
        <GameResults {...base} guest guestLine="That score is place 14 of 60 today. Sign in to put your name on the board." />
      </MemoryRouter>,
    );
    expect(screen.getByText(/place 14 of 60 today/)).toBeInTheDocument();
    expect(screen.queryByText(/You are playing as a guest/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Keep this score' })).toBeInTheDocument();
  });

  it('a signed in player is never asked', () => {
    show({ guestLine: 'That score is place 14 of 60 today.' });
    expect(screen.queryByText(/place 14 of 60/)).toBeNull();
    expect(screen.queryByRole('link', { name: 'Keep this score' })).toBeNull();
  });
});