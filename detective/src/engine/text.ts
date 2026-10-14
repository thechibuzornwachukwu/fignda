// Letter stream and sentence splitting. Shared by hiddenWords, excerpt and paginate.

const LETTER = /[a-z]/i;

/**
 * One entry per character of the source text.
 * Letters carry `li` (index in the lowercase letter stream `S`).
 * Non letters have `li = -1` and carry `prev` / `next`: the nearest letter index on each side, or -1.
 */
export type Char = { ch: string; li: number; prev?: number; next?: number };

export type Sentence = {
  /** Char index range [cs, ce) into the `Char[]`, trailing whitespace included. */
  cs: number;
  ce: number;
  /** First and last letter index inside the sentence, -1 if none. */
  ls: number;
  le: number;
  /** Trimmed length in UTF-16 units. Budgets compare against this. */
  len: number;
};

export function toChars(text: string): { chars: Char[]; S: string } {
  const chars: Char[] = [];
  let S = '';
  for (const ch of text) {
    if (LETTER.test(ch)) {
      chars.push({ ch, li: S.length });
      S += ch.toLowerCase();
    } else chars.push({ ch, li: -1 });
  }
  let last = -1;
  for (const c of chars) {
    if (c.li >= 0) last = c.li;
    else c.prev = last;
  }
  let next = -1;
  for (let i = chars.length - 1; i >= 0; i--) {
    const c = chars[i]!;
    if (c.li >= 0) next = c.li;
    else c.next = next;
  }
  return { chars, S };
}

const SENTENCE = /[^.?!]+[.?!]+["')\]]*\s*|[^.?!]+$/g;

export function sentences(text: string, chars: readonly Char[]): Sentence[] {
  // Regex indices are UTF-16 units; chars are code points. Map one to the other.
  const at = new Array<number>(text.length + 1);
  let ci = 0;
  let cu = 0;
  for (const ch of text) {
    at[cu] = ci++;
    cu += ch.length;
  }
  at[text.length] = ci;

  const out: Sentence[] = [];
  for (const m of text.matchAll(SENTENCE)) {
    const cs = at[m.index]!;
    const ce = at[m.index + m[0].length]!;
    let ls = -1;
    let le = -1;
    for (let i = cs; i < ce && i < chars.length; i++) {
      const li = chars[i]!.li;
      if (li >= 0) {
        if (ls < 0) ls = li;
        le = li;
      }
    }
    out.push({ cs, ce, ls, le, len: m[0].trim().length });
  }
  return out;
}

/** Source text for sentences [s0, s1], trimmed. */
export function rangeText(chars: readonly Char[], sents: readonly Sentence[], s0: number, s1: number): string {
  return chars
    .slice(sents[s0]!.cs, sents[s1]!.ce)
    .map((c) => c.ch)
    .join('')
    .trim();
}
