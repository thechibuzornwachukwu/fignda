// Lantern Row in 3D (BUILD_PLAN set 1-map): 1 scene made from the same data as the maps (src/map/street.ts), seen through
// whichever camera a view needs: straight down, at 30 degrees, from the far pavement, or walking down the road. The
// sun stands where the player's hour puts it and casts soft shadows; at night the moon, the lamps and some windows
// give the light. 1 plan unit is 0.15 m: the road 12 m wide with 3 m pavements, a terraced house front 6.75 m, a storey
// 3.3 m (22 units), eyes 1.6 m up (11 units), a lamp 7 m, a street tree 15 m.

import {
  AmbientLight, BoxGeometry, DoubleSide, MeshToonMaterial, NearestFilter, DataTexture, RedFormat, type Material, BufferGeometry, CanvasTexture, Color, ConeGeometry, CylinderGeometry, DirectionalLight, Float32BufferAttribute, Fog, Group, HemisphereLight,
  IcosahedronGeometry, LineBasicMaterial, LineSegments, Mesh, MeshStandardMaterial, Object3D, OrthographicCamera, PerspectiveCamera, PlaneGeometry, PointLight, Points, PointsMaterial,
  Scene, SphereGeometry, Sprite, SpriteMaterial, SRGBColorSpace, Texture, TorusGeometry, Vector3, type Camera,
} from 'three';
import { BINS, BLOCKS, CROWNS, LAMPS, SIGNS, STREET_NAME, TREES, moonPhase, sunAt, type Block, type TreeForm, type TreeKind, type Weather } from '../map/street';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { brick, cobbles, fields, grass, lettering, moonFace, paving, plaster, rng, tarmac, tiles } from './textures';

/** Real proportions from the maps' drawn ones: walls and roofs, and trees. */
const HS = 0.72;
const TS = 1.8;
const EYE = 11;
/** A storey, in units. */
const STOREY = 22;

export type View = 'plan' | 'iso' | 'front' | 'walk' | 'enter';
/**
 * The looks (BUILD_PLAN set 1-map). The chosen one is `village`: a model village, rounded and soft, warm, photographed
 * from above with a tilt-shift, lit as a real street is (sun, sky, soft shadows, ambient occlusion) and dressed in real
 * surfaces (brick, plaster, tiles, setts, paving, tarmac, fields). The 2 kept for comparison: `real`, the same light and
 * surfaces on sharp edges with no tilt-shift; `storybook`, toon light in 3 tones, plain colours and outlines.
 */
export type Style = 'village' | 'storybook' | 'real';
export type Options = { view?: View; hour?: number; date?: Date; weather?: Weather; walkX?: number; aspect?: number; style?: Style };
let STYLE: Style = 'village';
let TOON: DataTexture | null = null;
/** 3 bands of light, for the storybook look. */
const toonRamp = () => {
  if (TOON) return TOON;
  TOON = new DataTexture(new Uint8Array([90, 170, 255]), 3, 1, RedFormat);
  TOON.minFilter = NearestFilter;
  TOON.magFilter = NearestFilter;
  TOON.needsUpdate = true;
  return TOON;
};
/** A colour as each look wants it: warmed a touch toward the cream of the paper, or brightened for the storybook. */
const styled = (hex: string) => {
  const c = new Color(hex);
  return STYLE === 'storybook' ? c.offsetHSL(0, 0.12, 0.04) : c.lerp(new Color('#f3e6cf'), STYLE === 'village' ? 0.08 : 0);
};
/** A box: softened edges in the village and the storybook, sharp for realism. */
const box = (w: number, h: number, d: number): BufferGeometry => (STYLE === 'real' ? new BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 2, Math.min(STYLE === 'village' ? 1.8 : 1.2, w / 4, h / 4, d / 4)));
/** A surface in its real texture; the storybook paints it plain. */
const skin = (make: () => Texture, plain = '#b0a890', extra: Record<string, unknown> = {}): Material => (STYLE === 'storybook' ? mat(plain, extra) : new MeshStandardMaterial({ map: make(), roughness: 0.92, ...extra }));

