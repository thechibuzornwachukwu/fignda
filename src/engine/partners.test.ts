import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_PARTNER, MOOD, nextAt, parsePartner, PARTNER_POINTS, PARTNERS, partnerName, partnerSrc, slotsFor, standingOf, START, takePartner, type Moment } from './partners';

const root = join(__dirname, '..', '..');

describe('the partners', () => {
  it('3 are in the game, Detective X first and the default, and the robot waits on its name', () => {
    expect(PARTNERS.map((p) => p.id)).toEqual(['cat', 'dino', 'dog']);
    expect(PARTNERS.map((p) => p.name)).toEqual(['Detective X', 'Detective Tobs', 'Detective Puff']);
    expect(DEFAULT_PARTNER).toBe('cat');
    expect(partnerName('dog')).toBe('Detective Puff');
    expect(JSON.stringify(PARTNERS)).not.toMatch(/robo/i);
  });

  it('every partner has a picture for every moment, and no robot is shipped', () => {
    for (const p of PARTNERS) {
      for (const moment of Object.keys(MOOD) as Moment[]) {
        const src = partnerSrc(p.id, moment);
        expect(src).toBe(`/partners/${p.id}-${MOOD[moment]}.svg`);
        const file = join(root, 'public', src);
        expect(existsSync(file), src).toBe(true);
        const svg = readFileSync(file, 'utf8');
        expect(svg.startsWith('<svg ')).toBe(true);
        expect(svg).not.toMatch(/<script|onload=|href=/i);
      }
    }
    expect(existsSync(join(root, 'public', 'partners', 'robot-calm.svg'))).toBe(false);
  });
});

describe('slots and thresholds', () => {
  it('the first partner is free and each further one opens at its points', () => {
    expect(PARTNER_POINTS).toEqual([0, 3000, 9000]);
    expect([0, 2999, 3000, 8999, 9000, 10_000_000].map(slotsFor)).toEqual([1, 1, 2, 2, 3, 3]);
    expect([Number.NaN, -5, Infinity, undefined as unknown as number].map(slotsFor)).toEqual([1, 1, 1, 1]);
  });

  it('partner_slots in the database opens each partner at the same points', () => {
    const sql = readFileSync(join(root, 'supabase', 'migrations', '20261010000600_partners.sql'), 'utf8');
    const body = sql.slice(sql.indexOf('create function public.partner_slots'), sql.indexOf('create function public.my_partner'));
    const inSql = [...body.matchAll(/>= (\d+) then (\d+)/g)].map((m) => [Number(m[2]), Number(m[1])] as const).sort((a, b) => a[0] - b[0]);
    expect(inSql).toEqual(PARTNER_POINTS.slice(1).map((points, i) => [i + 2, points]));
    expect(body).toContain('else 1');
    // And the database knows the same partners.
    for (const p of PARTNERS) expect(sql).toContain(`'${p.id}'`);
    expect(sql).not.toMatch(/robot/);
  });

  it('own, open or locked: by what is held and what the points allow', () => {
    expect(standingOf(START, 'cat', 0)).toBe('own');
    expect(standingOf(START, 'dino', 0)).toBe('locked');
    expect(standingOf(START, 'dino', 3000)).toBe('open');
    const two = { current: 'dino', owned: ['cat', 'dino'] } as const;
    expect(standingOf({ ...two, owned: [...two.owned] }, 'dog', 3000)).toBe('locked');
    expect(standingOf({ ...two, owned: [...two.owned] }, 'dog', 9000)).toBe('open');
    expect(nextAt(START)).toBe(3000);
    expect(nextAt({ current: 'dino', owned: ['cat', 'dino'] })).toBe(9000);
    expect(nextAt({ current: 'dino', owned: ['cat', 'dino', 'dog'] })).toBeNull();
  });

  it('taking: a switch among the held, a new one when points allow, nothing when locked, and points are never spent', () => {
    expect(takePartner(START, 'dino', 0)).toBe(START);
    const two = takePartner(START, 'dino', 3000);
    expect(two).toEqual({ current: 'dino', owned: ['cat', 'dino'] });
    expect(takePartner(two, 'cat', 0)).toEqual({ current: 'cat', owned: ['cat', 'dino'] });
    expect(takePartner(two, 'dog', 3000)).toBe(two);
    expect(takePartner(two, 'dog', 9000)).toEqual({ current: 'dog', owned: ['cat', 'dino', 'dog'] });
  });
});

describe('parsePartner', () => {
  it('keeps a good state and mends a bad one', () => {
    expect(parsePartner({ current: 'dog', owned: ['dog'] })).toEqual({ current: 'dog', owned: ['dog'] });
    expect(parsePartner({ current: 'dino', owned: ['cat'] })).toEqual({ current: 'dino', owned: ['cat', 'dino'] });
    expect(parsePartner({ current: 'robot', owned: ['dog', 'dog', 'robot', 7] })).toEqual({ current: 'dog', owned: ['dog'] });
    for (const bad of [null, undefined, 'cat', 7, [], {}, { current: 'robot' }, { owned: 'cat' }]) expect(parsePartner(bad)).toEqual(START);
  });
});