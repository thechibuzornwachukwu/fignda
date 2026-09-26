/** Dailies played and the current run of consecutive days, ending today or yesterday. */
export function dailyStats(days: Iterable<number>, today: number): { played: number; streak: number } {
  const set = new Set([...days].filter((d) => Number.isInteger(d) && d >= 1 && d <= today));
  let d = set.has(today) ? today : today - 1;
  let streak = 0;
  while (set.has(d)) {
    streak++;
    d--;
  }
  return { played: set.size, streak };
}

/** Only same-site paths. Blocks open redirects like `//evil.com` or `https://evil.com`. */
export function safeNext(next: string | null | undefined, fallback = '/play'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}

/** First word of a name, lowercased to the handle alphabet. */
export function handleFromName(name: string): string {
  return (name.trim().split(/\s+/)[0] ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
}

export const HANDLE_RE = /^[a-z0-9._]{2,20}$/;
export const RESERVED_HANDLES = ['admin', 'fignda', 'support', 'root', 'help'];

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
