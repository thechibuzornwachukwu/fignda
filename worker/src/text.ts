// Topic cleaning, profanity filter and share codes.

import { LOCAL_BLOCKED } from './blocklistLocal';

export const TOPIC_MAX = 60;

/** Trim, strip control and format characters, collapse spaces. */
export function cleanTopic(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .normalize('NFKC')
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Cache key: lowercase letters, digits and single spaces. */
export const topicKey = (topic: string) =>
  topic.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, TOPIC_MAX);

// Deliberately short and strong. Matched as whole words, case-insensitive.
const BLOCKED = [
  'fuck', 'fucking', 'shit', 'cunt', 'bitch', 'bastard', 'dick', 'cock', 'pussy', 'whore', 'slut',
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'rape', 'rapist', 'nazi', 'porn', 'sex', 'anal',
  'penis', 'vagina', 'boob', 'boobs', 'tits', 'asshole', 'wank', 'twat', 'kike', 'spic', 'chink',
];
const BLOCKED_RE = new RegExp(`\\b(${[...BLOCKED, ...LOCAL_BLOCKED].join('|')})\\b`, 'i');

/** Lowercase, accents off ("akwụna" to "akwuna"), so a rude word with marks on it is still read. */
const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// Rude words that can appear in a paragraph across word joins without being typed: "ass hole", "pass holes".
// The paragraph is read as one stream of letters. Ordinary prose spells short rude words by accident all the
// time ("this hit" holds SHIT, "a bit chilly" holds BITCH, "the pen is" holds PENIS, "who reached" holds WHORE),
// so two tiers keep false flags rare:
//   ANYWHERE  long or unusual enough that no ordinary sentence spells them across a join. Flagged wherever they cross one.
//   ALIGNED   short or common-looking. Flagged only when the rude word begins exactly where a word begins and ends
//             exactly where a word ends ("sh it", "bit ch"), which is how a writer cuts a word to hide it.
// Left out on purpose: penis and anal (too many ordinary sentences). Whole words are still caught by isProfane.
const JOIN_ANYWHERE = ['fuck', 'cunt', 'nigger', 'nigga', 'faggot', 'pussy', 'asshole', 'vagina', 'rapist'];
const JOIN_ALIGNED = [
  'shit', 'bitch', 'whore', 'slut', 'bastard', 'dick', 'cock', 'rape', 'porn', 'sex', 'tits', 'boob', 'boobs', 'wank',
  'kike', 'spic', 'chink', 'fag', 'retard', 'nazi', 'twat', ...LOCAL_BLOCKED,
];

/** True when a rude word is spelled across a word boundary of the text. Looks at the letter stream, not the words. */
export function hasHiddenProfanity(text: string): boolean {
  const words = plain(text).match(/[a-z]+(?:['’][a-z]+)*/g) ?? [];
  if (words.length < 2) return false;
  const starts = new Set<number>();
  const ends = new Set<number>();
  let stream = '';
  for (const w of words) {
    starts.add(stream.length);
    stream += w.replace(/['’]/g, '');
    ends.add(stream.length);
  }
  const crosses = (i: number, n: number) => {
    for (let b = i + 1; b < i + n; b++) if (starts.has(b)) return true;
    return false;
  };
  const found = (term: string, aligned: boolean) => {
    for (let i = stream.indexOf(term); i >= 0; i = stream.indexOf(term, i + 1)) {
      if (crosses(i, term.length) && (!aligned || (starts.has(i) && ends.has(i + term.length)))) return true;
    }
    return false;
  };
  return JOIN_ANYWHERE.some((t) => found(t, false)) || JOIN_ALIGNED.some((t) => found(t, true));
}

/** Rude as written, or rude once the words run together. Every text is read both ways, so a paragraph, a title and a word list are all covered. */
export const isProfane = (...texts: string[]) =>
  texts.some((t) => BLOCKED_RE.test(plain(t)) || hasHiddenProfanity(t));

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** 8 char base32 share code from crypto.getRandomValues. 256 is a multiple of 32, so no bias. */
export function shareCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => B32[b & 31]).join('');
}
