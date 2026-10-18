// @vitest-environment jsdom
// Make, one feature (BUILD_PLAN set 6): one box, a written draft that waits in the background and picks up on
// return, Hide some for me, Write it myself, a preview to change, an icon, and Publish as the player's own tap.

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

type JobState = { id: string; state: 'waiting' | 'done' | 'failed'; code: string | null; error: string | null; run: boolean };
const world = vi.hoisted(() => ({
  start: null as unknown,
  jobs: [] as unknown[],
  runs: 0,
  published: [] as unknown[],
  game: null as unknown,
}));
vi.mock('../lib/auth', () => ({
  useAuth: () => ({ enabled: true, loading: false, session: {}, profile: { id: 'u1', name: 'Ada', handle: 'ada', avatar: null } }),
}));
vi.mock('../lib/api', async (original) => ({
  ...(await original<typeof import('../lib/api')>()),
  myPuzzles: async () => [],
  startGenerate: async () => world.start,
  getGenerateJob: async () => world.jobs.shift() ?? { ok: true, job: { id: JOB, state: 'waiting', code: null, error: null, run: false } },
  runGenerateJob: async () => {
    world.runs++;
    return world.jobs.shift() ?? { ok: false, error: 'network' };
  },
  fetchCustomGame: async () => world.game,
  publishPuzzle: async (p: unknown) => {
    world.published.push(p);
    return { ok: true, code: 'ABCDEFGH' };
  },
}));

const JOB = '0b8f2c5e-1d3a-4c6b-9e7f-2a1b3c4d5e6f';
const job = (j: Partial<JobState>) => ({ ok: true, job: { id: JOB, state: 'waiting', code: null, error: null, run: false, ...j } });
const GAME = { id: 'c-abcdefgh', title: 'Market day', noun: 'food words', text: "Pat omitted the big old map. It's a most unusual day in Kenya, and she didn't mind. Then Sam ate a plum by the door.", dict: ['atom', 'gold', 'amos', 'mate'], code: 'ABCDEFGH', icon: null };

const { Make } = await import('./Make');

function show() {
  return render(
    <MemoryRouter initialEntries={['/make']}>
      <Routes>
        <Route path="/make" element={<Make />} />
        <Route path="/p/:code" element={<p>opened</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
const box = () => screen.getByLabelText('What should we hide words in?');

beforeEach(() => {
  localStorage.clear();
  world.jobs = [];
  world.runs = 0;
  world.published = [];
  world.game = GAME;
  world.start = job({ state: 'waiting', run: true });
});

describe('Make', () => {
  it('nothing typed is Surprise me; a topic is Make it; a paragraph is Hide some for me', () => {
    show();
    expect(screen.getByRole('button', { name: 'Surprise me' })).toBeInTheDocument();
    fireEvent.change(box(), { target: { value: 'football' } });
    expect(screen.getByRole('button', { name: 'Make it' })).toBeInTheDocument();
    fireEvent.change(box(), { target: { value: GAME.text } });
    expect(screen.getByRole('button', { name: 'Hide some for me' })).toBeInTheDocument();
  });

  it('a topic is written in the background, kept for a return, and lands as a draft to change, with the icon of its topic', async () => {
    world.jobs = [job({ state: 'waiting', run: true }), job({ state: 'done', code: 'ABCDEFGH' })];
    show();
    fireEvent.change(box(), { target: { value: 'football' } });
    fireEvent.click(screen.getByRole('button', { name: 'Make it' }));
    expect(await screen.findByLabelText('Title')).toHaveValue('Market day');
    expect(world.runs).toBe(1);
    expect(localStorage.getItem('gazecraft-make-job')).toBeNull();
    expect(screen.getByRole('radio', { name: 'Goal' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Another go' })).toBeInTheDocument();
  });

  it('a wait left half way picks up on return', async () => {
    localStorage.setItem('gazecraft-make-job', JSON.stringify({ id: JOB, topic: 'football' }));
    world.jobs = [job({ state: 'done', code: 'ABCDEFGH' })];
    show();
    expect(await screen.findByLabelText('Title')).toHaveValue('Market day');
  });

  it('Publish sends the draft as edited, with the icon picked, and opens the puzzle', async () => {
    world.jobs = [job({ state: 'done', code: 'ABCDEFGH' })];
    show();
    fireEvent.change(box(), { target: { value: 'football' } });
    fireEvent.click(screen.getByRole('button', { name: 'Make it' }));
    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'Small hours' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Music' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish puzzle' }));
    expect(await screen.findByText('opened')).toBeInTheDocument();
    expect(world.published).toEqual([{ title: 'Small hours', noun: 'food words', text: GAME.text, words: ['atom', 'gold', 'amos', 'mate'], icon: 'Music' }]);
  });

  it('fewer than 4 hidden words publishes nothing', async () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Write it myself' }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Short' } });
    fireEvent.change(screen.getByLabelText('What is hidden'), { target: { value: 'words' } });
    fireEvent.change(screen.getByLabelText(/^Paragraph/), { target: { value: GAME.text } });
    fireEvent.change(screen.getByLabelText(/^Hidden words/), { target: { value: 'atom, gold' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish puzzle' }));
    expect(await screen.findByText('Hide at least 4 words. 2 so far.')).toBeInTheDocument();
    expect(world.published).toEqual([]);
  });

  it('the limit reached says when to try again, and a session that ran out says to sign in again', async () => {
    world.start = { ok: false, error: 'rate_limited', retryAfter: 600 };
    show();
    fireEvent.change(box(), { target: { value: 'football' } });
    fireEvent.click(screen.getByRole('button', { name: 'Make it' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('10 minutes');
    world.start = { ok: false, error: 'bad_token' };
    fireEvent.click(screen.getByRole('button', { name: 'Make it' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Sign in again, then try once more.'));
  });

  it('a draft that could not be written leaves the topic in the box and says so', async () => {
    world.jobs = [job({ state: 'failed', error: 'generate_failed' })];
    show();
    fireEvent.change(box(), { target: { value: 'football' } });
    fireEvent.click(screen.getByRole('button', { name: 'Make it' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(box()).toHaveValue('football');
  });

  it('emoji we do not know: the box asks for a word, and nothing is sent', async () => {
    let asked = false;
    world.start = new Proxy({}, { get: () => (asked = true) });
    show();
    fireEvent.change(box(), { target: { value: '🫥' } });
    fireEvent.click(screen.getByRole('button', { name: 'Make it' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Add a word beside it.');
    expect(asked).toBe(false);
  });

  it('Hide some for me finds the words already hidden in a paragraph, and the player names it', async () => {
    show();
    fireEvent.change(box(), { target: { value: GAME.text } });
    fireEvent.click(screen.getByRole('button', { name: 'Hide some for me' }));
    const words = (await screen.findByLabelText(/^Hidden words/)) as HTMLTextAreaElement;
    expect(words.value.split(', ').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByLabelText('Title')).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Another go' })).toBeNull();
  });
});
