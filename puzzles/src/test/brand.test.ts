// The characters and the brand elements in /design are drawn by code, so they are tested like code.
import { CAST, character, MOODS, WHO, type Mood, type Who } from '../../design/characters/characters';
import { appIcon, bubble, caseCard, clamp, esc, eyesPattern, fit, gameCard, mark, pawDivider, previewCard, rankBadge, RANKS, stamp, stateCard, watermark, wordmark } from '../../design/brand/elements';

/** What every drawing must be: one closed svg with nothing unfilled in it. */
function sound(svg: string) {
  expect(svg.startsWith('<svg ')).toBe(true);
  expect(svg.endsWith('</svg>')).toBe(true);
  expect(svg).not.toMatch(/undefined|NaN|Infinity|\$\{|\[object/);
  expect(svg.match(/<svg/g)!.length).toBe(svg.match(/<\/svg>/g)!.length);
  expect(svg.match(/<g[ >]/g)?.length ?? 0).toBe(svg.match(/<\/g>/g)?.length ?? 0);
}
const size = (svg: string) => ({ w: Number(/ width="([\d.]+)"/.exec(svg)![1]), h: Number(/ height="([\d.]+)"/.exec(svg)![1]) });

describe('characters', () => {
  it('draws every character in every mood, dress and view', () => {
    const dress = [{}, { hat: true }, { coat: true }, { hat: true, coat: true, glass: true }, { hat: true, coat: true, monocle: true }, { wave: true }, { hat: true, coat: true, wave: true, glass: true, monocle: true }];
    let n = 0;
    for (const who of WHO)
      for (const mood of MOODS)
        for (const d of dress)
          for (const view of ['full', 'bust', 'eyes'] as const)
            for (const dark of [false, true]) {
              sound(character({ who, mood, view, dark, ...d }));
              n++;
            }
    expect(n).toBe(WHO.length * MOODS.length * dress.length * 3 * 2);
  });

  it('each mood draws a different face', () => {
    for (const who of WHO) expect(new Set(MOODS.map((mood) => character({ who, mood }).replace(/ch\d+/g, ''))).size).toBe(MOODS.length);
  });

  it('a wave is happy unless told otherwise, and an unknown mood is the default', () => {
    const face = (o: Parameters<typeof character>[0]) => character(o).replace(/ch\d+/g, '');
    expect(character({ who: 'cat', wave: true })).toContain('aria-label="Detective X, happy, waving"');
    expect(character({ who: 'cat', wave: true, mood: 'stumped' })).toContain('aria-label="Detective X, stumped, waving"');
    expect(face({ who: 'dog', mood: 'furious' as Mood })).toBe(face({ who: 'dog' }));
  });

  it('a bust and an icon are square, the whole figure is not, and a size is kept sane', () => {
    for (const who of WHO) {
      expect(size(character({ who, view: 'bust', size: 100 }))).toEqual({ w: 100, h: 100 });
      expect(size(character({ who, view: 'eyes', size: 64 }))).toEqual({ w: 64, h: 64 });
      expect(size(character({ who, size: 240 })).h).toBeGreaterThan(240);
    }
    for (const bad of [0, -5, NaN, Infinity]) sound(character({ who: 'cat', size: bad }));
    expect(size(character({ who: 'cat', view: 'bust', size: 0 })).w).toBe(1);
    expect(size(character({ who: 'cat', view: 'bust', size: 1e9 })).w).toBe(4096);
  });

  it('flips, and draws its lines in cream on a dark ground', () => {
    expect(character({ who: 'robot', flip: true })).toContain('scale(-1 1)');
    expect(character({ who: 'robot' })).not.toContain('scale(-1 1)');
    expect(character({ who: 'dino', glass: true, dark: true })).toContain('stroke="#f1ece2" stroke-width="8"');
    expect(character({ who: 'dino', glass: true })).toContain('stroke="#141416" stroke-width="8"');
  });

  it('two drawings on one page never share a clip id', () => {
    const ids = Array.from({ length: 50 }, () => /clipPath id="(ch\d+)"/.exec(character({ who: 'cat' }))![1]);
    expect(new Set(ids).size).toBe(50);
  });

  it('the robot has tools of its own: it scans and zooms, and shows 404 when stumped', () => {
    const gold = 'stroke="#e0a526"';
    // No gold monocle rim and no hand lens on a machine with a screen for a face.
    expect(character({ who: 'robot', monocle: true })).not.toContain(gold);
    expect(character({ who: 'cat', monocle: true })).toContain(gold);
    expect(character({ who: 'robot', glass: true })).not.toContain('fill-opacity=".25" stroke="#141416" stroke-width="8"');
    expect(character({ who: 'dog', glass: true })).toContain('fill-opacity=".25" stroke="#141416" stroke-width="8"');
    expect(character({ who: 'robot', monocle: true })).toContain('stroke-dasharray="7 5"');
    expect(character({ who: 'robot', mood: 'stumped' })).toContain('>404</text>');
    for (const who of ['cat', 'dino', 'dog'] as const) expect(character({ who, mood: 'stumped' })).not.toContain('404');
    expect(CAST.robot.tools).toEqual({ glass: 'scanner', monocle: 'zoom' });
    expect(CAST.cat.tools.glass).toBe('magnifying glass');
  });

  it('says who is in the cast when asked for someone who is not', () => {
    expect(() => character({ who: 'monkey' as Who })).toThrow(/cat, dino, dog, robot/);
  });

  it('the icon is filled with the character\'s own colour', () => {
    for (const who of WHO) expect(character({ who, view: 'eyes' })).toContain(`fill="${CAST[who].fur}"`);
  });
});

describe('brand elements', () => {
  it('the helpers hold at the edges', () => {
    expect(esc('<b> & "x" \'y\'')).toBe('&lt;b&gt; &amp; &quot;x&quot; &#39;y&#39;');
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(NaN, 0, 3)).toBe(0);
    expect(clamp('2', 0, 3)).toBe(0);
    expect(fit('short', 10)).toBe('short');
    expect(fit('  many   spaces  ', 20)).toBe('many spaces');
    expect(fit('a very long line of text', 10)).toBe('a very...');
    expect(fit('', 10)).toBe('');
    expect(fit(null, 10)).toBe('');
  });

  it('the logo keeps its shape at any size, and a bad size is still a drawing', () => {
    for (const h of [16, 22, 46, 240]) {
      sound(mark(h));
      sound(wordmark('#111113', h));
      expect(size(wordmark('#111113', h)).h).toBe(h);
    }
    for (const bad of [0, -1, NaN]) {
      sound(mark(bad));
      sound(wordmark('#fff', bad));
      expect(size(mark(bad)).h).toBe(1);
    }
    expect(wordmark('"><script>', 20)).not.toContain('<script>');
  });

  it('every character has an app icon, square at any size', () => {
    for (const who of WHO)
      for (const n of [16, 29, 180, 512]) {
        const svg = appIcon(who, n);
        sound(svg);
        expect(size(svg)).toEqual({ w: n, h: n });
      }
    sound(appIcon('cat', 0));
  });

  it('the watermark is never loud, whatever it is asked for', () => {
    const at = (o: number) => Number(/opacity="([\d.]+)"/.exec(watermark(1200, 630, o))![1]);
    expect(at(1)).toBe(0.16);
    expect(at(0)).toBe(0.04);
    expect(at(0.1)).toBe(0.1);
    expect(at(NaN)).toBe(0.04);
    expect(watermark(1200, 630)).not.toMatch(/NaN|undefined/);
  });

  it('a rank outside the 4 is the nearest of them', () => {
    for (let i = 0; i < RANKS.length; i++) expect(rankBadge(i)).toContain(`aria-label="${RANKS[i]}"`);
    expect(rankBadge(-3)).toContain('aria-label="Rookie"');
    expect(rankBadge(99)).toContain('aria-label="Chief"');
    expect(rankBadge(NaN)).toContain('aria-label="Rookie"');
    expect(rankBadge(1.6)).toContain('aria-label="Inspector"');
    for (const r of [-3, 0, 3, 99, NaN]) sound(rankBadge(r));
  });

  it('a case card holds at 0 clues, too many clues, more found than there are, and a long or unsafe title', () => {
    const lit = (svg: string) => (svg.match(/<circle [^>]*cy="150"[^>]*fill="#d4f04c"/g) ?? []).length;
    const dots = (svg: string) => (svg.match(/<circle [^>]*cy="150"/g) ?? []).length;
    expect(dots(caseCard('A', 'B', 0, 0, 'cat'))).toBe(1);
    expect(caseCard('A', 'B', 0, 0, 'cat')).toContain('0 of 1 clues');
    expect(dots(caseCard('A', 'B', 3, 40, 'cat'))).toBe(9);
    expect(lit(caseCard('A', 'B', 40, 40, 'cat'))).toBe(9);
    expect(lit(caseCard('A', 'B', 99, 5, 'cat'))).toBe(5);
    expect(caseCard('A', 'B', 99, 5, 'cat')).toContain('5 of 5 clues');
    expect(lit(caseCard('A', 'B', -4, 5, 'cat'))).toBe(0);
    expect(lit(caseCard('A', 'B', NaN, NaN, 'cat'))).toBe(0);
    const long = caseCard('The case of the extraordinarily long title that goes on', 'Case 12 · A category with a very long name indeed', 2, 5, 'dino');
    expect(long).toContain('...');
    expect(long).toContain('textLength="204"');
    const unsafe = caseCard('<img src=x onerror=alert(1)>', 'A & B', 1, 3, 'dog', true);
    expect(unsafe).not.toContain('<img');
    expect(unsafe).toContain('A &amp; B');
    for (const who of WHO) for (const closed of [false, true]) sound(caseCard('The missing trophy', 'Case 3', 2, 5, who, closed));
  });

  it('a bubble holds no words, one line, two lines, far too many, and unsafe ones', () => {
    const lines = (svg: string) => (svg.match(/<text /g) ?? []).length;
    expect(lines(bubble('cat', 'calm', ''))).toBe(1);
    expect(lines(bubble('cat', 'calm', 'It was there the whole time.'))).toBe(1);
    expect(lines(bubble('cat', 'calm', 'It was there the whole time, and nobody looked.'))).toBe(2);
    const many = bubble('robot', 'calm', 'word '.repeat(80), true);
    expect(lines(many)).toBe(2);
    expect(many).toContain('...');
    expect(bubble('dog', 'happy', 'x'.repeat(200))).toContain('...');
    expect(bubble('dog', 'happy', '<b>hi</b> & bye')).toContain('&lt;b&gt;hi&lt;/b&gt; &amp; bye');
    for (const who of WHO) for (const mood of MOODS) for (const dark of [false, true]) sound(bubble(who, mood, 'A line.', dark));
  });

  it('a state card and a stamp squeeze a long line instead of letting it out of the card', () => {
    const s = stateCard('cat', 'stumped', 'A title that is much too long for the card it is on', 'A line underneath that is also much too long to fit');
    sound(s);
    expect(s.match(/textLength="244"/g)!.length).toBe(2);
    expect(stateCard('cat', 'sleepy', '', '')).not.toMatch(/undefined/);
    expect(stamp('Found', '#111113')).not.toContain('textLength');
    expect(stamp('Case closed', '#111113')).toContain('textLength="128"');
    expect(stamp('A stamp with far too much on it', '#111113')).toContain('...');
    sound(stamp('', '#111113'));
    for (const who of WHO) for (const dark of [false, true]) sound(stateCard(who, 'found', 'Case closed', 'Every word found.', dark));
  });

  it('preview and game cards hold long, empty and unsafe text, in both themes', () => {
    sound(previewCard('', '', '', ''));
    const long = previewCard('k'.repeat(300), 'A headline that is far longer than the card', 'and a second one too, also long', 'f'.repeat(300));
    sound(long);
    expect(long).toContain('...');
    expect(long).toContain('textLength="1056"');
    expect(previewCard('<k>', '<a>', '<b>', '<c>')).not.toMatch(/<k>|<a>|<b>|<c>/);
    expect(size(previewCard('a', 'b', 'c', 'd', 600))).toEqual({ w: 600, h: 315 });
    for (const dark of [false, true]) sound(gameCard(dark));
    expect(gameCard(true)).not.toBe(gameCard(false));
  });

  it('patterns and rules draw at any width, a narrow one included', () => {
    for (const w of [1, 40, 300, 1200]) {
      sound(eyesPattern(w, 100, '#0d0d0e'));
      sound(pawDivider(w, '#111113'));
    }
    // Two grounds on one page keep their own pattern, and every eye has a pupil.
    const [one, two] = [eyesPattern(300, 150, '#0d0d0e'), eyesPattern(300, 150, '#454552')];
    expect(/pattern id="(eyes\d+)"/.exec(one)![1]).not.toBe(/pattern id="(eyes\d+)"/.exec(two)![1]);
    expect(two).toContain('fill="#454552"');
    expect(one.match(/<ellipse /g)!.length).toBe(4);
    expect(pawDivider(20, '#111')).not.toContain('<g ');
    expect((pawDivider(480, '#111').match(/<g /g) ?? []).length).toBeGreaterThan(10);
  });
});
