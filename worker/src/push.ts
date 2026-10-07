// Web push for the daily reminder. Pushes carry no payload, so nothing needs encrypting: the push only wakes
// the browser's service worker, which asks /api/push/line what to say. Each request is signed with the
// site's VAPID key (RFC 8292) so the push service knows it is us.
//
//   VAPID_PUBLIC_KEY   wrangler.toml var. Base64url, 65 bytes. Also handed to browsers to subscribe with.
//   VAPID_PRIVATE_KEY  Worker secret. Base64url, 32 bytes.
//   Make a pair with: npm run push:keys

/** Sends one empty push. Resolves to the push service's HTTP status (201 sent, 404 or 410 gone for good). */
export type PushSend = (endpoint: string) => Promise<number>;

/** Only real push services. The endpoint comes from the browser, and the Worker calls it. */
export const PUSH_ENDPOINT =
  /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)\//;

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const text = (s: string) => new TextEncoder().encode(s);

/** A reminder is only useful for a few hours; after that the push service may drop it. */
const TTL_SECONDS = 6 * 3600;

export async function vapidHeader(endpoint: string, keys: { publicKey: string; privateKey: string; subject: string }, now = Date.now()) {
  const pub = fromB64url(keys.publicKey);
  if (pub.length !== 65 || pub[0] !== 4) throw new Error('VAPID_PUBLIC_KEY must be an uncompressed P-256 point.');
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x: b64url(pub.slice(1, 33)), y: b64url(pub.slice(33)), d: keys.privateKey },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const head = b64url(text(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64url(text(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: keys.subject })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, text(`${head}.${claims}`)));
  return `vapid t=${head}.${claims}.${b64url(sig)}, k=${keys.publicKey}`;
}

/** Null when no key pair is configured: reminders are off and browsers are told so. */
export function makePush(o: { publicKey?: string; privateKey?: string; subject?: string }): PushSend | null {
  if (!o.publicKey || !o.privateKey || !o.subject) return null;
  const keys = { publicKey: o.publicKey, privateKey: o.privateKey, subject: o.subject };
  return async (endpoint) => {
    if (!PUSH_ENDPOINT.test(endpoint)) return 400;
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: await vapidHeader(endpoint, keys), TTL: String(TTL_SECONDS), Urgency: 'normal', 'Content-Length': '0' },
      signal: AbortSignal.timeout(8000),
    });
    return r.status;
  };
}
