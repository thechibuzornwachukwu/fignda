// Topic cleaning, profanity filter and share codes.

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
const BLOCKED_RE = new RegExp(`\\b(${BLOCKED.join('|')})\\b`, 'i');

export const isProfane = (...texts: string[]) => texts.some((t) => BLOCKED_RE.test(t));

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** 8 char base32 share code from crypto.getRandomValues. 256 is a multiple of 32, so no bias. */
export function shareCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => B32[b & 31]).join('');
}
