import tokens from '../styles/tokens.json';
import { games } from '../games/catalog';
import { answersFrom, puzzleCards, RATIOS, resultCard, type Ratio } from './cards';
import { excerptRange } from './excerpt';
import { buildHiddenWords } from './hiddenWords';
import { paginate } from './paginate';
import { rangeText, sentences, toChars } from './text';

const ratios = Object.keys(RATIOS) as Ratio[];
const ENDS_SENTENCE = /[.?!]["')\]]*$/;

const cases = games.flatMap((g) => ratios.map((ratio) => [g.id, ratio, g] as const));

function setup(text: string) {
  const { chars } = toChars(text);
  const sents = sentences(text, chars);
  return { chars, sents };
}

/** Length the budget is measured in: trimmed sentences joined by one space. */
const measured = (sents: ReturnType<typeof sentences>, s0: number, s1: number) =>
  sents.slice(s0, s1 + 1).reduce((n, s, i) => n + s.len + (i ? 1 : 0), 0);

describe('sentences', () => {
  it('cover the whole text in order with no gaps', () => {
    for (const g of games) {
      const { chars, sents } = setup(g.text);
      expect(sents[0]!.cs).toBe(0);
      expect(sents[sents.length - 1]!.ce).toBe(chars.length);
      for (let i = 1; i < sents.length; i++) expect(sents[i]!.cs).toBe(sents[i - 1]!.ce);
    }
  });
});

describe('excerpts', () => {
  it.each(cases)('%s %s: whole sentences within the first-page budget', (_, ratio, g) => {
    const { chars, sents } = setup(g.text);
    const answers = answersFrom(g.text, buildHiddenWords(g).answers.map((a) => a.key));
    const r = excerptRange(sents, answers, RATIOS[ratio].first, () => true)!;
    const [s0, s1] = r;
    const text = rangeText(chars, sents, s0, s1);

    // Ends on a sentence boundary (or the text's own end).
    if (s1 < sents.length - 1) expect(text).toMatch(ENDS_SENTENCE);
    // Starts on one: the text before it ends a sentence.
    if (s0 > 0) expect(rangeText(chars, sents, 0, s0 - 1)).toMatch(ENDS_SENTENCE);
    // Fits, unless one sentence is longer than the budget on its own.
    if (s0 !== s1) expect(measured(sents, s0, s1)).toBeLessThanOrEqual(RATIOS[ratio].first);
  });

  it('picks the window with the most answers', () => {
    const text = 'Nothing here. Nor here. Amos and Mark sit here.';
    const { sents } = setup(text);
    const answers = answersFrom(text, ['amos', 'mark']);
    expect(excerptRange(sents, answers, 30, () => true)).toEqual([2, 2]);
  });
});

describe('pages', () => {
  it.each(cases)('%s %s: every page respects its char budget', (_, ratio, g) => {
    const { chars, sents } = setup(g.text);
    const { first, next } = RATIOS[ratio];
    const pages = paginate(sents, first, next);

    // Contiguous, complete.
    expect(pages[0]![0]).toBe(0);
    expect(pages[pages.length - 1]![1]).toBe(sents.length - 1);
    pages.forEach(([s0, s1], p) => {
      if (p > 0) expect(s0).toBe(pages[p - 1]![1] + 1);
      const budget = p === 0 ? first : next;
      if (s0 !== s1) expect(measured(sents, s0, s1)).toBeLessThanOrEqual(budget);
      if (s1 < sents.length - 1) expect(rangeText(chars, sents, s0, s1)).toMatch(ENDS_SENTENCE);
    });
  });

  it('Bible full at 4:5 is 4 pages', () => {
    const bible = games.find((g) => g.id === 'bible')!;
    const answers = answersFrom(bible.text, buildHiddenWords(bible).answers.map((a) => a.key));
    expect(puzzleCards({ ratio: '4:5', mode: 'full', text: bible.text, answers, secs: 0 })).toHaveLength(4);
  });
});

describe('card layout', () => {
  it('budgets and sizes come from tokens.json', () => {
    for (const r of ratios) {
      expect(RATIOS[r].w).toBe(1080);
      expect(RATIOS[r].first).toBe(tokens.shareCard.charBudget[r].first);
      expect(RATIOS[r].next).toBe(tokens.shareCard.charBudget[r].next);
      expect(RATIOS[r].text).toBeGreaterThanOrEqual(tokens.shareCard.textMinPx);
    }
  });
});

describe('puzzleCards', () => {
  const text = 'Nothing here. Is a most odd? Yes. The end.';
  const answers = answersFrom(text, ['amos', 'odd']).map((a) => ({ ...a, found: a.key === 'amos' }));

  it('adds ellipses around a partial excerpt and counts what hides in view', () => {
    const filler = 'Filler words sit in this sentence to use up the budget quite fast. ';
    const long = filler.repeat(6) + 'Is a most odd? ' + filler.repeat(6);
    const ans = answersFrom(long, ['amos', 'odd', 'filler']);
    const [card, more] = puzzleCards({ ratio: '1:1', mode: 'excerpt', text: long, answers: ans, secs: 0 });
    expect(more).toBeUndefined();
    expect(card!.segs[0]!.t).toBe('…');
    expect(card!.segs[card!.segs.length - 1]!.t).toBe(' …');
    expect(card!.pline2).toMatch(/^\d+ hiding here\. \d+ more inside\.$/);
    expect(card!.ptitle).toBe('Can you find 3 words?');
  });

  it('with Show my finds, joins a found word across the space into one lit run', () => {
    const [card] = puzzleCards({ ratio: '1:1', mode: 'excerpt', text, answers, secs: 65, show: true, name: 'Ada Lovelace' });
    const lit = card!.segs.filter((s) => s.state === 1).map((s) => s.t);
    expect(lit).toEqual(['a mos']);
    expect(card!.ptitle).toBe('I found 1 of 2 words.');
    expect(card!.pline).toBe('Ada · 1/2 in 1:05');
    expect(card!.pline2).toBe('Highlighted words are answers');
  });

  it('daily hides the count', () => {
    const [card] = puzzleCards({ ratio: '1:1', mode: 'excerpt', text, answers, secs: 5, hideCount: true, noun: 'names' });
    expect(card!.ptitle).toBe('How many names can you find?');
  });
});

describe('resultCard', () => {
  const answers = answersFrom('amos and mark', ['amos', 'mark']);

  it('perfect run', () => {
    const c = resultCard({ ratio: '4:5', answers: answers.map((a) => ({ ...a, found: true })), secs: 100 });
    expect(c).toMatchObject({ badge: 'Perfect', found: '2/2 found', score: '700', hints: 'No hints', time: '1:40', name: 'Guest player' });
    expect(c.cells.map((x) => x.kind)).toEqual(['found', 'found']);
  });

  it('gave up', () => {
    const c = resultCard({ ratio: '4:5', answers, secs: 100, name: 'Ada', handle: '@ada' });
    expect(c).toMatchObject({ badge: 'Gave up', cta: 'Can you find them?', name: 'Ada', initial: 'A' });
  });

  it('daily hides unfound cells and the total', () => {
    const c = resultCard({
      ratio: '1:1',
      answers: [{ ...answers[0]!, found: true, hinted: true }, answers[1]!],
      secs: 10,
      hideCount: true,
    });
    expect(c.found).toBe('1 found');
    expect(c.cells).toEqual([{ width: 4 * 9 + 16, kind: 'hint' }]);
    expect(c.hints).toBe('1 hint');
  });
});

describe('With NAME on a card', () => {
  const answers = answersFrom('amos and mark', ['amos', 'mark']);
  const text = 'Amos and Mark went out. Then they came home.';
  const mark = { sponsor: 'With Chi Farms', sponsorHost: 'chifarms.example' };

  it('a result card carries the line and the site name', () => {
    expect(resultCard({ ratio: '4:5', answers, secs: 10, ...mark })).toMatchObject(mark);
  });

  it('every page of a puzzle card carries them, and the card shows them with the title', () => {
    const cards = puzzleCards({ ratio: '4:5', answers, secs: 10, text, mode: 'full', ...mark });
    expect(cards.length).toBeGreaterThan(0);
    for (const c of cards) expect(c).toMatchObject(mark);
  });

  it('no sponsor is two empty strings, never undefined', () => {
    expect(resultCard({ ratio: '4:5', answers, secs: 10 })).toMatchObject({ sponsor: '', sponsorHost: '' });
  });

  it('a site name with no line is dropped', () => {
    expect(resultCard({ ratio: '4:5', answers, secs: 10, sponsor: '  ', sponsorHost: 'chifarms.example' })).toMatchObject({ sponsor: '', sponsorHost: '' });
  });

  it('the score on the card is the same with or without it', () => {
    const found = answers.map((a) => ({ ...a, found: true }));
    expect(resultCard({ ratio: '4:5', answers: found, secs: 100, ...mark }).score).toBe(resultCard({ ratio: '4:5', answers: found, secs: 100 }).score);
  });
});
