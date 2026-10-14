// @vitest-environment jsdom
import { readdirSync, readFileSync } from 'node:fs';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { checkInterlude, interludeChapter, type Interlude as File } from '../engine/interlude';
import { chapters, interludes } from '../games/chapters';
import { Brief } from './Brief';
import { Casebook } from './Casebook';
import { Interlude } from './Interlude';
import { Step } from './Step';

// The casebook on Cases, cold cases and interludes (SPEC section 6).

vi.mock('../lib/auth', () => ({ useAuth: () => ({ enabled: false, loading: false, profile: null, session: null }) }));

const all = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3 };
const keep = (stars: Record<string, Record<number, number>>) => localStorage.setItem('gazecraft-chapters', JSON.stringify(stars));
const kept = () => JSON.parse(localStorage.getItem('gazecraft-chapters') ?? '{}') as Record<string, Record<string, number>>;
const open = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="play" element={<Casebook />} />
        <Route path="case/:id" element={<Brief />} />
        <Route path="case/:id/:n" element={<Step />} />
        <Route path="cold/:id" element={<Brief />} />
        <Route path="cold/:id/:n" element={<Step />} />
        <Route path="interlude/:id" element={<Interlude />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => localStorage.clear());

describe('the casebook on Cases', () => {
  it('a new player: the first file is open, the rest are shut, and the next one is not written', () => {
    const { container } = open('/play');
    expect(screen.getByRole('heading', { level: 2, name: 'Lantern Row' })).toBeInTheDocument();
    expect(container.querySelector('[data-chapter]')).toHaveAttribute('data-chapter', 'the-long-spoon');
    expect(screen.getByRole('img', { name: '6 steps' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the brief' })).toHaveAttribute('href', '/case/the-long-spoon');
    expect(container.querySelectorAll('[data-state="locked"][data-file]')).toHaveLength(chapters.length - 1);
    expect(container.querySelector('[data-next-file]')).toHaveTextContent('Case 7');
    expect(container.querySelector('[data-interlude]')).toHaveAttribute('data-state', 'locked');
  });

  it('half way: the steps are marks, closed files fold to a row, and the way in is Carry on', () => {
    keep({ 'the-long-spoon': all, 'the-open-box': { 1: 3, 2: 2 } });
    const { container } = open('/play');
    expect(container.querySelector('[data-file="the-long-spoon"]')).toHaveAttribute('data-state', 'closed');
    expect(container.querySelector('[data-chapter]')).toHaveAttribute('data-chapter', 'the-open-box');
    expect(screen.getByRole('img', { name: 'Step 3 of 6' })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-steps] [data-state="done"]')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Carry on' })).toHaveAttribute('href', '/case/the-open-box');
    expect(screen.getByRole('link', { name: 'Work The long spoon cold, with no tip-offs' })).toHaveAttribute('href', '/cold/the-long-spoon');
  });

  it('every written case closed: no file is open, and the interlude can be read', () => {
    keep(Object.fromEntries(chapters.map((c) => [c.id, all])));
    const { container } = open('/play');
    expect(container.querySelector('[data-chapter]')).toBeNull();
    expect(screen.getByRole('link', { name: 'The bookmark' })).toHaveAttribute('href', '/interlude/the-bookmark');
  });
});

describe('a cold case', () => {
  it('is a closed case: one that is still open leads back to its own brief', () => {
    const { container } = open('/cold/the-long-spoon');
    expect(container.querySelector('[data-brief="the-long-spoon"]')).not.toHaveAttribute('data-cold');
  });

  it('starts from an empty board with stars of its own, and a step has no tip-off', () => {
    keep({ 'the-long-spoon': all });
    const first = open('/cold/the-long-spoon');
    expect(first.container.querySelector('[data-brief]')).toHaveAttribute('data-cold', 'true');
    expect(first.container.querySelector('[data-find]')).toBeNull();
    expect(screen.getByRole('link', { name: 'Go to the store room' })).toHaveAttribute('href', '/cold/the-long-spoon/1');
    first.unmount();

    open('/cold/the-long-spoon/1');
    expect(screen.queryByRole('button', { name: 'Ask for a tip-off' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tip-off' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: "I'm done" }));
    expect(screen.getByRole('link', { name: "Go to Rosa's night stall" })).toHaveAttribute('href', '/cold/the-long-spoon/2');
    expect(kept()['cold~the-long-spoon']![1]).toBe(1);
    expect(kept()['the-long-spoon']![1]).toBe(3);
  });

  it('closed cold, the ending carries the gold seal, and so does its file', () => {
    keep({ 'the-long-spoon': all, 'cold~the-long-spoon': all });
    const first = open('/cold/the-long-spoon/6');
    expect(screen.getByRole('img', { name: 'Gold seal' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'The board' })).toHaveAttribute('href', '/cold/the-long-spoon');
    first.unmount();
    const { container } = open('/play');
    expect(container.querySelector('[data-file="the-long-spoon"] [data-seal]')).toBeInTheDocument();
  });
});

describe('an interlude', () => {
  const files = readdirSync('design/stories/interludes').filter((f) => f.endsWith('.json'));
  const read = (f: string) => JSON.parse(readFileSync(`design/stories/interludes/${f}`, 'utf8')) as File;

  it.each(files)('%s can be played, is named as its file, and follows a written case', (f) => {
    const i = read(f);
    expect(checkInterlude(i)).toEqual([]);
    expect(`${i.id}.json`).toBe(f);
    expect(chapters.some((c) => c.number === i.after && c.casebook === i.casebook)).toBe(true);
    expect(interludeChapter(i).steps).toHaveLength(1);
  });

  it('one that is not an interlude, or hides a word the engine cannot find, is refused', () => {
    expect(checkInterlude(null)).toEqual(['not an interlude']);
    expect(checkInterlude({ ...read(files[0]!), words: ['hall', 'spoon'] })).toContain('the engine does not find spoon');
    expect(checkInterlude({ ...read(files[0]!), fact: 'Read it!' }).join(' ')).toMatch(/exclamation/);
  });

  it('is shut until the case before it is closed', () => {
    const { container } = open('/interlude/the-bookmark');
    expect(container.querySelector('[data-step]')).toBeNull();
  });

  it('is 1 board, ends on what it says, and leads back to Cases', () => {
    keep(Object.fromEntries(chapters.map((c) => [c.id, all])));
    const { container } = open('/interlude/the-bookmark');
    expect(interludes).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'The bookmark' })).toBeInTheDocument();
    expect(container.querySelector('[data-marks]')).toBeNull();
    expect(screen.getByRole('link', { name: 'Cases' })).toHaveAttribute('href', '/play');
    fireEvent.click(screen.getByRole('button', { name: "I'm done" }));
    expect(container.querySelector('[data-fact]')).toHaveTextContent('Hall. Glow. Key. Dark.');
    expect(screen.getByRole('link', { name: 'Back to cases' })).toHaveAttribute('href', '/play');
    expect(kept()['the-bookmark']![1]).toBe(1);
  });
});
