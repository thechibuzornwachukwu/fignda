// A guest has no handle to draw a starter from. One seed, saved in the browser, so the same guest sees the
// same character each time. Never sent anywhere.

import { storage } from '../lib/storage';
import { avatarFor, parseAvatar, type Avatar } from './draw';

export const GUEST_SEED_KEY = 'gazecraft-guest-seed';

let seed: string | null = null;

export function guestSeed(): string {
  if (seed) return seed;
  const saved = storage.get(GUEST_SEED_KEY);
  seed = saved && /^[a-z0-9]{4,16}$/.test(saved) ? saved : Math.random().toString(36).slice(2, 10).padEnd(4, '0');
  if (seed !== saved) storage.set(GUEST_SEED_KEY, seed);
  return seed;
}

/** Tests only: forget the seed held for this page. */
export function forgetGuestSeed(): void {
  seed = null;
}

// A guest can design a character before there is an account (BUILD_PLAN 3b). The code lives in the browser and
// moves to the account when its profile exists (src/lib/firstMinute.ts).
export const GUEST_AVATAR_KEY = 'gazecraft-guest-avatar';
const CODE_RE = /^([a-z][0-9]{1,2}){1,24}$/;

/** The guest's own design, or null when there is none or what is stored is not a code. */
export function guestAvatarCode(): string | null {
  const saved = storage.get(GUEST_AVATAR_KEY);
  return saved && CODE_RE.test(saved) ? saved : null;
}

export function setGuestAvatarCode(code: string | null): void {
  if (code && CODE_RE.test(code)) storage.set(GUEST_AVATAR_KEY, code);
  else storage.remove(GUEST_AVATAR_KEY);
}

/** What a guest looks like: their design, else the starter drawn from their seed. Never blank. */
export function guestAvatar(): Avatar {
  const code = guestAvatarCode();
  return code ? parseAvatar(code) : avatarFor(guestSeed());
}
