// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { roleLabel, type Chapter } from '../engine/chapter';
import { characterFor, PARTS } from '../avatar/draw';
import { getChapter } from '../games/chapters';
import { Brief } from '../routes/Brief';
import { CaseBoard } from './CaseBoard';

const spoon = (): Chapter => structuredClone(getChapter('the-long-spoon')!);

/** The long spoon with n suspects, the longest name a chapter may give and the longest role the game has. */
const crowd = (n: number): Chapter => {
  const c = spoon();
  const more = { who: 'the neighbour from 2 doors down', name: 'Alexandria', look: 'feminine' as const, line: 'Lives close by.', says: 'I was asleep.' };
  c.suspects = [...c.suspects, more].slice(0, n);
  return c;
};

describe('CaseBoard', () => {
  it('opens on the chapter’s own pins, in its order', () => {
    const { container } = render(<CaseBoard chapter={spoon()} />);
    expect([...container.querySelectorAll('[data-kind]')].map((p) => p.getAttribute('data-kind'))).toEqual(['item', 'note', 'left', 'faces']);
    expect(screen.getByText('the Long Spoon')).toBeInTheDocument();
    expect(screen.getByText('Smells of burnt wood.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Left behind: A card with one open eye' })).toBeInTheDocument();
    expect(screen.getByText('4 were near. 1 of them.')).toBeInTheDocument();
    expect(container.querySelector('[data-find]')).toBeNull();
  });

  it.each([1, 2, 3, 4, 5])('holds %i suspects, each with a name and a role that can be read in full', (n) => {
    const { container } = render(<CaseBoard chapter={crowd(n)} />);
    const board = container.querySelector('[data-case-board]')!;
    expect(board).toHaveAttribute('data-suspects', String(n));
    expect(board).toHaveAccessibleName(new RegExp(n === 1 ? '1 suspect\\.' : `${n} suspects\\.`));
    const faces = [...container.querySelectorAll('[data-face]')];
    expect(faces).toHaveLength(n);
    const row = container.querySelector('[data-faces]') as HTMLElement;
    expect(row.style.getPropertyValue('--faces')).toBe(String(n));
    expect(row.style.getPropertyValue('--rows-of')).toBe(String([1, 2, 3, 2, 3][n - 1]));
    // What is cut on screen is still there to read: the whole name and the whole role are the title.
    for (const [i, s] of crowd(n).suspects.entries()) {
      expect(within(faces[i] as HTMLElement).getByTitle(s.name)).toHaveTextContent(s.name);
      expect(within(faces[i] as HTMLElement).getByTitle(roleLabel(s.who))).toBeInTheDocument();
    }
  });

  it('a board with no faces pinned shows none', () => {
    const c = spoon();
    c.board = { pins: [{ kind: 'map', label: 'The market, by row' }] };
    const { container } = render(<CaseBoard chapter={c} />);
    expect(container.querySelector('[data-face]')).toBeNull();
    expect(screen.getByText('The market, by row')).toBeInTheDocument();
  });

  it('gains a pin for each step solved, and tapes over who is cleared', () => {
    const { container } = render(<CaseBoard chapter={spoon()} solved={2} cleared={['the stall owner']} />);
    expect([...container.querySelectorAll('[data-find]')].map((f) => f.textContent)).toEqual(['Key 7 out, 6.40 to 9.15', 'Till roll: across town']);
    expect(container.querySelectorAll('[data-cleared]')).toHaveLength(1);
    expect(screen.getByText('Cleared')).toBeInTheDocument();
    expect(container.querySelector('[data-case-board]')).toHaveAccessibleName(/2 finds\./);
  });

  it('draws a suspect the way the chapter says they present', () => {
    const hair = PARTS.find((p) => p.key === 'hair')!;
    for (const seed of ['a', 'the-long-spoon~the caretaker', 'x~the baker', 'zz', 'q9'])
      for (const look of ['feminine', 'masculine'] as const) expect(hair.looks[characterFor(seed, look).hair]).toBe(look);
    expect(characterFor('a', 'masculine')).toEqual(characterFor('a', 'masculine'));
  });

  it('names a role as the words under a face', () => {
    expect(roleLabel('the stall owner')).toBe('Stall owner');
    expect(roleLabel('the neighbour from 2 doors down')).toBe('Neighbour from 2 doors down');
  });
});

describe('Brief', () => {
  const open = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="case/:id" element={<Brief />} />
        </Routes>
      </MemoryRouter>,
    );

  it('opens a written chapter on its board, with the brief under it and the way back', () => {
    const { container } = open('/case/the-long-spoon');
    expect(screen.getByRole('heading', { level: 1, name: 'The long spoon' })).toBeInTheDocument();
    expect(container.querySelector('[data-case-board]')).toBeInTheDocument();
    expect(screen.getByText(/Tonight at 6 is the 20th cook-off final/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cases' })).toHaveAttribute('href', '/cases');
    expect(screen.getByRole('link', { name: 'Go to the store room' })).toHaveAttribute('href', '/case/the-long-spoon/1');
  });

  it('a case that is not written says so, with the way back', () => {
    const { container } = open('/case/nothing');
    expect(container.querySelector('[data-brief="missing"]')).toBeInTheDocument();
    expect(container.querySelector('[data-case-board]')).toBeNull();
    expect(screen.getByRole('link', { name: 'Back to cases' })).toHaveAttribute('href', '/cases');
  });
});
