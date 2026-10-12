import { buildPath, caseOrder, clueKind, MIRROR_N, SUMS_FROM, UNMASK_N } from '../engine/journey';
import { HINT_OF, mixedSquad, PARTNERS } from '../engine/partners';
import { POOLS } from '../copy';
import { ALPHABET, bankOf, givenOf, UNMASK_DECOYS, UNMASK_TRIES, unmaskClue, unmaskGiven, unmaskName, unmaskSlots, withinTries } from '../engine/unmask';
import { caseFile, secretOf } from './caseFile';
import { culpritName, games, getPassage, getPuzzle, MIRROR_WORDS } from './catalog';
import { familyOf, registry } from './registry';

describe('the rhythm of a case', () => {
  it('is word, word, number, word, then Mirror, then the unmasking', () => {
    expect(caseOrder(1)).toEqual([0]);
    expect(caseOrder(2)).toEqual([1, 2, 21, 40]);
    expect(caseOrder(3, true)).toEqual([1, 2, 21, 3, 31, 40]);
    expect(caseOrder(6)).toEqual([1, 2, 21, 3, 4, 5, 22, 6, 40]);
    expect([0, 1, 19, 21, 29, 31, 40].map(clueKind)).toEqual(['whole', 'words', 'words', 'sums', 'sums', 'mirror', 'unmask']);
    expect(familyOf('unmask')).toBe('verbal');
    expect(familyOf('buried-sums')).toBe('quantitative');
    expect(familyOf('mirror')).toBe('verbal');
  });

  it('every catalogue case follows it, and every clue on the path can be played', () => {
    const path = buildPath(games, MIRROR_WORDS);
    const seen: string[] = [];
    let sums = 0;
    let mirrors = 0;
    for (const c of path.cases) {
      const cut = getPassage(c.id, 1)?.part.count ?? 0;
      const ns = c.clues.map((x) => x.n);
      expect(ns).toEqual(caseOrder(cut, ns.includes(MIRROR_N)));
      // The account keeps a clue under a number from 1 to 40.
      expect(Math.max(...ns)).toBeLessThanOrEqual(40);
      expect(cut).toBeLessThan(SUMS_FROM - 1);
      ns.forEach((n, i) => {
        const clue = getPassage(c.id, n)!;
        expect(clue.part).toEqual({ n, count: cut, at: i + 1, of: ns.length, next: ns[i + 1] ?? 0 });
        const built = registry[clue.def.type].build(clue.def);
        expect(built.answers.length, `${c.id}~${n}`).toBeGreaterThanOrEqual(3);
        if (clueKind(n) === 'sums') sums++;
        if (clueKind(n) === 'mirror') {
          mirrors++;
          expect(getPuzzle(c.id)!.text).toContain(clue.def.text.slice(0, 40));
          seen.push(`${c.id}: ${clue.def.dict.join(' ')} (${built.S.length} letters)`);
        }
      });
      expect(getPassage(c.id, 99)).toBeUndefined();
    }
    if (process.env.LOOK) console.log(seen.join('\n'), '\n', sums, 'sums clues,', mirrors, 'mirror clues,', path.cases.length, 'cases');
    expect(sums).toBeGreaterThanOrEqual(path.cases.length);
    expect(mirrors).toBeGreaterThan(0);
  });

  it('gives a case the secret it had before the new clues joined: a piece per passage and one for the unmasking', () => {
    for (const g of games) expect(secretOf(g.id)!.pieces.length).toBe((getPassage(g.id, 1)?.part.count ?? 0) + 1);
  });
});

describe('what a pet does', () => {
  it('every pet has its own way of choosing a hint', () => {
    expect(new Set(PARTNERS.map((p) => HINT_OF[p.id])).size).toBe(PARTNERS.length);
    expect(HINT_OF.cat).toBe('first');
  });

  it('a squad is mixed when 2 or more players each bring a different pet', () => {
    expect(mixedSquad(['cat', 'dog'])).toBe(2);
    expect(mixedSquad(['cat', 'dog', 'robot', 'dino'])).toBe(4);
    expect(mixedSquad(['cat', 'cat'])).toBe(0);
    expect(mixedSquad(['cat'])).toBe(0);
    expect(mixedSquad(['cat', undefined])).toBe(0);
    expect(mixedSquad(['cat', 'dragon'])).toBe(0);
  });

  it('a Mirror hint marks the last letter of the span, where the word starts', () => {
    const p = registry.mirror.build({ id: 'x', type: 'mirror', category: 'c', title: 't', noun: 'n', difficulty: 'Easy', expectedAnswers: [], dict: ['rats'], text: 'Go dash to the star, Tab.' });
    expect(registry.mirror.hint(p, new Set())).toEqual({ key: 'rats', at: 14 });
  });
});

