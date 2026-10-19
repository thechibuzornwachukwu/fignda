// The map of Lantern Row seen at 30 degrees (BUILD_PLAN set 1-map): the same street as the plan
// (design/sketches/map/the-street.html, src/engine/world.ts), raised into blocks and looked at from the south east, so
// the fronts of the hall, the bakery and the sale room face the player. Pure: it returns shapes, and whoever draws them
// (the sketch script, the Cases screen) turns them into SVG. The hour moves the sun and the shadows, the date sets the
// moon, the case sets the weather.
//
// Colours are classes (`f-*` fill, `shade-*`), each a `--map-*` value with a day and a night side, so the theme swaps
// day for night without a second drawing.

import { ANCHORS, MAP_H, MAP_W, PLACES, PLACE_IDS, type PlaceId } from '../engine/world';

/** The weather on the night of a case (its story says which). Snow comes in December; a storm or a flood is a case of its own. */
export type Weather = 'clear' | 'rain' | 'fog' | 'snow' | 'storm' | 'flood';
type Wet = { snow?: boolean; flood?: boolean };
export type Shape = {
  tag: 'polygon' | 'circle' | 'ellipse' | 'line' | 'path' | 'text';
  /** The words a sign or a plaque carries, at their real size: legible only when the map is zoomed in. */
  text?: string;
  attrs: Record<string, string | number>;
  cls?: string;
  anchor?: (typeof ANCHORS)[number];
};
export type Scene = { width: number; height: number; shapes: Shape[]; places: Record<PlaceId, [number, number]> };

const COS = Math.cos(Math.PI / 6);
const SIN = 0.5;
/** Room around the projected street, and the band of sky above it. */
const PAD = 40;
const SKY = 220;
const SHIFT_X = 800 * COS + PAD;

/** A point on the plan, `z` above the ground, as it lands in the picture. */
export const iso = (x: number, y: number, z = 0): [number, number] => [round((x - y) * COS + SHIFT_X), round((x + y) * SIN - z + SKY)];
const round = (n: number) => Math.round(n * 10) / 10;
const pts = (list: Array<[number, number]>) => list.map((p) => p.join(',')).join(' ');
/** The street's name, as its signs carry it. */
export const STREET_NAME = 'Lantern Row';
/**
 * Words set flat on a wall that faces south, as the 30 degree view sees it: along the wall they run down to the right
 * at 30 degrees, and up the wall they rise straight. (x, y, z) is where the words start, on the plan.
 */
const onSouthWall = (x: number, y: number, z: number, words: string, size: number, cls: string): Shape => {
  const [tx, ty] = iso(x, y, z);
  return { tag: 'text', text: words, attrs: { transform: `matrix(${round(COS * 100) / 100},0.5,0,1,${tx},${ty})`, 'font-size': size }, cls };
};

type Roof = 'flat' | 'hip' | 'ridge';
type Block = {
  /** The footprint on the plan, the height of the walls, and how much the roof rises above them. */
  at: [number, number, number, number];
  wall: number;
  roof: number;
  shape: Roof;
  walls: string;
  top: string;
  anchor?: Shape['anchor'];
  /** Rows of windows on the street-facing wall, and a door: its left edge and width on the plan. */
  windows?: number;
  door?: [number, number];
  doorAnchor?: Shape['anchor'];
  chimney?: boolean;
  clock?: number;
  /** How high it stands off the ground: a chimney stands on its roof. */
  base?: number;
  /** An old or neglected roof: grime and moss on it, and a tile or 2 gone. The number seeds where. */
  wear?: number;
  /** Its number on the street, on a plaque by the door: odd on the hall's side, even on the library's. */
  number?: number;
  /** A poster pasted on its east wall, and the billboard it is. */
  poster?: Shape['anchor'];
  /** Standing on 2 posts, `base` above the ground: a hoarding. */
  posts?: boolean;
};

// The street from the plan, building by building. Heights are drawn taller than life so the fronts read on a phone.
const BLOCKS: Block[] = [
  { at: [180, 150, 290, 260], wall: 55, roof: 95, shape: 'hip', walls: 'f-brick', top: 'f-terracotta', anchor: 'roof-hall', windows: 1, door: [300, 50], doorAnchor: 'door-hall', clock: 325, number: 1 },
  { at: [440, 372, 28, 36], wall: 26, roof: 0, shape: 'flat', walls: 'f-plaster', top: 'f-ochre-dim' },
  { at: [530, 170, 160, 240], wall: 95, roof: 50, shape: 'ridge', walls: 'f-plaster', top: 'f-bakery', anchor: 'roof-bakery', windows: 2, door: [590, 40], doorAnchor: 'door-bakery', chimney: true, number: 3 },
  { at: [700, 180, 170, 230], wall: 75, roof: 70, shape: 'hip', walls: 'f-stone', top: 'f-blue', anchor: 'roof-sale-room', wear: 3, windows: 2, door: [765, 40], doorAnchor: 'door-sale-room', number: 5, poster: 'billboard-2' },
  { at: [60, 525, 100, 34], wall: 26, roof: 0, shape: 'flat', walls: 'f-wood', top: 'f-wood', wear: 5, poster: 'billboard-3' },
  { at: [180, 525, 44, 44], wall: 30, roof: 0, shape: 'flat', walls: 'f-plaster', top: 'f-terracotta' },
  { at: [380, 530, 200, 230], wall: 70, roof: 80, shape: 'hip', walls: 'f-stone', top: 'f-library', anchor: 'roof-library', windows: 1, number: 2 },
  { at: [680, 530, 45, 170], wall: 80, roof: 26, shape: 'ridge', walls: 'f-house', top: 'f-terracotta', anchor: 'roof-houses', windows: 2, number: 4 },
  { at: [725, 530, 45, 170], wall: 80, roof: 26, shape: 'ridge', walls: 'f-house-2', top: 'f-wood', windows: 2, wear: 7, number: 6 },
  { at: [770, 530, 45, 170], wall: 80, roof: 26, shape: 'ridge', walls: 'f-house', top: 'f-terracotta', windows: 2, number: 8 },
  { at: [815, 530, 45, 170], wall: 80, roof: 26, shape: 'ridge', walls: 'f-house-2', top: 'f-wood', windows: 2, wear: 11, number: 10 },
  { at: [1110, 620, 46, 46], wall: 32, roof: 0, shape: 'flat', walls: 'f-wood', top: 'f-wood', wear: 13 },
];
// 3 billboards of 3 kinds: a hoarding on posts on open ground at the top of the market square, a poster pasted on the sale room's side wall, and a
// panel on the end of the bus shelter. What is on them is the case's or the season's to say.
BLOCKS.push({ at: [1095, 316, 60, 6], wall: 40, roof: 0, shape: 'flat', walls: 'f-poster', top: 'f-wood', anchor: 'billboard-1', base: 18, posts: true });
// Bins: public litter bins at the bus stop, the hall, and the market corners; wheelie bins in the back gardens and
// beside the bakery. A bin is where things are thrown away, and where a detective finds them again.
const BINS: Array<[number, number, 'public' | 'wheelie', string]> = [
  [178, 516, 'public', 'f-bin-public'], [358, 433, 'public', 'f-bin-public'], [886, 605, 'public', 'f-bin-public'], [1152, 605, 'public', 'f-bin-public'],
  [713, 770, 'wheelie', 'f-bin-green'], [758, 770, 'wheelie', 'f-bin-grey'], [803, 770, 'wheelie', 'f-bin-green'], [848, 770, 'wheelie', 'f-bin-grey'], [524, 398, 'wheelie', 'f-bin-grey'],
];
/** A bin as the 30 degree view sees it, standing at (x, y) on the plan. */
function bin(x: number, y: number, kind: 'public' | 'wheelie', cls: string): Shape[] {
  if (kind === 'public') {
    // A short cylinder: its body, a dark band round it, and the rim of its open top.
    const [cx, cy] = iso(x, y);
    const [tx, ty] = iso(x, y, 13);
    const r = 5;
    return [
      { tag: 'path', attrs: { d: `M${cx - r},${cy} L${tx - r},${ty} A${r},${r * 0.5} 0 0 0 ${tx + r},${ty} L${cx + r},${cy} A${r},${r * 0.5} 0 0 1 ${cx - r},${cy} Z` }, cls },
      { tag: 'path', attrs: { d: `M${cx - r},${round(cy - 6)} A${r},${r * 0.5} 0 0 0 ${cx + r},${round(cy - 6)} L${cx + r},${round(cy - 8.5)} A${r},${r * 0.5} 0 0 1 ${cx - r},${round(cy - 8.5)} Z` }, cls: 'f-bin-lid' },
      { tag: 'ellipse', attrs: { cx: tx, cy: ty, rx: r, ry: r * 0.5 }, cls: 'f-bin-lid' },
    ];
  }
  // A wheelie bin: a tall body, a lid that overhangs at the front, 2 wheels at the back.
  const [w, d, h] = [8, 9, 15];
  const face = (list: Array<[number, number, number?]>, c: string): Shape => ({ tag: 'polygon', attrs: { points: pts(list.map(([a, b, z]) => iso(a, b, z ?? 0))) }, cls: c });
  return [
    face([[x + w, y], [x + w, y + d], [x + w, y + d, h], [x + w, y, h]], cls),
    face([[x + w, y], [x + w, y + d], [x + w, y + d, h], [x + w, y, h]], 'shade-2'),
    face([[x, y + d], [x + w, y + d], [x + w, y + d, h], [x, y + d, h]], cls),
    face([[x - 1, y - 1, h], [x + w + 1, y - 1, h], [x + w + 1, y + d + 2, h], [x - 1, y + d + 2, h]], 'f-bin-lid'),
    face([[x - 1, y + d + 2, h], [x + w + 1, y + d + 2, h], [x + w + 1, y + d + 2, h - 2], [x - 1, y + d + 2, h - 2]], 'f-bin-lid'),
    { tag: 'circle', attrs: { cx: iso(x + 1, y + 1)[0], cy: iso(x + 1, y + 1)[1], r: 2 }, cls: 'f-bin-lid' },
    { tag: 'circle', attrs: { cx: iso(x + w - 1, y + 1)[0], cy: iso(x + w - 1, y + 1)[1], r: 2 }, cls: 'f-bin-lid' },
  ];
}
/** The street's name, on a sign on a post at each end. */
const SIGNS: Array<[number, number]> = [[130, 414], [860, 414]];
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
  BLOCKS.push({ at: [x, y, 55, 60], wall: 22, roof: 10, shape: 'ridge', walls: 'f-wood', top: AWNINGS[i]!, anchor: `awning-${i + 1}` as Shape['anchor'] });
}

