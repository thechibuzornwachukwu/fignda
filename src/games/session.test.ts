import { getPuzzle } from './catalog';
import { registry } from './registry';
import { applyFinish, applyHint, applyPick, isLogged, newSession, type Copy, type Session } from './session';

const mod = registry['hidden-words'];
const bible = getPuzzle('bible')!;
const total = bible.answers.length;

const copy: Copy = {
  pick: (k) => `pick:${k}`,
  onFound: (c) => `found:${c.word}:${c.streak}`,
  resultTitle: (f, t) => `title:${f}/${t}`,
};

const spanOf = (word: string): [number, number] => {
  const i = bible.S.indexOf(word);
  return [i, i + word.length - 1];
};

function pick(s: Session, a: number, b: number, opts: { daily?: boolean; now?: number } = {}) {
  const found = new Set(s.found.map((f) => f.key));
  return applyPick(s, mod.check(bible, a, b, found), { now: opts.now ?? 1000, total, daily: !!opts.daily, copy });
}

describe('session transitions', () => {
  it('hit records the selected span in find order and builds the streak', () => {
    let s = newSession(0);
    s = pick(s, ...spanOf('amos'));
    s = pick(s, ...spanOf('mark'));
    expect(s.found.map((f) => f.label)).toEqual(['Amos', 'Mark']);
    expect(s.found[0]!.span).toEqual(spanOf('amos'));
    expect(s.streak).toBe(2);
    expect(s.msg).toBe('found:Mark:2');
  });

  it('reversed selection still records a forward span', () => {
    const [a, b] = spanOf('amos');
    expect(pick(newSession(0), b, a).found[0]!.span).toEqual([a, b]);
  });

  it('already found', () => {
    const s = pick(newSession(0), ...spanOf('amos'));
    expect(pick(s, ...spanOf('amos')).msg).toBe('pick:already');
  });

  it('only real picks go in the play log: a repeat would make the server refuse the play', () => {
    const [a, b] = spanOf('amos');
    expect(isLogged(mod.check(bible, a, b, new Set()))).toBe(true);
    expect(isLogged(mod.check(bible, a, b, new Set(['amos'])))).toBe(false);
    expect(isLogged(mod.check(bible, a, a + 1, new Set()))).toBe(false);
    expect(isLogged({ kind: 'wrong' })).toBe(true);
    expect(isLogged({ kind: 'close' })).toBe(true);
  });

  it('wrong resets the streak; only the daily counts misses', () => {
    let s = pick(newSession(0), ...spanOf('amos'));
    const wrong = [0, 4] as const; // "there"
    const free = pick(s, ...wrong);
    expect(free).toMatchObject({ streak: 0, misses: 0, msg: 'pick:wrong' });
    s = pick(s, ...wrong, { daily: true });
    expect(s).toMatchObject({ streak: 0, misses: 1, msg: 'pick:wrongDaily' });
  });

  it('near miss costs nothing', () => {
    const [a, b] = spanOf('amos');
    const s = pick(newSession(0), a, b + 1, { daily: true }); // "amost"
    expect(s).toMatchObject({ misses: 0, msg: 'pick:close' });
  });

  it('under 3 letters is ignored', () => {
    expect(pick(newSession(0), 0, 1).msg).toBe('');
  });

  it('hint marks the first letter of the earliest unfound answer and resets the streak', () => {
    let s = pick(newSession(0), ...spanOf('amos'));
    s = applyHint(s, mod.hint(bible, new Set(['amos'])), copy);
    const second = bible.answers[1]!;
    expect(s).toMatchObject({ hints: 1, hintLi: second.spans[0]![0], streak: 0, msg: 'pick:hint' });
    expect(s.hinted).toEqual([second.key]);
  });

  it('finding the hinted word clears the mark', () => {
    let s = applyHint(newSession(0), mod.hint(bible, new Set()), copy);
    expect(s.hintLi).toBe(spanOf('amos')[0]);
    s = pick(s, ...spanOf('amos'));
    expect(s.hintLi).toBe(-1);
  });

  it('last find finishes and fixes the title', () => {
    let s = newSession(0);
    for (const a of bible.answers) s = pick(s, ...a.spans[0]!, { now: 5000 });
    expect(s.endAt).toBe(5000);
    expect(s.resultTitle).toBe(`title:${total}/${total}`);
    expect(pick(s, ...spanOf('amos'))).toBe(s);
  });

  it("I'm done finishes with the current count", () => {
    const s = applyFinish(pick(newSession(0), ...spanOf('amos')), 9000, total, copy);
    expect(s).toMatchObject({ endAt: 9000, resultTitle: `title:1/${total}`, hintLi: -1 });
  });

  it('missed spans cover every unfound answer after finish', () => {
    expect(mod.missed(bible, new Set(['amos']))).toHaveLength(total - 1);
  });
});
