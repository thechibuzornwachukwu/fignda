// @vitest-environment jsdom
// The first minute (BUILD_PLAN 3b). The step rules are tested in src/lib/onboarding.test.ts; this is what a player sees.
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import { GUEST_AVATAR_KEY } from '../avatar/guest';
import { today } from '../games/daily';
import { FLOW_KEY, LOOK_KEY } from '../lib/firstMinute';
import { Welcome } from './Welcome';

type User = { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null };
const world = vi.hoisted(() => ({
  enabled: true,
  loading: false,
  checking: false,
  user: null as User | null,
  profile: null as { id: string; name: string; handle: string } | null,
  refreshed: 0,
  saved: [] as Array<{ id: string; name: string; handle: string }>,
  saveResult: null as string | null,
  taken: [] as string[],
}));

vi.mock('../lib/auth', () => ({
  useAuth: () => ({
    enabled: world.enabled,
    loading: world.loading,
    checking: world.checking,
    session: world.user ? { user: world.user } : null,
    email: world.user?.email ?? null,
    profile: world.profile,
    refreshProfile: async () => {
      world.refreshed += 1;
      return world.profile;
    },
  }),
}));
vi.mock('../avatar/store', () => ({ avatarCodeOf: () => undefined, subscribeAvatars: () => () => {}, setAvatarCode: () => {} }));
vi.mock('../lib/api', () => ({
  saveProfile: async (p: { id: string; name: string; handle: string }) => {
    world.saved.push(p);
    return world.saveResult;
  },
  fetchProfileByHandle: async (h: string) => (world.taken.includes(h) ? { id: 'x', name: 'X', handle: h, created_at: '' } : null),
  saveAvatar: async () => true,
  saveLook: async () => true,
  fetchLook: async () => null,
  fetchPoints: async () => null,
}));

const DAILY = `/d/${today().n}`;

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

