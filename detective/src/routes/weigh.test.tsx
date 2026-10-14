// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { trailOf } from '../engine/chapter';
import { getChapter } from '../games/chapters';
import { Brief } from './Brief';
import { Step } from './Step';

// The 2 ways of weighing what could have happened (SPEC section 6): which account fits, and could it be done.

// Sign in is not set up here, so nothing is sent and no guest wall stands in the way.
vi.mock('../lib/auth', () => ({ useAuth: () => ({ enabled: false, loading: false, profile: null, session: null }) }));

const all = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3 };
const keep = (stars: Record<string, Record<number, number>>) => localStorage.setItem('lantern-chapters', JSON.stringify(stars));
const kept = () => JSON.parse(localStorage.getItem('lantern-chapters') ?? '{}') as Record<string, Record<string, number>>;
const open = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="case/:id" element={<Brief />} />
        <Route path="case/:id/:n" element={<Step />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => localStorage.clear());

describe('a case opens when the one before it is closed', () => {
  it('the brief of the next case says not yet, and leads to the case that is open', () => {
    const { container } = open('/case/the-open-box');
    expect(container.querySelector('[data-brief="locked"]')).toBeInTheDocument();
    expect(container.querySelector('[data-case-board]')).toBeNull();
    expect(screen.getByRole('link', { name: 'Open the case before it' })).toHaveAttribute('href', '/case/the-long-spoon');
  });

  it('a step of it leads back to that brief', () => {
    const { container } = open('/case/the-open-box/1');
    expect(container.querySelector('[data-brief="locked"]')).toBeInTheDocument();
  });

  it('closed, the next brief opens on its own board', () => {
    keep({ 'the-long-spoon': all });
    const { container } = open('/case/the-open-box');
    expect(container.querySelector('[data-case-board]')).toHaveAttribute('data-suspects', '2');
    expect(screen.getByRole('link', { name: 'Go to the committee room' })).toHaveAttribute('href', '/case/the-open-box/1');
  });
});

