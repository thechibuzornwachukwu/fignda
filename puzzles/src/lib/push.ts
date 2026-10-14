// The daily reminder: a web push at an hour the player picks, sent only on days they have not played.
// The browser subscribes with the site's public key; the subscription's address is saved to the player's own
// row (RLS: own rows only). The Worker's hourly cron does the sending (worker/src/app.ts sendReminders).

import { getSupabase } from './supabase';

export const REMINDER_HOURS = [8, 13, 19] as const;
export type ReminderHour = (typeof REMINDER_HOURS)[number];
export const DEFAULT_HOUR: ReminderHour = 19;

export type ReminderState =
  /** This browser cannot do web push (on iPhone: until the site is on the Home Screen). */
  | { status: 'unsupported' }
  /** The server has no keys yet. */
  | { status: 'unavailable' }
  /** The player blocked notifications for the site. */
  | { status: 'blocked' }
  | { status: 'off' }
  | { status: 'on'; hour: number };

const API = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

export const pushSupported = (): boolean =>
  typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof window !== 'undefined' && 'PushManager' in window && 'Notification' in window;

let keyPromise: Promise<string | null> | null = null;

/** The site's public push key, or null while reminders are switched off on the server. */
export function pushKey(): Promise<string | null> {
  keyPromise ??= fetch(`${API}/health`, { signal: AbortSignal.timeout(4000) })
    .then(async (r) => (r.ok ? (((await r.json()) as { push?: string | null }).push ?? null) : null))
    .catch(() => null);
  return keyPromise;
}

const keyBytes = (b64url: string) => Uint8Array.from(atob(b64url.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

async function subscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration('/');
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function reminderState(): Promise<ReminderState> {
  if (!pushSupported()) return { status: 'unsupported' };
  if (!(await pushKey())) return { status: 'unavailable' };
  if (Notification.permission === 'denied') return { status: 'blocked' };
  const sub = await subscription().catch(() => null);
  const sb = await getSupabase();
  if (!sub || !sb) return { status: 'off' };
  const { data } = await sb.from('push_subs').select('hour').eq('endpoint', sub.endpoint).maybeSingle();
  return data ? { status: 'on', hour: data.hour as number } : { status: 'off' };
}

/** Asks for permission (the browser shows its own prompt), subscribes and saves. Must run from a tap. */
export async function enableReminder(hour: number = DEFAULT_HOUR): Promise<ReminderState> {
  if (!pushSupported()) return { status: 'unsupported' };
  const key = await pushKey();
  const sb = await getSupabase();
  if (!key || !sb) return { status: 'unavailable' };
  if ((await Notification.requestPermission()) !== 'granted') return { status: Notification.permission === 'denied' ? 'blocked' : 'off' };
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
    const { error } = await sb.from('push_subs').upsert({ endpoint: sub.endpoint, tz: zone(), hour }, { onConflict: 'endpoint' });
    if (error) return { status: 'off' };
    return { status: 'on', hour };
  } catch {
    return { status: 'off' };
  }
}

export async function setReminderHour(hour: number): Promise<boolean> {
  const sub = await subscription().catch(() => null);
  const sb = await getSupabase();
  if (!sub || !sb) return false;
  const { error } = await sb.from('push_subs').update({ hour, tz: zone() }).eq('endpoint', sub.endpoint);
  return !error;
}

/** Forget this browser. Also run on sign out, so the next player here does not get someone else's nudges. */
export async function disableReminder(): Promise<void> {
  if (!pushSupported()) return;
  const sub = await subscription().catch(() => null);
  if (!sub) return;
  const sb = await getSupabase();
  await sb?.from('push_subs').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe().catch(() => {});
}
