import { hideForMe } from './hideForMe';
import { checkDraft } from './make';

const text =
  'Pat omitted nothing from the list, and the ship sailed at dawn. Dad ran to the dock with a warm coat, ' +
  'then he sat down for a long, quiet breakfast with Mum and the two dogs by the old stove.';

describe('hideForMe', () => {
  const out = hideForMe(text);

  it('finds words hidden across joins', () => {
    expect(out.length).toBeGreaterThanOrEqual(4);
    expect(out).toContain('atom');
  });

  it('every word it returns is hidden by the same rule Make applies', () => {
    const check = checkDraft(text, out);
    expect(check.words.filter((w) => w.state !== 'hidden')).toEqual([]);
  });

  it('never returns a word that is plainly visible as a whole word', () => {
    const plain = 'The ship and the dog sat by the old stove with a warm coat, near a pot and a pan.';
    const got = hideForMe(plain, { minLength: 3 });
    for (const w of ['ship', 'dog', 'sat', 'old', 'stove', 'warm', 'coat', 'pot', 'pan', 'the', 'and', 'near']) expect(got).not.toContain(w);
  });

  it('drops a word that sits whole inside one word only', () => {
    expect(hideForMe('A chrome bumper rolled by.', { minLength: 4 })).not.toContain('rome');
  });

  it('respects the limit and the minimum length, and returns reading order', () => {
    const few = hideForMe(text, { limit: 3 });
    expect(few).toHaveLength(3);
    expect(hideForMe(text, { minLength: 6 }).every((w) => w.length >= 6)).toBe(true);
    const keys = out.map((w) => text.toLowerCase().replace(/[^a-z]/g, '').indexOf(w));
    expect(keys).toEqual([...keys].sort((a, b) => a - b));
  });

  it('lets the caller reject words', () => {
    expect(hideForMe(text, { reject: (w) => w === 'atom' })).not.toContain('atom');
  });

  it('gives nothing for no text, one word or no letters', () => {
    expect(hideForMe('')).toEqual([]);
    expect(hideForMe('Rome')).toEqual([]);
    expect(hideForMe('12 34 ...')).toEqual([]);
  });
});
