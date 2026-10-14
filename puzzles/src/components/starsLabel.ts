import { pick } from '../copy';

export const MAX_STARS = 3;

/** A whole number from 0 to 3, whatever comes in. */
export function clampStars(value: unknown): 0 | 1 | 2 | 3 {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 0;
  return Math.min(MAX_STARS, Math.max(0, n)) as 0 | 1 | 2 | 3;
}

/** "2 of 3 stars". The one accessible name for a row of stars. */
export function starsLabel(value: unknown): string {
  return pick('starsOf', { n: clampStars(value) });
}
