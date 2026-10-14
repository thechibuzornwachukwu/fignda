// A player's name and handle: the rules sign in and settings share, and where sign in may send a player next.

/** Only same-site paths. Blocks open redirects like `//evil.com` or `https://evil.com`. */
export function safeNext(next: string | null | undefined, fallback = '/cases'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}

/** First word of a name, lowercased to the handle alphabet. */
export function handleFromName(name: string): string {
  return (name.trim().split(/\s+/)[0] ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
}

export const HANDLE_RE = /^[a-z0-9._]{2,20}$/;
export const RESERVED_HANDLES = ['admin', 'lanternrow', 'detective', 'support', 'root', 'help'];

/** Name and handle rules shared by sign up and settings. Returns cleaned values or the message to show. */
export function checkProfile(rawName: string, rawHandle: string): { name: string; handle: string } | { error: string } {
  const name = rawName.trim().replace(/\s+/g, ' ');
  const handle = rawHandle.trim().toLowerCase().replace(/^@/, '');
  if (!name) return { error: 'Add a name. First name is fine.' };
  if (name.length > 40) return { error: 'Keep your name under 40 letters.' };
  if (handle.length < 2) return { error: 'Handles need at least 2 letters or numbers.' };
  if (!HANDLE_RE.test(handle)) return { error: 'Handles use a to z, 0 to 9, dots and underscores. Up to 20.' };
  if (RESERVED_HANDLES.includes(handle)) return { error: 'That handle is taken. Try another.' };
  return { name, handle };
}

/** A tail for a handle, from a 0 to 1 random source: 4 characters of a to z and 0 to 9. */
export function tail(random: () => number = Math.random): string {
  const abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 4 }, () => abc[Math.min(abc.length - 1, Math.floor(random() * abc.length))]).join('');
}

/** A handle with a tail, inside the 20 character limit: "ada" becomes "ada_x7k2". */
export function withTail(handle: string, random: () => number = Math.random): string {
  const base = handle.toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 15) || 'detective';
  return `${base}_${tail(random)}`;
}
