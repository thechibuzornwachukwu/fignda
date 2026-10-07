import { avatarCode, avatarFor, avatarSvg, DEFAULT_AVATAR, drawAvatar, parseAvatar, PARTS, type Avatar } from './draw';
import { HAIR_STYLES } from './parts/hair';

const namesOf = (key: string) => PARTS.find((p) => p.key === key)!.names;

describe('avatar parts are append only', () => {
  // Saved avatars store positions. These lists pin the start of each part: new entries go at the END.
  // If one of these fails, an entry was reordered or removed and saved avatars would change faces.
  const pinned: Record<string, string[]> = {
    back: ['lime', 'ink', 'cream', 'sky', 'coral', 'lilac'],
    skin: ['tone 1', 'tone 2', 'tone 3', 'tone 4', 'tone 5', 'tone 6'],
    hair: [
      'low cut', 'afro', 'braids', 'locs', 'puffs', 'bald', 'gele', 'fila', 'hijab', 'short', 'side part', 'long', 'bob', 'ponytail', 'curly', 'bun',
      'cornrows', 'bantu knots', 'high top', 'frohawk', 'twists', 'long locs', 'shuku', 'top puff', 'kufi', 'turban', 'low fade', 'high fade',
      'mohawk fade', 'low afro', 'tapered afro', 'waves', 'side part cut', 'box braids', 'bob braids', 'fulani braids', 'thread', 'koroba', 'patewo',
      'loc bun', 'durag',
    ],
    colour: ['black', 'dark brown', 'brown', 'blonde', 'ginger', 'grey'],
    eyes: ['dots', 'smiling', 'wide', 'wink'],
    mouth: ['smile', 'grin', 'flat', 'smirk'],
    face: ['none', 'beard', 'moustache', 'goatee'],
    extra: ['none', 'glasses', 'earrings', 'shades'],
    mark: ['none', 'freckles', 'pimples', 'beauty mark', 'blush', 'tribal marks', 'tribal marks across', 'single mark'],
    item: ['none', 'toothpick', 'chewing stick'],
    tie: ['none', 'scrunchie', 'headband'],
    outfit: ['tee', 'agbada', 'kaftan', 'dashiki', 'ankara', 'buba and beads', 'suit', 'hoodie', 'jersey', 'turtleneck', 'hero cape', 'wizard robe', 'space suit', 'high collar shirt'],
  };

  it.each(PARTS.map((p) => [p.key, p.letter] as const))('%s keeps its saved order', (key) => {
    expect(pinned[key], `pin the new part "${key}" here`).toBeDefined();
    expect(namesOf(key).slice(0, pinned[key]!.length)).toEqual(pinned[key]);
  });

  it('every part has its own letter, no duplicate names, and at most 100 choices', () => {
    expect(new Set(PARTS.map((p) => p.letter)).size).toBe(PARTS.length);
    for (const p of PARTS) {
      expect(new Set(p.names).size, p.key).toBe(p.names.length);
      expect(p.names.length, p.key).toBeLessThanOrEqual(100);
    }
  });
});

describe('avatar drawing', () => {
  it('every choice of every part draws shapes with safe values', () => {
    for (const p of PARTS) {
      for (let i = 0; i < p.names.length; i++) {
        const shapes = drawAvatar({ ...DEFAULT_AVATAR, [p.key]: i });
        expect(shapes.length, `${p.key} ${p.names[i]}`).toBeGreaterThan(3);
        for (const s of shapes) {
          for (const v of Object.values(s.attrs)) {
            // Numbers, colours and path data only: nothing that could carry markup or script.
            if (typeof v === 'string') expect(v, `${p.key} ${p.names[i]}`).toMatch(/^[#A-Za-z0-9 .,-]+$/);
            else expect(Number.isFinite(v)).toBe(true);
          }
        }
      }
    }
  });

  it('a code round trips, and junk falls back to the default', () => {
    const a: Avatar = { back: 5, skin: 2, hair: 40, colour: 4, eyes: 3, mouth: 1, face: 2, extra: 3, mark: 7, item: 2, tie: 1, outfit: 13 };
    expect(parseAvatar(avatarCode(a))).toEqual(a);
    expect(avatarCode(a)).toMatch(/^([a-z][0-9]{1,2}){12}$/);
    for (const junk of [null, undefined, '', '<svg onload=alert(1)>', 'h999', 'b9s9', 'x'.repeat(500)]) {
      expect(parseAvatar(junk)).toEqual(DEFAULT_AVATAR);
    }
    expect(parseAvatar('h12').hair).toBe(12);
    expect(parseAvatar('h1').hair).toBe(1);
  });

  it('a starter avatar is stable for a handle and never uses headwear', () => {
    expect(avatarFor('ada')).toEqual(avatarFor('ada'));
    for (const h of ['ada', 'chidi', 'bisi_x', 'zz.9', 'emma', 'a1', 'tobi.k', 'x_y']) {
      const a = avatarFor(h);
      expect(HAIR_STYLES[a.hair]!.headwear, h).toBeFalsy();
      expect(parseAvatar(avatarCode(a))).toEqual(a);
    }
  });

  it('a veil covers the outfit, ears and facial hair; shades replace the eyes', () => {
    const hijab = namesOf('hair').indexOf('hijab');
    const veiled = JSON.stringify(drawAvatar({ ...DEFAULT_AVATAR, hair: hijab, outfit: 1, face: 1, extra: 2 }));
    const plainVeil = JSON.stringify(drawAvatar({ ...DEFAULT_AVATAR, hair: hijab }));
    expect(veiled).toBe(plainVeil);
    const shades = drawAvatar({ ...DEFAULT_AVATAR, extra: 3, eyes: 2 });
    expect(JSON.stringify(shades)).toBe(JSON.stringify(drawAvatar({ ...DEFAULT_AVATAR, extra: 3, eyes: 0 })));
  });

  it('a headband never sits on headwear or a bald head, and a scrunchie only where hair is gathered', () => {
    const count = (o: Partial<Avatar>) => drawAvatar({ ...DEFAULT_AVATAR, ...o }).length;
    for (const name of ['gele', 'fila', 'kufi', 'turban', 'durag', 'bald']) {
      const hair = namesOf('hair').indexOf(name);
      expect(count({ hair, tie: 2 }), name).toBe(count({ hair }));
    }
    const at = (name: string) => namesOf('hair').indexOf(name);
    expect(count({ hair: at('afro'), tie: 2 })).toBe(count({ hair: at('afro') }) + 1);
    expect(count({ hair: at('puffs'), tie: 1 })).toBe(count({ hair: at('puffs') }) + 2);
    expect(count({ hair: at('afro'), tie: 1 })).toBe(count({ hair: at('afro') }));
  });

  it('the neckline is no wider than the neck', () => {
    // The neck spans x 41 to 55. A wider scoop shows as a bulge at its base.
    const scoop = drawAvatar(DEFAULT_AVATAR).find((s) => s.tag === 'path' && String(s.attrs.d).includes('v-3h-'));
    expect(String(scoop!.attrs.d)).toMatch(/^M41 79\.5q7 \d+ 14 0v-3h-14z$/);
  });

  it('svg text carries only the drawing', () => {
    const svg = avatarSvg(avatarFor('ada'), 40);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"')).toBe(true);
    expect(svg).not.toMatch(/script|onload|href/i);
  });
});
