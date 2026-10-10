// The secret of a case (SPEC section 9, The secret). Something was hidden, and its name is the secret: one word
// from `data/secrets.json`, chosen by the engine and never typed against a puzzle. Every clue gives one piece
// of the word, in its true place, so the word fills in like a crossword and can be guessed before the end.
// The last clue, the whole puzzle, gives the last piece. Pure.
//
// Nothing about a secret is stored. It is worked out from the puzzle's id and how many clues its case has, and
// the pieces a player holds are worked out from the clues they have done. So a puzzle whose text changes keeps
// its secret, and whatever changes, the pieces shown are always pieces of the word shown.

export type Piece = {
  /** Where the piece sits in the word: the index of its first letter. */
  at: number;
  /** Its letters. Empty only when a case has more clues than its word has letters. */
  text: string;
};

export type Secret = {
  /** Capitals, A to Z. */
  word: string;
  /** One per clue, in the order of the case: `pieces[0]` is the first passage, the last is the unmasking. */
  pieces: Piece[];
};

/** Used when the pool holds no usable word, so a case is never without a secret. */
export const FALLBACK_SECRET = 'SECRET';
/** No word shorter than this: 3 letters are guessed from 1. */
export const SECRET_MIN = 4;
/** A piece is 3 letters at most where the pool allows, so no one clue gives the word away. */
export const PIECE_MAX = 3;

/** FNV-1a, 32 bits. The same string gives the same number on every device. */
export function hashOf(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A small seeded generator (mulberry32): numbers from 0 up to 1. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The pool as the engine reads it: capitals, letters only, long enough, none twice. */
export function usableWords(pool: readonly unknown[]): string[] {
  const out = new Set<string>();
  for (const w of pool) {
    if (typeof w !== 'string') continue;
    const up = w.trim().toUpperCase();
    if (up.length >= SECRET_MIN && /^[A-Z]+$/.test(up)) out.add(up);
  }
  return [...out];
}

/** Words that suit a case of `clues` clues: a letter for every clue, and no piece too long. The longest there are when none is long enough. */
function fitting(words: readonly string[], clues: number): string[] {
  const fit = words.filter((w) => w.length >= clues && w.length <= Math.max(SECRET_MIN + 2, clues * PIECE_MAX));
  if (fit.length) return fit;
  const max = Math.max(...words.map((w) => w.length));
  return words.filter((w) => w.length === max);
}

/**
 * The word cut into one piece per clue, as even as it goes, and handed out in an order that is not left to
 * right, so the first clue does not always give the first letters. The order comes from `seed` alone.
 */
export function cutSecret(word: string, clues: number, seed: string): Piece[] {
  const n = Math.max(1, Math.floor(clues) || 1);
  const filled = Math.min(n, word.length);
  const pieces: Piece[] = [];
  let at = 0;
  for (let i = 0; i < n; i++) {
    const size = i < filled ? Math.floor(word.length / filled) + (i < word.length % filled ? 1 : 0) : 0;
    pieces.push({ at, text: word.slice(at, at + size) });
    at += size;
  }
  const random = seeded(hashOf(`${seed}:order`));
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j]!, pieces[i]!];
  }
  // The unmasking always has something to give.
  if (!pieces[n - 1]!.text) {
    const full = pieces.findIndex((p) => p.text);
    if (full >= 0) [pieces[n - 1], pieces[full]] = [pieces[full]!, pieces[n - 1]!];
  }
  return pieces;
}

/**
 * A secret for every case. Each case asks for the word its own id points at, and takes the next free one when
 * that word is gone, so no 2 cases share a word while the pool lasts. Cases are served in the order of their
 * id's hash, not the order they arrive in, so reordering the catalogue changes nothing.
 */
export function caseSecrets(cases: ReadonlyArray<{ id: string; clues: number }>, pool: readonly unknown[]): Map<string, Secret> {
  const usable = usableWords(pool);
  const words = usable.length ? usable : [FALLBACK_SECRET];
  const taken = new Set<string>();
  const out = new Map<string, Secret>();
  const order = [...cases].sort((a, b) => hashOf(a.id) - hashOf(b.id) || (a.id < b.id ? -1 : 1));
  for (const c of order) {
    if (out.has(c.id)) continue;
    const clues = Math.max(1, Math.floor(c.clues) || 1);
    const fit = fitting(words, clues);
    const start = hashOf(c.id) % fit.length;
    let word = fit[start]!;
    for (let i = 0; i < fit.length; i++) {
      const w = fit[(start + i) % fit.length]!;
      if (!taken.has(w)) {
        word = w;
        break;
      }
    }
    taken.add(word);
    out.set(c.id, { word, pieces: cutSecret(word, clues, c.id) });
  }
  return out;
}

/** The word as the player sees it: one slot per letter, filled where a clue they hold put it. `have[i]` is clue `i`. */
export function revealSecret(secret: Secret, have: readonly boolean[]): string[] {
  const slots = Array.from({ length: secret.word.length }, () => '');
  secret.pieces.forEach((p, i) => {
    if (!have[i]) return;
    for (let k = 0; k < p.text.length; k++) slots[p.at + k] = p.text[k]!;
  });
  return slots;
}

/** Slot indexes one piece fills. */
export const pieceSlots = (p: Piece): number[] => Array.from({ length: p.text.length }, (_, k) => p.at + k);

export type Culprit = {
  /** What their ordinary avatar is drawn from. */
  seed: string;
  /** Which disguise they wear, by position in the list. */
  disguise: number;
  /** Who they turn out to be, by position in the list. */
  who: number;
};

/** Who hid the secret: one culprit per case, the same on every device. `disguises` and `roles` are the list lengths. */
export function culpritOf(id: string, disguises: number, roles: number): Culprit {
  return {
    seed: `culprit-${id}`,
    disguise: disguises > 0 ? hashOf(`${id}:disguise`) % disguises : 0,
    who: roles > 0 ? hashOf(`${id}:who`) % roles : 0,
  };
}