function open(at = '/welcome') {
  return render(
    <MemoryRouter initialEntries={[at]}>
      <Routes>
        <Route path="/welcome" element={<Welcome />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

const h1 = () => screen.getByRole('heading', { level: 1 });
const ring = () => screen.getByRole('progressbar');
const where = () => screen.getByTestId('where').textContent;
const stored = () => JSON.parse(localStorage.getItem(FLOW_KEY) ?? '{}') as Record<string, unknown>;
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

/** One heading, a ring that says where the player is, a way to skip, and nothing that reads like a missing value. */
function expectStep(title: string | RegExp, label: string) {
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(h1()).toHaveTextContent(title);
  expect(ring()).toHaveAccessibleName(label);
  expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
  expect(document.body.textContent ?? '').not.toMatch(/undefined|NaN|\bnull\b|\[object/);
}

beforeAll(() => {
  // jsdom has no modal dialogs. This is enough for the tree to be reachable.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});

beforeEach(() => {
  Object.assign(world, { enabled: true, loading: false, checking: false, user: null, profile: null, refreshed: 0, saved: [], saveResult: null, taken: [] });
});

describe('a new guest', () => {
  it('builds a character first, then is offered sign in, with the ring one step on', () => {
    open();
    expectStep('This is you.', 'Step 1 of 4');
    expect(ring()).toHaveAttribute('aria-valuenow', '0');
    click('Keep this look');
    expectStep('Sign in to keep it.', 'Step 2 of 4');
    expect(ring()).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    // Keeping the starter makes it theirs, and the answer survives a reload.
    expect(localStorage.getItem(GUEST_AVATAR_KEY)).toMatch(/^([a-z][0-9]{1,2})+$/);
    expect(stored()).toEqual({ character: 'done' });
  });

  it('the outfit question: the agreed words, 3 answers, and one tap ends on the daily', () => {
    localStorage.setItem(FLOW_KEY, JSON.stringify({ character: 'done', signin: 'skipped' }));
    open();
    expectStep('We believe you should look good.', 'Step 3 of 3');
    const group = screen.getByRole('group', { name: 'Who are we dressing?' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['A woman', 'A man', "I'd rather not say"]);
    expect(screen.getByText('So we pick hair and outfits that suit you. Change it any time.')).toBeInTheDocument();
    click("I'd rather not say");
    // A full answer, not a skip.
    expect(localStorage.getItem(LOOK_KEY)).toBe('mixed');
    expect(stored()).toEqual({ character: 'done', signin: 'skipped', look: 'done', done: true });
    expect(where()).toBe(DAILY);
  });

  it.each([
    ['A woman', 'feminine'],
    ['A man', 'masculine'],
  ])('%s is kept in this browser as %s', (label, value) => {
    localStorage.setItem(FLOW_KEY, JSON.stringify({ character: 'done', signin: 'skipped' }));
    open();
    click(label);
    expect(localStorage.getItem(LOOK_KEY)).toBe(value);
  });

  it('skips everything: 3 taps, nothing kept about them, and the flow ends on the daily, not a menu', () => {
    open();
    click('Skip');
    expectStep('Sign in to keep it.', 'Step 2 of 4');
    click('Skip');
    expectStep('We believe you should look good.', 'Step 3 of 3');
    click('Skip');
    expect(where()).toBe(DAILY);
    expect(localStorage.getItem(LOOK_KEY)).toBeNull();
    expect(localStorage.getItem(GUEST_AVATAR_KEY)).toBeNull();
    expect(stored()).toEqual({ character: 'skipped', signin: 'skipped', look: 'skipped', done: true });
  });

  it('leaves half way and returns: the flow opens on the step they had reached', () => {
    const first = open();
    click('Keep this look');
    first.unmount();
    open();
    expectStep('Sign in to keep it.', 'Step 2 of 4');
  });

  it.each(['{broken', '[]', '"done"', '{"character":7,"done":"yes"}', ''])('stored answers %s read as none: the flow starts at the character', (raw) => {
    localStorage.setItem(FLOW_KEY, raw);
    localStorage.setItem(GUEST_AVATAR_KEY, '<bad>');
    localStorage.setItem(LOOK_KEY, 'robot');
    open();
    expectStep('This is you.', 'Step 1 of 4');
  });

  it('who has been through it comes back to keep a score: straight to sign in, and back to that score', () => {
    localStorage.setItem(FLOW_KEY, JSON.stringify({ character: 'skipped', signin: 'skipped', look: 'skipped', done: true }));
    open('/welcome?from=%2Fplay%2Fbible');
    expect(where()).toBe('/signin?next=%2Fplay%2Fbible');
  });

  it('can say they already have an account, from the first screen', () => {
    open('/welcome?from=%2Fplay%2Fbible');
    expect(screen.getByRole('link', { name: 'Already have an account? Sign in' })).toHaveAttribute('href', '/signin?next=%2Fplay%2Fbible');
  });

  it('opens the same editor as Settings, with the outfit question in it', () => {
    open();
    click('Change it');
    const editor = screen.getByRole('dialog', { name: 'Edit your character' });
    fireEvent.click(within(editor).getByRole('tab', { name: 'Wear' }));
    fireEvent.click(within(editor).getByRole('button', { name: 'A woman' }));
    expect(localStorage.getItem(LOOK_KEY)).toBe('feminine');
    expect(within(editor).getByRole('button', { name: 'A woman' })).toHaveAttribute('aria-pressed', 'true');
    // Every outfit is still on offer.
    expect(within(editor).getByRole('button', { name: 'Outfit: Agbada' })).toBeInTheDocument();
  });

  it('sign in not set up: character, the question, the daily. No sign in step and no dead end', () => {
    world.enabled = false;
    open();
    expectStep('This is you.', 'Step 1 of 2');
    expect(screen.queryByRole('link', { name: /Sign in/ })).toBeNull();
    click('Skip');
    expectStep('We believe you should look good.', 'Step 2 of 2');
    click('A man');
    expect(where()).toBe(DAILY);
  });
});

describe('an existing player', () => {
  beforeEach(() => {
    world.user = { id: 'u1', email: 'ada@example.com' };
    world.profile = { id: 'u1', name: 'Ada', handle: 'ada' };
  });

  it('never sees a step and goes back to where they were', () => {
    open('/welcome?from=%2Fplay%2Fbible');
    expect(where()).toBe('/play/bible');
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('on a second device, with nothing stored and nowhere to return to, lands on Games', () => {
    open();
    expect(where()).toBe('/play');
  });

  it('is not shown a step while their profile is still on its way', () => {
    world.profile = null;
    world.checking = true;
    const { container } = open();
    expect(screen.queryByRole('heading')).toBeNull();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('a stored session still loading shows a busy screen, not a step', () => {
    world.user = null;
    world.profile = null;
    world.loading = true;
    const { container } = open();
    expect(screen.queryByRole('heading')).toBeNull();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });
});

describe('a new signed in player', () => {
  beforeEach(() => {
    world.user = { id: 'u2', email: 'chidi.okafor@example.com', user_metadata: {} };
  });

  it('who came in by /signin is asked for a character and the question before the name', () => {
    open('/welcome?next=%2Fs%2FABCD');
    expectStep('This is you.', 'Step 1 of 4');
    click('Keep this look');
    expectStep('We believe you should look good.', 'Step 3 of 4');
    click('A man');
    expectStep(/What should\s*we call you\?/, 'Step 4 of 4');
  });

  it('name and @handle come last, prefilled, and one tap accepts them', async () => {
    localStorage.setItem(FLOW_KEY, JSON.stringify({ character: 'done', look: 'done' }));
    open();
    expectStep(/What should\s*we call you\?/, 'Step 4 of 4');
    expect(screen.getByLabelText('Name')).toHaveValue('Chidi');
    expect(screen.getByLabelText('Handle')).toHaveValue('chidi');
    click('Start finding');
    await waitFor(() => expect(where()).toBe(DAILY));
    expect(world.saved).toEqual([{ id: 'u2', name: 'Chidi', handle: 'chidi' }]);
    // Refreshing the profile is what moves the guest character, look and dailies to the account.
    expect(world.refreshed).toBe(1);
    expect(stored().done).toBe(true);
  });

  it('ends on the page they asked for when a link brought them in', async () => {
    localStorage.setItem(FLOW_KEY, JSON.stringify({ character: 'done', look: 'done' }));
    open('/welcome?next=%2Fs%2FABCD');
    click('Start finding');
    await waitFor(() => expect(where()).toBe('/s/ABCD'));
  });

  it('a suggested handle that is taken gets a tail before they meet an error', async () => {
    world.taken = ['chidi'];
    localStorage.setItem(FLOW_KEY, JSON.stringify({ character: 'done', look: 'done' }));
    open();
    await waitFor(() => expect((screen.getByLabelText('Handle') as HTMLInputElement).value).toMatch(/^chidi_[a-z0-9]{4}$/));
    expect(screen.getByLabelText('Name')).toHaveValue('Chidi');
  });

  it('typing a name still fills the handle, and a taken handle says so and stays on the step', async () => {
    localStorage.setItem(FLOW_KEY, JSON.stringify({ character: 'done', look: 'done' }));
    world.saveResult = 'taken';
    open();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ada Obi' } });
    expect(screen.getByLabelText('Handle')).toHaveValue('ada');
    click('Start finding');
    expect(await screen.findByRole('alert')).toHaveTextContent('That handle is taken. Try another.');
    expectStep(/What should\s*we call you\?/, 'Step 4 of 4');
  });

  it.each([
    ['no email and no name', { id: 'u3', email: null, user_metadata: null }],
    ['an email with no letters', { id: 'u3', email: '1234@example.com' }],
    ['a reserved word', { id: 'u3', email: 'admin@example.com' }],
  ])('%s: the fields are still filled with something that can be saved', (_name, user) => {
    world.user = user;
    localStorage.setItem(FLOW_KEY, JSON.stringify({ character: 'done', look: 'done' }));
    open();
    expectStep(/What should\s*we call you\?/, 'Step 4 of 4');
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).not.toBe('');
    expect((screen.getByLabelText('Handle') as HTMLInputElement).value).toMatch(/^[a-z0-9._]{2,20}$/);
    expect(['admin', 'root', 'help']).not.toContain((screen.getByLabelText('Handle') as HTMLInputElement).value);
  });

  it('a Google name is the one prefilled', () => {
    world.user = { id: 'u4', email: 'x@example.com', user_metadata: { full_name: 'Ngozi Eze' } };
    localStorage.setItem(FLOW_KEY, JSON.stringify({ character: 'done', look: 'done' }));
    open();
    expect(screen.getByLabelText('Name')).toHaveValue('Ngozi Eze');
    expect(screen.getByLabelText('Handle')).toHaveValue('ngozi');
  });

  it('Skip on the name gives a neutral one, said on the screen first, and nothing from the email', async () => {
    localStorage.setItem(FLOW_KEY, JSON.stringify({ character: 'done', look: 'done' }));
    open();
    const said = screen.getByText(/^Skip and you are @reader_[a-z0-9]{4} for now\.$/).textContent!;
    click('Skip');
    await waitFor(() => expect(where()).toBe(DAILY));
    expect(world.saved).toHaveLength(1);
    expect(world.saved[0]!.name).toBe('Reader');
    expect(said).toContain(`@${world.saved[0]!.handle}`);
    expect(JSON.stringify(world.saved)).not.toMatch(/chidi|okafor/i);
  });

  it('Skip that cannot be saved still lets them play, and the name is asked again next time', async () => {
    localStorage.setItem(FLOW_KEY, JSON.stringify({ character: 'done', look: 'done' }));
    world.saveResult = 'failed';
    const first = open();
    click('Skip');
    await waitFor(() => expect(where()).toBe(DAILY));
    expect(world.refreshed).toBe(0);
    first.unmount();
    open();
    expectStep(/What should\s*we call you\?/, 'Step 4 of 4');
  });
});
