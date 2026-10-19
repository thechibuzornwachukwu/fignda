// Lantern Row as data (BUILD_PLAN set 1-map): every building, tree, lamp, sign, bin, camera and patch of ground, on the
// plan of the street (src/engine/world.ts, 1200 by 800 units, 1 unit 0.15 m), with the sun by the hour and the moon by
// the date. The 3D street (src/map3d) is built from it. Pure: data and nothing else.

/** The weather on the night of a case (its story says which). Snow comes in December; a storm or a flood is a case of its own. */
export type Weather = 'clear' | 'rain' | 'fog' | 'snow' | 'storm' | 'flood';
/** The morning after a storm or a flood: the weather has gone, what it did has not. */
export type After = 'storm' | 'flood';

/** The street's name, as its signs carry it. */
export const STREET_NAME = 'Lantern Row';

type Roof = 'flat' | 'hip' | 'ridge';
export type Block = {
  /** The footprint on the plan, the height of the walls, and how much the roof rises above them. */
  at: [number, number, number, number];
  wall: number;
  roof: number;
  shape: Roof;
  walls: string;
  top: string;
  anchor?: string;
  /** Rows of windows on the street-facing wall, and a door: its left edge and width on the plan. */
  windows?: number;
  door?: [number, number];
  doorAnchor?: string;
  chimney?: boolean;
  clock?: number;
  /** How high it stands off the ground: a chimney stands on its roof. */
  base?: number;
  /** An old or neglected roof: grime and moss on it, and a tile or 2 gone. The number seeds where. */
  wear?: number;
  /** Its number on the street, on a plaque by the door: odd on the hall's side, even on the library's. */
  number?: number;
  /** A poster pasted on its east wall, and the billboard it is. */
  poster?: string;
  /** Standing on 2 posts, `base` above the ground: a hoarding. */
  posts?: boolean;
};

// The street from the plan, building by building. Heights are drawn taller than life so the fronts read on a phone.
export const BLOCKS: Block[] = [
  { at: [180, 150, 290, 260], wall: 55, roof: 95, shape: 'hip', walls: 'f-brick', top: 'f-slate', anchor: 'roof-hall', windows: 1, door: [300, 50], doorAnchor: 'door-hall', clock: 325, number: 1 },
  { at: [440, 372, 28, 36], wall: 26, roof: 0, shape: 'flat', walls: 'f-plaster', top: 'f-ochre-dim' },
  { at: [530, 170, 160, 240], wall: 95, roof: 50, shape: 'ridge', walls: 'f-plaster', top: 'f-slate-light', anchor: 'roof-bakery', windows: 2, door: [590, 40], doorAnchor: 'door-bakery', chimney: true, number: 3 },
  { at: [700, 180, 170, 230], wall: 75, roof: 70, shape: 'hip', walls: 'f-stone', top: 'f-blue', anchor: 'roof-sale-room', wear: 3, windows: 2, door: [765, 40], doorAnchor: 'door-sale-room', number: 5, poster: 'billboard-2' },
  { at: [60, 525, 100, 34], wall: 26, roof: 0, shape: 'flat', walls: 'f-wood', top: 'f-wood', wear: 5, poster: 'billboard-3' },
  { at: [180, 525, 44, 44], wall: 30, roof: 0, shape: 'flat', walls: 'f-plaster', top: 'f-charcoal' },
  { at: [380, 530, 200, 230], wall: 70, roof: 80, shape: 'hip', walls: 'f-stone', top: 'f-library', anchor: 'roof-library', windows: 1, number: 2 },
  { at: [680, 530, 45, 170], wall: 80, roof: 26, shape: 'ridge', walls: 'f-house', top: 'f-slate', anchor: 'roof-houses', windows: 2, number: 4 },
  { at: [725, 530, 45, 170], wall: 80, roof: 26, shape: 'ridge', walls: 'f-house-2', top: 'f-charcoal', windows: 2, wear: 7, number: 6 },
  { at: [770, 530, 45, 170], wall: 80, roof: 26, shape: 'ridge', walls: 'f-house', top: 'f-terracotta', windows: 2, number: 8 },
  { at: [815, 530, 45, 170], wall: 80, roof: 26, shape: 'ridge', walls: 'f-house-2', top: 'f-roof-black', windows: 2, wear: 11, number: 10 },
  { at: [1110, 620, 46, 46], wall: 32, roof: 0, shape: 'flat', walls: 'f-wood', top: 'f-wood', wear: 13 },
];
// 3 billboards of 3 kinds: a hoarding on posts on open ground at the top of the market square, a poster pasted on the sale room's side wall, and a
// panel on the end of the bus shelter. What is on them is the case's or the season's to say.
BLOCKS.push({ at: [1095, 316, 60, 6], wall: 40, roof: 0, shape: 'flat', walls: 'f-poster', top: 'f-wood', anchor: 'billboard-1', base: 18, posts: true });
// Bins: public litter bins at the bus stop, the hall, and the market corners; wheelie bins in the back gardens and
// beside the bakery. A bin is where things are thrown away, and where a detective finds them again.
export const BINS: Array<[number, number, 'public' | 'wheelie', string]> = [
  [178, 516, 'public', 'f-bin-public'], [358, 433, 'public', 'f-bin-public'], [886, 605, 'public', 'f-bin-public'], [1152, 605, 'public', 'f-bin-public'],
  [713, 770, 'wheelie', 'f-bin-green'], [758, 770, 'wheelie', 'f-bin-grey'], [803, 770, 'wheelie', 'f-bin-green'], [848, 770, 'wheelie', 'f-bin-grey'], [524, 398, 'wheelie', 'f-bin-grey'],
];