/**
 * Wear on 1 face of a roof, as patches inside it: grime or moss, and now and then a slipped tile with the dark battens
 * showing on a plain pitched roof. Each patch is the face shrunk toward a point inside it, so it never spills over an edge.
 */
function wearOn(face: Array<[number, number]>, seed: number, tiles: boolean): Shape[] {
  const n = face.length;
  const cx = face.reduce((a, p) => a + p[0], 0) / n;
  const cy = face.reduce((a, p) => a + p[1], 0) / n;
  const r = scatter(6, seed);
  const patch = (towards: number, pull: number, size: number): Array<[number, number]> => {
    const [vx, vy] = face[towards % n]!;
    const [px, py] = [cx + (vx - cx) * pull, cy + (vy - cy) * pull];
    return face.map(([x, y]) => [round(px + (x - cx) * size), round(py + (y - cy) * size)]);
  };
  const out: Shape[] = [{ tag: 'polygon', attrs: { points: pts(patch(Math.floor(r[0]! * n), 0.55, 0.28 + r[1]! * 0.12)) }, cls: r[2]! < 0.5 ? 'f-moss' : 'f-grime' }];
  if (tiles && r[3]! < 0.55) out.push({ tag: 'polygon', attrs: { points: pts(patch(Math.floor(r[4]! * n) + 1, 0.35, 0.07 + r[5]! * 0.04)) }, cls: 'f-battens' });
  return out;
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
export const cameraView = (c: (typeof CAMERAS)[number]): Array<[number, number]> => {
  const out: Array<[number, number]> = [[c.at[0], c.at[1]]];
  for (let k = 0; k <= 8; k++) {
    const a = c.aim - c.fov / 2 + (c.fov * k) / 8;
    out.push([round(c.at[0] + Math.cos(a) * c.range), round(c.at[1] + Math.sin(a) * c.range)]);
  }
  return out;
};

/** Weeds, where a real street grows them: along the kerbs, in the alley, at the yard's edge, round the hut. */
const WEEDS: Array<[number, number]> = [
  [150, 300], [158, 200], [148, 380], [300, 132], [430, 140], [478, 300], [512, 380], [475, 145], [868, 130],
  [70, 428], [380, 428], [640, 512], [820, 512], [1100, 612], [1162, 668], [1120, 672], [884, 598], [1150, 344],
  [600, 512], [210, 512], [700, 792], [395, 795],
];
/** A weed: a dark crack in the ground and a clump of filled leaf blades, in 2 greens, growing out of it. */
const BLADES: Array<[number, number, number]> = [[-6, -5, 0], [-3, -9, 1], [0, -11, 0], [3, -8, 1], [6, -4, 0]];
const weed = (x: number, y: number): Shape[] => [
  { tag: 'ellipse', attrs: { cx: x, cy: y + 1, rx: 7, ry: 2 }, cls: 'f-crack' },
  ...BLADES.map(([tx, ty, tone]): Shape => ({ tag: 'path', attrs: { d: `M${x},${y} Q${x + tx * 0.2 - 1.5},${y + ty * 0.55} ${x + tx},${y + ty} Q${x + tx * 0.2 + 1.5},${y + ty * 0.55} ${x},${y} Z` }, cls: tone ? 'f-weed-2' : 'f-weed' })),
];

/** Flat ground on the plan: [x, y, w, h, class]. */
const GROUND: Array<[number, number, number, number, string, Shape['anchor']?]> = [
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
/** How a tree is doing: in full leaf, in fruit, drying out, or holding a nest. */
type TreeKind = 'healthy' | 'apple' | 'orange' | 'dry' | 'nest' | 'bare';
/** [x, y, crown radius, height, kind, leaf class, anchor]. */
const TREES: Array<[number, number, number, number, TreeKind, string, Shape['anchor']?]> = [
  [275, 560, 26, 70, 'healthy', 'f-plane', 'tree-plane-1'],
  [335, 560, 26, 70, 'dry', 'f-leaf-dry', 'tree-plane-2'],
  [625, 572, 42, 92, 'nest', 'f-lime', 'tree-lime'],
  [700, 735, 16, 46, 'apple', 'f-plane'],
  [845, 735, 18, 50, 'orange', 'f-lime'],
  [1170, 690, 16, 52, 'dry', 'f-leaf-dry'],
  [60, 640, 20, 60, 'bare', 'f-bark'],
];
// A crown is several rounded clumps, each with its own light and shade, so its outline is uneven and it reads as
// standing in the scene, not as a ball. Offsets are in crown radii from the crown's middle; back clumps first.
const CLUMPS: Array<[number, number, number]> = [[0, -0.42, 0.58], [-0.5, -0.1, 0.55], [0.52, -0.08, 0.52], [-0.22, 0.32, 0.56], [0.3, 0.34, 0.52], [0, 0.02, 0.6]];
const SPARSE: Array<[number, number, number]> = [[-0.45, -0.25, 0.42], [0.4, -0.1, 0.4], [-0.05, 0.3, 0.44]];

/**
 * 1 tree, its crown centred on (cx, cy) in the picture, its foot at (fx, fy). The trunk tapers and is shaded on 1
 * side; a dry tree shows bare branches through a thin crown; fruit hangs in the crown; a nest sits on top with its bird.
 */
function tree(kind: TreeKind, leaf: string, cx: number, cy: number, rad: number, foot: [number, number] | null, anchor: Shape['anchor'] | undefined, snow: boolean): Shape[] {
  const out: Shape[] = [];
  if (foot) {
    const [fx, fy] = foot;
    const top = cy + rad * 0.35;
    out.push({ tag: 'polygon', attrs: { points: pts([[fx - 4, fy], [fx + 4, fy], [cx + 2, top], [cx - 2, top]]) }, cls: 'f-bark' });
    out.push({ tag: 'polygon', attrs: { points: pts([[fx, fy], [fx + 4, fy], [cx + 2, top], [cx, top]]) }, cls: 'shade-2' });
  }
  if (kind === 'bare') {
    // No leaves at all: the trunk forks into branches, and each branch forks again.
    const base: [number, number] = [cx, cy + rad * 0.45];
    for (const [dx, dy] of [[-0.9, -0.55], [0.85, -0.6], [0.05, -1.05], [-0.55, -0.05], [0.6, 0]] as const) {
      const end: [number, number] = [round(cx + dx * rad), round(cy + dy * rad)];
      out.push({ tag: 'path', attrs: { d: `M${round(base[0])},${round(base[1])} L${end[0]},${end[1]}`, fill: 'none' }, cls: 'branch' });
      for (const t of [-0.35, 0.35]) out.push({ tag: 'path', attrs: { d: `M${end[0]},${end[1]} l${round((dx + t) * rad * 0.35)},${round((dy - 0.3) * rad * 0.35)}`, fill: 'none' }, cls: 'twig' });
    }
    if (snow) out.push({ tag: 'path', attrs: { d: `M${round(cx - rad * 0.9)},${round(cy - rad * 0.55)} L${round(cx)},${round(cy + rad * 0.45)} L${round(cx + rad * 0.85)},${round(cy - rad * 0.6)}`, fill: 'none' }, cls: 'snow-line' });
    return out;
  }
  const dry = kind === 'dry';
  const clumps = dry ? SPARSE : CLUMPS;
  if (dry) {
    // Bare branches, showing where the leaves have gone.
    for (const [dx, dy] of [[-0.8, -0.5], [0.75, -0.55], [0.1, -0.9], [-0.6, 0.15], [0.65, 0.1]] as const) {
      out.push({ tag: 'path', attrs: { d: `M${round(cx)},${round(cy + rad * 0.3)} L${round(cx + dx * rad)},${round(cy + dy * rad)}`, fill: 'none' }, cls: 'branch' });
    }
  }
  const circle = (dx: number, dy: number, r: number) => ({ cx: round(cx + dx * rad), cy: round(cy + dy * rad), r: round(r * rad) });
  for (const [dx, dy, r] of clumps) out.push({ tag: 'circle', attrs: circle(dx, dy, r), cls: `${leaf} cloud-edge` });
  clumps.forEach(([dx, dy, r], i) => {
    const c = circle(dx, dy, r);
    out.push({ tag: 'circle', attrs: c, cls: `${leaf} cloud-fill`, anchor: i === clumps.length - 1 ? anchor : undefined });
    // Shade on the lower right of each clump, light on the upper left.
    out.push({ tag: 'path', attrs: { d: `M${round(c.cx + c.r)},${c.cy} A${c.r},${c.r} 0 0 1 ${c.cx},${round(c.cy + c.r)} A${round(c.r * 0.82)},${round(c.r * 0.82)} 0 0 0 ${round(c.cx + c.r)},${c.cy} Z` }, cls: 'shade-2' });
    out.push({ tag: 'circle', attrs: { cx: round(c.cx - c.r * 0.35), cy: round(c.cy - c.r * 0.35), r: round(c.r * 0.32) }, cls: 'f-leaf-light' });
  });
  if (kind === 'apple' || kind === 'orange') {
    for (const [dx, dy] of [[-0.45, 0.05], [0.2, -0.3], [0.45, 0.25], [-0.15, 0.4], [0.05, 0.05], [-0.55, -0.35]] as const) {
      out.push({ tag: 'circle', attrs: { cx: round(cx + dx * rad), cy: round(cy + dy * rad), r: Math.max(2.4, round(rad * 0.13)) }, cls: kind === 'apple' ? 'f-fruit-red' : 'f-fruit-orange' });
    }
  }
  if (kind === 'nest') {
    // A nest of twigs in the top of the crown, and its bird.
    const [nx, ny] = [round(cx + rad * 0.15), round(cy - rad * 0.78)];
    out.push({ tag: 'ellipse', attrs: { cx: nx, cy: ny, rx: round(rad * 0.3), ry: round(rad * 0.14) }, cls: 'f-nest' });
    for (const k of [-1, 0, 1]) out.push({ tag: 'path', attrs: { d: `M${nx - rad * 0.28},${ny + k * 2} L${nx + rad * 0.28},${ny - k * 2}`, fill: 'none' }, cls: 'thin' });
    out.push({ tag: 'ellipse', attrs: { cx: nx + 3, cy: ny - 6, rx: 6, ry: 4.5 }, cls: 'f-bird' });
    out.push({ tag: 'circle', attrs: { cx: nx + 8, cy: ny - 9, r: 3 }, cls: 'f-bird' });
  }
  if (snow) out.push({ tag: 'ellipse', attrs: { cx: round(cx), cy: round(cy - rad * 0.55), rx: round(rad * 0.9), ry: round(rad * 0.4) }, cls: 'f-snow-cap' });
  return out;
}
const LAMPS: Array<[number, number]> = [[100, 424], [420, 424], [700, 424], [880, 334], [240, 516], [600, 516], [880, 606], [1160, 606]];
const LAMP_H = 64;

const quad = (x: number, y: number, w: number, h: number, z = 0): Array<[number, number]> => [iso(x, y, z), iso(x + w, y, z), iso(x + w, y + h, z), iso(x, y + h, z)];

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

/** The shadow a block casts on the ground: its footprint swept away from the sun, as 1 outline. */
function shadow(b: Block, sun: ReturnType<typeof sunAt>, plan = false): Array<[number, number]> {
  const [x, y, w, h] = b.at;
  const len = Math.min(220, (b.wall + b.roof * 0.6) / Math.tan(sun.elevation));
  // East is +x and south is +y on the plan: the shadow falls away from where the sun stands.
  const dx = -Math.cos(sun.azimuth) * len;
  const dy = -Math.sin(sun.azimuth) * len * 0.6;
  const corners: Array<[number, number]> = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const out = hull([...corners, ...corners.map(([a, c]): [number, number] => [a + dx, c + dy])]);
  return plan ? out : out.map(([a, c]) => iso(a, c));
}

function hull(points: Array<[number, number]>): Array<[number, number]> {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Array<[number, number]> = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: Array<[number, number]> = [];
  for (const q of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** A block: the walls that face the player, then the roof, then what is on the street-facing wall. */
function block(b: Block, wet: Wet = {}): Shape[] {
  const [x, y, w, h] = b.at;
  const base = b.base ?? 0;
  const iso2 = (px: number, py: number, pz = 0) => iso(px, py, pz + base);
  const quad2 = (qx: number, qy: number, qw: number, qh: number, qz = 0) => quad(qx, qy, qw, qh, qz + base);
  const z = b.wall;
  const out: Shape[] = [];
  if (b.posts) for (const px of [x + 6, x + w - 6]) out.push({ tag: 'line', attrs: { x1: iso(px, y + h)[0], y1: iso(px, y + h)[1], x2: iso2(px, y + h)[0], y2: iso2(px, y + h)[1] }, cls: 'post' });
  const south = [iso2(x, y + h), iso2(x + w, y + h), iso2(x + w, y + h, z), iso2(x, y + h, z)];
  const east = [iso2(x + w, y), iso2(x + w, y + h), iso2(x + w, y + h, z), iso2(x + w, y, z)];
  out.push({ tag: 'polygon', attrs: { points: pts(east) }, cls: b.walls });
  out.push({ tag: 'polygon', attrs: { points: pts(east) }, cls: 'shade-2' });
  out.push({ tag: 'polygon', attrs: { points: pts(south) }, cls: b.walls });
  out.push({ tag: 'polygon', attrs: { points: pts(south) }, cls: 'shade-1' });
  // A poster pasted on the east wall: a clean graphic, 2 blocks of colour, no words.
  if (b.poster) {
    const [p0, p1, z0, z1] = [y + h * 0.2, y + h * 0.8, z * 0.2, z * 0.85];
    out.push({ tag: 'polygon', attrs: { points: pts([iso2(x + w, p0, z0), iso2(x + w, p1, z0), iso2(x + w, p1, z1), iso2(x + w, p0, z1)]) }, cls: 'f-poster', anchor: b.poster });
    out.push({ tag: 'polygon', attrs: { points: pts([iso2(x + w, p0, z0), iso2(x + w, p1, z0), iso2(x + w, p1, z0 + (z1 - z0) * 0.3), iso2(x + w, p0, z0 + (z1 - z0) * 0.3)]) }, cls: 'f-blue' });
    out.push({ tag: 'polygon', attrs: { points: pts([iso2(x + w, p0 + (p1 - p0) * 0.15, z0 + (z1 - z0) * 0.5), iso2(x + w, p0 + (p1 - p0) * 0.4, z0 + (z1 - z0) * 0.5), iso2(x + w, p0 + (p1 - p0) * 0.4, z1 - (z1 - z0) * 0.12), iso2(x + w, p0 + (p1 - p0) * 0.15, z1 - (z1 - z0) * 0.12)]) }, cls: 'f-terracotta' });
  }
  // The hoarding's own face: the same clean graphic.
  if (b.posts) {
    out.push({ tag: 'polygon', attrs: { points: pts([iso2(x, y + h), iso2(x + w, y + h), iso2(x + w, y + h, z * 0.3), iso2(x, y + h, z * 0.3)]) }, cls: 'f-blue' });
    out.push({ tag: 'polygon', attrs: { points: pts([iso2(x + w * 0.1, y + h, z * 0.45), iso2(x + w * 0.38, y + h, z * 0.45), iso2(x + w * 0.38, y + h, z * 0.88), iso2(x + w * 0.1, y + h, z * 0.88)]) }, cls: 'f-terracotta' });
  }
  // The house number, on a plaque beside the door.
  if (b.number != null && b.door) {
    const px = b.door[0] + b.door[1] + 4;
    out.push({ tag: 'polygon', attrs: { points: pts([iso2(px, y + h, 22), iso2(px + 10, y + h, 22), iso2(px + 10, y + h, 30), iso2(px, y + h, 30)]) }, cls: 'f-plaque' });
    out.push(onSouthWall(px + (b.number > 9 ? 1.2 : 3), y + h, 23.4 + base, String(b.number), 6, 'plaque-words'));
  }
  // In a flood the water stands against the walls, and leaves its line on them.
  if (wet.flood && base === 0) {
    const d = 12;
    out.push({ tag: 'polygon', attrs: { points: pts([iso2(x + w, y), iso2(x + w, y + h), iso2(x + w, y + h, d), iso2(x + w, y, d)]) }, cls: 'f-water' });
    out.push({ tag: 'polygon', attrs: { points: pts([iso2(x, y + h), iso2(x + w, y + h), iso2(x + w, y + h, d), iso2(x, y + h, d)]) }, cls: 'f-water' });
  }

  // Windows in rows on the street-facing (south) wall, lit at night. A door, and the hall's clock.
  for (let row = 0; row < (b.windows ?? 0); row++) {
    const z0 = 14 + row * 38;
    for (let wx = x + 14; wx + 16 <= x + w - 10; wx += 34) {
      if (b.door && wx + 16 > b.door[0] - 4 && wx < b.door[0] + b.door[1] + (b.number != null ? 18 : 4) && row === 0) continue;
      out.push({ tag: 'polygon', attrs: { points: pts([iso2(wx, y + h, z0), iso2(wx + 16, y + h, z0), iso2(wx + 16, y + h, z0 + 22), iso2(wx, y + h, z0 + 22)]) }, cls: (wx * 7 + row * 3) % 5 < 2 ? 'f-window-lit' : 'f-window' });
    }
  }
  if (b.door) {
    const [dx, dw] = b.door;
    out.push({ tag: 'polygon', attrs: { points: pts([iso2(dx, y + h), iso2(dx + dw, y + h), iso2(dx + dw, y + h, 30), iso2(dx, y + h, 30)]) }, cls: 'f-wood' });
    // The step in front of the door: where a season leaves its pumpkins and its parcels.
    out.push({ tag: 'polygon', attrs: { points: pts(quad2(dx - 6, y + h, dw + 12, 10, 4)) }, cls: 'f-stone', anchor: b.doorAnchor });
  }
  if (b.clock != null) {
    const [cx, cy] = iso2(b.clock, y + h, z - 16);
    out.push({ tag: 'ellipse', attrs: { cx, cy, rx: 11, ry: 12 }, cls: 'f-clock' });
    out.push({ tag: 'path', attrs: { d: `M${cx},${cy} L${cx},${cy - 7} M${cx},${cy} L${cx + 5},${cy + 2}`, fill: 'none' } });
  }

  const roof = (cls: string, list: Array<[number, number]>, anchor?: Shape['anchor']) => {
    out.push({ tag: 'polygon', attrs: { points: pts(list) }, cls, anchor });
    if (b.wear != null) out.push(...wearOn(list, b.wear + out.length, b.shape === 'ridge'));
    // Snow lies on every slope.
    if (wet.snow) out.push({ tag: 'polygon', attrs: { points: pts(list) }, cls: 'f-snow-cap' });
  };
  if (b.shape === 'flat' || b.roof === 0) roof(b.top, quad2(x, y, w, h, z), b.anchor);
  else if (b.shape === 'ridge') {
    // The ridge runs along the longer side.
    const along = w >= h;
    const r = z + b.roof;
    if (along) {
      const m = y + h / 2;
      roof(b.top, [iso2(x, y, z), iso2(x + w, y, z), iso2(x + w, m, r), iso2(x, m, r)]);
      out.push({ tag: 'polygon', attrs: { points: pts([iso2(x + w, y, z), iso2(x + w, y + h, z), iso2(x + w, m, r)]) }, cls: b.walls });
      roof(b.top, [iso2(x, m, r), iso2(x + w, m, r), iso2(x + w, y + h, z), iso2(x, y + h, z)], b.anchor);
    } else {
      const m = x + w / 2;
      roof(b.top, [iso2(x, y, z), iso2(m, y, r), iso2(m, y + h, r), iso2(x, y + h, z)]);
      out.push({ tag: 'polygon', attrs: { points: pts([iso2(x, y + h, z), iso2(x + w, y + h, z), iso2(m, y + h, r)]) }, cls: b.walls });
      roof(b.top, [iso2(m, y, r), iso2(x + w, y, z), iso2(x + w, y + h, z), iso2(m, y + h, r)], b.anchor);
      out.push({ tag: 'polygon', attrs: { points: pts([iso2(m, y, r), iso2(x + w, y, z), iso2(x + w, y + h, z), iso2(m, y + h, r)]) }, cls: 'shade-1' });
    }
  } else {
    // A hip roof: 2 long slopes meeting at a ridge, and a triangle at each end. From above all 4 show; the back first.
    const r = z + b.roof;
    const inset = Math.min(w, h) / 2;
    if (w >= h) {
      const [a, c] = [iso2(x + inset, y + h / 2, r), iso2(x + w - inset, y + h / 2, r)];
      roof(b.top, [iso2(x, y, z), iso2(x + w, y, z), c, a]);
      roof(b.top, [iso2(x, y, z), iso2(x, y + h, z), a]);
      roof(b.top, [iso2(x + w, y, z), iso2(x + w, y + h, z), c]);
      out.push({ tag: 'polygon', attrs: { points: pts([iso2(x + w, y, z), iso2(x + w, y + h, z), c]) }, cls: 'shade-1' });
      roof(b.top, [a, c, iso2(x + w, y + h, z), iso2(x, y + h, z)], b.anchor);
    } else {
      const [a, c] = [iso2(x + w / 2, y + inset, r), iso2(x + w / 2, y + h - inset, r)];
      roof(b.top, [iso2(x, y, z), iso2(x + w, y, z), a]);
      roof(b.top, [iso2(x, y, z), a, c, iso2(x, y + h, z)]);
      roof(b.top, [iso2(x + w, y, z), iso2(x + w, y + h, z), c, a]);
      out.push({ tag: 'polygon', attrs: { points: pts([iso2(x + w, y, z), iso2(x + w, y + h, z), c, a]) }, cls: 'shade-1' });
      roof(b.top, [iso2(x, y + h, z), iso2(x + w, y + h, z), c], b.anchor);
    }
  }
  if (b.chimney) out.push(...block({ at: [x + w - 50, y + 12, 20, 20], wall: 34, roof: 0, shape: 'flat', walls: 'f-brick', top: 'f-wood', base: base + z + b.roof * 0.4 }, wet).filter((s) => !s.anchor));
  return out;
}

/** Deterministic scatter, so a drawing is the same every time it is made. */
const scatter = (n: number, seed: number) => {
  let s = seed;
  return Array.from({ length: n }, () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  });
};

/**
 * The street at an hour, on a date, in a weather. Night is the theme's to show: the shapes carry classes, and the dark
 * theme's values light the lamps and the windows. The sun is drawn for the light theme, the moon for the dark.
 */
/** The numbers of the houses a case has fenced off along their fronts: a fence is the case's to put up. */
const fenceFor = (fenced: readonly number[]) => BLOCKS.filter((b) => b.number != null && fenced.includes(b.number));
/** Where a building's front fence runs on the plan: the side that faces the street, a step out from the wall. */
const fenceLine = (b: Block): [number, number, number] => {
  const [x, y, w, h] = b.at;
  return y + h < 470 ? [x, y + h + 7, w] : [x, y - 6, w];
};

export function drawStreet({ hour = 15, date = new Date(Date.UTC(2026, 9, 19)), weather = 'clear', fenced = [] }: { hour?: number; date?: Date; weather?: Weather; fenced?: readonly number[] } = {}): Scene {
  const width = Math.ceil((1200 + 800) * COS + PAD * 2);
  const height = Math.ceil((1200 + 800) * SIN + SKY + PAD);
  const shapes: Shape[] = [];
  // Rain, fog, storm, flood and falling snow all come from cloud: no sun, no moon, no stars.
  const grey = weather !== 'clear';
  const wet: Wet = { snow: weather === 'snow', flood: weather === 'flood' };
  const full = (cls: string): Shape => ({ tag: 'polygon', attrs: { points: pts([[0, 0], [width, 0], [width, height], [0, height]]) }, cls });
  const sun = sunAt(hour);

  // No horizon: seen from above, the land runs to every edge. The sky is in the clouds over the town and in the dial.
  shapes.push(full('f-land'));


  for (const [x, y, w, h, cls, anchor] of GROUND) shapes.push({ tag: 'polygon', attrs: { points: pts(quad(x, y, w, h)) }, cls, anchor });
  // Parking lines in the yard, and the fences between the back gardens.
  for (let lx = 530; lx <= 830; lx += 60) shapes.push({ tag: 'line', attrs: { x1: iso(lx, 60)[0], y1: iso(lx, 60)[1], x2: iso(lx, 130)[0], y2: iso(lx, 130)[1] }, cls: 'thin' });
  for (const fx of [725, 770, 815]) shapes.push({ tag: 'line', attrs: { x1: iso(fx, 700)[0], y1: iso(fx, 700)[1], x2: iso(fx, 790)[0], y2: iso(fx, 790)[1] }, cls: 'fence' });

  for (const [x, y] of WEEDS) {
    const [wx, wy] = iso(x, y);
    shapes.push(...weed(wx, wy));
  }

  // What lies on the ground, under everything standing.
  if (weather === 'rain' || weather === 'storm') {
    shapes.push({ tag: 'polygon', attrs: { points: pts(quad(0, 430, 1200, 80)) }, cls: 'f-wet' });
    scatter(10, 11).forEach((v, i) => {
      const [px, py] = iso(60 + v * 1080, 445 + (i % 3) * 22);
      shapes.push({ tag: 'ellipse', attrs: { cx: px, cy: py, rx: 22, ry: 7 }, cls: 'f-puddle' });
    });
  }
  if (weather === 'snow') {
    shapes.push({ tag: 'polygon', attrs: { points: pts(quad(0, 0, 1200, 800)) }, cls: 'f-snow-ground' });
    // 2 wheel tracks down the street, where the snow is pressed to slush.
    for (const ty of [455, 485]) shapes.push({ tag: 'polygon', attrs: { points: pts(quad(0, ty, 1200, 7)) }, cls: 'f-slush' });
  }
  if (weather === 'flood') {
    shapes.push({ tag: 'polygon', attrs: { points: pts(quad(0, 0, 1200, 800)) }, cls: 'f-flood' });
    scatter(26, 5).forEach((v, i) => {
      const [px, py] = iso(40 + v * 1120, 40 + ((i * 97) % 720));
      shapes.push({ tag: 'path', attrs: { d: `M${px - 18},${py} q9,-5 18,0 t18,0`, fill: 'none' }, cls: 'ripple' });
    });
  }
  // The shadows the sun casts.
  if (sun.up && !grey) for (const b of BLOCKS) shapes.push({ tag: 'polygon', attrs: { points: pts(shadow(b, sun)) }, cls: 'f-shadow' });

  // Everything standing, from the back of the street to the front, so nearer things cover farther ones.
  const lean = weather === 'storm' ? 14 : 0;
  const standing: Array<{ depth: number; shapes: Shape[] }> = [];
  for (const b of BLOCKS) standing.push({ depth: b.at[0] + b.at[2] + b.at[1] + b.at[3], shapes: block(b, wet) });
  for (const [x, y, rad, hgt, kind, leaf, anchor] of TREES) {
    const foot = iso(x, y);
    const [tx0, ty] = iso(x, y, hgt);
    // In a storm the crowns are pushed over by the wind.
    const tx = tx0 + lean;
    const cast: Shape[] = sun.up && !grey ? [{ tag: 'ellipse', attrs: { cx: round(foot[0] - Math.cos(sun.azimuth) * rad * 1.4), cy: round(foot[1] + 4), rx: round(rad * 1.3), ry: round(rad * 0.5) }, cls: 'f-shadow' }] : [];
    standing.push({ depth: x + y + rad, shapes: [...cast, ...tree(kind, leaf, tx, ty, rad * 1.15, foot, anchor, !!wet.snow)] });
  }
  LAMPS.forEach(([x, y], i) => {
    // A modern street light: a tall pole, an arm curving out over the road, a flat head shining down.
    const toward = y < 470 ? 1 : -1;
    const [bx, by] = iso(x, y);
    const [tx, ty] = iso(x, y, LAMP_H);
    const [hx, hy] = iso(x, y + toward * 16, LAMP_H + 4);
    const [gx, gy] = iso(x, y + toward * 20);
    standing.push({
      depth: x + y,
      shapes: [
        // The pool of light it throws on the road at night; in fog it spreads wide.
        { tag: 'ellipse', attrs: { cx: gx, cy: gy, rx: weather === 'fog' ? 52 : 34, ry: weather === 'fog' ? 28 : 18 }, cls: 'glow' },
        { tag: 'line', attrs: { x1: bx, y1: by, x2: tx, y2: ty }, cls: 'post' },
        { tag: 'path', attrs: { d: `M${tx},${ty} Q${tx},${round(ty - 8)} ${hx},${hy}`, fill: 'none' }, cls: 'post' },
        { tag: 'polygon', attrs: { points: pts([iso(x - 5, y + toward * 12, LAMP_H + 3), iso(x + 5, y + toward * 12, LAMP_H + 3), iso(x + 5, y + toward * 22, LAMP_H + 3), iso(x - 5, y + toward * 22, LAMP_H + 3)]) }, cls: 'f-lamp-head' },
        { tag: 'polygon', attrs: { points: pts([iso(x - 4, y + toward * 13, LAMP_H + 1), iso(x + 4, y + toward * 13, LAMP_H + 1), iso(x + 4, y + toward * 21, LAMP_H + 1), iso(x - 4, y + toward * 21, LAMP_H + 1)]) }, cls: 'f-ochre', anchor: `lamp-${i + 1}` as Shape['anchor'] },
      ],
    });
  });
  for (const [x, y, kind, cls] of BINS) standing.push({ depth: x + y + 9, shapes: bin(x, y, kind, cls) });
  for (const c of CAMERAS) {
    const [x, y] = c.at;
    const [wx, wy] = iso(x, y, c.z);
    const [lx, ly] = iso(x + Math.cos(c.aim) * 9, y + Math.sin(c.aim) * 9, c.z - 3);
    standing.push({
      depth: x + y + 1,
      shapes: [
        { tag: 'line', attrs: { x1: wx, y1: wy, x2: round((wx + lx) / 2), y2: round((wy + ly) / 2) }, cls: 'post' },
        { tag: 'polygon', attrs: { points: pts([[round((wx + lx) / 2 - 3), round((wy + ly) / 2 - 3)], [lx + 2, ly - 2], [lx + 1, ly + 3], [round((wx + lx) / 2 - 4), round((wy + ly) / 2 + 2)]]) }, cls: 'f-camera' },
        { tag: 'circle', attrs: { cx: lx + 1, cy: ly, r: 1.6 }, cls: 'f-camera-eye' },
      ],
    });
  }
  for (const b of fenceFor(fenced)) {
    const [fx, fy, fw] = fenceLine(b);
    const out: Shape[] = [];
    for (let px = fx; px <= fx + fw; px += 6) out.push({ tag: 'line', attrs: { x1: iso(px, fy)[0], y1: iso(px, fy)[1], x2: iso(px, fy, 13)[0], y2: iso(px, fy, 13)[1] }, cls: 'picket' });
    for (const z of [4, 10]) out.push({ tag: 'line', attrs: { x1: iso(fx, fy, z)[0], y1: iso(fx, fy, z)[1], x2: iso(fx + fw, fy, z)[0], y2: iso(fx + fw, fy, z)[1] }, cls: 'picket' });
    standing.push({ depth: fx + fw + fy, shapes: out });
  }
  for (const [x, y] of SIGNS) {
    const [bx, by] = iso(x, y);
    const [tx, ty] = iso(x, y, 34);
    standing.push({
      depth: x + y,
      shapes: [
        { tag: 'line', attrs: { x1: bx, y1: by, x2: tx, y2: ty }, cls: 'post' },
        { tag: 'polygon', attrs: { points: pts([iso(x - 18, y, 34), iso(x + 18, y, 34), iso(x + 18, y, 44), iso(x - 18, y, 44)]) }, cls: 'f-sign' },
        onSouthWall(x - 15, y, 37, STREET_NAME, 4.6, 'sign-words'),
      ],
    });
  }
  standing.sort((a, b) => a.depth - b.depth);
  // Fog lies thicker the farther off a thing is: a thin veil between each band of depth, so the back of the street fades.
  const veils = weather === 'fog' ? [0, 600, 900, 1200, 1500] : [];
  let v = 0;
  for (const s of standing) {
    while (v < veils.length && s.depth >= veils[v]!) {
      shapes.push(full('f-fog'));
      v++;
    }
    shapes.push(...s.shapes);
  }

  // What falls, over everything.
  if (weather === 'rain' || weather === 'storm' || weather === 'flood') {
    const n = weather === 'storm' ? 200 : weather === 'flood' ? 90 : 140;
    const slant = weather === 'storm' ? 18 : 7;
    const ys = scatter(n, 23);
    scatter(n, 7).forEach((x, i) => {
      const x1 = round(x * width);
      const y1 = round(ys[i]! * height);
      shapes.push({ tag: 'line', attrs: { x1, y1, x2: round(x1 - slant), y2: round(y1 + 22) }, cls: 'rain' });
    });
  }
  if (weather === 'storm') {
    // Papers and leaves torn loose, blown down the street.
    const ys = scatter(24, 31);
    scatter(24, 13).forEach((x, i) => {
      const [px, py] = iso(80 + x * 1040, 300 + ys[i]! * 360, 20 + ((i * 37) % 90));
      shapes.push({ tag: 'polygon', attrs: { points: pts([[px, py], [px + 9, py - 3], [px + 11, py + 5], [px + 2, py + 8]]) }, cls: i % 2 ? 'f-ochre-dim' : 'f-sage' });
    });
  }
  if (weather === 'snow') {
    const ys = scatter(170, 41);
    scatter(170, 17).forEach((x, i) => shapes.push({ tag: 'circle', attrs: { cx: round(x * width), cy: round(ys[i]! * height), r: 1.8 + (i % 3) * 0.7 }, cls: 'f-flake' }));
  }

  // Clouds in the air over the town, each with its shadow on the ground below it: a few white ones on a fair day, more
  // and grey when it rains, snows or storms. They keep to the open land, never over the street, so it always reads.
  const clouds: Array<[number, number, number]> = grey
    ? [[0.38, 50, 78], [0.62, 40, 72], [0.1, 960, 72], [0.88, 1060, 76], [0.4, 1170, 66]]
    : [[0.2, 150, 58], [0.62, 90, 46], [0.82, 420, 52]];
  // A cloud: rounded lobes over a flat base, with 1 outline round the outside. The lobes are drawn twice, outlined
  // and then filled over, so no line crosses the inside. A shadow is the same shape, with no line at all.
  const LOBES = [[-0.95, 0.08, 0.52, 0.4], [-0.42, -0.2, 0.6, 0.52], [0.25, -0.3, 0.66, 0.58], [0.85, -0.02, 0.5, 0.42], [0, 0.22, 1.4, 0.26]] as const;
  const puff = (cx: number, cy: number, size: number, cls: string) => {
    const lobe = (extra: string) => {
      for (const [dx, dy, rx, ry] of LOBES) shapes.push({ tag: 'ellipse', attrs: { cx: round(cx + dx * size), cy: round(cy + dy * size), rx: round(rx * size), ry: round(ry * size) }, cls: `${cls} ${extra}` });
    };
    if (cls !== 'f-cloud-shadow') lobe('cloud-edge');
    lobe('cloud-fill');
    // Lit from above: the flat underside is in its own shadow.
    if (cls !== 'f-cloud-shadow') {
      const [, by, brx, bry] = LOBES[4];
      const [ux, uy, ur, uh] = [cx, cy + by * size, brx * size, bry * size];
      shapes.push({ tag: 'path', attrs: { d: `M${round(ux - ur)},${round(uy)} A${round(ur)},${round(uh)} 0 0 0 ${round(ux + ur)},${round(uy)} Z` }, cls: 'shade-2' });
    }
  };
  if (weather !== 'fog') {
    for (const [cx, cy, size] of clouds) puff(cx * width + 60, cy + 150, size, 'f-cloud-shadow');
    for (const [cx, cy, size] of clouds) puff(cx * width, cy, size, grey ? 'f-cloud-grey' : 'f-cloud');
  }

  if (weather === 'storm') {
    // A tornado always stands on the ground. Its foot is on the fields west of the town, past the end of the road, on
    // the plan at (-80, 630): there it throws a shadow and churns a cloud of dust and debris. From there it rises the
    // whole height of the picture, a cone narrow at the ground and broad where it leaves the lowered wall cloud under
    // the storm, grey above and brown below with the dust it lifts. Behind it, across the fields and away from the
    // street, the path it has torn. Rain falls in shafts to one side.
    const [gx, gy] = iso(-80, 630);
    const [tx, ty] = [gx + 40, 64];
    const steps = 30;
    const at = (f: number): [number, number, number] => [tx + (gx - tx) * f + Math.sin(f * Math.PI) * 18, ty + (gy - ty) * f, 64 * (1 - f) ** 1.4 + 9];
    // The path it has torn, running back toward the far corner of the fields.
    const trail = scatter(26, 91);
    scatter(26, 59).forEach((v, i) => {
      const [px, py] = iso(-80 - v * 340, 630 + v * 120 + (trail[i]! - 0.5) * 50);
      shapes.push({ tag: 'polygon', attrs: { points: pts([[px, py], [px + 6, py - 2], [px + 7, py + 3], [px + 1, py + 4]]) }, cls: i % 3 ? 'f-bark' : 'f-dust' });
    });
    for (let k = 0; k < 7; k++) shapes.push({ tag: 'line', attrs: { x1: tx - 150 + k * 18, y1: ty + 10, x2: tx - 190 + k * 18, y2: gy - 30 }, cls: 'shaft' });
    shapes.push({ tag: 'ellipse', attrs: { cx: gx + 12, cy: gy + 6, rx: 46, ry: 14 }, cls: 'f-shadow-storm' });
    const outline = (f0: number, f1: number): Array<[number, number]> => {
      const left: Array<[number, number]> = [];
      const right: Array<[number, number]> = [];
      for (let k = 0; k <= steps; k++) {
        const [cx, cy, rx] = at(f0 + ((f1 - f0) * k) / steps);
        left.push([round(cx - rx), round(cy)]);
        right.unshift([round(cx + rx), round(cy)]);
      }
      return [...left, ...right];
    };
    shapes.push({ tag: 'polygon', attrs: { points: pts(outline(0, 0.72)) }, cls: 'f-funnel' });
    shapes.push({ tag: 'polygon', attrs: { points: pts(outline(0.7, 1)) }, cls: 'f-funnel-dust' });
    for (const [f0, f1] of [[0.04, 0.2], [0.18, 0.36], [0.34, 0.52], [0.5, 0.68], [0.66, 0.84]] as const) {
      const [ax, ay, ar] = at(f0);
      const [bx, by, br] = at(f1);
      shapes.push({ tag: 'path', attrs: { d: `M${round(ax - ar * 0.9)},${round(ay)} Q${round((ax + bx) / 2)},${round((ay + by) / 2 + 8)} ${round(bx + br * 0.9)},${round(by)}`, fill: 'none' }, cls: 'band' });
    }
    // The dust and debris churning at its foot.
    for (const [ox, oy, sz] of [[-30, -4, 22], [16, -8, 26], [-6, -24, 20], [40, 0, 18]] as const) puff(gx + ox, gy + oy, sz, 'f-dust');
    const bits = scatter(12, 83);
    scatter(12, 47).forEach((v, i) => shapes.push({ tag: 'circle', attrs: { cx: round(gx - 70 + v * 140), cy: round(gy - 90 + bits[i]! * 70), r: 1.5 + (i % 3) * 0.5 }, cls: 'f-bark' }));
    // The lowered wall cloud it comes out of, under a long dark storm base.
    for (const [ox, oy, sz] of [[-230, -10, 54], [-130, -18, 66], [-20, -6, 74], [90, -16, 64], [190, -8, 52]] as const) puff(tx + ox, ty - 20 + oy, sz, 'f-wall-cloud');
  }
  // The sky dial, in the corner: the sun on its arc by the player's hour, or tonight's moon among a few stars. When it
  // is overcast the dial is grey, because nobody on the street can see either.
  const [dx, dy, dr] = [width - 96, 96, 62];
  shapes.push({ tag: 'circle', attrs: { cx: dx, cy: dy, r: dr }, cls: grey ? 'f-dial-grey' : 'f-dial' });
  shapes.push({ tag: 'path', attrs: { d: `M${dx - dr + 10},${dy + 22} L${dx + dr - 10},${dy + 22}`, fill: 'none' }, cls: 'thin' });
  if (!grey) {
    const t = Math.min(1, Math.max(0, (hour - 6) / 12));
    // East is where the sun comes up: the right of the dial, as on the map.
    const [sx, sy] = [dx + (dr - 18) * Math.cos(Math.PI * t), dy + 22 - (dr - 16) * Math.sin(Math.PI * t)];
    if (sun.up) shapes.push({ tag: 'circle', attrs: { cx: round(sx), cy: round(sy), r: 12 }, cls: sun.elevation < 0.45 ? 'f-sun-dawn' : 'f-sun' });
    const ys = scatter(9, 53);
    scatter(9, 29).forEach((x, i) => shapes.push({ tag: 'circle', attrs: { cx: round(dx - 40 + x * 80), cy: round(dy - 40 + ys[i]! * 52), r: i % 3 ? 1.2 : 1.8 }, cls: 'f-star' }));
    const n = ((hour + 6) % 24) / 24;
    const [mx, my] = [dx + (dr - 18) * Math.cos(Math.PI * n), dy + 22 - (dr - 16) * Math.sin(Math.PI * n)];
    const phase = moonPhase(date);
    // The lit part of the moon, from the phase: a crescent grows into a full disc and back.
    const r = 12;
    const k = Math.cos(phase * 2 * Math.PI) * r;
    const waxing = phase < 0.5;
    shapes.push({ tag: 'circle', attrs: { cx: round(mx), cy: round(my), r }, cls: 'f-moon-dark' });
    shapes.push({ tag: 'path', attrs: { d: `M${round(mx)},${round(my - r)} A${r},${r} 0 0 ${waxing ? 1 : 0} ${round(mx)},${round(my + r)} A${round(Math.abs(k))},${r} 0 0 ${(k > 0) === waxing ? 0 : 1} ${round(mx)},${round(my - r)} Z` }, cls: 'f-moon' });
  }

  // Birds cross over the town in the early morning and the early evening, on a fair day.
  if (!grey && ((hour >= 6 && hour < 9) || (hour >= 16 && hour < 19))) {
    const ys = scatter(7, 61);
    scatter(7, 37).forEach((x, i) => {
      const bx = round(width * (0.3 + x * 0.25));
      const by = round(80 + ys[i]! * 90);
      const w = 7 + (i % 3) * 2;
      shapes.push({ tag: 'path', attrs: { d: `M${bx - w},${by - 3} Q${bx - w / 2},${by - 7} ${bx},${by} Q${bx + w / 2},${by - 7} ${bx + w},${by - 3}`, fill: 'none' }, cls: 'bird' });
    });
  }

  // Open sky over the rooftops, where a season puts what flies.
  const skyBoxes: Array<[number, number, number, number]> = [[120, 40, 260, 120], [width / 2 - 130, 30, 260, 110], [width - 420, 260, 260, 120]];
  skyBoxes.forEach(([x, y, w, h], i) => shapes.push({ tag: 'polygon', attrs: { points: pts([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]), fill: 'none', stroke: 'none' }, anchor: `sky-${i + 1}` as Shape['anchor'] }));

  const places = Object.fromEntries(
    PLACE_IDS.map((id) => {
      const [px, py] = PLACES[id].at;
      // A place inside a building is pinned on its roof, so the pin stands clear of the walls.
      const on = BLOCKS.find((b) => px >= b.at[0] && px <= b.at[0] + b.at[2] && py >= b.at[1] && py <= b.at[1] + b.at[3]);
      return [id, iso(px, py, on ? on.wall + on.roof : 0)];
    }),
  ) as Record<PlaceId, [number, number]>;
  return { width, height, shapes, places };
}

/**
 * The same street seen straight down: the plan routes are drawn on (design/sketches/map/the-street.html). Made from the
 * same blocks as the 30 degree view, so the 2 can never disagree. Roads first, buildings as blocks that frame them,
 * and each slope of a roof its own flat tone, so a roof reads as a volume from above.
 */
export function drawPlan({ hour = 15, fenced = [] }: { hour?: number; fenced?: readonly number[] } = {}): Scene {
  const width = MAP_W;
  const height = MAP_H;
  const shapes: Shape[] = [];
  const box = (x: number, y: number, w: number, h: number): string => pts([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
  shapes.push({ tag: 'polygon', attrs: { points: box(0, 0, width, height) }, cls: 'f-lot' });
  for (const [x, y, w, h, cls, anchor] of GROUND.slice(1)) shapes.push({ tag: 'polygon', attrs: { points: box(x, y, w, h) }, cls, anchor });
  // The road leaving at each edge, and a broken line down the tarmac.
  for (let lx = 490; lx < 870; lx += 40) shapes.push({ tag: 'line', attrs: { x1: lx, y1: 470, x2: lx + 18, y2: 470 }, cls: 'thin' });
  for (const [x, y, d] of [[40, 470, -1], [1160, 455, 1], [1160, 490, 1]] as const) shapes.push({ tag: 'path', attrs: { d: `M${x - 10 * d},${y - 14} L${x + 10 * d},${y} L${x - 10 * d},${y + 14}`, fill: 'none' }, cls: 'thick' });
  // Parking lines in the yard, and the fences between the back gardens.
  for (let lx = 530; lx <= 830; lx += 60) shapes.push({ tag: 'line', attrs: { x1: lx, y1: 60, x2: lx, y2: 130 }, cls: 'thin' });
  for (const fx of [725, 770, 815]) shapes.push({ tag: 'line', attrs: { x1: fx, y1: 700, x2: fx, y2: 790 }, cls: 'fence' });

  for (const [x, y] of WEEDS) shapes.push(...weed(x, y));

  // Shadows, cast by the sun at the hour.
  const sun = sunAt(hour);
  if (sun.up) for (const b of BLOCKS) shapes.push({ tag: 'polygon', attrs: { points: pts(shadow(b, sun, true)) }, cls: 'f-shadow' });

  for (const b of BLOCKS) {
    const [x, y, w, h] = b.at;
    const roof = (list: Array<[number, number]>, shade?: string, anchor?: Shape['anchor']) => {
      shapes.push({ tag: 'polygon', attrs: { points: pts(list) }, cls: b.top, anchor });
      if (b.wear != null) shapes.push(...wearOn(list, b.wear + shapes.length, b.shape === 'ridge'));
      if (shade) shapes.push({ tag: 'polygon', attrs: { points: pts(list) }, cls: shade });
    };
    if (b.shape === 'flat' || b.roof === 0) roof([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], undefined, b.anchor);
    else if (b.shape === 'ridge') {
      // 2 slopes either side of the ridge: the one facing north is in shade.
      if (w >= h) {
        roof([[x, y], [x + w, y], [x + w, y + h / 2], [x, y + h / 2]], 'shade-2');
        roof([[x, y + h / 2], [x + w, y + h / 2], [x + w, y + h], [x, y + h]], undefined, b.anchor);
      } else {
        roof([[x, y], [x + w / 2, y], [x + w / 2, y + h], [x, y + h]]);
        roof([[x + w / 2, y], [x + w, y], [x + w, y + h], [x + w / 2, y + h]], 'shade-1', b.anchor);
      }
    } else {
      // A hip roof from above: 2 slopes and 2 ends round a short ridge, each a tone of its own.
      const inset = Math.min(w, h) / 2;
      if (w >= h) {
        // The ridge runs east to west: long slopes north and south, triangles at the ends.
        const [a, c]: [[number, number], [number, number]] = [[x + inset, y + h / 2], [x + w - inset, y + h / 2]];
        roof([[x, y], [x + w, y], c, a], 'shade-2');
        roof([[x + w, y], [x + w, y + h], c], 'shade-1');
        roof([[x, y], a, [x, y + h]]);
        roof([[x, y + h], [x + w, y + h], c, a], undefined, b.anchor);
      } else {
        // The ridge runs north to south: long slopes east and west, triangles at the ends.
        const [a, c]: [[number, number], [number, number]] = [[x + w / 2, y + inset], [x + w / 2, y + h - inset]];
        roof([[x, y], [x + w, y], a], 'shade-2');
        roof([[x + w, y], [x + w, y + h], c, a], 'shade-1');
        roof([[x, y], a, c, [x, y + h]]);
        roof([[x, y + h], [x + w, y + h], c], undefined, b.anchor);
      }
    }
    shapes.push({ tag: 'polygon', attrs: { points: box(x, y, w, h), fill: 'none' } });
    if (b.chimney) shapes.push({ tag: 'polygon', attrs: { points: box(x + w - 50, y + 12, 20, 20) }, cls: 'f-brick' });
    if (b.door) shapes.push({ tag: 'polygon', attrs: { points: box(b.door[0], y + h, b.door[1], 8) }, cls: 'f-stone', anchor: b.doorAnchor });
    if (b.clock != null) shapes.push({ tag: 'circle', attrs: { cx: b.clock, cy: y + h - 12, r: 9 }, cls: 'f-clock' });
  }
  // The billboards: the hoarding at the market corner, the posters on the sale room's wall and the bus shelter's end.
  shapes.push({ tag: 'polygon', attrs: { points: box(870, 260, 4, 70) }, cls: 'f-poster', anchor: 'billboard-2' });
  shapes.push({ tag: 'polygon', attrs: { points: box(160, 528, 4, 28) }, cls: 'f-poster', anchor: 'billboard-3' });
  // Bins from above: a ring for a litter bin, a lid for a wheelie bin.
  for (const [x, y, kind, cls] of BINS) {
    if (kind === 'public') shapes.push({ tag: 'circle', attrs: { cx: x, cy: y, r: 5 }, cls }, { tag: 'circle', attrs: { cx: x, cy: y, r: 2.6 }, cls: 'f-bin-lid' });
    else shapes.push({ tag: 'polygon', attrs: { points: box(x - 1, y - 1, 10, 12) }, cls: 'f-bin-lid' });
  }
  // A case's fences, along the fronts it has fenced.
  for (const b of fenceFor(fenced)) {
    const [fx, fy, fw] = fenceLine(b);
    shapes.push({ tag: 'line', attrs: { x1: fx, y1: fy, x2: fx + fw, y2: fy }, cls: 'fence-plan' });
  }
  // CCTV: each camera, and the ground it sees, faint.
  for (const c of CAMERAS) {
    shapes.push({ tag: 'polygon', attrs: { points: pts(cameraView(c)) }, cls: 'f-cone' });
    shapes.push({ tag: 'circle', attrs: { cx: c.at[0], cy: c.at[1], r: 5 }, cls: 'f-camera' });
  }
  // The street's name, on a sign at each end.
  for (const [x, y] of SIGNS) {
    shapes.push({ tag: 'polygon', attrs: { points: box(x - 18, y - 3, 36, 6) }, cls: 'f-sign' });
    shapes.push({ tag: 'text', text: STREET_NAME, attrs: { x: x - 15, y: y + 1.6, 'font-size': 4.6 }, cls: 'sign-words' });
  }
  // The library's door faces the street, on its north side.
  shapes.push({ tag: 'polygon', attrs: { points: box(455, 522, 50, 8) }, cls: 'f-stone', anchor: 'door-library' });
  // Stripes on the awnings.
  for (let i = 0; i < 8; i++) {
    const sx = 900 + (i % 4) * 65;
    const sy = i < 4 ? 350 : 530;
    for (const off of [18, 36]) shapes.push({ tag: 'line', attrs: { x1: sx + off, y1: sy, x2: sx + off, y2: sy + 60 }, cls: 'thin' });
  }
  // Tree crowns, shaded on the side away from the sun.
  for (const [x, y, rad, , kind, leaf, anchor] of TREES) shapes.push(...tree(kind, leaf, x, y, rad, null, anchor, false));
  LAMPS.forEach(([x, y], i) => {
    shapes.push({ tag: 'circle', attrs: { cx: x, cy: y, r: 24 }, cls: 'glow' });
    shapes.push({ tag: 'circle', attrs: { cx: x, cy: y, r: 6 }, cls: 'f-ochre', anchor: `lamp-${i + 1}` as Shape['anchor'] });
  });
  // Open sky over the rooftops, where a season puts what flies.
  for (const [i, [x, y, w, h]] of ([[200, 20, 160, 90], [900, 80, 200, 180], [40, 600, 300, 160]] as const).entries()) {
    shapes.push({ tag: 'polygon', attrs: { points: box(x, y, w, h), fill: 'none', stroke: 'none' }, anchor: `sky-${i + 1}` as Shape['anchor'] });
  }
  const places = Object.fromEntries(PLACE_IDS.map((id) => [id, [...PLACES[id].at]])) as Record<PlaceId, [number, number]>;
  return { width, height, shapes, places };
}

/** The colour classes a drawing of the street uses, each a `--map-*` value. Day first, night second. */
export const MAP_COLOURS: Record<string, [string, string]> = { ink: ['#2a2622', '#e9dfcc'],
  cobble: ['#ddd0b8', '#2a2f38'], tarmac: ['#d9cdb6', '#2c313a'], square: ['#e3d6bd', '#303641'], alley: ['#c8b998', '#22262d'],
  terracotta: ['#b5573c', '#6e3a2c'], wood: ['#7a5236', '#4a3526'], ochre: ['#d0a65a', '#f2c46b'], 'ochre-dim': ['#d0a65a', '#8a6d3b'],
  bakery: ['#c98b4e', '#7a5838'], sage: ['#8a9a6b', '#4f5a42'], blue: ['#8fa3ad', '#4b5a63'], plane: ['#9aa57a', '#4d5740'],
  library: ['#7f8d63', '#45503a'], lime: ['#a9b37f', '#5c6648'], house: ['#c9b48f', '#514636'], 'house-2': ['#d3bf9a', '#5a4e3c'],
  brick: ['#a5503a', '#5a3026'], plaster: ['#eadcc0', '#4a4438'], stone: ['#d8ccb4', '#454039'],
  window: ['#8fa3ad', '#2b3440'], 'window-lit': ['#8fa3ad', '#f2c46b'], clock: ['#f3ead9', '#f2d9a0'],
  shadow: ['rgba(42,38,34,0.16)', 'rgba(0,0,0,0)'], sun: ['#f4d27a', 'rgba(0,0,0,0)'], moon: ['rgba(0,0,0,0)', '#efe6cf'], 'moon-dark': ['rgba(0,0,0,0)', '#2a2f38'],
  wet: ['rgba(80,96,110,0.18)', 'rgba(120,150,180,0.12)'], star: ['rgba(0,0,0,0)', '#e9dfcc'], cloud: ['rgba(251,248,241,0.92)', 'rgba(52,58,70,0.85)'], 'cloud-grey': ['rgba(185,180,170,0.88)', 'rgba(38,43,51,0.88)'],
  'sun-dawn': ['#e8955a', 'rgba(0,0,0,0)'],
  fog: ['rgba(238,233,224,0.3)', 'rgba(120,130,145,0.17)'], 'snow-cap': ['rgba(250,249,246,0.86)', 'rgba(205,214,226,0.82)'],
  'snow-ground': ['rgba(250,249,246,0.82)', 'rgba(150,165,185,0.5)'], slush: ['rgba(170,165,155,0.5)', 'rgba(60,66,78,0.6)'], flake: ['#ffffff', '#e6ecf2'],
  funnel: ['#8d877d', '#3a404a'], 'wall-cloud': ['#7d776d', '#1f242c'], dust: ['#b3a58a', '#3d3a33'], land: ['#dfdfc2', '#171c1d'], 'funnel-dust': ['#9a8a6e', '#3d3a33'], 'shadow-storm': ['rgba(42,38,34,0.18)', 'rgba(0,0,0,0.3)'], 'bin-public': ['#3f5a4a', '#2c3e34'], 'bin-green': ['#4f7a4a', '#2f4a2c'], 'bin-grey': ['#7d8288', '#454a50'], 'bin-lid': ['#2f3a34', '#1c2420'], picket: ['#f3ead9', '#8a8270'], camera: ['#e8e4dc', '#9aa0a8'], 'camera-eye': ['#2a2622', '#f26b5b'], cone: ['rgba(80,110,160,0.12)', 'rgba(150,180,230,0.10)'], 'lamp-head': ['#5a5f66', '#3a3f46'], weed: ['#6f8a4e', '#4a5e3a'], 'weed-2': ['#8fa65f', '#5a6e44'], crack: ['rgba(42,38,34,0.28)', 'rgba(0,0,0,0.4)'], sign: ['#3f5a4a', '#2c3e34'], plaque: ['#f3ead9', '#8a8270'], bark: ['#7a5236', '#3a2a1f'], 'leaf-dry': ['#b8a46a', '#4a4430'], 'leaf-light': ['rgba(255,255,240,0.22)', 'rgba(255,255,240,0.06)'], 'fruit-red': ['#c4452f', '#7a3324'], 'fruit-orange': ['#e48a2e', '#8a5a26'], nest: ['#8a6a48', '#3d3024'], bird: ['#3a3430', '#d8cfbd'], moss: ['rgba(110,128,72,0.42)', 'rgba(70,90,60,0.5)'], grime: ['rgba(42,38,34,0.16)', 'rgba(0,0,0,0.28)'], battens: ['#3b2a1f', '#120d0a'], grass: ['#c9cf9f', '#1d251f'], pavement: ['#e7ddc8', '#262b33'], poster: ['#e9d8a6', '#4a4536'], dial: ['#c9dbe2', '#10141c'], 'dial-grey': ['#cfccc5', '#1c2028'], 'cloud-shadow': ['rgba(42,38,34,0.08)', 'rgba(0,0,0,0.18)'], lot: ['#f3ead9', '#1b1f27'], flood: ['rgba(122,128,118,0.62)', 'rgba(52,62,74,0.7)'], water: ['rgba(122,128,118,0.7)', 'rgba(52,62,74,0.75)'], puddle: ['rgba(110,135,150,0.45)', 'rgba(242,196,107,0.28)'],
};