describe('which account fits', () => {
  const last = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 };
  const file = (n: number) => fireEvent.click(screen.getByRole('tab', { name: `Account ${n}` }));
  const stand = () => fireEvent.click(screen.getByRole('button', { name: 'This one stands' }));

  it('3 files with 1 open at a time, and the finds beside them, with no board and no fact under them', () => {
    keep({ 'the-long-spoon': all, 'the-open-box': last });
    const { container } = open('/case/the-open-box/6');
    expect(screen.getByRole('heading', { level: 1, name: 'Which account fits?' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Somebody opened the box to take votes out');
    file(3);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('The wedding ran late.');
    expect(screen.getByRole('tabpanel')).not.toHaveTextContent('take votes out');
    expect(screen.getByRole('list', { name: 'Found so far' }).children).toHaveLength(5);
    expect(container.querySelector('[data-case-board]')).toBeNull();
    expect(container.querySelector('[data-step-result]')).toBeNull();
  });

  it('the right account at once: the others are struck out, then the ending, a card at a time', () => {
    keep({ 'the-long-spoon': all, 'the-open-box': last });
    const { container } = open('/case/the-open-box/6');
    file(3);
    stand();

    expect(container.querySelector('[data-accounts="weighed"]')).toBeInTheDocument();
    expect([0, 1, 2].map((i) => container.querySelector(`[data-account="${i}"]`)!.getAttribute('data-state'))).toEqual(['struck', 'struck', 'stands']);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('The wedding ran late.');
    file(2);
    expect(container.querySelector('[data-struck-by]')).toHaveTextContent('Struck out by: Key 4 handed in at 9.05');
    expect(kept()['the-open-box']![6]).toBe(3);

    fireEvent.click(screen.getByRole('button', { name: 'See how it ends' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Case closed' })).toBeInTheDocument();
    expect(container.querySelector('[data-culprit-photo]')).toHaveTextContent('Otto');
    expect(container.querySelector('[data-found]')).toHaveTextContent('Nothing was taken.');
    // 3 cards: what was found, what he says, what came after. The way out is on the last.
    expect(screen.queryByRole('link', { name: 'Back to cases' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('button', { name: 'Card 2 of 3' })).toHaveAttribute('aria-current', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('link', { name: 'Back to cases' })).toHaveAttribute('href', '/cases');
    fireEvent.click(screen.getByRole('button', { name: 'Card 1 of 3' }));
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });

  it('a wrong pick is struck out by its find, costs a star, and cannot be picked again', () => {
    keep({ 'the-long-spoon': all, 'the-open-box': last });
    const { container } = open('/case/the-open-box/6');
    stand();
    expect(container.querySelector('[data-account="0"]')).toHaveAttribute('data-state', 'struck');
    expect(container.querySelector('[data-struck-by]')).toHaveTextContent('Struck out by: 41 names, 41 cards');
    expect(container.querySelector('[data-tries]')).toHaveAttribute('data-tries', '1');
    expect(screen.getByRole('button', { name: 'This one stands' })).toBeDisabled();
    file(3);
    stand();
    expect(kept()['the-open-box']![6]).toBe(2);
  });

  it('2 wrong picks and the one left stands anyway: nobody is locked out', () => {
    keep({ 'the-long-spoon': all, 'the-open-box': last });
    const { container } = open('/case/the-open-box/6');
    stand();
    file(2);
    stand();
    expect(container.querySelector('[data-accounts="weighed"]')).toBeInTheDocument();
    expect(container.querySelector('[data-account="2"]')).toHaveAttribute('data-state', 'stands');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('The wedding ran late.');
    expect(kept()['the-open-box']![6]).toBe(1);
  });

  it('closed stays closed: the step opens on the ending, and the brief leads to it', () => {
    keep({ 'the-long-spoon': all, 'the-open-box': all });
    const first = open('/case/the-open-box/6');
    expect(first.container.querySelector('[data-ending="the-open-box"]')).toBeInTheDocument();
    first.unmount();
    open('/case/the-open-box');
    expect(screen.getByRole('link', { name: 'See the ending' })).toHaveAttribute('href', '/case/the-open-box/6');
  });
});

describe('could it be done', () => {
  const before = { 1: 3, 2: 3, 3: 3 };
  const closed = { 'the-long-spoon': all, 'the-open-box': all };

  it('the fact that decides and the verdict, both right, end the step on its fact and its lead', () => {
    keep({ ...closed, 'the-early-bus': before });
    const { container } = open('/case/the-early-bus/4');
    expect(screen.getByRole('heading', { level: 1, name: 'The bus stop' })).toBeInTheDocument();
    expect(container.querySelector('[data-claim-says]')).toHaveTextContent('Nobody gets to that clock and back in 4.');
    expect(screen.getByRole('button', { name: 'Say so' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /60 paces/ }));
    expect(screen.getByRole('button', { name: 'Say so' })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: 'Could be done' }));
    fireEvent.click(screen.getByRole('button', { name: 'Say so' }));

    expect(container.querySelector('[data-claim="done"]')).toBeInTheDocument();
    expect(container.querySelector('[data-fact]')).toHaveTextContent('It could be done. 3 minutes is enough');
    expect(container.querySelector('[data-proof="chance"]')).toHaveAttribute('data-state', 'new');
    expect(container.querySelector('[data-fact-pick="1"]')).toHaveAttribute('data-state', 'decides');
    expect(container.querySelector('[data-verdict]')).toHaveTextContent('It could be done');
    expect(screen.getByRole('link', { name: 'Go to the cab' })).toHaveAttribute('href', '/case/the-early-bus/5');
    expect(kept()['the-early-bus']![4]).toBe(3);
  });

  it('a wrong verdict costs a star and cannot be said twice, and after 2 the answer is shown anyway', () => {
    keep({ ...closed, 'the-early-bus': before });
    const { container } = open('/case/the-early-bus/4');
    fireEvent.click(screen.getByRole('button', { name: /4 metres up/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'Could not' }));
    fireEvent.click(screen.getByRole('button', { name: 'Say so' }));
    expect(container.querySelector('[data-tries]')).toHaveAttribute('data-tries', '1');
    expect(screen.getByRole('button', { name: 'Say so' })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: 'Could be done' }));
    fireEvent.click(screen.getByRole('button', { name: 'Say so' }));
    expect(container.querySelector('[data-claim="done"]')).toBeInTheDocument();
    expect(kept()['the-early-bus']![4]).toBe(1);
    // The lead is given all the same, and it can be played again.
    expect(container.querySelector('[data-lead]')).toHaveTextContent('He could have.');
    fireEvent.click(screen.getByRole('button', { name: 'Play it again' }));
    expect(container.querySelector('[data-claim="open"]')).toBeInTheDocument();
    expect(container.querySelector('[data-tries]')).toHaveAttribute('data-tries', '2');
  });

  it('the step before the accounts says so on its way on', () => {
    keep({ ...closed, 'the-early-bus': { ...before, 4: 3 } });
    open('/case/the-early-bus/5');
    fireEvent.click(screen.getByRole('button', { name: "I'm done" }));
    expect(screen.getByRole('link', { name: 'Weigh the accounts' })).toHaveAttribute('href', '/case/the-early-bus/6');
  });
});

describe('walk it back, the trail', () => {
  const closed = { 'the-long-spoon': all, 'the-open-box': all, 'the-early-bus': all };
  const year = getChapter('the-year-that-is-missing')!;
  const trail = trailOf(year, 5)!;
  const stop = (i: number) => fireEvent.click(document.querySelector(`[data-stop="${i}"] button`)!);

  it('each find is handed over in turn and pinned to the place it was found', () => {
    keep({ ...closed, 'the-year-that-is-missing': { 1: 3, 2: 3, 3: 3, 4: 3 } });
    const { container } = open('/case/the-year-that-is-missing/5');
    expect(container.querySelectorAll('[data-stop]')).toHaveLength(4);
    trail.finds.forEach((f, k) => {
      expect(container.querySelector('[data-in-hand]')).toHaveTextContent(f.pin);
      stop(f.place);
      if (k < 3) expect(container.querySelector(`[data-stop="${f.place}"] [data-placed]`)).toHaveTextContent(f.pin);
    });
    expect(container.querySelector('[data-trail="done"]')).toBeInTheDocument();
    expect(kept()['the-year-that-is-missing']![5]).toBe(3);
    expect(container.querySelector('[data-proof="motive"]')).toHaveAttribute('data-state', 'new');
    expect(screen.getByRole('link', { name: 'Weigh the accounts' })).toHaveAttribute('href', '/case/the-year-that-is-missing/6');
  });

  it('a find put in the wrong place goes where it belongs, marked, and costs a star', () => {
    keep({ ...closed, 'the-year-that-is-missing': { 1: 3, 2: 3, 3: 3, 4: 3 } });
    const { container } = open('/case/the-year-that-is-missing/5');
    const first = trail.finds[0]!;
    stop((first.place + 1) % 4);
    expect(container.querySelector(`[data-stop="${first.place}"] [data-placed]`)).toHaveAttribute('data-missed', 'true');
    trail.finds.slice(1).forEach((f) => stop(f.place));
    expect(kept()['the-year-that-is-missing']![5]).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: 'Play it again' }));
    expect(container.querySelector('[data-trail="open"]')).toBeInTheDocument();
  });
});

