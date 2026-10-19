// What makes a street feel lived in at eye level (BUILD_PLAN set 1-map): shopfronts with their names on the fascia,
// an awning, a post box, benches, planters, bollards, a cycle rack, telegraph poles and their wires, and real parked
// cars. Built in the same units as the street (1 unit 0.15 m) and placed by the street's own data.

import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BoxGeometry, BufferGeometry, CatmullRomCurve3, ExtrudeGeometry, Shape, CylinderGeometry, Float32BufferAttribute, Group, Line, LineBasicMaterial, Mesh, MeshStandardMaterial, SphereGeometry, TorusGeometry, Vector3, type Material } from 'three';
import { lettering, rng } from './textures';

type Mat = (c: string, extra?: Record<string, unknown>) => Material;

/** A shopfront on a south-facing ground floor: a stall riser, a big window in a frame, a fascia with the shop's name. */
export function shopfront(m: Mat, x0: number, x1: number, faceZ: number, name: string, fascia: string, awning?: string): Group {
  const g = new Group();
  const w = x1 - x0;
  const cx = (x0 + x1) / 2;
  const riser = new Mesh(new BoxGeometry(w, 5, 1.6), m('#3e3a36'));
  riser.position.set(cx, 3.5, faceZ + 0.6);
  const glass = new Mesh(new BoxGeometry(w - 4, 13, 0.8), new MeshStandardMaterial({ color: '#2d3a42', roughness: 0.15, metalness: 0.3 }));
  glass.position.set(cx, 12.5, faceZ + 0.5);
  const frame = new Mesh(new BoxGeometry(w, 15, 0.6), m('#e9e3d6'));
  frame.position.set(cx, 12.5, faceZ + 0.2);
  for (let k = 1; k < 3; k++) {
    const mullion = new Mesh(new BoxGeometry(0.8, 13, 1), m('#e9e3d6'));
    mullion.position.set(x0 + (w * k) / 3, 12.5, faceZ + 0.7);
    g.add(mullion);
  }
  const board = new Mesh(new BoxGeometry(w + 2, 4.4, 1.2), [m(fascia), m(fascia), m(fascia), m(fascia), new MeshStandardMaterial({ map: lettering(name, 512, 64, fascia, '#f3ead9', 38) }), m(fascia)]);
  board.position.set(cx, 22.4, faceZ + 0.9);
  g.add(frame, glass, riser, board);
  if (awning) {
    // A canvas awning, wound out over the pavement on its arms.
    const a = new Mesh(new BoxGeometry(w, 0.5, 9), m(awning, { roughness: 0.9 }));
    a.position.set(cx, 19.5, faceZ + 4.6);
    a.rotation.x = 0.32;
    const valance = new Mesh(new BoxGeometry(w, 2.2, 0.4), m(awning));
    valance.position.set(cx, 17.6, faceZ + 8.8);
    g.add(a, valance);
  }
  return g;
}

/** A red pillar post box. */
export function postBox(m: Mat, x: number, z: number): Group {
  const g = new Group();
  const body = new Mesh(new CylinderGeometry(1.9, 1.9, 9, 14), m('#b3271e', { roughness: 0.4 }));
  body.position.set(x, 5.4, z);
  const cap = new Mesh(new SphereGeometry(1.95, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), m('#b3271e', { roughness: 0.4 }));
  cap.position.set(x, 9.9, z);
  const slot = new Mesh(new BoxGeometry(2, 0.4, 0.5), m('#1d1c1b'));
  slot.position.set(x, 8, z + 1.8);
  g.add(body, cap, slot);
  return g;
}

/** A bench: 2 iron ends, a slatted seat and back. */
export function bench(m: Mat, x: number, z: number, facing: 1 | -1): Group {
  const g = new Group();
  for (const dx of [-5.5, 5.5]) {
    const end = new Mesh(new BoxGeometry(0.8, 5, 3.4), m('#2c2e30', { metalness: 0.4, roughness: 0.5 }));
    end.position.set(x + dx, 3.4, z);
    g.add(end);
  }
  for (let k = 0; k < 3; k++) {
    const slat = new Mesh(new BoxGeometry(13, 0.5, 0.9), m('#8a6240'));
    slat.position.set(x, 3.6, z - 1.2 + k * 1.2);
    g.add(slat);
  }
  const back = new Mesh(new BoxGeometry(13, 2.6, 0.5), m('#8a6240'));
  back.position.set(x, 6.4, z - facing * 1.8);
  g.add(back);
  return g;
}

/** A planter: a stone trough, earth, and flowers. */
export function planter(m: Mat, x: number, z: number, seed: number): Group {
  const g = new Group();
  const r = rng(seed);
  const trough = new Mesh(new BoxGeometry(10, 3.6, 4), m('#b7ad98'));
  trough.position.set(x, 2.6, z);
  g.add(trough);
  for (let k = 0; k < 9; k++) {
    const f = new Mesh(new SphereGeometry(0.9 + r() * 0.5, 6, 5), m(['#c9473a', '#e3b04b', '#d77fa1', '#f0ead8'][k % 4]!));
    f.position.set(x - 4 + r() * 8, 5 + r() * 1.2, z - 1.4 + r() * 2.8);
    const leaf = new Mesh(new SphereGeometry(1.3, 6, 5), m('#5f7d43'));
    leaf.position.set(x - 4 + r() * 8, 4.6, z - 1.4 + r() * 2.8);
    g.add(leaf, f);
  }
  return g;
}

