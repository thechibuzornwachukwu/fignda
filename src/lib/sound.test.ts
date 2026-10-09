// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Note = { freq: number };
let notes: Note[];
let now = 0;

class FakeParam {
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
}
class FakeCtx {
  state = 'running';
  destination = {};
  get currentTime() {
    return now;
  }
  resume() {
    return Promise.resolve();
  }
  createGain() {
    return { gain: new FakeParam(), connect: (n: unknown) => n };
  }
  createOscillator() {
    const frequency = {
      setValueAtTime: (f: number) => notes.push({ freq: f }),
    };
    return { type: '', frequency, connect: (n: unknown) => n, start() {}, stop() {} };
  }
}

async function load() {
  vi.resetModules();
  return import('./sound');
}

beforeEach(() => {
  notes = [];
  now = 0;
  localStorage.clear();
  vi.stubGlobal('AudioContext', FakeCtx);
  vi.spyOn(performance, 'now').mockImplementation(() => now * 1000);
});

describe('board sounds', () => {
  it('is on by default and stays silent until a gesture wakes it', async () => {
    const s = await load();
    expect(s.soundOn()).toBe(true);
    s.tick(1);
    expect(notes).toHaveLength(0);
    s.unlock();
    s.tick(1);
    expect(notes).toHaveLength(1);
  });

  it('climbs a semitone per letter, capped at two octaves', async () => {
    const s = await load();
    expect(s.tickPitch(1)).toBe(660);
    expect(s.tickPitch(13)).toBeCloseTo(1320);
    expect(s.tickPitch(40)).toBeCloseTo(2640);
    expect(s.tickPitch(2)).toBeGreaterThan(s.tickPitch(1));
  });

  it('merges ticks that come too fast', async () => {
    const s = await load();
    s.unlock();
    s.tick(1);
    now = 0.01;
    s.tick(2);
    now = 0.05;
    s.tick(3);
    expect(notes.map((n) => Math.round(n.freq))).toEqual([660, Math.round(s.tickPitch(3))]);
  });

  it('a find plays two rising notes', async () => {
    const s = await load();
    s.unlock();
    s.chime();
    expect(notes).toHaveLength(2);
    expect(notes[1]!.freq).toBeGreaterThan(notes[0]!.freq);
  });

  it('a new record plays three rising notes, and nothing when muted', async () => {
    const s = await load();
    s.unlock();
    s.record();
    expect(notes).toHaveLength(3);
    expect(notes[1]!.freq).toBeGreaterThan(notes[0]!.freq);
    expect(notes[2]!.freq).toBeGreaterThan(notes[1]!.freq);
    s.setSound(false);
    s.record();
    expect(notes).toHaveLength(3);
  });

  it('a record makes no sound before a gesture has woken audio', async () => {
    const s = await load();
    s.record();
    expect(notes).toHaveLength(0);
  });

  it('mute is remembered and silences everything', async () => {
    const s = await load();
    s.unlock();
    const heard = vi.fn();
    s.subscribeSound(heard);
    s.setSound(false);
    expect(heard).toHaveBeenCalled();
    expect(localStorage.getItem('gazecraft-sound')).toBe('off');
    s.tick(1);
    s.chime();
    expect(notes).toHaveLength(0);
    const again = await load();
    expect(again.soundOn()).toBe(false);
    again.setSound(true);
    expect(localStorage.getItem('gazecraft-sound')).toBeNull();
  });
});
