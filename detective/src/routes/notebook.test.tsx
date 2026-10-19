// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { chapters } from '../games/chapters';
import { Notebook } from './Notebook';

// Your Notebook (SPEC section 6): every case worked, as its own board.

const keep = (stars: Record<string, Record<number, number>>) => localStorage.setItem('lantern-chapters', JSON.stringify(stars));
const open = () =>
  render(
    <MemoryRouter initialEntries={['/notebook']}>
      <Routes>
        <Route path="notebook" element={<Notebook />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => localStorage.clear());

describe('Your Notebook', () => {
  it('is empty until a step is done, and sends the player to their case', () => {
    const { container } = open();
    expect(container.querySelector('[data-notebook="empty"]')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open your case' })).toHaveAttribute('href', '/case/the-long-spoon');
  });

  it('holds each case worked as its board, with the lead that is open', () => {
    const spoon = chapters[0]!;
    keep({ [spoon.id]: { 1: 3, 2: 3 } });
    const { container } = open();
    expect(screen.getByRole('heading', { level: 1, name: 'Your Notebook' })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-case]')).toHaveLength(1);
    expect(screen.getByRole('link', { name: spoon.title })).toHaveAttribute('href', `/case/${spoon.id}`);
    expect(screen.getByText(spoon.steps[1]!.lead!)).toBeInTheDocument();
  });

  it('a closed case is stamped, and leads nowhere', () => {
    const spoon = chapters[0]!;
    keep({ [spoon.id]: Object.fromEntries(spoon.steps.map((_, i) => [i + 1, 3])) });
    const { container } = open();
    expect(container.querySelector(`[data-case="${spoon.id}"]`)).toHaveAttribute('data-closed', 'true');
    expect(screen.getByText('Case closed')).toBeInTheDocument();
  });
});
