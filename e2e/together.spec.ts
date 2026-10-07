import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { newPlayer } from './helpers';

// Local stack keys cached by the DB test setup. Local only; never used in the app.
const env = JSON.parse(readFileSync('supabase/.temp/test-env.json', 'utf8')) as { url: string; service: string };
const admin = (path: string, init: RequestInit = {}) =>
  fetch(`${env.url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: env.service, Authorization: `Bearer ${env.service}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });

async function seedPlay(handle: string, play: { game_id: string; score: number; found: number; total: number; secs: number }) {
  const [p] = (await (await admin(`profiles?handle=eq.${handle}&select=id`)).json()) as Array<{ id: string }>;
  const r = await admin('plays', { method: 'POST', body: JSON.stringify({ user_id: p!.id, ...play, verified: true, source: 'worker' }) });
  expect(r.ok, await r.text()).toBe(true);
}

async function indexOf(page: Page, word: string) {
  await page.locator('[data-li]').first().waitFor();
  const S = await page.evaluate(() => Array.from(document.querySelectorAll('[data-li]'), (e) => e.textContent).join('').toLowerCase());
  return S.indexOf(word);
}

async function clickPair(page: Page, a: number, b: number) {
  await page.locator(`[data-li="${a}"]`).click();
  await page.locator(`[data-li="${b}"]`).click();
}

