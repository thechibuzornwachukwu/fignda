// Player-made puzzles against the local Supabase stack.

import { createClient } from '@supabase/supabase-js';
import { makeProfile, makeUser, uniqueHandle, type TestUser } from '../../supabase/tests/helpers';
import { handle, type Deps } from '../src/app';

const APP = 'http://localhost:5173';
const db = createClient(process.env.SB_URL!, process.env.SB_SERVICE!, { auth: { persistSession: false } });
const anon = createClient(process.env.SB_URL!, process.env.SB_ANON!, { auth: { persistSession: false } });
const deps: Deps = { db, ai: null, origins: [APP] };

const post = (body: unknown, u?: TestUser) =>
  handle(
    new Request('http://api.test/api/puzzles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: APP, ...(u ? { Authorization: `Bearer ${u.token}` } : {}) },
      body: JSON.stringify(body),
    }),
    deps,
  );

const TEXT = 'It was a most ordinary day until Pat omitted the big old key from each drawer in the house.';
const good = { title: 'House keys', noun: 'short words', text: TEXT, words: ['Amos', 'Atom', 'Gold', 'Rome'] };

async function player(tag: string) {
  const u = await makeUser(tag);
  const h = uniqueHandle(tag);
  await makeProfile(u, tag, h);
  return { u, h };
}

describe('POST /api/puzzles', () => {
  it('signed in players publish a puzzle the engine agrees with; anyone with the link can open it', async () => {
    const ada = await player('mada');
    expect((await post(good)).status).toBe(401);
    const r = await post(good, ada.u);
    expect(r.status).toBe(200);
    const out = (await r.json()) as { code: string; dict: string[]; title: string };
    expect(out.code).toMatch(/^[A-Z2-7]{8}$/);
    expect(out.dict).toEqual(['Amos', 'Atom', 'Gold', 'Rome']);

    const opened = await anon.rpc('get_game_by_code', { p_code: out.code });
    expect(opened.data).toHaveLength(1);
    expect(opened.data[0]).toMatchObject({ title: 'House keys', noun: 'short words', category: 'Player made', text: TEXT });
    const row = await db.from('games').select('owner_id, kind').eq('share_code', out.code).single();
    expect(row.data).toEqual({ owner_id: ada.u.id, kind: 'custom' });
  });

  it.each([
    ['a word that is not in the text', { ...good, words: [...good.words, 'Zebra'] }, 422, 'not_hidden'],
    ['a word in plain sight', { ...good, words: [...good.words, 'house'] }, 422, 'not_hidden'],
    ['too few words', { ...good, words: ['Amos', 'Atom', 'Gold'] }, 400, 'bad_request'],
    ['a paragraph that is too short', { ...good, text: 'a most Pat omitted' }, 400, 'bad_request'],
    ['a paragraph that is too long', { ...good, text: `${TEXT} `.repeat(12) }, 400, 'bad_request'],
    ['words with spaces or digits', { ...good, words: ['Amos', 'Atom', 'Gold', 'Ro me'] }, 400, 'bad_request'],
    ['rude text', { ...good, title: 'shit keys' }, 422, 'not_allowed'],
    ['extra fields', { ...good, owner_id: 'someone', kind: 'curated' }, 400, 'bad_request'],
  ])('refuses %s', async (_, body, status, error) => {
    const ada = await player('mbad');
    const r = await post(body, ada.u);
    expect(r.status).toBe(status);
    expect(((await r.json()) as { error: string }).error).toBe(error);
    expect((await db.from('games').select('id').eq('owner_id', ada.u.id)).data).toEqual([]);
  });

  it('names the words that are not hidden', async () => {
    const ada = await player('mwhy');
    const r = await post({ ...good, words: [...good.words, 'Zebra', 'house'] }, ada.u);
    expect(await r.json()).toEqual({ error: 'not_hidden', words: ['Zebra', 'house'] });
  });

  it('control characters never reach the stored text', async () => {
    const ada = await player('mctl');
    const r = await post({ ...good, title: 'House\u0000 keys​', text: `${TEXT}\u0007` }, ada.u);
    const out = (await r.json()) as { title: string; text: string };
    expect(out.title).toBe('House keys');
    expect(out.text).toBe(TEXT);
  });
});

describe('ratings and the maker list', () => {
  it('one thumb per player, never on your own, and the maker sees how it is doing', async () => {
    const [ada, bisi, chidi] = [await player('rada'), await player('rbisi'), await player('rchidi')];
    const { code } = (await (await post(good, ada.u)).json()) as { code: string };

    expect((await ada.u.client.rpc('rate_puzzle', { p_code: code, p_up: true })).data).toBe(false);
    expect((await anon.rpc('rate_puzzle', { p_code: code, p_up: true })).error).not.toBeNull();
    expect((await bisi.u.client.rpc('rate_puzzle', { p_code: code, p_up: true })).data).toBe(true);
    expect((await chidi.u.client.rpc('rate_puzzle', { p_code: code, p_up: true })).data).toBe(true);
    // Changing your mind replaces your thumb.
    expect((await chidi.u.client.rpc('rate_puzzle', { p_code: code, p_up: false })).data).toBe(true);
    expect((await bisi.u.client.rpc('rate_puzzle', { p_code: 'ZZZZZZZZ', p_up: true })).data).toBe(false);

    expect((await anon.rpc('puzzle_rating', { p_code: code })).data).toEqual([{ ups: 1, downs: 1, mine: null, maker: ada.h, own: false }]);
    expect((await chidi.u.client.rpc('puzzle_rating', { p_code: code })).data).toEqual([{ ups: 1, downs: 1, mine: false, maker: ada.h, own: false }]);
    expect((await ada.u.client.rpc('puzzle_rating', { p_code: code })).data[0]).toMatchObject({ own: true });

    const mine = (await ada.u.client.rpc('my_puzzles')).data as Array<Record<string, unknown>>;
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ code, title: 'House keys', words: 4, plays: 0, ups: 1, downs: 1 });
    expect((await bisi.u.client.rpc('my_puzzles')).data).toEqual([]);
    expect((await bisi.u.client.from('puzzle_ratings').select('*')).data ?? []).toEqual([]);
    expect((await bisi.u.client.from('puzzle_ratings').insert({ game_id: `c-${code.toLowerCase()}`, user_id: bisi.u.id, up: true })).error).not.toBeNull();
  });
});
