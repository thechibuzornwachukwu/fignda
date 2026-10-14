// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { checkChapter, type Chapter } from '../engine/chapter';
import { openEyeFile } from '../engine/openEye';
import { chapters, interludes } from '../games/chapters';
import pools from '../../data/copy.json';
import { Casebook } from './Casebook';
import { OpenEye } from './OpenEye';

// The Open Eye file (SPEC section 6) and the end of the casebook.

vi.mock('../lib/auth', () => ({ useAuth: () => ({ enabled: false, loading: false, profile: null, session: null }) }));

const all = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3 };
const keep = (stars: Record<string, Record<number, number>>) => localStorage.setItem('lantern-chapters', JSON.stringify(stars));
const open = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="open-eye" element={<OpenEye />} />
        <Route path="cases" element={<Casebook />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => localStorage.clear());

describe('the Open Eye file, from the stories', () => {
  const file = openEyeFile(chapters, interludes, () => true);

  it('holds every message in the order of the story: 4 passed in plain sight and the 2 interludes', () => {
    expect(file.map((e) => `${e.id}~${e.step}`)).toEqual([
      'the-long-spoon~5',
      'the-early-bus~5',
      'the-year-that-is-missing~4',
      'the-bookmark~1',
      'the-envelope~1',
      'who-carries-the-cards~5',
    ]);
    expect(file.every((e) => e.text && e.says.startsWith('Read the way the Open Eye teaches'))).toBe(true);
  });

  it('a message is read once its step is done', () => {
    const read = openEyeFile(chapters, interludes, (id, n) => id === 'the-long-spoon' && n === 5);
    expect(read.filter((e) => e.read).map((e) => e.id)).toEqual(['the-long-spoon']);
  });

  it('only a hidden-words step with its text is a message', () => {
    const c = structuredClone(chapters[0]!) as Chapter;
    c.steps[1]!.eye = true;
    expect(checkChapter(c, pools.culpritWho)).toContain('step 2: only a hidden-words step with its text is a message to the Open Eye');
  });
});

describe('the Open Eye file, on screen', () => {
  it('nothing read: the pet says what goes here and leads to the case', () => {
    const { container } = open('/open-eye');
    expect(container.querySelector('[data-open-eye="empty"]')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open your case' })).toHaveAttribute('href', '/case/the-long-spoon');
  });

  it('what has been read is filed as its card with what it says, and the rest are shut cards in their place', () => {
    keep({ 'the-long-spoon': all, 'the-open-box': all, 'the-early-bus': { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 } });
    const { container } = open('/open-eye');
    expect(container.querySelectorAll('[data-eye]')).toHaveLength(6);
    expect(container.querySelectorAll('[data-eye][data-read]')).toHaveLength(2);
    expect(container.querySelector('[data-eye="the-long-spoon"]')).toHaveTextContent('Room to let.');
    expect(container.querySelector('[data-eye="the-long-spoon"]')).toHaveTextContent('Her name goes back before the 20th is burned.');
    expect(screen.getAllByRole('img', { name: 'A message not read yet' })).toHaveLength(4);
  });

  it('Cases leads to it once there is something in it, and a closed casebook shows the next one shut', () => {
    const first = open('/cases');
    expect(first.container.querySelector('[data-eye-link]')).toBeNull();
    first.unmount();
    keep(Object.fromEntries(chapters.map((c) => [c.id, all])));
    const { container } = open('/cases');
    expect(screen.getByRole('link', { name: 'The Open Eye' })).toHaveAttribute('href', '/open-eye');
    expect(container.querySelector('[data-next-book]')).toHaveTextContent('Casebook 2');
  });
});