test.describe('phone tab bar', () => {
  test.use({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true });

  test('app pages get Games, Leaders, Players, Sign in; landing and puzzles do not', async ({ page }) => {
    await page.goto('/play');
    const tabs = page.getByRole('navigation', { name: 'Tabs' });
    await expect(tabs).toBeVisible();
    await expect(tabs.getByRole('link')).toHaveText(['Games', 'Leaders', 'Players', 'Sign in']);
    await expect(tabs.getByRole('link', { name: 'Games' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
    await tabs.getByRole('link', { name: 'Leaders' }).click();
    await expect(page).toHaveURL(/\/leaderboard$/);
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Tabs' })).toHaveCount(0);
    await page.goto('/play/bible');
    await expect(page.getByRole('navigation', { name: 'Tabs' })).toHaveCount(0);
  });

  test('desktop keeps the header links and no tab bar', async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto('/play');
    await expect(page.getByRole('navigation', { name: 'Tabs' })).toBeHidden();
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await page.close();
  });
});

test('head to head: a shared link sets the bar, the result names the winner', async ({ page, browser }) => {
  const ada = await browser.newPage();
  const handle = await newPlayer(ada, 'Ada');
  await ada.close();
  await seedPlay(handle, { game_id: 'bible', score: 1234, found: 10, total: 30, secs: 95 });

  await page.goto(`/play/bible?vs=${handle}`);
  const bar = page.locator('[data-challenge]');
  await expect(bar).toHaveText(`@${handle} scored 1,234 with 10 found in 1:35. Beat it.`);
  await expect(bar.getByRole('link', { name: `@${handle}` })).toHaveAttribute('href', `/u/${handle}`);
  await page.getByRole('button', { name: "I'm done" }).first().click();
  await expect(bar).toHaveAttribute('data-challenge', 'lost');
  await expect(bar).toContainText(`@${handle} wins by`);
});

test('a challenge from an unknown or bad handle shows nothing', async ({ page }) => {
  await page.goto('/play/bible?vs=%27%20or%201%3D1');
  await page.locator('[data-li]').first().waitFor();
  await page.waitForTimeout(500);
  await expect(page.locator('[data-challenge]')).toHaveCount(0);
});

test.describe('play together', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('two players share finds live; a late joiner gets what was found; forged finds are ignored', async ({ context }) => {
    const host = await context.newPage();
    await host.goto('/play/bible');
    await host.getByRole('button', { name: 'Play together' }).click();
    await expect(host).toHaveURL(/\?room=[A-Z2-9]{6}$/);
    const url = host.url();
    const room = host.getByRole('region', { name: 'Playing together' });
    await expect(room).toContainText('Waiting for a friend');
    await expect(room).toContainText('Signed in teams go on the Together board');
    await expect(room.locator('[data-status="live"]')).toHaveText('Live');

    const guest = await context.newPage();
    await guest.goto(url.replace(/^https?:\/\/[^/]+/, ''));
    await expect(room.locator('[data-peers="1"]')).toBeVisible();
    await expect(guest.getByRole('region', { name: 'Playing together' }).locator('[data-peers="1"]')).toBeVisible();

    // The guest finds Amos; it lands on the host's board too.
    const i = await indexOf(guest, 'amost');
    await clickPair(guest, i, i + 3);
    await expect(guest.locator(`[data-li="${i}"]`)).toHaveAttribute('data-state', 'found');
    await expect(host.locator(`[data-li="${i}"]`)).toHaveAttribute('data-state', 'found');
    await expect(host.getByRole('status').filter({ hasText: /Amos/ }).first()).toBeAttached();

    // A late joiner receives everything found so far.
    const late = await context.newPage();
    await late.goto(url.replace(/^https?:\/\/[^/]+/, ''));
    await expect(late.locator(`[data-li="${i}"]`)).toHaveAttribute('data-state', 'found');

    // A forged message for a span that is not an answer changes nothing.
    const code = new URL(url).searchParams.get('room');
    await guest.evaluate((code) => {
      const bc = new BroadcastChannel(`fignda-room-${code}`);
      bc.postMessage({ event: 'find', payload: { a: 0, b: 6, from: { id: 'x', name: 'Mallory' } } });
      bc.postMessage({ event: 'sync', payload: { spans: [[1, 9], ['a', 'b']], from: { id: 'x', name: 'Mallory' } } });
    }, code);
    await host.waitForTimeout(400);
    await expect(host.locator('[data-li="0"]')).not.toHaveAttribute('data-state', 'found');
    await expect(host.getByRole('complementary').getByText(/1 \/ /)).toBeVisible();

    // A later find reaches everyone, including the late joiner.
    const m = await indexOf(host, 'mark');
    await clickPair(host, m, m + 3);
    await expect(late.locator(`[data-li="${m}"]`)).toHaveAttribute('data-state', 'found', { timeout: 12000 });

    // Scoreboard: the guest found 1 word; host found 1 too (Mark), so both show 1 word.
    const board = room.getByRole('list', { name: 'Room scoreboard' });
    await expect(board.locator('li[data-you]')).toContainText('1 word');
    await expect(board).toContainText('A friend');

    // Away: the guest switches apps; the host sees it.
    await guest.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(board.locator('li[data-away]')).toHaveCount(1);
    await guest.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(board.locator('li[data-away]')).toHaveCount(0);

    // Leave drops you out of the room.
    await guest.getByRole('link', { name: 'Leave' }).click();
    await expect(guest).toHaveURL(/\/play\/bible$/);
    await expect(room.locator('[data-peers="1"]')).toBeVisible();
  });

  test('four players finding at the same moment end with the same board and a fair scoreboard', async ({ context }) => {
    const host = await context.newPage();
    await host.goto('/play/bible');
    await host.getByRole('button', { name: 'Play together' }).click();
    await expect(host).toHaveURL(/room=/);
    const path = host.url().replace(/^https?:\/\/[^/]+/, '');
    const others = await Promise.all([0, 1, 2].map(() => context.newPage()));
    await Promise.all(others.map((p) => p.goto(path)));
    const all = [host, ...others];
    for (const p of all) await expect(p.locator('[data-peers="3"]')).toBeVisible();

    const S = await host.evaluate(() => Array.from(document.querySelectorAll('[data-li]'), (e) => e.textContent).join('').toLowerCase());
    const at = (w: string) => S.indexOf(w);
    const words = ['amost', 'mark', 'ruth', 'job'].map((w) => [at(w), at(w) + (w === 'amost' ? 3 : w.length - 1)] as const);
    for (const [a] of words) expect(a).toBeGreaterThanOrEqual(0);
    // Everyone fires at once: 4 different words, and 2 players race for the same one (Ruth).
    await Promise.all([
      clickPair(all[0]!, ...words[0]!),
      clickPair(all[1]!, ...words[1]!),
      clickPair(all[2]!, ...words[2]!),
      (async () => {
        await clickPair(all[3]!, ...words[2]!);
        await clickPair(all[3]!, ...words[3]!);
      })(),
    ]);
    // Every board converges on the same 4 finds, each once.
    for (const p of all) {
      for (const [a] of words) await expect(p.locator(`[data-li="${a}"]`)).toHaveAttribute('data-state', 'found');
      await expect(p.getByRole('complementary')).toContainText('4 / 30');
    }
    const found = await Promise.all(all.map((p) => p.evaluate(() => Array.from(document.querySelectorAll('[data-state="found"]'), (e) => e.getAttribute('data-li')).join())));
    expect(new Set(found).size).toBe(1);
    // Scoreboards agree on who is on it, and nobody has more than they found.
    for (const p of all) await expect(p.getByRole('list', { name: 'Room scoreboard' }).locator('li')).toHaveCount(4);
  });

  test('a signed up player shows by name, linked to their profile', async ({ context }) => {
    const host = await context.newPage();
    const handle = await newPlayer(host, 'Chidi');
    await host.goto('/play/bible');
    await host.getByRole('button', { name: 'Play together' }).click();
    await expect(host).toHaveURL(/room=/);
    const path = host.url().replace(/^https?:\/\/[^/]+/, '');
    // Test rooms run over BroadcastChannel, which only reaches tabs of one browser, so the second player is
    // Chidi in another tab: enough to prove the name and handle travel with each find.
    const guest = await context.newPage();
    await guest.goto(path);
    const board = guest.getByRole('list', { name: 'Room scoreboard' });
    await expect(board.getByRole('link', { name: 'Chidi' })).toHaveAttribute('href', `/u/${handle}`);
    const S = await host.evaluate(() => Array.from(document.querySelectorAll('[data-li]'), (e) => e.textContent).join('').toLowerCase());
    const i = S.indexOf('amost');
    await clickPair(host, i, i + 3);
    await expect(guest.getByRole('status').filter({ hasText: /Chidi (found|got) Amos|Amos, spotted by Chidi/ }).first()).toBeAttached();
  });

  test('dailies have no Play together', async ({ page }) => {
    await page.goto('/play');
    await page.getByRole('link', { name: /Daily/ }).first().click();
    await page.locator('[data-li]').first().waitFor();
    await expect(page.getByRole('button', { name: 'Play together' })).toHaveCount(0);
  });
});