describe('edges', () => {
  it('a case of 0 or 1 passages has no extra clue, and a very long one never runs past the numbers kept for it', () => {
    expect(caseOrder(0)).toEqual([0]);
    expect(caseOrder(1, true)).toEqual([0]);
    const long = caseOrder(40, true);
    expect(long.filter((n) => clueKind(n) === 'words')).toHaveLength(19);
    expect(new Set(long).size).toBe(long.length);
    expect(long.filter((n) => n !== UNMASK_N).at(-1)).toBe(MIRROR_N);
    expect(Math.max(...long)).toBe(UNMASK_N);
    expect(long.at(-1)).toBe(UNMASK_N);
    expect(clueKind(30)).toBe('sums');
    expect(clueKind(20)).toBe('words');
  });

  it('boards that hide nothing build empty and take no pick', () => {
    const def = { id: 'x', category: 'c', title: 't', noun: 'n', difficulty: 'Easy' as const, expectedAnswers: [] };
    const none = new Set<string>();
    for (const text of ['', '   ', 'no digits here', '5']) {
      const p = registry['buried-sums'].build({ ...def, type: 'buried-sums', text, dict: ['15'] });
      expect(p.answers).toEqual([]);
      expect(registry['buried-sums'].hint(p, none)).toBeNull();
    }
    // A target that is missing or not a number hides nothing.
    for (const dict of [[], ['x'], ['0'], ['-4']]) expect(registry['buried-sums'].build({ ...def, type: 'buried-sums', text: '3 8 4 1', dict }).answers).toEqual([]);
    const sums = registry['buried-sums'].build({ ...def, type: 'buried-sums', text: '3 8 4 1', dict: ['15'] });
    expect(registry['buried-sums'].check(sums, 0, 0, none).kind).toBe('ignore');
    expect(registry['buried-sums'].check(sums, 2, 99, none).kind).toBe('wrong');
    for (const [text, dict] of [['', ['rats']], ['Go dash to the star.', []], ['Go dash to the star.', ['ab', 'level', 'tiger']], ['Émile à côté 123 !?', ['rats']]] as const) {
      const p = registry.mirror.build({ ...def, type: 'mirror', text, dict: [...dict] });
      expect(p.answers).toEqual([]);
      expect(registry.mirror.check(p, 0, 3, none).kind).not.toBe('hit');
    }
  });

  it('a hint has nothing to mark on an empty board, and a squad of nobody is not mixed', () => {
    expect(mixedSquad([])).toBe(0);
    expect(mixedSquad([undefined, undefined])).toBe(0);
  });
});

