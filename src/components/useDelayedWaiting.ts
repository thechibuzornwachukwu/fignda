import { useEffect, useRef, useState } from 'react';

/** A wait shorter than this never shows the waiting screen. A loader that flashes is worse than none. */
export const WAIT_DELAY_MS = 1000;
/** Once shown, the waiting screen stays at least this long, so it does not flicker. */
export const WAIT_MIN_MS = 600;
/** A long wait gets a new line this often, so the screen does not look stuck. */
export const WAIT_LINE_MS = 20_000;

/**
 * When to show `<Waiting>` for a piece of work. Pass `active` while the work runs.
 * True only after `delay` of waiting, then for at least `min` even if the work ends sooner.
 * Callers that leave the page on success wait for this to go false first.
 */
export function useDelayedWaiting(active: boolean, delay: number = WAIT_DELAY_MS, min: number = WAIT_MIN_MS): boolean {
  const [show, setShow] = useState(false);
  const since = useRef(0);

  useEffect(() => {
    if (active === show) return;
    const wait = active ? delay : Math.max(0, min - (Date.now() - since.current));
    const t = setTimeout(() => {
      if (active) since.current = Date.now();
      setShow(active);
    }, wait);
    return () => clearTimeout(t);
  }, [active, show, delay, min]);

  return show;
}
