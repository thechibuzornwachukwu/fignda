import { webcrypto } from 'node:crypto';
import pools from '../../data/copy.json';
import { reminderLine } from '../src/app';
import { makePush, PUSH_ENDPOINT, vapidHeader } from '../src/push';

const b64url = (b: ArrayBuffer | Uint8Array) => Buffer.from(b as ArrayBuffer).toString('base64url');

async function keyPair() {
  const pair = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const publicKey = b64url(await webcrypto.subtle.exportKey('raw', pair.publicKey));
  const privateKey = (await webcrypto.subtle.exportKey('jwk', pair.privateKey)).d!;
  return { pair, publicKey, privateKey };
}

describe('VAPID header', () => {
  it('is a JWT for the push service origin that verifies with the public key', async () => {
    const { pair, publicKey, privateKey } = await keyPair();
    const now = Date.UTC(2026, 9, 7);
    const h = await vapidHeader('https://fcm.googleapis.com/fcm/send/abc', { publicKey, privateKey, subject: 'https://fignda.pages.dev' }, now);
    const m = h.match(/^vapid t=([\w-]+)\.([\w-]+)\.([\w-]+), k=([\w-]+)$/)!;
    expect(m).not.toBeNull();
    expect(m[4]).toBe(publicKey);
    expect(JSON.parse(Buffer.from(m[1]!, 'base64url').toString())).toEqual({ typ: 'JWT', alg: 'ES256' });
    expect(JSON.parse(Buffer.from(m[2]!, 'base64url').toString())).toEqual({
      aud: 'https://fcm.googleapis.com',
      exp: now / 1000 + 12 * 3600,
      sub: 'https://fignda.pages.dev',
    });
    const ok = await webcrypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      pair.publicKey,
      Buffer.from(m[3]!, 'base64url'),
      new TextEncoder().encode(`${m[1]}.${m[2]}`),
    );
    expect(ok).toBe(true);
  });

  it('is off without keys', () => {
    expect(makePush({})).toBeNull();
    expect(makePush({ publicKey: 'x', subject: 'y' })).toBeNull();
  });
});

describe('push endpoints', () => {
  it.each([
    'https://fcm.googleapis.com/fcm/send/abc',
    'https://updates.push.services.mozilla.com/wpush/v2/abc',
    'https://web.push.apple.com/abc',
    'https://wns2-by3p.notify.windows.com/w/?token=abc',
  ])('accepts %s', (u) => expect(PUSH_ENDPOINT.test(u)).toBe(true));

  it.each([
    'http://fcm.googleapis.com/fcm/send/abc',
    'https://evil.example/fcm.googleapis.com/',
    'https://fcm.googleapis.com.evil.example/x',
    'https://127.0.0.1/',
    'https://push.apple.com.evil.example/',
  ])('refuses %s', (u) => expect(PUSH_ENDPOINT.test(u)).toBe(false));

  it('never calls a refused endpoint', async () => {
    const { publicKey, privateKey } = await keyPair();
    const send = makePush({ publicKey, privateKey, subject: 'https://fignda.pages.dev' })!;
    expect(await send('https://evil.example/x')).toBe(400);
  });
});

describe('reminder line', () => {
  const from = (pool: string[], line: string, v: Record<string, string>) =>
    pool.some((t) => t.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '') === line);

  it('a friend who has played comes first, then the streak, then the plain nudge', () => {
    expect(from(pools.remindFriend, reminderLine({ streak: 9, friend: 'Ada' }), { name: 'Ada' })).toBe(true);
    expect(from(pools.remindStreak, reminderLine({ streak: 9, friend: null }), { n: '9' })).toBe(true);
    // One day is not a run yet.
    expect(pools.remind).toContain(reminderLine({ streak: 1, friend: null }));
    expect(pools.remind).toContain(reminderLine({ streak: 0, friend: null }));
  });
});
