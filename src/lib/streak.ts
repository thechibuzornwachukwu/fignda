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
