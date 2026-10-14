import { storage } from './storage';

/**
 * Board sounds, synthesized with Web Audio: no files, nothing to download.
 *   tick(n)  one soft click per letter a selection passes. Pitch climbs a semitone per letter, so the ear
 *            hears how long the selection is. Resets on the next swipe.
 *   chime()  two quick notes when a word is found. A miss makes no sound.
 *   record() three rising notes when a personal record falls, after the last chime has rung.
 * On by default and quiet. Stored as `gazecraft-sound` = "off" when muted.
 * Safari plays Web Audio in the ambient session, so the iPhone silent switch mutes it, as it should.
 */
const KEY = 'gazecraft-sound';
/** Base pitch for the first letter, in Hz. */
const BASE = 660;
/** Ticks closer than this merge into one, so a fast flick is a ripple, not a buzz. */
const MIN_GAP_MS = 25;

type Ctx = AudioContext;
let ctx: Ctx | null = null;
let lastTick = -Infinity;
const listeners = new Set<() => void>();

export function soundOn(): boolean {
  return storage.get(KEY) !== 'off';
}

export function setSound(on: boolean): void {
  if (on) storage.remove(KEY);
  else storage.set(KEY, 'off');
  if (on) unlock();
  listeners.forEach((l) => l());
}

export function subscribeSound(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/**
 * Create or wake the audio context. Browsers only allow this inside a user gesture (a tap, a click, a key),
 * so it runs from those handlers and never on page load.
 */
export function unlock(): void {
  if (!soundOn()) return;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return;
    try {
      ctx = new C();
    } catch {
      return;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
}

const EVENTS = ['touchend', 'pointerdown', 'click', 'keydown'] as const;
let armed = false;
/** Wake audio on the first tap, click or key anywhere, so the first swipe already ticks. */
export function armSound(): void {
  if (armed || typeof window === 'undefined') return;
  armed = true;
  const wake = () => {
    unlock();
    if (ctx?.state === 'running') {
      for (const e of EVENTS) window.removeEventListener(e, wake, true);
    }
  };
  for (const e of EVENTS) window.addEventListener(e, wake, true);
}

function ready(): Ctx | null {
  if (!soundOn() || !ctx || ctx.state !== 'running') return null;
  return ctx;
}

function note(c: Ctx, freq: number, at: number, peak: number, length: number, type: OscillatorType): void {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(peak, at + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain).connect(c.destination);
  osc.start(at);
  osc.stop(at + length + 0.01);
}

/** Pitch for the nth letter of a selection. A semitone per letter, capped at two octaves. */
export function tickPitch(n: number): number {
  return BASE * 2 ** (Math.min(Math.max(n, 1) - 1, 24) / 12);
}

export function tick(n: number): void {
  const c = ready();
  if (!c) return;
  // Page clock, not the audio clock: the audio clock can stall (no output device) and would swallow every tick.
  const t = performance.now();
  if (t - lastTick < MIN_GAP_MS) return;
  lastTick = t;
  note(c, tickPitch(n), c.currentTime, 0.05, 0.035, 'triangle');
}

export function chime(): void {
  const c = ready();
  if (!c) return;
  const at = c.currentTime + 0.01;
  note(c, 1046.5, at, 0.06, 0.16, 'sine'); // C6
  note(c, 1568, at + 0.07, 0.06, 0.24, 'sine'); // G6
}

/** A new personal record: E6, G6, C7. It starts late enough to follow the chime of the find that ended the game. */
export function record(): void {
  const c = ready();
  if (!c) return;
  const at = c.currentTime + 0.45;
  note(c, 1318.5, at, 0.06, 0.16, 'sine'); // E6
  note(c, 1568, at + 0.09, 0.06, 0.16, 'sine'); // G6
  note(c, 2093, at + 0.18, 0.06, 0.32, 'sine'); // C7
}
