import { existsSync } from 'node:fs';
import rawGroups from '../../data/groups.json';
import rawLiar from '../../data/liar.json';
import { games, getPassage, getPuzzle, SPECIAL_SOURCES } from '../games/catalog';
import { evalGroups, evalLiar, evalRelay, evalSums } from './evaluate';
import { buildGroups, decodePick, encodePick, groupsClue, GROUPS_MIN_LETTERS, type GroupBoard } from './groups';
import { buildLiar, liarClue, LIAR_SHOWN, type Statement } from './liar';
import { buildRelay, chainsIn } from './relay';
import { buildSeries, seriesClue, seriesIn, SERIES_LEVELS } from './series';
import { LIAR_N, RELAY_N, SERIES_N, specialClues } from './specials';
import { toChars } from './text';

const none = new Set<string>();

describe('number series', () => {
  it('finds each run that steps evenly, whole, and never a repeat or a big jump', () => {
    expect(seriesIn([1, 3, 5, 7, 2, 2, 2, 9, 6, 3, 0, 1, 8])).toEqual([[0, 3], [7, 10]]);
    expect(seriesIn([1, 6, 1, 6])).toEqual([]);
  });

  it('every level hides exactly its count, the same on every device', () => {
    SERIES_LEVELS.forEach((lv, level) => {
      for (const seed of ['bible~33', 'science~33', 'x', 'y']) {
        const def = seriesClue(seed, level);
        expect(def).toEqual(seriesClue(seed, level));
        const p = buildSeries(def);
        expect(p.S).toHaveLength(lv.digits);
        expect(p.answers).toHaveLength(lv.runs);
      }
    });
  });

  it('the exact run is a hit, one digit short is close', () => {
    const p = buildSeries({ text: '4 1 3 5 7 0', dict: [] });
    expect(p.answers.map((a) => a.label)).toEqual(['1 3 5 7 (+2)']);
    expect(evalSums(p, 1, 4, none)).toMatchObject({ kind: 'hit' });
    expect(evalSums(p, 1, 3, none)).toEqual({ kind: 'close' });
  });
});

describe('relay', () => {
  const words = new Set(['kept', 'tap', 'pet', 'term', 'mine', 'the', 'end']);
  it('links share their joining letter, and the longest chain wins', () => {
    const S = toChars('Dani kept a pet ermine in a box.').S;
    expect(chainsIn(S, words).map((c) => c.links)).toEqual([['kept', 'tap', 'pet', 'term', 'mine']]);
  });

  it('the whole chain is a hit; a link short is close; elsewhere is wrong', () => {
    const p = buildRelay({ text: 'Dani kept a pet ermine in a box.', dict: ['kept+tap+pet+term+mine'] });
    const [a, b] = p.answers[0]!.spans[0]!;
    expect(p.answers[0]!.label).toBe('Kept · Tap · Pet · Term · Mine');
    expect(evalRelay(p, a, b, none)).toMatchObject({ kind: 'hit' });
    expect(evalRelay(p, a, b - 4, none)).toEqual({ kind: 'close' });
    expect(evalRelay(p, 0, 2, none)).toEqual({ kind: 'wrong' });
  });
});

describe('liar', () => {
  const bank = (rawLiar as unknown as Record<string, Statement[]>).Science!;

  it('shows 5 statements, 1 or 2 of them false, the same for the same seed', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e']) {
      const def = liarClue(bank, seed)!;
      expect(def).toEqual(liarClue(bank, seed));
      const shown = bank.filter((x) => def.text.includes(x.s));
      expect(shown).toHaveLength(LIAR_SHOWN);
      expect(def.dict).toEqual(shown.filter((x) => !x.t).sort((x, y) => def.text.indexOf(x.s) - def.text.indexOf(y.s)).map((x) => x.s));
      expect([1, 2]).toContain(def.dict.length);
    }
  });

  it('a tap inside a false statement marks all of it; one inside a true one is wrong', () => {
    const p = buildLiar({ text: 'Bats are mammals. A whale is a kind of fish.', dict: ['A whale is a kind of fish.'] });
    const [a, b] = p.answers[0]!.spans[0]!;
    expect(p.S.slice(a, b + 1)).toBe('awhaleisakindoffish');
    expect(evalLiar(p, a + 3, a + 3, none)).toEqual({ kind: 'hit', key: p.answers[0]!.key, label: 'A whale is a kind of fish.', span: [a, b] });
    expect(evalLiar(p, 0, 0, none)).toEqual({ kind: 'wrong' });
    expect(evalLiar(p, a + 3, a + 3, new Set([p.answers[0]!.key]))).toEqual({ kind: 'already' });
  });

  it('every category has enough of both kinds, and every statement ends its sentence', () => {
    for (const [cat, list] of Object.entries(rawLiar as Record<string, unknown>)) {
      if (!Array.isArray(list)) continue;
      const l = list as Statement[];
      expect(l.filter((x) => !x.t).length, cat).toBeGreaterThanOrEqual(2);
      expect(l.filter((x) => x.t).length, cat).toBeGreaterThanOrEqual(LIAR_SHOWN - 1);
      for (const x of l) expect(x.s, cat).toMatch(/^[A-Z].*\.$/);
    }
  });
});