const colour = (hex: string) => new Color(hex);
const mat = (c: string, extra: Record<string, unknown> = {}): Material => {
  if (STYLE === 'storybook') {
    const { emissive, emissiveIntensity, side } = extra as { emissive?: Color; emissiveIntensity?: number; side?: typeof DoubleSide };
    return new MeshToonMaterial({ color: styled(c), gradientMap: toonRamp(), ...(emissive ? { emissive, emissiveIntensity } : {}), ...(side ? { side } : {}) });
  }
  return new MeshStandardMaterial({ color: styled(c), roughness: 0.95, metalness: 0, flatShading: STYLE === 'real', ...extra });
};
const shadowy = <T extends Object3D>(o: T, cast = true, receive = true): T => {
  o.traverse((m) => {
    if ((m as Mesh).isMesh) {
      m.castShadow = cast;
      m.receiveShadow = receive;
    }
  });
  return o;
};

/** The colours the maps use, by their class name, day side. */
const PALETTE: Record<string, string> = {
  'f-brick': '#9c4c38', 'f-plaster': '#e3d5b8', 'f-stone': '#cfc4ad', 'f-house': '#c9b48f', 'f-house-2': '#d6c29d', 'f-wood': '#6e4a31',
  'f-terracotta': '#a9523a', 'f-slate': '#59626b', 'f-slate-light': '#868e96', 'f-charcoal': '#3b3d42', 'f-roof-black': '#2b2b2d', 'f-blue': '#7f93a0',
  'f-library': '#6f7d57', 'f-sage': '#7d8d60', 'f-ochre-dim': '#c69a52', 'f-poster': '#e7d6a4', 'f-bakery': '#c0844a',
  'f-plane': '#7f9a5c', 'f-lime': '#8fa564', 'f-leaf-dry': '#b59d5e', 'f-bark': '#6b4a34', 'f-birch-leaf': '#a8bb6e', 'f-poplar': '#6f8c4e', 'f-pine': '#3f5a3c',
};
const tone = (cls: string) => PALETTE[cls] ?? '#b0a890';