/** The street's name, on a sign on a post at each end. */
export const SIGNS: Array<[number, number]> = [[130, 414], [860, 414]];
// Behind the houses, a shed at the end of each back garden.
for (const gx of [688, 733, 778, 823]) BLOCKS.push({ at: [gx, 762, 22, 18], wall: 16, roof: 6, shape: 'ridge', walls: 'f-wood', top: 'f-wood', wear: gx });
// Cars: 3 in the yard, 2 at the kerb.
const CARS: Array<[number, number, string]> = [[540, 75, 'f-terracotta'], [660, 75, 'f-blue'], [780, 75, 'f-sage'], [560, 433, 'f-ochre-dim'], [730, 433, 'f-blue']];
for (const [cx, cy, cls] of CARS) BLOCKS.push({ at: [cx, cy, cy > 400 ? 44 : 30, cy > 400 ? 20 : 44], wall: 12, roof: 8, shape: 'flat', walls: cls, top: cls });
// The 8 stalls of the market row, each under its awning.
const AWNINGS = ['f-terracotta', 'f-sage', 'f-ochre-dim', 'f-blue', 'f-ochre-dim', 'f-blue', 'f-terracotta', 'f-sage'];
for (let i = 0; i < 8; i++) {
  const x = 900 + (i % 4) * 65;
  const y = i < 4 ? 350 : 530;
  BLOCKS.push({ at: [x, y, 55, 60], wall: 22, roof: 10, shape: 'ridge', walls: 'f-wood', top: AWNINGS[i]!, anchor: `awning-${i + 1}` });
}


/**
 * CCTV cameras, each on a bracket under the eaves: where it is on the plan, how high, which way it looks (radians on
 * the plan, east 0, south a quarter turn), how far and how wide it sees. A camera sees only its wedge: a case's
 * recording can hold nothing from outside it (CASE_WRITING, The recording).
 */
export const CAMERAS: Array<{ id: string; at: [number, number]; z: number; aim: number; range: number; fov: number }> = [
  { id: 'sale-room', at: [868, 410], z: 62, aim: Math.atan2(0.6, -1), range: 170, fov: 0.9 },
  { id: 'bakery', at: [532, 410], z: 74, aim: Math.atan2(0.55, 1), range: 150, fov: 0.8 },
  { id: 'house-8', at: [792, 530], z: 62, aim: Math.atan2(-1, -0.35), range: 120, fov: 0.85 },
];
/** The ground a camera sees, as a wedge on the plan. */
const round = (n: number) => Math.round(n * 10) / 10;
export const cameraView = (c: (typeof CAMERAS)[number]): Array<[number, number]> => {
  const out: Array<[number, number]> = [[c.at[0], c.at[1]]];
  for (let k = 0; k <= 8; k++) {
    const a = c.aim - c.fov / 2 + (c.fov * k) / 8;
    out.push([round(c.at[0] + Math.cos(a) * c.range), round(c.at[1] + Math.sin(a) * c.range)]);
  }
  return out;
};

/** Weeds, where a real street grows them: along the kerbs, in the alley, at the yard's edge, round the hut. */
export const WEEDS: Array<[number, number]> = [
  [150, 300], [158, 200], [148, 380], [300, 132], [430, 140], [478, 300], [512, 380], [475, 145], [868, 130],
  [70, 428], [380, 428], [640, 512], [820, 512], [1100, 612], [1162, 668], [1120, 672], [884, 598], [1150, 344],
  [600, 512], [210, 512], [700, 792], [395, 795],
];

