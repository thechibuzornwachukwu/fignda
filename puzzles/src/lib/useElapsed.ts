import { useEffect, useState } from 'react';

/** Whole seconds from `startAt` to `endAt` (or now, ticking every second while running). */
export function useElapsed(startAt: number, endAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endAt != null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [endAt]);
  return Math.max(0, Math.floor(((endAt ?? now) - startAt) / 1000));
}
