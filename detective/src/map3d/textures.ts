// Surfaces for the 3D street, painted in code so nothing is downloaded: tarmac, cobbles, paving, grass, brick, plaster,
// roof tiles. Each is a small canvas that repeats. Real surfaces are never one flat colour: tarmac is speckled, worn in
// the wheel lanes and patched; cobbles are rounded stones each catching the light; paving is laid in slabs.

import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';

/** A seeded random, so the street is the same every time it is built. */
export function rng(seed: number): () => number {
  let s = seed % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

const canvas = (size: number) => {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return [c, c.getContext('2d')!] as const;
};

const finish = (c: HTMLCanvasElement, repeat: number): Texture => {
  const t = new CanvasTexture(c);
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

/** Specks of lighter and darker over a base, the grain every real surface has. */
function speckle(g: CanvasRenderingContext2D, size: number, base: string, light: string, dark: string, n: number, seed: number) {
  const r = rng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < n; i++) {
    g.fillStyle = r() < 0.5 ? light : dark;
    const s = 1 + r() * 2;
    g.fillRect(r() * size, r() * size, s, s);
  }
}

export function tarmac(): Texture {
  const size = 512;
  const [c, g] = canvas(size);
  speckle(g, size, '#5c5f63', 'rgba(255,255,255,0.10)', 'rgba(0,0,0,0.16)', 9000, 3);
  const r = rng(11);
  // Patches where it has been dug up and filled, a shade off the rest.
  for (let i = 0; i < 5; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.05)';
    g.fillRect(r() * size, r() * size, 40 + r() * 90, 30 + r() * 60);
  }
  // Cracks, branching.
  g.strokeStyle = 'rgba(20,20,22,0.45)';
  g.lineWidth = 1.2;
  for (let i = 0; i < 7; i++) {
    let [x, y] = [r() * size, r() * size];
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 8; k++) {
      x += (r() - 0.5) * 26;
      y += (r() - 0.5) * 26;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  return finish(c, 1);
}

export function cobbles(): Texture {
  const size = 256;
  const [c, g] = canvas(size);
  g.fillStyle = '#4a4540';
  g.fillRect(0, 0, size, size);
  const r = rng(5);
  const step = 16;
  for (let row = 0; row < size / step; row++) {
    for (let col = 0; col < size / step + 1; col++) {
      const x = col * step + (row % 2 ? step / 2 : 0) + (r() - 0.5) * 3;
      const y = row * step + step / 2 + (r() - 0.5) * 3;
      const tone = 120 + Math.floor(r() * 50);
      g.fillStyle = `rgb(${tone},${tone - 8},${tone - 18})`;
      g.beginPath();
      g.ellipse(x, y, step * 0.44, step * 0.4, r() * 0.6, 0, Math.PI * 2);
      g.fill();
      // Each stone is rounded: lit on top, darker below.
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.beginPath();
      g.ellipse(x - 1.5, y - 2, step * 0.22, step * 0.14, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  return finish(c, 1);
}

export function paving(): Texture {
  const size = 256;
  const [c, g] = canvas(size);
  speckle(g, size, '#b9b4a9', 'rgba(255,255,255,0.12)', 'rgba(0,0,0,0.08)', 2500, 7);
  const r = rng(13);
  g.strokeStyle = 'rgba(60,55,50,0.45)';
  g.lineWidth = 1.5;
  for (let k = 0; k <= size; k += 64) {
    g.beginPath();
    g.moveTo(0, k);
    g.lineTo(size, k);
    g.stroke();
  }
  for (let row = 0; row < 4; row++) {
    for (let k = 0; k <= size; k += 64) {
      g.beginPath();
      g.moveTo(k + (row % 2 ? 32 : 0), row * 64);
      g.lineTo(k + (row % 2 ? 32 : 0), row * 64 + 64);
      g.stroke();
    }
  }
  // A slab or 2 stained or cracked.
  for (let i = 0; i < 3; i++) {
    g.fillStyle = 'rgba(0,0,0,0.07)';
    g.fillRect(Math.floor(r() * 4) * 64, Math.floor(r() * 4) * 64, 64, 64);
  }
  return finish(c, 1);
}

export function grass(): Texture {
  const size = 256;
  const [c, g] = canvas(size);
  speckle(g, size, '#7e9058', 'rgba(220,235,170,0.25)', 'rgba(40,60,30,0.25)', 6000, 17);
  return finish(c, 1);
}

export function fields(): Texture {
  const size = 512;
  const [c, g] = canvas(size);
  speckle(g, size, '#a7ae7c', 'rgba(230,230,180,0.2)', 'rgba(60,70,40,0.2)', 8000, 19);
  // Fields in strips, the way farmland reads from above.
  const r = rng(23);
  for (let k = 0; k < 6; k++) {
    g.fillStyle = r() < 0.5 ? 'rgba(120,110,60,0.18)' : 'rgba(70,100,50,0.18)';
    g.fillRect(0, k * 85, size, 70);
  }
  return finish(c, 1);
}

export function brick(): Texture {
  const size = 256;
  const [c, g] = canvas(size);
  g.fillStyle = '#b8b0a2';
  g.fillRect(0, 0, size, size);
  const r = rng(29);
  const [bw, bh] = [32, 12];
  for (let row = 0; row < size / bh; row++) {
    for (let col = -1; col < size / bw + 1; col++) {
      const x = col * bw + (row % 2 ? bw / 2 : 0);
      const tone = 150 + Math.floor(r() * 40);
      g.fillStyle = `rgb(${tone},${Math.floor(tone * 0.5)},${Math.floor(tone * 0.38)})`;
      g.fillRect(x + 1, row * bh + 1, bw - 2, bh - 2);
    }
  }
  return finish(c, 1);
}

export function plaster(base: string): Texture {
  const size = 256;
  const [c, g] = canvas(size);
  speckle(g, size, base, 'rgba(255,255,255,0.10)', 'rgba(0,0,0,0.07)', 3500, 31);
  // Weathering: streaks down from the sills and a damp band at the foot.
  const grad = g.createLinearGradient(0, size * 0.8, 0, size);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(60,50,40,0.18)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return finish(c, 1);
}

export function tiles(base: string): Texture {
  const size = 256;
  const [c, g] = canvas(size);
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  const r = rng(37);
  const [tw, th] = [24, 16];
  for (let row = 0; row < size / th; row++) {
    for (let col = -1; col < size / tw + 1; col++) {
      const x = col * tw + (row % 2 ? tw / 2 : 0);
      g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.03 + r() * 0.08})`;
      g.fillRect(x, row * th, tw - 1, th - 1);
      // The lower edge of each tile casts a thin shadow on the row below.
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(x, row * th + th - 2, tw - 1, 2);
    }
  }
  return finish(c, 1);
}

/** Words on a sign, a plaque or a poster, as a texture, at the size they are on the thing. */
export function lettering(words: string, w: number, h: number, bg: string, fg: string, px: number): Texture {
  const [c, g] = [document.createElement('canvas'), null as CanvasRenderingContext2D | null];
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  void g;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg;
  ctx.font = `700 ${px}px Manrope, "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(words, w / 2, h / 2 + 1);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** The moon as it is tonight, drawn as light: the lit part with its seas, the rest a faint ghost, no outline. */
export function moonFace(phase: number): Texture {
  const size = 128;
  const [c, g] = canvas(size);
  const [cx, cy, r] = [size / 2, size / 2, size * 0.42];
  g.clearRect(0, 0, size, size);
  g.fillStyle = 'rgba(235,228,205,0.08)';
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  // The lit part: from the right as it waxes, from the left as it wanes; the terminator an ellipse.
  const k = Math.cos(phase * 2 * Math.PI) * r;
  const waxing = phase < 0.5;
  g.save();
  g.beginPath();
  g.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, !waxing);
  g.ellipse(cx, cy, Math.abs(k), r, 0, Math.PI / 2, -Math.PI / 2, (k > 0) === waxing);
  g.closePath();
  g.clip();
  g.fillStyle = '#f1ead2';
  g.fillRect(0, 0, size, size);
  g.fillStyle = 'rgba(140,135,120,0.35)';
  for (const [dx, dy, rr] of [[0.3, -0.25, 0.2], [0.12, 0.22, 0.24], [-0.28, -0.05, 0.18], [-0.45, 0.3, 0.12], [0.5, 0.15, 0.13]] as const) {
    g.beginPath();
    g.arc(cx + dx * r, cy + dy * r, rr * r, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
