// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const world = vi.hoisted(() => ({ list: [] as unknown, fail: false, slow: false }));
vi.mock('../lib/auth', () => ({ useAuth: () => ({ enabled: true, loading: false, session: null, profile: null }) }));
vi.mock('../lib/api', async (original) => ({
  ...(await original<typeof import('../lib/api')>()),
  fetchPublicPuzzles: () => (world.slow ? new Promise(() => {}) : world.fail ? Promise.reject(new Error('x')) : Promise.resolve(world.list)),
}));
const { Made } = await import('./Made');
const show = () => render(<MemoryRouter><Made /></MemoryRouter>);

beforeEach(() => Object.assign(world, { list: [], fail: false, slow: false }));

describe('Made by players', () => {
  it('lists each puzzle with its icon, maker, words, plays and likes, and links to it', async () => {
    world.list = [{ code: 'ABCDEFGH', title: 'Market day', icon: 'Utensils', maker: 'ada', words: 6, plays: 1, ups: 3 }];
    show();
    const link = await screen.findByRole('link', { name: /Market day/ });
    expect(link).toHaveAttribute('href', '/p/ABCDEFGH');
    expect(link).toHaveTextContent('@ada · 6 words · 1 play · 3 liked it');
    expect(link.querySelector('[data-topic-icon="Utensils"]')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Make one' })).toHaveAttribute('href', '/make');
  });

  it('loading is a skeleton, nothing yet is the pet with a line, and a failure says so', async () => {
    world.slow = true;
    const first = show();
    expect(document.querySelector('[aria-busy="true"], [data-skeleton]')).not.toBeNull();
    first.unmount();
    world.slow = false;
    const second = show();
    expect(await screen.findByText('Nothing here yet')).toBeInTheDocument();
    second.unmount();
    world.fail = true;
    show();
    expect(await screen.findByText('The list did not load. Try again in a moment.')).toBeInTheDocument();
  });
});