function roofGeometry(b: Block, z: number): BufferGeometry | null {
  const [x, y, w, h] = b.at;
  const r = z + b.roof * 0.62;
  const P = (px: number, py: number, pz: number) => [px, pz, py];
  let faces: number[][][];
  if (b.shape === 'flat' || b.roof === 0) return null;
  if (b.shape === 'ridge') {
    if (w >= h) {
      const m = y + h / 2;
      faces = [[P(x, y, z), P(x + w, y, z), P(x + w, m, r), P(x, m, r)], [P(x, m, r), P(x + w, m, r), P(x + w, y + h, z), P(x, y + h, z)], [P(x, y, z), P(x, m, r), P(x, y + h, z)], [P(x + w, y, z), P(x + w, y + h, z), P(x + w, m, r)]];
    } else {
      const m = x + w / 2;
      faces = [[P(x, y, z), P(m, y, r), P(m, y + h, r), P(x, y + h, z)], [P(m, y, r), P(x + w, y, z), P(x + w, y + h, z), P(m, y + h, r)], [P(x, y, z), P(x + w, y, z), P(m, y, r)], [P(x, y + h, z), P(m, y + h, r), P(x + w, y + h, z)]];
    }
  } else {
    const inset = Math.min(w, h) / 2;
    if (w >= h) {
      const [a, c] = [P(x + inset, y + h / 2, r), P(x + w - inset, y + h / 2, r)];
      faces = [[P(x, y, z), P(x + w, y, z), c, a], [a, c, P(x + w, y + h, z), P(x, y + h, z)], [P(x, y, z), a, P(x, y + h, z)], [P(x + w, y, z), P(x + w, y + h, z), c]];
    } else {
      const [a, c] = [P(x + w / 2, y + inset, r), P(x + w / 2, y + h - inset, r)];
      faces = [[P(x, y, z), P(x + w, y, z), a], [P(x, y + h, z), c, P(x + w, y + h, z)], [P(x, y, z), a, c, P(x, y + h, z)], [P(x + w, y, z), P(x + w, y + h, z), c, a]];
    }
  }
  const pos: number[] = [];
  const uv: number[] = [];
  for (const f of faces) {
    const tri: number[][][] = f.length === 4 ? [[f[0]!, f[1]!, f[2]!], [f[0]!, f[2]!, f[3]!]] : [[f[0]!, f[1]!, f[2]!]];
    for (const t of tri) for (const v of t) {
      pos.push(v[0]!, v[1]!, v[2]!);
      uv.push(v[0]! / 18, v[2]! / 18);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

/** A building: walls of its own material, a roof, and on its street side storeys of windows, a door, its number. */
function building(b: Block, night: boolean, seed: number): Group {
  const g = new Group();
  const [x, y, w, h] = b.at;
  const z = b.wall * HS;
  const base = (b.base ?? 0) * HS;
  const walls = new Mesh(box(w, z, h), skin(() => {
    const t = b.walls === 'f-brick' ? brick() : plaster(tone(b.walls));
    t.repeat.set(Math.max(1, w / 24), Math.max(1, z / 18));
    return t;
  }, b.walls === 'f-brick' ? '#a65a44' : tone(b.walls)));
  walls.position.set(x + w / 2, base + z / 2, y + h / 2);
  g.add(walls);
  if (b.wall >= 40 && !b.posts) {
    // A stone plinth along the foot, and a cornice where the wall meets the roof: real fronts are not flat slabs.
    const stone = mat('#bdb39f');
    const plinth = new Mesh(new BoxGeometry(w + 1.2, 4, h + 1.2), stone);
    plinth.position.set(x + w / 2, base + 2, y + h / 2);
    const cornice = new Mesh(new BoxGeometry(w + 2.4, 2, h + 2.4), stone);
    cornice.position.set(x + w / 2, base + z - 1, y + h / 2);
    g.add(plinth, cornice);
  }
  const roof = roofGeometry({ ...b, at: [x - 1.5, y - 1.5, w + 3, h + 3] }, base + z);
  if (roof) {
    g.add(new Mesh(roof, STYLE === 'storybook' ? mat(tone(b.top), { side: DoubleSide }) : new MeshStandardMaterial({ map: tiles(tone(b.top)), roughness: 0.85, flatShading: true, side: DoubleSide })));
  } else {
    const top = new Mesh(box(w + 2, 1.6, h + 2), mat(tone(b.top)));
    top.position.set(x + w / 2, base + z + 0.6, y + h / 2);
    g.add(top);
  }
  if (b.chimney) {
    const c = new Mesh(box(9, 26, 9), skin(brick, '#a65a44'));
    c.position.set(x + w - 40, base + z + b.roof * 0.62 * 0.6 + 8, y + h * 0.3);
    g.add(c);
  }
  // The street side: south for the north side of the street, north for the south side.
  const north = y + h < 470;
  const faceZ = north ? y + h + 0.3 : y - 0.3;
  const r = rng(seed);
  const storeys = Math.max(1, Math.floor(z / STOREY));
  const glass = new MeshStandardMaterial({ color: colour('#3d4a55'), roughness: 0.25, metalness: 0.1 });
  const lit = new MeshStandardMaterial({ color: colour('#f2c46b'), emissive: colour('#f2b04b'), emissiveIntensity: 1.2, roughness: 0.5 });
  const frame = mat('#e8e2d6');
  const door = b.door ?? (b.number != null ? [x + w / 2 - 4, 8] : undefined);
  if (b.wall >= 20 && !b.posts) {
    for (let s = 0; s < storeys; s++) {
      const sy = base + 5 + s * STOREY;
      // Windows at a rhythm of their own, with now and then one bricked up or shuttered: real fronts are not even.
      const step = 16 + Math.floor(r() * 5);
      for (let wx = x + 6 + r() * 4; wx + 9 <= x + w - 5; wx += step) {
        if (s === 0 && door && wx + 10 > door[0] - 3 && wx < door[0] + door[1] + 10) continue;
        if (r() < 0.08) continue;
        const isLit = night && r() < 0.4;
        const pane = new Mesh(new BoxGeometry(8.6, 11, 0.6), isLit ? lit : glass);
        pane.position.set(wx + 4.5, sy + 5.5, faceZ);
        const fr = new Mesh(new BoxGeometry(10, 12.4, 0.4), frame);
        fr.position.set(wx + 4.5, sy + 5.5, faceZ + (north ? -0.15 : 0.15));
        const bar = new Mesh(new BoxGeometry(0.6, 11, 0.8), frame);
        bar.position.set(wx + 4.5, sy + 5.5, faceZ);
        const sill = new Mesh(new BoxGeometry(11, 0.8, 2), frame);
        sill.position.set(wx + 4.5, sy - 0.6, faceZ);
        g.add(fr, pane, bar, sill);
        if (r() < 0.18) for (const side of [-1, 1]) {
          const sh = new Mesh(new BoxGeometry(4.4, 12, 0.5), mat(r() < 0.5 ? '#4f6a55' : '#5d4a3a'));
          sh.position.set(wx + 4.5 + side * 7.4, sy + 5.5, faceZ);
          g.add(sh);
        }
      }
    }
    // A civic front: pilasters between the bays.
    if (b.clock != null) for (let px = x + 4; px <= x + w - 4; px += 36) {
      const pil = new Mesh(new BoxGeometry(3, z - 4, 1.6), mat('#c4b8a2'));
      pil.position.set(px, base + 2 + (z - 4) / 2, faceZ);
      g.add(pil);
    }
    // A drainpipe down 1 corner.
    const pipe = new Mesh(new CylinderGeometry(0.6, 0.6, z, 6), mat('#2f3236'));
    pipe.position.set(r() < 0.5 ? x + 1 : x + w - 1, base + z / 2, faceZ);
    g.add(pipe);
  }
  if (door && b.wall >= 20) {
    const d = new Mesh(new BoxGeometry(7, 14, 0.8), mat(['#5a3b2a', '#2f4a3e', '#6b2d2a', '#2c3a52'][seed % 4]!));
    d.position.set(door[0] + door[1] / 2, base + 7, faceZ);
    const step = new Mesh(new BoxGeometry(11, 1.2, 4), mat('#c9c2b2'));
    step.position.set(door[0] + door[1] / 2, base + 0.6, faceZ + (north ? 2 : -2));
    g.add(d, step);
    if (b.number != null) {
      const plate = new Mesh(new PlaneGeometry(3.2, 2.4), new MeshStandardMaterial({ map: lettering(String(b.number), 64, 48, '#f3ead9', '#2a2622', 34), roughness: 0.6 }));
      plate.position.set(door[0] + door[1] / 2 + 7, base + 11, faceZ + (north ? 0.5 : -0.5));
      if (!north) plate.rotation.y = Math.PI;
      g.add(plate);
    }
  }
  if (b.clock != null) {
    const c = new Mesh(new CylinderGeometry(5, 5, 0.8, 28), mat('#f3ead9'));
    c.rotation.x = Math.PI / 2;
    c.position.set(b.clock, base + z - 6, faceZ + 0.5);
    g.add(c);
  }
  if (b.posts) {
    for (const px of [x + 6, x + w - 6]) {
      const p = new Mesh(new CylinderGeometry(0.5, 0.5, base, 6), mat('#3a3c40'));
      p.position.set(px, base / 2, y + h / 2);
      g.add(p);
    }
  }
  return shadowy(g);
}

/** A market stall: a wooden counter, 4 posts, and a striped canvas awning sloping toward the shoppers. */
function stall(b: Block): Group {
  const g = new Group();
  const [x, y, w, h] = b.at;
  const counter = new Mesh(new BoxGeometry(w - 6, 7, h * 0.45), mat('#7a5638'));
  counter.position.set(x + w / 2, 3.5, y + h * 0.55);
  g.add(counter);
  for (const [px, py] of [[x + 2, y + 2], [x + w - 2, y + 2], [x + 2, y + h - 2], [x + w - 2, y + h - 2]] as const) {
    const p = new Mesh(new CylinderGeometry(0.5, 0.5, 18, 5), mat('#4a3a2c'));
    p.position.set(px, 9, py);
    g.add(p);
  }
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 8;
  const c = cv.getContext('2d')!;
  for (let k = 0; k < 8; k++) {
    c.fillStyle = k % 2 ? '#f1ece0' : tone(b.top);
    c.fillRect(k * 8, 0, 8, 8);
  }
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  const awning = new Mesh(new BoxGeometry(w + 4, 0.6, h + 4), new MeshStandardMaterial({ map: tex, roughness: 0.9, side: DoubleSide }));
  awning.position.set(x + w / 2, 19, y + h / 2);
  awning.rotation.x = (y < 470 ? 1 : -1) * 0.18;
  g.add(awning);
  return shadowy(g);
}

/** A tree: its trunk in its bark, its crown in its species' clumps, each clump its own lump of leaves. */
function tree3d(x: number, y: number, rad: number, hgt: number, form: TreeForm, kind: TreeKind, leafCls: string, seed: number): Group {
  const g = new Group();
  const r = rng(seed + 1);
  const H = hgt * TS;
  const crownY = form === 'columnar' ? H * 0.3 + rad * 2.2 : H;
  const bark = form === 'slender' ? mat('#ece6d8') : mat(tone('f-bark'));
  const trunkTop = form === 'conical' ? H * 0.35 : form === 'columnar' ? H * 0.3 : H * 0.85;
  const trunk = new Mesh(new CylinderGeometry(form === 'slender' ? 1 : 1.8, form === 'slender' ? 1.6 : 3, trunkTop, 8), bark);
  trunk.position.set(x, trunkTop / 2, y);
  g.add(trunk);
  const leaf = (c: string) => mat(new Color(tone(c)).offsetHSL(0, 0, (r() - 0.5) * 0.06).getStyle());
  if (kind === 'bare' || kind === 'dry') {
    // Branches only, each forking again: no leaves to cast, so none to draw.
    const branch = (from: Vector3, dir: Vector3, len: number, depth: number) => {
      const to = from.clone().add(dir.clone().multiplyScalar(len));
      const m = new Mesh(new CylinderGeometry(0.45 * depth, 0.7 * depth, len, 5), bark);
      m.position.copy(from.clone().add(to).multiplyScalar(0.5));
      m.lookAt(to);
      m.rotateX(Math.PI / 2);
      g.add(m);
      if (depth > 1) for (let k = 0; k < 2; k++) branch(to, dir.clone().add(new Vector3((r() - 0.5) * 1.2, 0.3, (r() - 0.5) * 1.2)).normalize(), len * 0.65, depth - 1);
    };
    for (let k = 0; k < 5; k++) branch(new Vector3(x, trunkTop * 0.9, y), new Vector3(Math.cos(k * 1.3) * 0.8, 0.9, Math.sin(k * 1.3) * 0.8).normalize(), rad * 0.55, 3);
    if (kind === 'bare') return shadowy(g);
  }
  if (form === 'conical') {
    for (let k = 0; k < 5; k++) {
      const cone = new Mesh(new ConeGeometry(rad * (1 - k * 0.17), H * 0.32, 9), leaf(leafCls));
      cone.position.set(x, H * 0.38 + k * H * 0.13, y);
      g.add(cone);
    }
    return shadowy(g);
  }
  const clumps = kind === 'dry' ? CROWNS.slender : form === 'weeping' ? CROWNS.round : CROWNS[form as keyof typeof CROWNS];
  const spread = form === 'columnar' ? 0.8 : 1;
  for (const [dx, dy, cr] of clumps) {
    const s = new Mesh(new IcosahedronGeometry(cr * rad * (kind === 'dry' ? 0.8 : 1), 1), leaf(leafCls));
    s.position.set(x + dx * rad * spread, crownY - dy * rad * (form === 'columnar' ? 1.4 : 1), y + (r() - 0.5) * rad * 0.9);
    s.scale.set(1, form === 'columnar' ? 1.35 : 0.9, 1);
    g.add(s);
  }
  if (form === 'weeping') {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const f = new Mesh(new CylinderGeometry(0.25, 0.25, rad * 1.3, 4), leaf(leafCls));
      f.position.set(x + Math.cos(a) * rad * 0.95, crownY - rad * 0.8, y + Math.sin(a) * rad * 0.95);
      g.add(f);
    }
  }
  if (kind === 'apple' || kind === 'orange') {
    const fm = mat(kind === 'apple' ? '#c4452f' : '#e48a2e');
    for (let k = 0; k < 14; k++) {
      const f = new Mesh(new SphereGeometry(1.2, 6, 5), fm);
      f.position.set(x + (r() - 0.5) * rad * 1.6, crownY + (r() - 0.5) * rad, y + (r() - 0.5) * rad * 1.6);
      g.add(f);
    }
  }
  if (kind === 'nest') {
    const n = new Mesh(new TorusGeometry(3, 1.2, 5, 10), mat('#7a5a3c'));
    n.rotation.x = Math.PI / 2;
    n.position.set(x + rad * 0.2, crownY + rad * 0.85, y);
    g.add(n);
  }
  return shadowy(g);
}

/** A slab of ground: a road, a pavement, grass. Kerbs stand up along the road's edges. */
function slab(x: number, y: number, w: number, h: number, top: number, material: Material): Mesh {
  const m = new Mesh(new BoxGeometry(w, top, h), material);
  m.position.set(x + w / 2, top / 2, y + h / 2);
  m.receiveShadow = true;
  return m;
}

const PLAIN = new Map<Texture, string>();
function surface(t: Texture, w: number, h: number, per: number): Material {
  if (STYLE === 'storybook') return mat(PLAIN.get(t) ?? '#9a948a');
  const c = t.clone();
  c.needsUpdate = true;
  c.repeat.set(w / per, h / per);
  return new MeshStandardMaterial({ map: c, roughness: 0.95 });
}

/** The street, its weather and its light. */
export function buildStreet({ view = 'iso', hour = 15, date = new Date(Date.UTC(2026, 9, 19)), weather = 'clear', walkX = 300, aspect = 16 / 9, style = 'village' }: Options = {}): { scene: Scene; camera: Camera } {
  STYLE = style;
  const scene = new Scene();
  const sun = sunAt(hour);
  const night = !sun.up;
  const grey = weather !== 'clear';

  // The sky and the air: blue by day, near black by night, grey under cloud.
  const sky = night ? '#0d1119' : grey ? '#9aa0a3' : '#a9c7d8';
  scene.background = colour(sky);
  const level = view === 'walk' || view === 'enter' || view === 'front';
  // Haze in the distance only seen from the street; from above the air is clear unless it is foggy.
  if (level || weather === 'fog') scene.fog = new Fog(colour(night ? '#0d1119' : grey ? '#a4a8a8' : '#cfdce2'), weather === 'fog' ? 80 : 900, weather === 'fog' ? 700 : 4200);
  if (level) scene.background = skyTexture(night, grey);

  // The land round the town, and the street's own ground.
  const land = new Mesh(new PlaneGeometry(5000, 5000), skin(() => { const t = fields(); t.repeat.set(30, 30); return t; }, '#9cc26a'));
  land.rotation.x = -Math.PI / 2;
  land.position.set(600, -0.05, 400);
  land.receiveShadow = true;
  scene.add(land);
  const T = tarmac();
  const [C, Pv, Gr] = [cobbles(), paving(), grass()];
  PLAIN.set(T, '#6f7680').set(C, '#a59d90').set(Pv, '#d6d0c3').set(Gr, '#8fbf5e');
  const ground = new Group();
  ground.add(slab(0, 0, 1200, 800, 0.1, surface(Gr, 1200, 800, 60)));
  // The road: cobbled at the top of the street, tarmac below the hall, opening into the market square.
  ground.add(slab(0, 430, 470, 80, 0.3, surface(C, 470, 80, 40)));
  ground.add(slab(470, 430, 410, 80, 0.3, surface(T, 410, 80, 70)));
  ground.add(slab(880, 340, 280, 260, 0.3, surface(T, 280, 260, 70)));
  ground.add(slab(1160, 430, 40, 80, 0.3, surface(T, 40, 80, 70)));
  // The road runs on out of town both ways, across the fields.
  ground.add(slab(-1400, 440, 1400, 60, 0.3, surface(T, 1400, 60, 70)));
  ground.add(slab(1200, 440, 1400, 60, 0.3, surface(T, 1400, 60, 70)));
  // The yard, the drive and the alley: rough tarmac.
  for (const [x, y, w, hh] of [[470, 40, 400, 110], [470, 150, 50, 280], [140, 120, 330, 30], [140, 150, 40, 280]] as const) ground.add(slab(x, y, w, hh, 0.25, surface(T, w, hh, 60)));
  // Pavements, raised a kerb's height, in slabs; the kerb itself a line of stone along the edge.
  const pave = (x: number, y: number, w: number, hh: number) => ground.add(slab(x, y, w, hh, 0.9, surface(Pv, w, hh, 12)));
  pave(0, 410, 880, 20);
  pave(0, 510, 880, 18);
  const kerb = mat('#a7a296');
  for (const [x, y, w] of [[0, 429, 880], [0, 510, 880]] as const) {
    const k = new Mesh(new BoxGeometry(w, 1, 1.6), kerb);
    k.position.set(x + w / 2, 0.5, y + 0.8);
    k.receiveShadow = true;
    ground.add(k);
  }
  // Drains at the kerb, and the white lines down the middle of the tarmac.
  const drain = mat('#232528', { roughness: 0.6 });
  for (let x = 60; x < 880; x += 140) for (const y of [431.5, 508.5]) {
    const d = new Mesh(new BoxGeometry(5, 0.4, 2.4), drain);
    d.position.set(x, 0.42, y);
    ground.add(d);
  }
  const paint = mat('#e9e6dc', { roughness: 0.7 });
  for (let x = 490; x < 870; x += 60) {
    const l = new Mesh(new BoxGeometry(20, 0.08, 0.8), paint);
    l.position.set(x, 0.35, 470);
    ground.add(l);
  }
  // Where the street meets the square, a give-way line across it.
  for (let x = -1380; x < 0; x += 60) {
    const l = new Mesh(new BoxGeometry(20, 0.08, 0.8), paint);
    l.position.set(x, 0.35, 470);
    ground.add(l);
  }
  for (let y = 434; y < 506; y += 6) {
    const l = new Mesh(new BoxGeometry(1.2, 0.08, 3.4), paint);
    l.position.set(878, 0.35, y);
    ground.add(l);
  }
  scene.add(ground);

  // The buildings, the trees, the lamps, the bins, the signs.
  BLOCKS.forEach((b, i) => {
    if (b.anchor?.startsWith('awning')) {
      scene.add(stall(b));
      return;
    }
    if (b.wall < 14 && !b.posts && b.roof === 0) {
      // Small things: cars and sheds and the like, as solid little blocks.
      const [x, y, w, hh] = b.at;
      const m = new Mesh(new BoxGeometry(w, b.wall * HS + 2, hh), mat(tone(b.walls), { roughness: 0.6 }));
      m.position.set(x + w / 2, (b.wall * HS + 2) / 2, y + hh / 2);
      scene.add(shadowy(m));
      return;
    }
    scene.add(building(b, night, i + 3));
  });
  TREES.forEach(([x, y, rad, hgt, form, kind, leaf], i) => scene.add(tree3d(x, y, rad, hgt, form, kind, leaf, i * 7)));
  const metal = mat('#3a3d42', { roughness: 0.5, metalness: 0.3 });
  for (const [x, y] of LAMPS) {
    const toward = y < 470 ? 1 : -1;
    const pole = new Mesh(new CylinderGeometry(0.8, 1.2, 47, 8), metal);
    pole.position.set(x, 23.5, y);
    const arm = new Mesh(new BoxGeometry(1, 1, 12), metal);
    arm.position.set(x, 47, y + toward * 6);
    const head = new Mesh(new BoxGeometry(4, 1.6, 6), metal);
    head.position.set(x, 46.6, y + toward * 12);
    const light = new Mesh(new BoxGeometry(3.4, 0.3, 5), new MeshStandardMaterial({ color: colour('#f6e7b8'), emissive: colour('#f6d98b'), emissiveIntensity: night ? 2 : 0.1 }));
    light.position.set(x, 45.7, y + toward * 12);
    scene.add(shadowy(pole), arm, head, light);
    if (night) {
      const p = new PointLight(colour('#ffcf86'), 4000, 160, 1.8);
      p.position.set(x, 44, y + toward * 12);
      scene.add(p);
    }
  }
  for (const [x, y, kind, cls] of BINS) {
    const c = kind === 'public' ? '#3f5a4a' : cls.includes('green') ? '#4f7a4a' : '#7d8288';
    const m = kind === 'public' ? new Mesh(new CylinderGeometry(2.6, 2.3, 6.6, 12), mat(c, { roughness: 0.5 })) : new Mesh(new BoxGeometry(4, 7, 4.8), mat(c, { roughness: 0.5 }));
    m.position.set(x, kind === 'public' ? 4.1 : 4.3, y);
    scene.add(shadowy(m));
  }
  const signTex = lettering(STREET_NAME, 256, 64, '#3f5a4a', '#f3ead9', 34);
  for (const [x, y] of SIGNS) {
    const post = new Mesh(new CylinderGeometry(0.5, 0.5, 16, 6), metal);
    post.position.set(x, 8.8, y);
    const plate = new Mesh(new BoxGeometry(16, 4, 0.4), [mat('#3f5a4a'), mat('#3f5a4a'), mat('#3f5a4a'), mat('#3f5a4a'), new MeshStandardMaterial({ map: signTex }), new MeshStandardMaterial({ map: signTex })]);
    plate.position.set(x, 17.6, y);
    scene.add(shadowy(post), shadowy(plate));
  }

  // The light: sky above and ground below, and the sun where the hour puts it, casting soft shadows.
  // Sky light warm from above and bounced warm off the ground, as the model village wants it; the sun does the rest.
  scene.add(new HemisphereLight(colour(night ? '#33405a' : '#fff1dc'), colour(night ? '#151a14' : '#9a8b6c'), night ? 0.35 : grey ? 1.4 : 1.15));
  scene.add(new AmbientLight(colour('#ffffff'), night ? 0.05 : 0.15));
  const key = new DirectionalLight(colour(night ? '#9fb3d9' : sun.elevation < 0.45 ? '#ffc58f' : '#fff3df'), night ? 0.25 : grey ? 0.6 : 2.6);
  const az = night ? Math.PI * 0.35 : sun.azimuth;
  const el = night ? 0.9 : Math.max(0.2, sun.elevation);
  // East is +x and south is +z: the sun rises east, stands south at noon, sets west.
  const dir = new Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
  key.position.copy(new Vector3(600, 0, 400).add(dir.multiplyScalar(900)));
  key.target.position.set(600, 0, 400);
  key.castShadow = !grey;
  key.shadow.mapSize.set(4096, 4096);
  const sc = key.shadow.camera as OrthographicCamera;
  Object.assign(sc, { left: -800, right: 800, top: 800, bottom: -800, near: 10, far: 2400 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.6;
  key.shadow.radius = 7;
  scene.add(key, key.target);

  // The sky's lights: the sun's disc, and tonight's moon.
  if (!grey) {
    const far = new Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)).multiplyScalar(2000).add(new Vector3(600, 0, 400));
    const s = new Sprite(new SpriteMaterial({ map: night ? moonFace(moonPhase(date)) : discTexture(sun.elevation < 0.45 ? '#ffb26b' : '#fff1c4'), fog: false, depthWrite: false }));
    s.position.copy(far);
    s.scale.setScalar(night ? 90 : 120);
    scene.add(s);
  }

  // Weather in the air.
  if (weather === 'rain' || weather === 'storm' || weather === 'flood') {
    const r = rng(9);
    const pts: number[] = [];
    const n = weather === 'storm' ? 9000 : 6000;
    const slant = weather === 'storm' ? 4 : 1;
    for (let k = 0; k < n; k++) {
      const [x, y, z] = [r() * 1400 - 100, r() * 160, r() * 1000 - 100];
      pts.push(x, y, z, x - slant, y - 4, z);
    }
    const lg = new BufferGeometry();
    lg.setAttribute('position', new Float32BufferAttribute(pts, 3));
    scene.add(new LineSegments(lg, new LineBasicMaterial({ color: colour('#c8d4dc'), transparent: true, opacity: 0.45 })));
  }
  if (weather === 'snow') {
    const r = rng(41);
    const pts: number[] = [];
    for (let k = 0; k < 7000; k++) pts.push(r() * 1400 - 100, r() * 160, r() * 1000 - 100);
    const pg = new BufferGeometry();
    pg.setAttribute('position', new Float32BufferAttribute(pts, 3));
    scene.add(new Points(pg, new PointsMaterial({ color: colour('#ffffff'), size: 1.4 })));
  }
  if (weather === 'flood') {
    const water = new Mesh(new PlaneGeometry(5000, 5000), new MeshStandardMaterial({ color: colour('#6f6248'), roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.88 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(600, 7, 400);
    scene.add(water);
  }

  return { scene, camera: cameraFor(view, aspect, walkX) };
}

/** The sky from street level: deep overhead, paler toward the horizon. */
function skyTexture(night: boolean, grey: boolean): Texture {
  const cv = document.createElement('canvas');
  cv.width = 4;
  cv.height = 256;
  const g = cv.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  const [top, low] = night ? ['#070a12', '#1c2433'] : grey ? ['#7d8387', '#c3c6c4'] : ['#5f93c4', '#d9e6ea'];
  grad.addColorStop(0, top);
  grad.addColorStop(0.55, low);
  grad.addColorStop(1, low);
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function discTexture(c: string): Texture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 6, 32, 32, 32);
  grad.addColorStop(0, c);
  grad.addColorStop(0.45, c);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** The camera a view needs. */
export function cameraFor(view: View, aspect: number, walkX: number): Camera {
  const centre = new Vector3(600, 0, 430);
  if (view === 'plan') {
    const half = 470;
    const c = new OrthographicCamera(-half * aspect, half * aspect, half, -half, 1, 4000);
    c.position.set(600, 1500, 400.01);
    c.up.set(0, 0, -1);
    c.lookAt(600, 0, 400);
    return c;
  }
  if (view === 'iso') {
    const half = 420;
    const c = new OrthographicCamera(-half * aspect, half * aspect, half, -half, 1, 6000);
    // From the south east, 30 degrees down: the fronts of the hall, the bakery and the sale room face the camera.
    const d = 1600;
    c.position.set(centre.x + d * Math.cos(Math.PI / 4), d * Math.tan(Math.PI / 6), centre.z + d * Math.sin(Math.PI / 4));
    c.lookAt(centre);
    return c;
  }
  const c = new PerspectiveCamera(view === 'front' ? 40 : 62, aspect, 0.5, 5000);
  if (view === 'front') {
    // From the south pavement, across the road at the north side: the hall, the bakery, the sale room.
    c.position.set(walkX, EYE + 1.5, 528);
    c.lookAt(walkX, EYE + 8, 300);
    return c;
  }
  // On foot, eyes 1.6 m up. Entering: just outside the town on the road in from the west, about to walk down it.
  const x = view === 'enter' ? -70 : walkX;
  c.position.set(x, EYE, 478);
  c.lookAt(x + 200, EYE + 2, 466);
  return c;
}
