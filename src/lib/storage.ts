/** localStorage that never throws (private mode, blocked storage). */
export const storage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  /** False when nothing was stored: storage is unavailable or full. */
  set(key: string, value: string): boolean {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  /** Every stored key that starts with `prefix`. */
  keys(prefix: string): string[] {
    const out: string[] = [];
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k?.startsWith(prefix)) out.push(k);
      }
    } catch {
      /* storage unavailable */
    }
    return out;
  },
  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  },
  getJSON<T>(key: string): T | null {
    const raw = storage.get(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  setJSON(key: string, value: unknown): boolean {
    return storage.set(key, JSON.stringify(value));
  },
};