describe('the unmasking', () => {
  const board = (text: string) => registry.unmask.build({ id: 'x', type: 'unmask', category: 'c', title: 't', noun: 'letters', difficulty: 'Easy', expectedAnswers: [], dict: [], text });
  const at = (ch: string) => ALPHABET.indexOf(ch);
  const none = new Set<string>();

  it('the name to spell is who the culprit is, without "the"', () => {
    expect(unmaskName('the choir leader')).toBe('CHOIR LEADER');
    expect(unmaskName('  The neighbour from 2 doors down ')).toBe('NEIGHBOUR FROM 2 DOORS DOWN');
    for (const g of games) {
      const clue = getPassage(g.id, UNMASK_N);
      if (!clue) continue;
      expect(clue.def.text).toBe(unmaskName(culpritName(g.id)));
      expect(clue.def.text).toMatch(/^[A-Z0-9 ]{3,}$/);
      expect(clue.part.next).toBe(0);
    }
  });

  it('an answer is each letter of the name, once, and a pick is one letter of the alphabet', () => {
    const p = board('BUS DRIVER');
    expect(p.answers.map((a) => a.key).join('')).toBe('bdeirsuv');
    expect(registry.unmask.check(p, at('r'), at('r'), none)).toEqual({ kind: 'hit', key: 'r', label: 'R', span: [17, 17] });
    expect(registry.unmask.check(p, at('r'), at('r'), new Set(['r'])).kind).toBe('already');
    expect(registry.unmask.check(p, at('z'), at('z'), none).kind).toBe('wrong');
    // A drag across 2 letters, or a place past Z, is no pick.
    expect(registry.unmask.check(p, 0, 1, none).kind).toBe('ignore');
    expect(registry.unmask.check(p, 26, 26, none).kind).toBe('ignore');
    // A hint points at a letter that is in the name.
    expect(registry.unmask.hint(p, none)).toEqual({ key: 'b', at: 1 });
    expect(registry.unmask.hint(p, new Set(p.answers.map((a) => a.key)))).toBeNull();
    expect(registry.unmask.tries).toBe(UNMASK_TRIES);
  });

  it('it is made to be won: the first letter of each word is given, and the bank is the missing letters and 6 that are not in the name', () => {
    expect(unmaskGiven('BUS DRIVER')).toBe('bd');
    // 7 would be left to find, so the letter the name uses most is given too.
    expect(unmaskGiven('CHOIR LEADER')).toBe('cel');
    expect(unmaskGiven('')).toBe('');
    expect(POOLS.culpritHint).toHaveLength(POOLS.culpritWho.length);
    for (const who of POOLS.culpritWho) {
      const clue = unmaskClue(who, 'bible');
      expect(clue).toEqual(unmaskClue(who, 'bible'));
      const name = clue.text.toLowerCase();
      const given = givenOf(clue);
      const bank = [...bankOf(clue)];
      const built = registry.unmask.build({ id: 'x', type: 'unmask', category: 'c', title: 't', noun: 'letters', difficulty: 'Easy', expectedAnswers: [], text: clue.text, dict: [...clue.dict] });
      const wanted = built.answers.map((a) => a.key);
      // Every letter still to find is in the bank, no given letter is, and nothing is there twice.
      for (const ch of wanted) expect(bank, `${who}: ${ch}`).toContain(ch);
      for (const ch of given) expect(bank).not.toContain(ch);
      expect(new Set(bank).size).toBe(bank.length);
      expect(bank.filter((ch) => !name.includes(ch))).toHaveLength(UNMASK_DECOYS);
      expect(bank.join('')).toBe([...bank].sort().join(''));
      // Something is left to find, and it is short work: 6 letters at most.
      expect(wanted.length, who).toBeGreaterThanOrEqual(2);
      expect(wanted.length, who).toBeLessThanOrEqual(6);
      // Every word opens with its letter.
      const slots = unmaskSlots(clue.text, new Set(), given);
      clue.text.split(' ').reduce((at, w) => (/[A-Z]/.test(w[0]!) && expect(slots[at]).toBe(w[0]), at + w.length + 1), 0);
    }
    // Only picking every letter that is not in the name uses all the tries.
    expect(UNMASK_DECOYS).toBe(UNMASK_TRIES);
    expect(unmaskClue('the baker', 'bible').dict).not.toEqual(unmaskClue('the baker', 'lagos').dict);
  });

  it('shows the name as it stands: found letters, blanks, and anything that is not a letter', () => {
    expect(unmaskSlots('BUS GO', new Set(['o']), 'bg')).toEqual(['B', '', '', ' ', 'G', 'O']);
    expect(unmaskSlots('BUS 2 GO', new Set(['b', 'o']))).toEqual(['B', '', '', ' ', '2', ' ', '', 'O']);
    expect(unmaskSlots('', none)).toEqual([]);
  });

  it('picks after the last try do not count', () => {
    const p = board('BAKER');
    const wrong = [...'zxqjvw'].map((ch) => ({ a: at(ch), b: at(ch) }));
    const right = [...'baker'].map((ch) => ({ a: at(ch), b: at(ch) }));
    expect(withinTries(p, [...right, ...wrong])).toHaveLength(11);
    expect(withinTries(p, [...wrong, ...right])).toHaveLength(6);
    expect(withinTries(p, [...wrong.slice(0, 5), ...right, wrong[5]!, ...wrong])).toHaveLength(11);
    expect(withinTries(p, [])).toEqual([]);
  });

  it('closes the case: the last piece of the secret comes with it, as it does with the whole puzzle', () => {
    const id = games.find((g) => getPassage(g.id, UNMASK_N))!.id;
    const count = getPassage(id, 1)!.part.count;
    const passages = Array.from({ length: count }, (_, i) => `${id}~${i + 1}`);
    expect(caseFile(id, new Set(passages))!.closed).toBe(false);
    expect(caseFile(id, new Set([...passages, `${id}~${UNMASK_N}`]))!.closed).toBe(true);
    expect(caseFile(id, new Set([id]))!.closed).toBe(true);
    expect(caseFile(id, new Set(passages))!.piece(UNMASK_N).text).not.toBe('');
  });
});
