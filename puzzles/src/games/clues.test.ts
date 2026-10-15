import { buildPath, caseOrder, clueKind, MIRROR_N, SUMS_FROM } from '../engine/journey';
import { HINT_OF, mixedSquad, PARTNERS } from '../engine/partners';
import { games, getPassage, getPuzzle, MIRROR_WORDS } from './catalog';
import { familyOf, registry } from './registry';

describe('the rhythm of a pack', () => {
  it('is word, word, number, word, then Mirror, and nothing after it', () => {
    expect(caseOrder(1)).toEqual([0]);
    expect(caseOrder(2)).toEqual([1, 2, 21]);
    expect(caseOrder(3, true)).toEqual([1, 2, 21, 3, 31]);
    expect(caseOrder(6)).toEqual([1, 2, 21, 3, 4, 5, 22, 6]);
    expect([0, 1, 19, 21, 29, 31, 40].map(clueKind)).toEqual(['whole', 'words', 'words', 'sums', 'sums', 'mirror', 'words']);
    expect(familyOf('hidden-words')).toBe('verbal');
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
    expect(Math.max(...long)).toBe(MIRROR_N);
    expect(long.at(-1)).toBe(MIRROR_N);
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

describe('no story', () => {
  it('no pack has an unmasking, and no clue number past the Mirror opens anything', () => {
    for (const g of games) for (const n of [32, 39, 40]) expect(getPassage(g.id, n)).toBeUndefined();
    expect(Object.keys(registry).sort()).toEqual(['buried-sums', 'hidden-words', 'mirror']);
  });
});
