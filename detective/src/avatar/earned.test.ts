import { avatarCode, avatarFor, DEFAULT_AVATAR, drawAvatar, parseAvatar, PARTS, surprise, type Avatar } from './draw';
import { EARNED, howTo, isEarned, needOf } from './earned';

const part = (key: string) => PARTS.find((p) => p.key === key)!;
const at = (key: string, name: string) => (part(key).names as readonly string[]).indexOf(name);

describe('earned pieces', () => {
  it('every earned piece is a real choice of its part, and only the detective pieces are earned', () => {
    for (const e of EARNED) expect(at(e.part, e.name)).toBeGreaterThan(0);
    expect(EARNED.map((e) => `${e.part}:${e.name}`).sort()).toEqual(['kit:badge', 'kit:detective hat', 'kit:full kit', 'kit:magnifying glass', 'outfit:detective coat']);
    // Everything that helps someone look like themselves stays free.
    for (const key of ['back', 'skin', 'hair', 'colour', 'eyes', 'mouth', 'face', 'extra', 'mark', 'item', 'tie', 'festive']) {
      for (const name of part(key).names) expect(needOf(key, name)).toBeUndefined();
    }
    expect(needOf('kit', 'none')).toBeUndefined();
    expect(needOf('outfit', 'tee')).toBeUndefined();
  });

  it('cases closed earn the badge, the glass and the full kit', () => {
    const got = (cases: number) => EARNED.filter((e) => isEarned(e.need, { cases, points: 0 })).map((e) => e.name);
    expect(got(0)).toEqual([]);
    expect(got(1)).toEqual(['badge']);
    expect(got(5)).toEqual(['badge', 'magnifying glass']);
    expect(got(10)).toEqual(['badge', 'magnifying glass', 'full kit']);
  });

  it('rank earns the hat and the coat, at the points the rank begins', () => {
    const got = (points: number) => EARNED.filter((e) => isEarned(e.need, { cases: 0, points })).map((e) => e.name);
    expect(got(3719)).toEqual([]);
    expect(got(3720)).toEqual(['detective hat']);
    expect(got(12969)).toEqual(['detective hat']);
    expect(got(12970)).toEqual(['detective hat', 'detective coat']);
    expect(got(10_000_000)).toEqual(['detective hat', 'detective coat']);
  });

  it('a standing that is not numbers earns nothing', () => {
    for (const bad of [Number.NaN, -5, Infinity, undefined as unknown as number, '9' as unknown as number]) {
      for (const e of EARNED) expect(isEarned(e.need, { cases: bad, points: bad })).toBe(false);
    }
  });

  it('says how to earn each, in digits and short sentences', () => {
    expect(EARNED.map((e) => howTo(e.need))).toEqual(['Close 1 case.', 'Close 5 cases.', 'Reach the rank of Detective.', 'Close 10 cases.', 'Reach the rank of Inspector.']);
  });
});

describe('the kit on an avatar', () => {
  it('draws on top, is saved in the code, and an old code opens with no kit', () => {
    const base = drawAvatar(DEFAULT_AVATAR).length;
    part('kit').names.forEach((name, i) => {
      const shapes = drawAvatar({ ...DEFAULT_AVATAR, kit: i });
      if (name === 'none') expect(shapes).toHaveLength(base);
      else expect(shapes.length).toBeGreaterThan(base);
      expect(JSON.stringify(shapes)).not.toMatch(/NaN|undefined/);
    });
    const a: Avatar = { ...DEFAULT_AVATAR, kit: at('kit', 'full kit'), outfit: at('outfit', 'detective coat') };
    expect(parseAvatar(avatarCode(a))).toEqual(a);
    expect(avatarCode(a)).toMatch(/^([a-z][0-9]{1,2}){1,24}$/);
    expect(parseAvatar('b0s3h0c0e0m0f0x0k0t0a0o0z0').kit).toBe(0);
    expect(parseAvatar('d99').kit).toBe(0);
  });

  it('an earned piece is never handed out by chance, and Surprise me keeps the kit someone earned', () => {
    const coat = at('outfit', 'detective coat');
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const me: Avatar = { ...DEFAULT_AVATAR, kit: at('kit', 'badge') };
    for (let i = 0; i < 300; i++) {
      const next = surprise(me, random);
      expect(next.outfit).not.toBe(coat);
      expect(next.kit).toBe(me.kit);
    }
    for (const h of ['ada', 'chidi', 'emma', 'x_y', 'culprit-bible']) {
      expect(avatarFor(h).kit).toBe(0);
      expect(avatarFor(h).outfit).not.toBe(coat);
    }
  });
});