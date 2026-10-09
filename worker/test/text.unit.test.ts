import { LOCAL_BLOCKED } from '../src/blocklistLocal';
import { hasHiddenProfanity, isProfane } from '../src/text';

describe('isProfane: whole words, as before', () => {
  it('catches a rude word, any case', () => {
    expect(isProfane('What the FUCK')).toBe(true);
    expect(isProfane('a title', 'Some shit here')).toBe(true);
  });
  it('lets ordinary words through', () => {
    expect(isProfane('Grapes and rapeseed oil', 'Essex, Scunthorpe, a class of 30', 'cockpit, analyst, assess')).toBe(false);
  });
});

describe('local blocklist (Pidgin, Yoruba, Igbo, Hausa)', () => {
  it('is short and plain', () => {
    expect(LOCAL_BLOCKED.length).toBeLessThanOrEqual(12);
    for (const w of LOCAL_BLOCKED) expect(w).toMatch(/^[a-z]+$/);
  });
  it.each([...LOCAL_BLOCKED])('catches %s as a whole word, in capitals too', (w) => {
    expect(isProfane(`you ${w} you`)).toBe(true);
    expect(isProfane(w.toUpperCase())).toBe(true);
  });
  it('reads past dots under letters', () => {
    expect(isProfane('akwụna')).toBe(true);
  });
  it('does not flag a word that only contains one', () => {
    expect(isProfane('karuwanci')).toBe(false);
  });
});

describe('hidden profanity across joins', () => {
  it.each([
    'He fell into the pass hole, I mean the other one.',
    'Cut it out, the ass hole said.',
    'Ruff uck, he said.',
    'Not a pa ssholes here.',
    'She had a bit ch to say.',
    'No sh it here.',
    'A slu t came by.',
    'Oh, who re the people?',
  ])('catches: %s', (t) => {
    expect(hasHiddenProfanity(t)).toBe(true);
    expect(isProfane(t)).toBe(true);
  });

  it('catches a join in the word list too (words are checked as one string)', () => {
    expect(isProfane('Title', ['ass', 'hole', 'tree'].join(' '))).toBe(true);
    expect(isProfane('Title', ['atom', 'amos', 'cairo'].join(' '))).toBe(false);
  });

  it('does not flag ordinary sentences that happen to spell something across a join', () => {
    const ordinary = [
      'This hit the wall and she was hit by the ball.',
      'It was a bit chilly, and the pen is blue.',
      'Who reached the hill first? Those who remembered the way.',
      'He was exactly right. She has extra time. It is exciting to see a cockpit.',
      'Pat omitted nothing from the list, and a most remarkable ship sailed at dawn.',
      'An Al came in and sat down. A nice cat sat on the mat.',
      'The sweat watch sat on a shelf, next to a scrap e book.',
      "Don't stop. Can't wait. We'd go if it's fine.",
      'Her ex was in Sussex. The kitten is fine. The dog ate rapeseed.',
      'Pass the salt, please. Class is over. The grass is wet.',
      '',
      '   ',
      'one',
    ];
    for (const t of ordinary) {
      expect(hasHiddenProfanity(t), t).toBe(false);
      expect(isProfane(t), t).toBe(false);
    }
  });

  it('reads accents and ignores punctuation, digits and case', () => {
    expect(hasHiddenProfanity('ASS... 12 HOLE')).toBe(true);
    expect(hasHiddenProfanity('Pass, hólé')).toBe(true);
  });
});
