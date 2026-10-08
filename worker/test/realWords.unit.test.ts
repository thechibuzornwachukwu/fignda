import games from '../../data/games.json';
import { buildHiddenWords } from '../../src/engine/hiddenWords';
import { crossesWords } from '../../src/engine/make';
import { draft } from '../src/app';
import { MAX_UNKNOWN, onRealWords, tokensOf, unknownIn } from '../src/realWords';

// What a free model really sent for the topic "Jesus" on 9 Oct 2026: words cut in two to fake hidden ones.
const CHEAT = {
  title: 'Cafe Morning',
  paragraph:
    "He entered the cafe, ordered a mug, and watched the rain. While waiting, he saw a cr osswalk where a lam b plush toy sat on the curb. A barista called, 'sa vior!' as she put a croissant on the plate. The talk reminded him of an old me ssiah story his grandmother told. He glanced at the newspaper, saw the go spel column, and felt a sudden fa ith. After a sip, a sense of gr ace warmed him, and he whispered a lo rd of thanks. A child held a she pherd figurine, dreaming of fields. He smiled, thinking of his dis ciple wish to learn guitar.",
  words: ['cross', 'lamb', 'savior', 'messiah', 'gospel', 'faith', 'grace', 'lord', 'shepherd', 'disciple'],
};

const honest = (text: string, dict: string[]) => {
  const p = buildHiddenWords({ text, dict });
  const tokens = tokensOf(p.chars);
  return { unknown: unknownIn(tokens), kept: p.answers.filter((a) => crossesWords(p.chars, a.spans) && onRealWords(tokens, a.spans)).map((a) => a.key) };
};

describe('real words', () => {
  it('sees the fragments in a cheated paragraph and keeps none of its hidden words', () => {
    const r = honest(CHEAT.paragraph, CHEAT.words);
    expect(r.unknown).toEqual(expect.arrayContaining(['cr', 'osswalk', 'b', 'sa', 'vior', 'ssiah', 'spel', 'ith', 'gr', 'rd', 'pherd', 'ciple']));
    expect(r.kept).toEqual([]);
  });

  it('the Worker turns the cheated puzzle down', async () => {
    expect(await draft(async () => JSON.stringify(CHEAT), 'Jesus')).toBeNull();
  });

  it('keeps honest hidden words, names and contractions', () => {
    const r = honest("Pat omitted the big old map. It's a most unusual day in Kenya, and she didn't mind.", ['atom', 'gold', 'amos']);
    expect(r.unknown).toEqual([]);
    expect(r.kept.sort()).toEqual(['amos', 'atom', 'gold']);
  });

  it('a short sentence start is checked, a name is not', () => {
    const p = buildHiddenWords({ text: 'Xq went home. Then Zbrk came. Mochi ate.', dict: [] });
    expect(unknownIn(tokensOf(p.chars))).toEqual(['Xq']);
  });

  it('our own puzzles pass: few unknown words, and nearly every hidden answer sits on real words', () => {
    let answers = 0;
    let kept = 0;
    for (const g of games.games as Array<{ id: string; text: string; dict: string[] }>) {
      const p = buildHiddenWords({ text: g.text, dict: g.dict });
      const tokens = tokensOf(p.chars);
      const hidden = p.answers.filter((a) => crossesWords(p.chars, a.spans));
      answers += hidden.length;
      kept += hidden.filter((a) => onRealWords(tokens, a.spans)).length;
      expect(unknownIn(tokens).length, `${g.id}: ${unknownIn(tokens).join(' ')}`).toBeLessThanOrEqual(MAX_UNKNOWN);
    }
    expect(kept / answers).toBeGreaterThan(0.95);
  });
});
