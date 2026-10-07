// The hourly reminder against the local Supabase stack, with a fake push service.

import { createClient } from '@supabase/supabase-js';
import pools from '../../data/copy.json';
import { dayNo } from '../../src/engine/daily';
import { makeProfile, makeUser, uniqueHandle } from '../../supabase/tests/helpers';
import { handle, sendReminders, type Deps } from '../src/app';

const APP = 'http://localhost:5173';
const db = createClient(process.env.SB_URL!, process.env.SB_SERVICE!, { auth: { persistSession: false } });
const ep = (tag: string) => `https://fcm.googleapis.com/fcm/send/${tag}-${Math.random().toString(36).slice(2)}`;
const hourIn = (tz: string) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(new Date()));

function fakePush(status: Record<string, number> = {}) {
  const calls: string[] = [];
  const deps: Deps = {
    db,
    ai: null,
    origins: [APP],
    pushKey: 'PUBLIC',
    push: async (endpoint) => {
      calls.push(endpoint);
      return status[endpoint] ?? 201;
    },
  };
  return { deps, calls };
}

async function player(tag: string) {
  const u = await makeUser(tag);
  const h = uniqueHandle(tag);
  await makeProfile(u, tag, h);
  return { u, h };
}

async function play(userId: string, day: number) {
  const game = (await db.from('daily').select('game_id').eq('day_no', day).single()).data!.game_id;
  const { error } = await db
    .from('plays')
    .insert({ user_id: userId, game_id: game, day_no: day, found: 1, total: 10, secs: 5, score: 100, verified: true, source: 'worker' });
  if (error) throw error;
}

describe('hourly reminders', () => {
  beforeEach(async () => {
    // Browsers left by other tests must not be due here.
    await db.from('push_subs').update({ last_day: dayNo() }).lt('last_day', dayNo());
  });

  it('sends once to players whose hour it is and who have not played; skips the rest', async () => {
    const [due, done, later] = [await player('rdue'), await player('rdone'), await player('rlater')];
    const tz = 'Africa/Lagos';
    const now = hourIn(tz);
    const e = { due: ep('due'), done: ep('done'), later: ep('later') };
    await due.u.client.from('push_subs').insert({ endpoint: e.due, tz, hour: now });
    await done.u.client.from('push_subs').insert({ endpoint: e.done, tz, hour: now });
    await later.u.client.from('push_subs').insert({ endpoint: e.later, tz, hour: (now + 5) % 24 });
    await play(done.u.id, dayNo());

    const { deps, calls } = fakePush();
    expect(await sendReminders(deps)).toEqual({ sent: 1, gone: 0, failed: 0 });
    expect(calls).toEqual([e.due]);
    // The same hour again: already sent today.
    expect(await sendReminders(deps)).toEqual({ sent: 0, gone: 0, failed: 0 });
    expect(calls).toHaveLength(1);
  });

  it('forgets browsers the push service says are gone', async () => {
    const p = await player('rgone');
    const tz = 'America/New_York';
    const gone = ep('gone');
    await p.u.client.from('push_subs').insert({ endpoint: gone, tz, hour: hourIn(tz) });
    const { deps } = fakePush({ [gone]: 410 });
    expect(await sendReminders(deps)).toEqual({ sent: 0, gone: 1, failed: 0 });
    expect((await db.from('push_subs').select('endpoint').eq('endpoint', gone)).data).toEqual([]);
  });

  it('does nothing without keys', async () => {
    expect(await sendReminders({ db, ai: null, origins: [APP], push: null })).toEqual({ sent: 0, gone: 0, failed: 0 });
  });
});

describe('POST /api/push/line', () => {
  const ask = (endpoint: unknown) =>
    handle(
      new Request('http://api.test/api/push/line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: APP, 'CF-Connecting-IP': `10.${Math.random()}` },
        body: JSON.stringify({ endpoint }),
      }),
      fakePush().deps,
    );

  it('an unknown or malformed endpoint gets the plain line and learns nothing', async () => {
    for (const e of [ep('nobody'), 'https://evil.example/x', 42]) {
      const r = await ask(e);
      expect(r.status).toBe(200);
      const body = (await r.json()) as { title: string; body: string; url: string };
      expect(pools.remind).toContain(body.body);
      expect(body.url).toBe(`/d/${dayNo()}`);
    }
  });

  it('a known browser hears about its streak', async () => {
    const p = await player('rline');
    const mine = ep('line');
    await p.u.client.from('push_subs').insert({ endpoint: mine, tz: 'UTC', hour: 9 });
    const today = dayNo();
    for (const d of [today - 1, today - 2, today - 3]) await play(p.u.id, d);
    const body = (await (await ask(mine)).json()) as { body: string };
    expect(pools.remindStreak.map((t) => t.replace('{n}', '3'))).toContain(body.body);
  });

  it('health tells browsers the public key only when reminders are on', async () => {
    const on = await handle(new Request('http://api.test/api/health'), fakePush().deps);
    expect(((await on.json()) as { push: string | null }).push).toBe('PUBLIC');
    const off = await handle(new Request('http://api.test/api/health'), { db, ai: null, origins: [APP], push: null, pushKey: 'PUBLIC' });
    expect(((await off.json()) as { push: string | null }).push).toBeNull();
  });
});