describe('the missing step', () => {
  const before = { 'the-long-spoon': all, 'the-open-box': all, 'the-early-bus': all, 'the-year-that-is-missing': all };
  const option = (i: number) => fireEvent.click(document.querySelector(`[data-option="${i}"]`)!);

  it('the thing that fits fills the gap at a tap, and the step ends on its lead', () => {
    keep({ ...before, 'the-2-signs': { 1: 3, 2: 3 } });
    const { container } = open('/case/the-2-signs/3');
    expect(screen.getByRole('list', { name: 'What happened, in order' }).children).toHaveLength(4);
    expect(container.querySelector('[data-gap]')).toHaveAttribute('data-gap', 'open');
    option(1);
    expect(container.querySelector('[data-gap="filled"]')).toHaveTextContent('Both signs are painted over while the row is empty.');
    expect(container.querySelector('[data-option]')).toBeNull();
    expect(container.querySelector('[data-proof="chance"]')).toHaveAttribute('data-state', 'new');
    expect(screen.getByRole('link', { name: 'Go to the pot store' })).toHaveAttribute('href', '/case/the-2-signs/4');
    expect(kept()['the-2-signs']![3]).toBe(3);
  });

  it('a wrong pick is struck out and costs a star, and after 2 the gap is filled anyway', () => {
    keep({ ...before, 'the-2-signs': { 1: 3, 2: 3 } });
    const { container } = open('/case/the-2-signs/3');
    option(0);
    expect(container.querySelector('[data-option="0"]')).toBeDisabled();
    expect(container.querySelector('[data-tries]')).toHaveAttribute('data-tries', '1');
    option(2);
    expect(container.querySelector('[data-chain="done"]')).toBeInTheDocument();
    expect(container.querySelector('[data-gap="filled"]')).toHaveTextContent('Both signs are painted over');
    expect(kept()['the-2-signs']![3]).toBe(1);
  });

  it('the line-up of a case where nothing was taken asks its own question', () => {
    keep({ ...before, 'the-2-signs': { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 } });
    open('/case/the-2-signs/6');
    expect(screen.getByRole('heading', { level: 1, name: 'Who changed the 2 signs?' })).toBeInTheDocument();
  });
});