describe('specials in the packs', () => {
  it('every cut pack has a Liar and a Series, and the clue the catalog serves is the one the server builds', () => {
    for (const g of games) {
      const sp = specialClues(getPuzzle(g.id)!, g.id, g.category, SPECIAL_SOURCES);
      const cut = getPassage(g.id, 1);
      if (!cut) {
        expect(sp.size).toBe(0);
        continue;
      }
      expect(sp.has(LIAR_N) && sp.has(SERIES_N), g.id).toBe(true);
      for (const [n, def] of sp) expect(getPassage(g.id, n)?.def.text, `${g.id}~${n}`).toBe(def.text);
    }
    expect(games.some((g) => specialClues(getPuzzle(g.id)!, g.id, g.category, SPECIAL_SOURCES).has(RELAY_N))).toBe(true);
  });
});

describe('groups', () => {
  it('every pick of 4 tiles has its own (a, b), and it comes back the same', () => {
    const seen = new Set<string>();
    for (let a = 0; a < 16; a++) for (let b = a + 1; b < 16; b++) for (let c = b + 1; c < 16; c++) for (let d = c + 1; d < 16; d++) {
      const [x, y] = encodePick([d, b, a, c]);
      seen.add(`${x},${y}`);
      expect(decodePick(x, y)).toEqual([a, b, c, d]);
    }
    expect(seen.size).toBe(1820);
    expect(decodePick(39, 46)).toBeNull();
  });

  it('a whole set is a hit, 3 of a set is one away, anything else is wrong', () => {
    const boards = (rawGroups as unknown as Record<string, GroupBoard[]>).General!;
    const p = buildGroups(groupsClue(boards, 'x')!);
    const tiles = p.text.split('\n');
    const at = (ws: string[]) => ws.map((w) => tiles.indexOf(w));
    const [a, b] = encodePick(at(['Apple', 'Banana', 'Grapes', 'Watermelon']));
    expect(evalGroups(p, a, b, none)).toMatchObject({ kind: 'hit', key: 'fruit' });
    expect(evalGroups(p, ...encodePick(at(['Apple', 'Banana', 'Grapes', 'Lion'])), none)).toEqual({ kind: 'close' });
    expect(evalGroups(p, ...encodePick(at(['Apple', 'Banana', 'Lion', 'Sun'])), none)).toEqual({ kind: 'wrong' });
  });

  it('every board in the data is 4 sets of 4 different pictures, with letters enough for every pick', () => {
    const icons = (rawGroups as { icons: Record<string, string> }).icons;
    for (const [cat, list] of Object.entries(rawGroups as Record<string, unknown>)) {
      if (!Array.isArray(list)) continue;
      for (const board of list as GroupBoard[]) {
        const words = board.flatMap((g) => g.words);
        expect(board, cat).toHaveLength(4);
        expect(new Set(words.map((w) => w.toLowerCase())).size, cat).toBe(16);
        expect(words.join('').replace(/[^a-z]/gi, '').length, cat).toBeGreaterThanOrEqual(GROUPS_MIN_LETTERS);
        expect(buildGroups(groupsClue([board], cat)!).answers, cat).toHaveLength(4);
        // Every word is played as its picture, and the picture is in the build.
        for (const w of words) expect(existsSync(`public/icons/fluent/${icons[w]}.webp`), `${cat}: ${w}`).toBe(true);
      }
    }
  });
});