/** Flat ground on the plan: [x, y, w, h, class]. */
export const GROUND: Array<[number, number, number, number, string, string?]> = [
  [0, 0, 1200, 800, 'f-lot'],
  [140, 120, 330, 30, 'f-alley'],
  [140, 150, 40, 280, 'f-alley'],
  [470, 40, 400, 110, 'f-square'],
  [470, 150, 50, 280, 'f-square'],
  [0, 430, 470, 80, 'f-cobble'],
  [470, 430, 410, 80, 'f-tarmac'],
  [880, 340, 280, 260, 'f-square', 'market-square'],
  [1160, 430, 40, 80, 'f-tarmac'],
  // Pavements both sides, between the road and the buildings.
  [0, 410, 880, 20, 'f-pavement'],
  [0, 510, 880, 16, 'f-pavement'],
  // Back gardens behind the houses, and grass behind the library.
  [680, 700, 180, 90, 'f-grass'],
  [380, 760, 200, 30, 'f-grass'],
];
/** A tree's crown, by species: how it reads from afar (design/TREES.md). */
export type TreeForm = 'spreading' | 'oval' | 'round' | 'columnar' | 'conical' | 'weeping' | 'slender';
/** How it is doing: in leaf, in fruit, drying out, bare, or holding a nest. */
export type TreeKind = 'healthy' | 'apple' | 'orange' | 'dry' | 'nest' | 'bare';
/** [x, y, crown radius, height, form, condition, leaf class, anchor]. */
export const TREES: Array<[number, number, number, number, TreeForm, TreeKind, string, string?]> = [
  // Street trees: London planes, spreading, on the pavement by the bus stop.
  [275, 560, 28, 50, 'spreading', 'healthy', 'f-plane', 'tree-plane-1'],
  [335, 560, 28, 50, 'spreading', 'dry', 'f-leaf-dry', 'tree-plane-2'],
  // The lime outside the library, the oldest thing on the street: tall and oval, with a nest.
  [625, 572, 40, 72, 'oval', 'nest', 'f-lime', 'tree-lime'],
  // In the back gardens: an apple, an orange, a birch.
  [700, 735, 17, 32, 'round', 'apple', 'f-plane'],
  [845, 735, 19, 34, 'round', 'orange', 'f-lime'],
  [748, 738, 13, 48, 'slender', 'healthy', 'f-birch-leaf'],
  [1170, 690, 17, 36, 'round', 'dry', 'f-leaf-dry'],
  // Out of town: a row of poplars along the field edge behind the yard, a pine to the west, a dead oak.
  [560, -40, 22, 70, 'columnar', 'healthy', 'f-poplar'],
  [640, -40, 22, 70, 'columnar', 'healthy', 'f-poplar'],
  [720, -40, 22, 70, 'columnar', 'healthy', 'f-poplar'],
  [-70, 300, 24, 84, 'conical', 'healthy', 'f-pine'],
  [60, 640, 22, 48, 'spreading', 'bare', 'f-bark'],
];
/** Where the clumps of a crown sit, in crown radii from its middle, back ones first: [dx, dy, r]. */
export const CROWNS: Record<Exclude<TreeForm, 'conical' | 'weeping'>, Array<[number, number, number]>> = {
  round: [[0, -0.42, 0.58], [-0.5, -0.1, 0.55], [0.52, -0.08, 0.52], [-0.22, 0.32, 0.56], [0.3, 0.34, 0.52], [0, 0.02, 0.6]],
  oval: [[0, -0.8, 0.5], [-0.42, -0.42, 0.5], [0.44, -0.4, 0.5], [-0.4, 0.12, 0.52], [0.42, 0.12, 0.52], [0, 0.45, 0.5], [0, -0.18, 0.62]],
  spreading: [[-0.62, -0.22, 0.5], [0.62, -0.24, 0.5], [0, -0.36, 0.56], [-1.22, 0.08, 0.42], [1.22, 0.06, 0.42], [-0.62, 0.22, 0.46], [0.62, 0.22, 0.46], [0, 0.16, 0.52]],
  columnar: [[0, -1.5, 0.36], [0.08, -1.05, 0.42], [-0.08, -0.6, 0.45], [0.06, -0.15, 0.46], [-0.05, 0.3, 0.44]],
  slender: [[-0.2, -0.85, 0.3], [0.22, -0.6, 0.32], [-0.28, -0.25, 0.33], [0.3, 0, 0.3], [0, 0.3, 0.32], [-0.1, -0.5, 0.28]],
};

export const LAMPS: Array<[number, number]> = [[100, 424], [420, 424], [700, 424], [880, 334], [240, 516], [600, 516], [880, 606], [1160, 606]];
export const LAMP_H = 64;

/** Where the sun is, by the player's hour: rising in the east at 6, highest at noon, setting in the west at 18. */
export function sunAt(hour: number): { up: boolean; azimuth: number; elevation: number } {
  const t = (hour - 6) / 12;
  const up = t > 0 && t < 1;
  return { up, azimuth: Math.PI * Math.min(1, Math.max(0, t)), elevation: up ? Math.max(0.17, Math.sin(Math.PI * t) * 0.96) : 0 };
}

/** How full the moon is on a date, 0 new to 0.5 full to 1 new again, from a known new moon. */
export function moonPhase(date: Date): number {
  const days = (date.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86_400_000;
  const p = (days / 29.530588853) % 1;
  return p < 0 ? p + 1 : p;
}
