import { checkDraft, splitWords } from './make';

// "a most" hides AMOS, "Pat omitted" hides ATOM, "big old" hides GOLD, "from each" hides ROME.
const TEXT = 'It was a most ordinary day until Pat omitted the big old key from each drawer in the house.';

describe('checkDraft', () => {
  it('accepts words that run across word boundaries', () => {
    const d = checkDraft(TEXT, ['Amos', 'Atom', 'Gold', 'Rome']);
    expect(d.words.map((w) => w.state)).toEqual(['hidden', 'hidden', 'hidden', 'hidden']);
    expect(d.ok).toBe(true);
  });

  it('says why each other word does not count', () => {
    const d = checkDraft(TEXT, ['Amos', 'Zebra', 'house', 'amos', 'ab', 'two words']);
    expect(d.words).toEqual([
      { word: 'Amos', state: 'hidden' },
      { word: 'Zebra', state: 'missing' },
      // Whole inside one word of the text: in plain sight.
      { word: 'house', state: 'plain' },
      { word: 'amos', state: 'repeat' },
      { word: 'ab', state: 'bad' },
      { word: 'two words', state: 'bad' },
    ]);
    expect(d.ok).toBe(false);
  });

  it('needs 4 hidden words and a real paragraph', () => {
    expect(checkDraft(TEXT, ['Amos', 'Atom', 'Gold']).ok).toBe(false);
    expect(checkDraft('a most Pat omitted big old from each', ['Amos', 'Atom', 'Gold', 'Rome']).ok).toBe(false);
  });
});

describe('splitWords', () => {
  it('takes commas and new lines', () => {
    expect(splitWords(' Amos, Atom\nGold ,, \n Rome ')).toEqual(['Amos', 'Atom', 'Gold', 'Rome']);
  });
});
