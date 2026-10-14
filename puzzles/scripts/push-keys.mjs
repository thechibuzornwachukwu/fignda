// Makes a VAPID key pair for the daily reminder (web push). Run once: npm run push:keys
// The public key goes in worker/wrangler.toml. The private key is a Worker secret: never commit it.
import { webcrypto } from 'node:crypto';

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const pair = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const pub = await webcrypto.subtle.exportKey('raw', pair.publicKey);
const jwk = await webcrypto.subtle.exportKey('jwk', pair.privateKey);

console.log('Public key. Put it in worker/wrangler.toml as VAPID_PUBLIC_KEY:\n');
console.log(`  ${b64url(pub)}\n`);
console.log('Private key. Store it as a secret, then clear your terminal:\n');
console.log('  npx wrangler secret put VAPID_PRIVATE_KEY --config worker/wrangler.toml\n');
console.log(`  ${jwk.d}\n`);
