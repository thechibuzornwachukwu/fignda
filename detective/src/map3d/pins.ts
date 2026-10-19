// Where a place on the plan shows in a picture of the 3D street (BUILD_PLAN set 1-map): the map on Cases lays its pins
// over the canvas at these spots, so a pin is a real link and the street is drawn only once.

import { OrthographicCamera, Vector3, type Camera } from 'three';

/** How high over the ground a pin stands, in street units: above the roofs, so it is never inside a building. */
const PIN_H = 40;
/** The middle of the street the iso camera looks at (street3d `cameraFor`). */
const CENTRE = new Vector3(600, 0, 430);

/** Brings the iso camera in on a spot, so a phone shows the part of the street round it. */
export function focus(camera: Camera, at: readonly [number, number], zoom: number) {
  if (!(camera instanceof OrthographicCamera)) return;
  const shift = new Vector3(at[0], 0, at[1]).sub(CENTRE);
  camera.position.add(shift);
  camera.lookAt(CENTRE.clone().add(shift));
  camera.zoom = zoom;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

/**
 * Each spot as a share of the picture, left and top from 0 to 100, kept a margin inside the edge so a place off the
 * picture still has its pin at the side it lies. 2 spots that land together are set apart, along the edge.
 */
export function spotsOf(camera: Camera, at: ReadonlyArray<readonly [number, number]>, margin = 6): Array<{ left: number; top: number }> {
  camera.updateMatrixWorld();
  const out: Array<{ left: number; top: number }> = [];
  for (const [x, y] of at) {
    const v = new Vector3(x, PIN_H, y).project(camera);
    const left = clamp(((v.x + 1) / 2) * 100, margin, 100 - margin);
    let top = clamp(((1 - v.y) / 2) * 100, margin, 100 - margin);
    // Set apart up the picture, or down it near the top, so 2 pins held at the same edge still both show.
    const step = top > 50 ? -6 : 6;
    while (out.some((o) => Math.abs(o.left - left) < 4 && Math.abs(o.top - top) < 4)) top += step;
    out.push({ left: Math.round(left * 10) / 10, top: Math.round(top * 10) / 10 });
  }
  return out;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
