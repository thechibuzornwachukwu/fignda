// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { Partner } from '../components/Partner';

const api = vi.hoisted(() => ({
  mine: null as { current: string; owned: string[]; points: number; bonds?: unknown } | null,
  fail: false,
  asked: [] as string[],
  slots: 1,
}));
vi.mock('./api', () => ({
  fetchMyPartner: async () => {
    if (api.fail) throw new Error('offline');
    return api.mine;
  },
  chooseServerPartner: async (who: string) => {
    if (api.fail) throw new Error('offline');
    api.asked.push(who);
    const cur = api.mine ?? { current: who, owned: [who], points: 0 };
    if (cur.owned.includes(who)) api.mine = { ...cur, current: who };
    else if (cur.owned.length < api.slots) api.mine = { ...cur, current: who, owned: [...cur.owned, who] };
    else api.mine = cur;
    return { current: api.mine.current, owned: api.mine.owned };
  },
}));

const { choosePartner, forgetPartner, loadPartner, PARTNER_KEY, partnerChosen, syncPartner } = await import('./partner');

beforeEach(() => {
  localStorage.clear();
  forgetPartner();
  api.mine = null;
  api.fail = false;
  api.asked = [];
  api.slots = 1;
});

describe('a guest', () => {
  it('starts with Detective X, unchosen, and holds 1: another pick swaps it', async () => {
    expect(loadPartner()).toEqual({ current: 'cat', owned: ['cat'], points: 0, bonds: {} });
    expect(partnerChosen()).toBe(false);
    expect(await choosePartner('dog', false)).toBe(true);
    expect(loadPartner()).toMatchObject({ current: 'dog', owned: ['dog'] });
    expect(await choosePartner('dino', false)).toBe(true);
    expect(loadPartner()).toMatchObject({ current: 'dino', owned: ['dino'] });
    expect(partnerChosen()).toBe(true);
    expect(api.asked).toEqual([]);
  });

  it('broken storage is the start, never a crash', () => {
    localStorage.setItem(PARTNER_KEY, '{broken');
    forgetPartner();
    expect(loadPartner()).toEqual({ current: 'cat', owned: ['cat'], points: 0, bonds: {} });
    localStorage.setItem(PARTNER_KEY, JSON.stringify({ current: 'robot', owned: ['robot'], points: 'lots', bonds: 'many' }));
    forgetPartner();
    expect(loadPartner()).toEqual({ current: 'cat', owned: ['cat'], points: 0, bonds: {} });
  });
});

describe('signing in', () => {
  it('a guest’s choice moves to an account that has none', async () => {
    await choosePartner('dog', false);
    await syncPartner();
    expect(api.asked).toEqual(['dog']);
    expect(loadPartner()).toMatchObject({ current: 'dog', owned: ['dog'] });
  });

  it('a player who never chose sends nothing up', async () => {
    await syncPartner();
    expect(api.asked).toEqual([]);
    expect(loadPartner().current).toBe('cat');
  });

  it('the account wins: what it holds comes down, with its points', async () => {
    await choosePartner('dog', false);
    api.mine = { current: 'dino', owned: ['cat', 'dino'], points: 4200 };
    await syncPartner();
    expect(api.asked).toEqual([]);
    expect(loadPartner()).toEqual({ current: 'dino', owned: ['cat', 'dino'], points: 4200, bonds: {} });
  });

  it('offline: nothing changes', async () => {
    await choosePartner('dog', false);
    api.fail = true;
    await syncPartner();
    expect(loadPartner()).toMatchObject({ current: 'dog', owned: ['dog'] });
  });
});

describe('choosing signed in', () => {
  it('the account decides: a partner it will not give is not taken', async () => {
    api.mine = { current: 'cat', owned: ['cat'], points: 0 };
    await syncPartner();
    expect(await choosePartner('dino', true)).toBe(false);
    expect(loadPartner()).toMatchObject({ current: 'cat', owned: ['cat'] });
    api.slots = 2;
    expect(await choosePartner('dino', true)).toBe(true);
    expect(loadPartner()).toMatchObject({ current: 'dino', owned: ['cat', 'dino'] });
  });

  it('offline: a switch among the held still shows, a new one does not', async () => {
    api.mine = { current: 'cat', owned: ['cat', 'dino'], points: 3000 };
    await syncPartner();
    api.fail = true;
    expect(await choosePartner('dino', true)).toBe(true);
    expect(loadPartner().current).toBe('dino');
    expect(await choosePartner('dog', true)).toBe(false);
    expect(loadPartner().owned).toEqual(['cat', 'dino']);
  });
});

describe('<Partner>', () => {
  it('draws the player’s partner in the mood of the moment, as a decorative picture', async () => {
    await choosePartner('dino', false);
    const { container } = render(<Partner moment="loading" size={88} />);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('/partners/dino-thinking.svg');
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('width')).toBe('88');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('the bond shows on the player’s own partner, and never on someone else’s', async () => {
    api.mine = { current: 'cat', owned: ['cat'], points: 0, bonds: { cat: 3 } };
    await syncPartner();
    expect(loadPartner().bonds).toEqual({ cat: 3 });
    const mine = render(<Partner moment="done" />);
    expect(mine.container.querySelector('img')!.getAttribute('src')).toBe('/partners/cat-happy-1.svg');
    mine.unmount();
    const theirs = render(<Partner who="cat" moment="empty" plain />);
    expect(theirs.container.querySelector('img')!.getAttribute('src')).toBe('/partners/cat-calm.svg');
    // Switching partner keeps what was earned with each.
    api.fail = true;
    await choosePartner('cat', true);
    expect(loadPartner().bonds).toEqual({ cat: 3 });
  });

  it('a named partner is drawn whoever the player has', () => {
    const { container } = render(<Partner who="dog" moment="hello" />);
    expect(container.querySelector('img')!.getAttribute('src')).toBe('/partners/dog-wave.svg');
  });
});