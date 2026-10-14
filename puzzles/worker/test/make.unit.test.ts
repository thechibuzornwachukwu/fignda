// Make, one feature (BUILD_PLAN set 6): a machine draft that gives its words away is turned down, a signed in
// player is written for by Google first, and a puzzle carries only an icon from the table.

import type { AiMeta } from '../src/ai';
import { draft, LIMITS, PuzzleBody } from '../src/app';

// 4 words, each across a join, on real words: "Pat omitted" ATOM, "big old" GOLD, "a most" AMOS, "Sam ate" MATE.
const GOOD = {
  title: 'Small hours',
  paragraph: "Pat omitted the big old map. It's a most unusual day in Kenya, and she didn't mind. Then Sam ate a plum by the door.",
  words: ['atom', 'gold', 'amos', 'mate'],
};

const reply = (p: object) => async () => JSON.stringify(p);

describe('a machine draft', () => {
  it('an honest one comes through with its words', async () => {
    expect(await draft(reply(GOOD), 'night')).toMatchObject({ title: 'Small hours', dict: ['Atom', 'Gold', 'Amos', 'Mate'] });
  });

  it('one that also says a hidden word out loud is turned down', async () => {
    const plain = { ...GOOD, paragraph: `${GOOD.paragraph} The ring was gold.` };
    expect(await draft(reply(plain), 'night')).toBeNull();
  });

  it('nothing usable, broken JSON or a rude word: nothing', async () => {
    expect(await draft(async () => null, 'night')).toBeNull();
    expect(await draft(async () => '{"title":', 'night')).toBeNull();
    expect(await draft(reply({ ...GOOD, extra: 1 }), 'night')).toBeNull();
    expect(await draft(reply({ ...GOOD, words: ['atom'] }), 'night')).toBeNull();
  });

  it('who to ask first goes to the providers, and who wrote it comes back', async () => {
    const meta: AiMeta = { first: 'gemini' };
    const seen: Array<AiMeta | undefined> = [];
    const ai = async (_t: string, m?: AiMeta) => {
      seen.push(m ? { ...m } : m);
      if (m) m.provider = 'gemini';
      return JSON.stringify(GOOD);
    };
    await draft(ai, 'night', meta);
    expect(seen[0]?.first).toBe('gemini');
    expect(meta.provider).toBe('gemini');
  });
});

describe('a puzzle from Make', () => {
  const body = { title: 'Small hours', noun: 'night words', text: GOOD.paragraph, words: GOOD.words };

  it('takes an icon from the table, or none', () => {
    expect(PuzzleBody.safeParse(body).success).toBe(true);
    expect(PuzzleBody.safeParse({ ...body, icon: 'Music' }).success).toBe(true);
    expect(PuzzleBody.safeParse({ ...body, icon: 'Shapes' }).success).toBe(true);
    for (const icon of ['Skull', '', 'music', '<svg>', 'A'.repeat(41), 7]) expect(PuzzleBody.safeParse({ ...body, icon }).success, String(icon)).toBe(false);
  });

  it('drafts and puzzles share 1 limit of 20 an hour', () => {
    expect(LIMITS.makePerHour).toBe(20);
    expect(LIMITS).not.toHaveProperty('puzzlesPerHour');
    expect(LIMITS).not.toHaveProperty('userGeneratePerHour');
  });
});