/** A bollard. */
export function bollard(m: Mat, x: number, z: number): Mesh {
  const b = new Mesh(new CylinderGeometry(0.9, 1.1, 6, 10), m('#2b2d30', { metalness: 0.3, roughness: 0.5 }));
  b.position.set(x, 3.9, z);
  return b;
}

/** A cycle rack with a bicycle or 2 leaning on it. */
export function cycleRack(m: Mat, x: number, z: number): Group {
  const g = new Group();
  for (let k = 0; k < 3; k++) {
    const hoop = new Mesh(new TorusGeometry(2.6, 0.25, 6, 16, Math.PI), m('#7d8288', { metalness: 0.6, roughness: 0.4 }));
    hoop.position.set(x + k * 4, 0.9, z);
    hoop.rotation.y = Math.PI / 2;
    g.add(hoop);
  }
  for (const [k, c] of [[0, '#2f5d8a'], [2, '#a33a2e']] as const) {
    for (const dz of [-2.6, 2.6]) {
      const wheel = new Mesh(new TorusGeometry(2.1, 0.22, 6, 16), m('#1e1f21'));
      wheel.position.set(x + k * 4 + 1, 3, z + dz);
      wheel.rotation.y = Math.PI / 2;
      g.add(wheel);
    }
    const frame = new Mesh(new BoxGeometry(0.4, 0.4, 5), m(c, { metalness: 0.4 }));
    frame.position.set(x + k * 4 + 1, 4.4, z);
    g.add(frame);
  }
  return g;
}

/** A parked car: a body, a glass cabin, 4 wheels, lights front and back. Along x unless `across`. */
export function car(m: Mat, x: number, z: number, colour: string, across = false): Group {
  const g = new Group();
  const [L, W] = [28, 12];
  const paint = m(colour, { roughness: 0.32, metalness: 0.25 });
  // A rounded body, and a cabin narrower at the roof than at the waist, its screens raked back.
  const body = new Mesh(new RoundedBoxGeometry(L, 5.4, W, 3, 1.8), paint);
  body.position.set(0, 4.4, 0);
  const side = new Shape();
  side.moveTo(-L * 0.3, 0);
  side.lineTo(L * 0.26, 0);
  side.lineTo(L * 0.14, 4.6);
  side.lineTo(-L * 0.2, 4.6);
  side.closePath();
  const cabinGeo = new ExtrudeGeometry(side, { depth: W - 1.6, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 2 });
  cabinGeo.translate(0, 0, -(W - 1.6) / 2);
  const cabin = new Mesh(cabinGeo, new MeshStandardMaterial({ color: '#27303a', roughness: 0.12, metalness: 0.5 }));
  cabin.position.set(-1, 7, 0);
  const pillar = new Mesh(new BoxGeometry(L * 0.06, 4.6, W - 1), paint);
  pillar.position.set(-1.5, 9.3, 0);
  g.add(body, cabin, pillar);
  for (const [dx, dz] of [[-9, -5.4], [9, -5.4], [-9, 5.4], [9, 5.4]] as const) {
    const wheel = new Mesh(new CylinderGeometry(2.6, 2.6, 1.8, 14), m('#18191b'));
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(dx, 2.6, dz);
    g.add(wheel);
  }
  for (const [dx, c] of [[L / 2, '#f4efd8'], [-L / 2, '#b8261f']] as const) for (const dz of [-3.8, 3.8]) {
    const lamp = new Mesh(new BoxGeometry(0.5, 1.2, 2.2), m(c, { emissive: c, emissiveIntensity: 0.2 }));
    lamp.position.set(dx, 5, dz);
    g.add(lamp);
  }
  g.position.set(x, 0, z);
  if (across) g.rotation.y = Math.PI / 2;
  return g;
}

/** A telegraph pole, and the wires that sag from it to the next and down to the houses. */
export function wires(m: Mat, poles: Array<[number, number]>, drops: Array<[number, number]>): Group {
  const g = new Group();
  const H = 52;
  for (const [x, z] of poles) {
    const p = new Mesh(new CylinderGeometry(0.8, 1.1, H, 8), m('#5a4a3a'));
    p.position.set(x, H / 2, z);
    const arm = new Mesh(new BoxGeometry(0.8, 0.8, 9), m('#5a4a3a'));
    arm.position.set(x, H - 3, z);
    g.add(p, arm);
  }
  const wire = new LineBasicMaterial({ color: '#1f2022' });
  const sag = (a: Vector3, b: Vector3, dip: number) => {
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.y -= dip;
    const pts = new CatmullRomCurve3([a, mid, b]).getPoints(16);
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(pts.flatMap((v) => [v.x, v.y, v.z]), 3));
    g.add(new Line(geo, wire));
  };
  for (let k = 0; k + 1 < poles.length; k++) for (const dz of [-3.5, 3.5]) sag(new Vector3(poles[k]![0], H - 3, poles[k]![1] + dz), new Vector3(poles[k + 1]![0], H - 3, poles[k + 1]![1] + dz), 4);
  // Each drop runs from the nearest pole to a house front: [x along the street, z of the front].
  for (const [x, toZ] of drops) {
    const near = poles.reduce((a, b) => (Math.abs(b[0] - x) < Math.abs(a[0] - x) ? b : a));
    sag(new Vector3(near[0], H - 3, near[1]), new Vector3(x, 40, toZ), 3);
  }
  return g;
}
