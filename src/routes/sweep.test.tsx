// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { getChapter } from '../games/chapters';
import { Step } from './Step';

// Sweep the room (SPEC section 6): case 5's first step, in the drawn hall.

vi.mock('../lib/auth', () => ({ useAuth: () => ({ enabled: false, loading: false, profile: null, session: null }) }));

const all = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3 };
const before = { 'the-long-spoon': all, 'the-open-box': all, 'the-early-bus': all, 'the-year-that-is-missing': all };
const kept = () => JSON.parse(localStorage.getItem('gazecraft-chapters') ?? '{}') as Record<string, Record<string, number>>;
const room = getChapter('the-light-in-the-hall')!.steps[0]!.room!;
const evidence = room.things.filter((t) => t.evidence).map((t) => t.name);
const open = () => {
  localStorage.setItem('gazecraft-chapters', JSON.stringify(before));
  return render(
    <MemoryRouter initialEntries={['/case/the-light-in-the-hall/1']}>
      <Routes>
        <Route path="case/:id/:n" element={<Step />} />
      </Routes>
    </MemoryRouter>,
  );
};
const tap = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

beforeEach(() => localStorage.clear());

describe('sweep the room', () => {
  it('the room is the drawing, with a button over every thing in it, and the drawing loads on its own skeleton', () => {
    const { container } = open();
    expect(screen.getByRole('heading', { level: 1, name: 'The hall' })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-thing]')).toHaveLength(room.things.length);
    expect(container.querySelector('[data-skeleton]')).toBeInTheDocument();
    fireEvent.load(container.querySelector('[data-room] img')!);
    expect(container.querySelector('[data-skeleton]')).toBeNull();
  });

  it('every piece found, clean, ends the step at once on 3 stars, its fact and its lead', () => {
    const { container } = open();
    for (const name of evidence) tap(name);
    expect(container.querySelector('[data-sweep="done"]')).toBeInTheDocument();
    expect(kept()['the-light-in-the-hall']![1]).toBe(3);
    expect(container.querySelector('[data-fact]')).toHaveTextContent('Nobody walks through walls');
    expect(container.querySelector('[data-proof="means"]')).toHaveAttribute('data-state', 'new');
    expect(screen.getByRole('link', { name: "Go to the caretaker's desk" })).toHaveAttribute('href', '/case/the-light-in-the-hall/2');
  });

  it('a tap on the room is marked and cannot be tapped again, and a tip-off rings a quarter until something is found', () => {
    const { container } = open();
    tap('The clock');
    expect(screen.getByRole('button', { name: 'The clock' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'The clock' })).toHaveAttribute('data-state', 'wrong');
    fireEvent.click(screen.getByRole('button', { name: 'Ask for a tip-off' }));
    expect(container.querySelector('[data-quarter="1"]')).toBeInTheDocument();
    tap('The torch on the piano');
    expect(container.querySelector('[data-quarter]')).toBeNull();
    // The count is in the row and on the phone bar.
    expect(screen.getAllByText('1 of 6')).toHaveLength(2);
  });

  it("I'm done ends it early: what was missed is shown, and the lead is given all the same", () => {
    const { container } = open();
    tap('The torch on the piano');
    fireEvent.click(screen.getByRole('button', { name: "I'm done" }));
    expect(kept()['the-light-in-the-hall']![1]).toBe(1);
    expect(container.querySelectorAll('[data-state="missed"]')).toHaveLength(5);
    expect(container.querySelector('[data-lead]')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Play it again' }));
    expect(container.querySelector('[data-sweep="open"]')).toBeInTheDocument();
  });
});
