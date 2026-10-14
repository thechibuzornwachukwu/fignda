// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { tornOf } from '../engine/chapter';
import { getChapter } from '../games/chapters';
import { Step } from './Step';

// The torn page (SPEC section 6): case 7's second step, the sale book's page torn in 2.

vi.mock('../lib/auth', () => ({ useAuth: () => ({ enabled: false, loading: false, profile: null, session: null }) }));

const all = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3 };
const before = Object.fromEntries(['the-long-spoon', 'the-open-box', 'the-early-bus', 'the-year-that-is-missing', 'the-light-in-the-hall', 'the-2-signs'].map((id) => [id, all]));
const kept = () => JSON.parse(localStorage.getItem('gazecraft-chapters') ?? '{}') as Record<string, Record<string, number>>;
const torn = tornOf(getChapter('the-other-spoon')!, 2)!;
const open = () => {
  localStorage.setItem('gazecraft-chapters', JSON.stringify({ ...before, 'the-other-spoon': { 1: 3 } }));
  return render(
    <MemoryRouter initialEntries={['/case/the-other-spoon/2']}>
      <Routes>
        <Route path="case/:id/:n" element={<Step />} />
      </Routes>
    </MemoryRouter>,
  );
};
const half = (i: number) => fireEvent.click(document.querySelector(`[data-half="${i}"]`)!);

beforeEach(() => localStorage.clear());

describe('the torn page', () => {
  it('the left halves are in order, the right halves are a pile, and the line that is open takes the next one', () => {
    const { container } = open();
    expect(screen.getByRole('heading', { level: 1, name: 'The sale book' })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-line]')).toHaveLength(4);
    expect(container.querySelector('[data-line="0"]')).toHaveAttribute('data-state', 'open');
    expect(container.querySelectorAll('[data-half]')).toHaveLength(4);
    half(torn.order[0]!);
    expect(container.querySelector('[data-line="0"]')).toHaveAttribute('data-state', 'whole');
    expect(container.querySelector('[data-line="0"]')).toHaveTextContent('Lot 20, entered on Tuesday at 10');
    expect(container.querySelectorAll('[data-half]')).toHaveLength(3);
  });

  it('every line whole is 3 stars, and the step ends on its fact and its lead', () => {
    const { container } = open();
    torn.order.forEach(half);
    expect(container.querySelector('[data-torn="done"]')).toBeInTheDocument();
    expect(kept()['the-other-spoon']![2]).toBe(3);
    expect(screen.getByRole('link', { name: 'Go to the art room' })).toHaveAttribute('href', '/case/the-other-spoon/3');
  });

  it('a wrong half is not kept: the right one is set, the line is marked, and it costs a star', () => {
    const { container } = open();
    const wrong = torn.order[1]!;
    half(wrong);
    expect(container.querySelector('[data-line="0"]')).toHaveAttribute('data-state', 'mended');
    expect(container.querySelector('[data-line="0"]')).toHaveTextContent('Lot 20, entered on Tuesday at 10');
    // The half picked wrongly is still in the pile, for the line it belongs to.
    expect(container.querySelector(`[data-half="${wrong}"]`)).toBeInTheDocument();
    torn.order.slice(1).forEach(half);
    expect(kept()['the-other-spoon']![2]).toBe(2);
  });
});
