import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createHmac, randomUUID } from 'node:crypto';

export const URL = process.env.SB_URL!;
export const ANON = process.env.SB_ANON!;
const SERVICE = process.env.SB_SERVICE!;

const opts = { auth: { persistSession: false, autoRefreshToken: false } };

export const anon = (): SupabaseClient => createClient(URL, ANON, opts);
/** Test fixtures only. The app never holds this key. */
export const admin = (): SupabaseClient => createClient(URL, SERVICE, opts);

export type TestUser = { id: string; email: string; client: SupabaseClient; token: string };

export async function makeUser(tag = 'u'): Promise<TestUser> {
  const email = `${tag}-${randomUUID().slice(0, 8)}@test.gazecraft.local`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await admin().auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const client = createClient(URL, ANON, opts);
  const { data: s, error: e2 } = await client.auth.signInWithPassword({ email, password });
  if (e2) throw e2;
  return { id: data.user.id, email, client, token: s.session!.access_token };
}

export async function makeProfile(u: TestUser, name: string, handle: string) {
  const { error } = await u.client.from('profiles').insert({ id: u.id, name, handle });
  if (error) throw error;
}

export const uniqueHandle = (p = 'h') => `${p}${randomUUID().replace(/-/g, '').slice(0, 10)}`;

/** Base32 share code, the shape the Worker will mint. */
export function shareCode(): string {
  const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  return Array.from({ length: 8 }, () => a[Math.floor(Math.random() * 32)]).join('');
}

/** Same as the engine: 2026-01-01 UTC is day 1. */
export function today(): number {
  const d = new Date();
  return Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(2026, 0, 1)) / 864e5) + 1;
}

const b64url = (s: string | Buffer) => Buffer.from(s).toString('base64url');

/** A JWT the server did not issue. */
export function forgedJwt(sub: string, role = 'authenticated', alg: 'HS256' | 'none' = 'HS256'): string {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg, typ: 'JWT' }));
  const body = b64url(JSON.stringify({ sub, role, aud: 'authenticated', iat: now, exp: now + 3600 }));
  if (alg === 'none') return `${head}.${body}.`;
  const sig = createHmac('sha256', 'not-the-real-secret').update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}

/** Raw REST call with an arbitrary bearer token. */
export function rest(path: string, token: string, init: RequestInit = {}) {
  return fetch(`${URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
  });
}
