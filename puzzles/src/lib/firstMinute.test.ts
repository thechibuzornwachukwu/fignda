// @vitest-environment jsdom
import { vi } from 'vitest';
import { avatarCode, avatarFor, DEFAULT_AVATAR, parseAvatar } from '../avatar/draw';
import { forgetGuestSeed, GUEST_AVATAR_KEY, guestAvatar, guestAvatarCode, guestSeed, setGuestAvatarCode } from '../avatar/guest';
import { DEMO_KEY, FLOW_KEY, GUIDED_KEY, guideSeen, hasPlayed, keepLook, loadFlow, loadLook, LOOK_KEY, markDemoDone, markGuideSeen, moveGuestToAccount, saveFlow } from './firstMinute';

const api = vi.hoisted(() => ({
  look: null as string | null,
  fetchFails: false,
  saveFails: false,
  savedAvatar: [] as Array<[string, string]>,
  savedLook: [] as Array<[string, string | null]>,
}));
vi.mock('./api', () => ({
  fetchLook: async () => {
    if (api.fetchFails) throw new Error('offline');
    return api.look;
  },
  saveAvatar: async (id: string, code: string) => {
    if (api.saveFails) return false;
    api.savedAvatar.push([id, code]);
    return true;
  },
  saveLook: async (id: string, look: string | null) => {
    if (api.saveFails) return false;
    api.savedLook.push([id, look]);
    return true;
  },
}));
const store = vi.hoisted(() => ({ set: [] as Array<[string, string | null]> }));
vi.mock('../avatar/store', () => ({ setAvatarCode: (h: string, c: string | null) => store.set.push([h, c]) }));

const CODE = avatarCode({ ...DEFAULT_AVATAR, hair: 3, outfit: 1 });
const ME = { id: 'u1', handle: 'ada', avatar: null };

beforeEach(() => {
  Object.assign(api, { look: null, fetchFails: false, saveFails: false, savedAvatar: [], savedLook: [] });
  store.set = [];
  forgetGuestSeed();
});

describe('what the browser keeps for a guest', () => {
  it('nothing stored: no answers, no look, a starter character, a first visit', () => {
    expect(loadFlow()).toEqual({});
    expect(loadLook()).toBeNull();
    expect(guestAvatarCode()).toBeNull();
    expect(guestAvatar()).toEqual(avatarFor(guestSeed()));
    expect(hasPlayed()).toBe(false);
    expect(guideSeen()).toBe(false);
  });

  it('malformed storage reads as empty, and never throws', () => {
    localStorage.setItem(FLOW_KEY, '{not json');
    localStorage.setItem(LOOK_KEY, 'robot');
    localStorage.setItem(GUEST_AVATAR_KEY, '<svg onload=x>');
    localStorage.setItem('gazecraft-finished', '{"a":1}');
    localStorage.setItem(GUIDED_KEY, 'yes');
    localStorage.setItem(DEMO_KEY, 'true');
    expect(loadFlow()).toEqual({});
    expect(loadLook()).toBeNull();
    expect(guestAvatarCode()).toBeNull();
    expect(guestAvatar()).toEqual(avatarFor(guestSeed()));
    expect(hasPlayed()).toBe(false);
    expect(guideSeen()).toBe(false);
  });

  it('blocked storage: everything still answers', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    try {
      expect(loadFlow()).toEqual({});
      expect(loadLook()).toBeNull();
      expect(hasPlayed()).toBe(false);
      expect(() => saveFlow({ character: 'done' })).not.toThrow();
      expect(() => keepLook('mixed')).not.toThrow();
      expect(() => setGuestAvatarCode(CODE)).not.toThrow();
      expect(guestAvatar()).toBeTruthy();
    } finally {
      get.mockRestore();
      set.mockRestore();
    }
  });

  it('answers, the look and the character come back after a reload', () => {
    saveFlow({ character: 'done', signin: 'skipped' });
    keepLook('feminine');
    setGuestAvatarCode(CODE);
    expect(loadFlow()).toEqual({ character: 'done', signin: 'skipped' });
    expect(loadLook()).toBe('feminine');
    expect(guestAvatar()).toEqual(parseAvatar(CODE));
    keepLook(null);
    setGuestAvatarCode(null);
    expect(loadLook()).toBeNull();
    expect(guestAvatarCode()).toBeNull();
    setGuestAvatarCode('not a code');
    expect(localStorage.getItem(GUEST_AVATAR_KEY)).toBeNull();
  });

  it('a visitor has played once the demo, a game or a daily is finished here', () => {
    markGuideSeen();
    expect(guideSeen()).toBe(true);
    // Being shown the guide is not playing.
    expect(hasPlayed()).toBe(false);
    markDemoDone();
    expect(hasPlayed()).toBe(true);
    localStorage.clear();
    localStorage.setItem('gazecraft-finished', '[]');
    expect(hasPlayed()).toBe(false);
    localStorage.setItem('gazecraft-finished', '["bible"]');
    expect(hasPlayed()).toBe(true);
    localStorage.clear();
    localStorage.setItem('gazecraft-daily-282', '{}');
    expect(hasPlayed()).toBe(true);
  });
});

describe('moving a guest to their account', () => {
  it('the character and the look move, and the guest copy of the character goes', async () => {
    setGuestAvatarCode(CODE);
    keepLook('masculine');
    expect(await moveGuestToAccount(ME)).toBe(true);
    expect(api.savedAvatar).toEqual([['u1', CODE]]);
    expect(api.savedLook).toEqual([['u1', 'masculine']]);
    expect(store.set).toEqual([['ada', CODE]]);
    expect(guestAvatarCode()).toBeNull();
    expect(loadLook()).toBe('masculine');
  });

  it('a guest who built nothing and answered nothing: nothing is written', async () => {
    expect(await moveGuestToAccount(ME)).toBe(false);
    expect(api.savedAvatar).toEqual([]);
    expect(api.savedLook).toEqual([]);
    expect(loadLook()).toBeNull();
  });

  it('a second device: the account already has a character and a look, and keeps both', async () => {
    setGuestAvatarCode(CODE);
    keepLook('masculine');
    api.look = 'feminine';
    expect(await moveGuestToAccount({ ...ME, avatar: 'b0s1h2' })).toBe(false);
    expect(api.savedAvatar).toEqual([]);
    expect(api.savedLook).toEqual([]);
    expect(guestAvatarCode()).toBeNull();
    expect(loadLook()).toBe('feminine');
  });

  it('an account with no look and a guest with none stays unanswered, never a made up value', async () => {
    api.look = 'something else';
    await moveGuestToAccount(ME);
    expect(loadLook()).toBeNull();
    expect(api.savedLook).toEqual([]);
  });

  it('a failed save keeps the guest copy for the next try', async () => {
    setGuestAvatarCode(CODE);
    keepLook('mixed');
    api.saveFails = true;
    expect(await moveGuestToAccount(ME)).toBe(false);
    expect(guestAvatarCode()).toBe(CODE);
    expect(loadLook()).toBe('mixed');
  });

  it('when the account cannot be read, neither copy of the look is touched', async () => {
    keepLook('mixed');
    api.fetchFails = true;
    await moveGuestToAccount(ME);
    expect(api.savedLook).toEqual([]);
    expect(loadLook()).toBe('mixed');
  });

  it.each([null, undefined, { id: '', handle: 'ada', avatar: null }])('no profile (%j): nothing happens', async (p) => {
    setGuestAvatarCode(CODE);
    expect(await moveGuestToAccount(p)).toBe(false);
    expect(api.savedAvatar).toEqual([]);
    expect(guestAvatarCode()).toBe(CODE);
  });
});
