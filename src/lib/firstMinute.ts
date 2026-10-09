// The first minute, the part that touches the browser and the account (BUILD_PLAN 3b). The rules are in
// onboarding.ts. Everything a guest builds is kept here until there is an account, then moved to it.

import { guestAvatarCode, setGuestAvatarCode } from '../avatar/guest';
import { setAvatarCode } from '../avatar/store';
import { fetchLook, saveAvatar, saveLook, type Profile } from './api';
import { parseFlow, parseLook, type Flow, type LookChoice } from './onboarding';
import { storage } from './storage';

export const FLOW_KEY = 'gazecraft-onboarding';
export const LOOK_KEY = 'gazecraft-look';
export const GUIDED_KEY = 'gazecraft-guided';
export const DEMO_KEY = 'gazecraft-demo';

export const loadFlow = (): Flow => parseFlow(storage.getJSON<unknown>(FLOW_KEY));
export const saveFlow = (flow: Flow): void => storage.setJSON(FLOW_KEY, parseFlow(flow));

/** This browser's copy of the look: a guest's answer, or the account's once it has been read. */
export const loadLook = (): LookChoice | null => parseLook(storage.get(LOOK_KEY));
export function keepLook(look: LookChoice | null): void {
  if (look) storage.set(LOOK_KEY, look);
  else storage.remove(LOOK_KEY);
}

/** The guided find on the landing demo has been done or skipped. */
export const guideSeen = (): boolean => storage.get(GUIDED_KEY) === '1';
export const markGuideSeen = (): void => storage.set(GUIDED_KEY, '1');
export const markDemoDone = (): void => storage.set(DEMO_KEY, '1');

/**
 * Whether this browser has finished anything yet: the demo, a game or a daily. A first time visitor has not.
 * Storage that is empty, blocked or broken reads as a first visit.
 */
export function hasPlayed(): boolean {
  if (storage.get(DEMO_KEY) === '1') return true;
  const finished = storage.getJSON<unknown>('gazecraft-finished');
  if (Array.isArray(finished) && finished.some((id) => typeof id === 'string')) return true;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      if (window.localStorage.key(i)?.startsWith('gazecraft-daily-')) return true;
    }
  } catch {
    /* storage unavailable */
  }
  return false;
}

/**
 * Move what a guest built to their account. Called whenever a profile is loaded, so it also runs on a second
 * device and for a player who signed in from the header. Safe to repeat.
 * - Character: saved when the account has none. An account that already has one keeps it, and the guest copy goes.
 * - Look: the account's answer wins. With none there, the guest's answer is saved. This browser ends up holding
 *   whichever is true, so the editor can read it at once.
 * A failed save leaves the guest copy in place for the next try. Resolves true when a character was moved.
 */
export async function moveGuestToAccount(profile: Pick<Profile, 'id' | 'handle' | 'avatar'> | null | undefined): Promise<boolean> {
  if (!profile?.id) return false;
  let moved = false;
  const code = guestAvatarCode();
  if (code) {
    if (profile.avatar) setGuestAvatarCode(null);
    else if (await saveAvatar(profile.id, code).catch(() => false)) {
      if (profile.handle) setAvatarCode(profile.handle, code);
      setGuestAvatarCode(null);
      moved = true;
    }
  }
  let theirs: LookChoice | null;
  try {
    theirs = parseLook(await fetchLook(profile.id));
  } catch {
    // Not known right now. Leave both copies as they are, so a bad connection never overwrites an answer.
    return moved;
  }
  const mine = loadLook();
  if (theirs) keepLook(theirs);
  else if (mine) await saveLook(profile.id, mine).catch(() => false);
  return moved;
}
