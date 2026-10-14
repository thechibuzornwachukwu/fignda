// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { Partner } from '../components/Partner';
import { choosePartner, forgetPartner, loadPartner, PARTNER_KEY } from './partner';

beforeEach(() => {
  localStorage.clear();
  forgetPartner();
});

describe('the pet beside the player', () => {
  it('is the cat until another is chosen, and any of the 4 can be chosen at any time, for nothing', () => {
    expect(loadPartner()).toBe('cat');
    for (const id of ['robot', 'dino', 'dog', 'cat'] as const) {
      choosePartner(id);
      expect(loadPartner()).toBe(id);
      expect(localStorage.getItem(PARTNER_KEY)).toBe(id);
    }
  });

  it('a stored value that is not a pet falls back to the cat', () => {
    localStorage.setItem(PARTNER_KEY, 'unicorn');
    forgetPartner();
    expect(loadPartner()).toBe('cat');
  });

  it('every pet on screen changes the moment it is chosen', () => {
    const { container } = render(<Partner moment="empty" />);
    expect(container.querySelector('img')).toHaveAttribute('data-partner', 'cat');
    act(() => choosePartner('dino'));
    expect(container.querySelector('img')).toHaveAttribute('data-partner', 'dino');
    expect(container.querySelector('img')).toHaveAttribute('src', '/pets/dino-calm.svg');
  });
});
