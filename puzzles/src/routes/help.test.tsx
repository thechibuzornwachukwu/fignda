// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { HelpArticle } from '../help/types';

const fake = vi.hoisted(
  (): HelpArticle[] => [
    {
      slug: 'how-to-play',
      group: 'Playing',
      title: 'How do I play?',
      answer: 'Drag across the letters of a hidden word.',
      steps: ['Open a pack.', 'Read the paragraph.'],
      related: ['add-a-friend', 'no-such-slug'],
    },
    {
      slug: 'tip-off',
      group: 'Playing',
      title: 'Can I get a tip-off?',
      answer: 'A tip-off shows one letter.',
      facts: ['Each tip-off costs 25 points.'],
    },
    {
      slug: 'add-a-friend',
      group: 'Friends',
      title: 'Can I add a friend?',
      answer: 'Open their profile and follow them.',
    },
  ],
);

vi.mock('../lib/auth', () => ({ useAuth: () => ({ enabled: true, loading: false, session: null, profile: null }) }));
vi.mock('../help/articles', async (original) => {
  const real = await original<typeof import('../help/articles')>();
  return {
    ...real,
    HELP_ARTICLES: fake,
    helpArticle: (slug: string) => fake.find((a) => a.slug === slug),
    helpByGroup: (list: readonly HelpArticle[] = fake) => real.helpByGroup(list),
    searchHelp: (query: string, list: readonly HelpArticle[] = fake) => real.searchHelp(query, list),
  };
});
const { Help, HelpArticlePage } = await import('./Help');

const app = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/help" element={<Help />} />
        <Route path="/help/:slug" element={<HelpArticlePage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('help centre', () => {
  it('lists the articles under their groups, each linking to its page', () => {
    app('/help');
    const playing = screen.getByRole('region', { name: 'Playing' });
    expect(within(playing).getByRole('link', { name: 'How do I play?' })).toHaveAttribute('href', '/help/how-to-play');
    expect(within(playing).getByRole('link', { name: 'Can I get a tip-off?' })).toHaveAttribute('href', '/help/tip-off');
    const friends = screen.getByRole('region', { name: 'Friends' });
    expect(within(friends).getByRole('link', { name: 'Can I add a friend?' })).toHaveAttribute('href', '/help/add-a-friend');
    expect(screen.getByRole('searchbox', { name: 'Search help' })).toHaveAttribute('placeholder', 'Search help');
  });

  it('typing in search keeps only the matching articles', () => {
    app('/help');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search help' }), { target: { value: 'friend' } });
    expect(screen.getByRole('link', { name: 'Can I add a friend?' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'How do I play?' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Playing' })).toBeNull();
  });

  it('a search with no match says so', () => {
    app('/help');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search help' }), { target: { value: 'zzzz' } });
    expect(screen.getByText('Nothing matches that. Try another word.')).toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('an article shows its title, answer and steps, and links only related articles that exist', () => {
    app('/help/how-to-play');
    const article = screen.getByRole('article');
    expect(article).toHaveAttribute('data-help', 'how-to-play');
    expect(within(article).getByRole('heading', { level: 1, name: 'How do I play?' })).toBeInTheDocument();
    expect(within(article).getByText('Drag across the letters of a hidden word.')).toBeInTheDocument();
    const steps = within(article).getAllByRole('listitem').map((li) => li.textContent);
    expect(steps).toEqual(['Open a pack.', 'Read the paragraph.']);
    const related = screen.getByRole('navigation', { name: 'Related' });
    expect(within(related).getByRole('link', { name: 'Can I add a friend?' })).toHaveAttribute('href', '/help/add-a-friend');
    expect(within(related).getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'All help' })).toHaveAttribute('href', '/help');
  });

  it('an unknown slug goes back to the list', () => {
    app('/help/nope');
    expect(screen.getByRole('searchbox', { name: 'Search help' })).toBeInTheDocument();
    expect(screen.queryByRole('article')).toBeNull();
  });
});
