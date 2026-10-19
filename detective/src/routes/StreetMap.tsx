import { Award, Check } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mesh, WebGLRenderer, type Material, type Scene } from 'three';
import { Icon } from '../components/Icon';
import { PLACES } from '../engine/world';
import { casebookRows } from '../lib/casebook';
import { finish, prepare } from '../map3d/finish';
import { focus, spotsOf } from '../map3d/pins';
import { buildStreet } from '../map3d/street3d';
import styles from './StreetMap.module.css';

/** Narrower than this, the map comes in on the open case. */
const PHONE = 560;

/**
 * The street on Cases (BUILD_PLAN set 1-map): Lantern Row in 3D at the player's own hour, with each case a pin at its
 * place. Closed with a tick, a gold seal once worked cold, the open one lit, the rest dim. On a phone it comes in on the
 * part of the street round the open case. The list under it stays the way in for a screen reader, and where the
 * device cannot draw 3D the map leaves and the list is the screen.
 */
export function StreetMap() {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const rows = useMemo(() => casebookRows(), []);
  const open = rows.find((r) => r.state === 'open');
  const phone = width > 0 && width < PHONE;
  const aspect = phone ? 4 / 5 : 16 / 10;
  // Read once a visit: the street shows the hour the player opened it at.
  const [hour] = useState(() => new Date().getHours());

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const seen = new ResizeObserver(([e]) => setWidth(Math.round(e!.contentRect.width)));
    seen.observe(el);
    return () => seen.disconnect();
  }, []);

  // The camera and the pins come from the same numbers, so a pin stands on its place in the picture.
  const { camera, scene, spots } = useMemo(() => {
    if (width === 0) return { camera: null, scene: null, spots: [] };
    const built = buildStreet({ view: 'iso', hour, date: new Date(), weather: 'clear', aspect });
    if (phone && open) focus(built.camera, PLACES[open.chapter.where].at, 1.3);
    return { ...built, spots: spotsOf(built.camera, rows.map((r) => PLACES[r.chapter.where].at)) };
  }, [width, phone, aspect, hour, open, rows]);

  useEffect(() => {
    const el = canvas.current;
    const frame = box.current;
    if (!el || !frame || !scene || !camera) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas: el, antialias: true });
    } catch {
      // No 3D on this device: the map leaves, and the list under it is the screen.
      frame.hidden = true;
      return;
    }
    prepare(renderer, w, h);
    finish(renderer, scene, camera, 'village', 'iso', hour, w, h);
    frame.dataset.drawn = '';
    return () => {
      renderer.dispose();
      release(scene);
    };
  }, [scene, camera, hour]);

  if (rows.length === 0) return null;
  return (
    <div ref={box} className={styles.map} data-street-map data-phone={phone || undefined} data-night={hour < 6 || hour >= 18 || undefined}>
      <canvas ref={canvas} className={styles.street} aria-hidden="true" />
      {spots.map((spot, i) => {
        const { chapter, state, sealed } = rows[i]!;
        const at = { left: `${spot.left}%`, top: `${spot.top}%` };
        if (state === 'locked') return <span key={chapter.id} className={styles.pin} data-pin={chapter.id} data-state="locked" style={at} aria-hidden="true" />;
        return (
          <Link key={chapter.id} to={`/case/${chapter.id}`} className={styles.pin} data-pin={chapter.id} data-state={state} data-seal={sealed || undefined} style={at} aria-label={chapter.title}>
            {state === 'closed' && <Icon icon={sealed ? Award : Check} size={16} />}
            {state === 'open' && <span className={styles.name}>{chapter.title}</span>}
          </Link>
        );
      })}
    </div>
  );
}

/** Frees what the street held on the graphics card: every shape, surface and picture on them. */
function release(scene: Scene) {
  scene.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    o.geometry.dispose();
    for (const m of ([] as Material[]).concat(o.material)) {
      for (const v of Object.values(m)) if (v && typeof v === 'object' && 'isTexture' in v) (v as { dispose(): void }).dispose();
      m.dispose();
    }
  });
}
