import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import { newPlayer } from './helpers';

// The waiting screen (BUILD_PLAN section 4, SPEC section 8). Every slow answer here is made slow on purpose
// by holding the request, so nothing depends on a real AI provider.

const CODE = 'ABCDEFGH';
const GAME = {
  id: 'c-abcdefgh',
  title: 'House keys',
  noun: 'short words',
  text: 'It was a most ordinary day until Pat omitted the big old key from each drawer in the house.',
  dict: ['amos', 'atom', 'gold', 'rome'],
  share_code: CODE,
};

const waiting = (page: Page, size: 'full' | 'inline' = 'full') => page.locator(`[data-waiting="${size}"]`);
const topic = (page: Page) => page.getByLabel('Or any topic');
const createBtn = (page: Page) => page.getByRole('button', { name: 'Create puzzle' });
const alertLine = (page: Page) => page.locator('#custom [role="alert"]');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Records whether a waiting screen was ever in the page, however briefly. */
async function watchForWaiting(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __sawWaiting: boolean };
    w.__sawWaiting = false;
    new MutationObserver(() => {
      if (document.querySelector('[data-waiting]')) w.__sawWaiting = true;
    }).observe(document, { childList: true, subtree: true });
  });
}
const sawWaiting = (page: Page) => page.evaluate(() => (window as unknown as { __sawWaiting: boolean }).__sawWaiting);

/** Any-topic is on, and `/api/generate` answers the way the test says. Returns the requests seen. */
async function mockGenerate(page: Page, handler: (route: Route) => Promise<void> | void) {
  const seen: string[] = [];
  await page.route('**/api/health', (r) => r.fulfill({ json: { ok: true, generate: true, push: null } }));
  await page.route('**/api/generate', async (r) => {
    seen.push(r.request().postData() ?? '');
    await handler(r);
  });
  return seen;
}

/** The puzzle behind CODE, after `delay` ms. */
async function mockPuzzle(page: Page, delay = 0) {
  await page.route('**/rest/v1/rpc/get_game_by_code*', async (r) => {
    if (delay) await sleep(delay);
    await r.fulfill({ json: [GAME] });
  });
}

const answerWith = (delay: number, response: Parameters<Route['fulfill']>[0]) => async (r: Route) => {
  await sleep(delay);
  // The request may be gone by now (Cancel, back). That is what some tests are checking.
  await r.fulfill(response).catch(() => {});
};

// Any topic appears on the games screen after 5 plays. The direct link always shows it.
async function openPlay(page: Page, text = 'Football') {
  await page.goto('/play#any-topic');
  await topic(page).fill(text);
}

test.describe('any topic', () => {
  test('an answer in under 1 second opens the puzzle and the waiting screen never appears', async ({ page }) => {
    await watchForWaiting(page);
    await mockPuzzle(page);
    await mockGenerate(page, answerWith(100, { json: { code: CODE } }));
    await openPlay(page);
    await createBtn(page).click();
    await expect(page).toHaveURL(new RegExp(`/p/${CODE}$`));
    await expect(page.getByRole('heading', { level: 1 })).toContainText('short words');
    expect(await sawWaiting(page)).toBe(false);
  });

  test('a slow answer shows the avatar, 3 dots, one line and Cancel, then opens the puzzle', async ({ page }) => {
    await mockPuzzle(page);
    await mockGenerate(page, answerWith(3000, { json: { code: CODE } }));
    await openPlay(page);
    const clicked = Date.now();
    await createBtn(page).click();

    // Not in the first second.
    await page.waitForTimeout(600);
    await expect(waiting(page)).toHaveCount(0);

    const w = waiting(page);
    await expect(w).toBeVisible();
    expect(Date.now() - clicked).toBeGreaterThanOrEqual(1000);

    // The player's avatar at 88, drawn by <Avatar>. A guest gets a starter from a seed saved in the browser.
    const avatar = w.locator('svg');
    await expect(avatar).toHaveCount(1);
    await expect(avatar).toHaveAttribute('width', '88');
    await expect(avatar).toHaveAttribute('aria-hidden', 'true');
    expect(await page.evaluate(() => localStorage.getItem('gazecraft-guest-seed'))).toMatch(/^[a-z0-9]{4,16}$/);

    // Screen reader: one status line. The avatar and the dots are hidden from it.
    await expect(w.getByRole('status')).toHaveCount(1);
    await expect(w.getByRole('status')).not.toBeEmpty();
    const dots = w.locator('span[aria-hidden="true"] > span');
    await expect(dots).toHaveCount(3);
    await expect(w.getByRole('button', { name: 'Cancel' })).toBeVisible();
    // Nothing else on it.
    await expect(w.getByRole('button')).toHaveCount(1);
    await expect(w.getByRole('link')).toHaveCount(0);

    // Dots are --muted, never lime.
    const colours = await page.evaluate(() => {
      const css = getComputedStyle(document.documentElement);
      const probe = (v: string) => {
        const el = document.createElement('i');
        el.style.color = css.getPropertyValue(v);
        document.body.append(el);
        const c = getComputedStyle(el).color;
        el.remove();
        return c;
      };
      const dot = document.querySelector('[data-waiting] span[aria-hidden="true"] > span')!;
      return { dot: getComputedStyle(dot).backgroundColor, muted: probe('--muted'), accent: probe('--accent') };
    });
    expect(colours.dot).toBe(colours.muted);
    expect(colours.dot).not.toBe(colours.accent);

    // Keyboard: focus is on the screen, and Tab stays inside it.
    await expect(w).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(w.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(w.getByRole('button', { name: 'Cancel' })).toBeFocused();

    // The old button text and the line under the input are gone.
    await expect(page.getByText('Creating...')).toHaveCount(0);
    await expect(page.getByText('This can take a few minutes. Keep this page open.', { exact: true })).toHaveCount(0);

    await expect(page).toHaveURL(new RegExp(`/p/${CODE}$`));
    await expect(waiting(page)).toHaveCount(0);
  });

  test('an answer just after it appears keeps the screen up for at least 600ms', async ({ page }) => {
    await mockPuzzle(page);
    await mockGenerate(page, answerWith(1100, { json: { code: CODE } }));
    await page.addInitScript(() => {
      const w = window as unknown as { __shown: number; __gone: number };
      w.__shown = 0;
      w.__gone = 0;
      new MutationObserver(() => {
        const on = !!document.querySelector('[data-waiting="full"]');
        if (on && !w.__shown) w.__shown = performance.now();
        if (!on && w.__shown && !w.__gone) w.__gone = performance.now();
      }).observe(document, { childList: true, subtree: true });
    });
    await openPlay(page);
    await createBtn(page).click();
    await expect(page).toHaveURL(new RegExp(`/p/${CODE}$`));
    const { shown, gone } = await page.evaluate(() => {
      const w = window as unknown as { __shown: number; __gone: number };
      return { shown: w.__shown, gone: w.__gone };
    });
    expect(shown).toBeGreaterThan(0);
    expect(gone - shown).toBeGreaterThanOrEqual(590);
  });

  test('double tap on Create and Enter twice send 1 request', async ({ page }) => {
    await mockPuzzle(page);
    const seen = await mockGenerate(page, answerWith(2500, { json: { code: CODE } }));
    await openPlay(page);
    await topic(page).press('Enter');
    await topic(page).press('Enter');
    await createBtn(page).dblclick({ force: true });
    await expect(waiting(page)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/p/${CODE}$`));
    expect(seen).toHaveLength(1);
    expect(JSON.parse(seen[0]!)).toEqual({ topic: 'Football' });
  });

  test('Cancel stops the request and returns to the input with the topic kept', async ({ page }) => {
    await mockPuzzle(page);
    await mockGenerate(page, answerWith(4000, { json: { code: CODE } }));
    await openPlay(page);
    const stopped = page.waitForEvent('requestfailed', (r) => r.url().endsWith('/api/generate'));
    await createBtn(page).click();
    await waiting(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(waiting(page)).toHaveCount(0);
    await stopped;
    await expect(topic(page)).toHaveValue('Football');
    await expect(topic(page)).toBeFocused();
    await expect(alertLine(page)).toBeEmpty();
    await expect(createBtn(page)).toBeEnabled();

    // The answer the server would have sent goes nowhere.
    await page.waitForTimeout(4500);
    await expect(page).toHaveURL(/\/play(#any-topic)?$/);
  });

  test('Escape cancels too', async ({ page }) => {
    await mockGenerate(page, answerWith(4000, { json: { code: CODE } }));
    await openPlay(page);
    await createBtn(page).click();
    await expect(waiting(page)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(waiting(page)).toHaveCount(0);
    await expect(topic(page)).toBeFocused();
    await expect(topic(page)).toHaveValue('Football');
  });

  test('failure: the screen closes, the topic stays, a genFail line shows', async ({ page }) => {
    await mockGenerate(page, answerWith(1500, { status: 422, json: { error: 'generate_failed' } }));
    await openPlay(page);
    await createBtn(page).click();
    await expect(waiting(page)).toBeVisible();
    await expect(waiting(page)).toHaveCount(0);
    await expect(alertLine(page)).toHaveText(/hid too well|got away|Nothing hiding there yet|monocle fogged up/);
    await expect(topic(page)).toHaveValue('Football');
    await expect(topic(page)).toBeFocused();
    await expect(page).toHaveURL(/\/play(#any-topic)?$/);
  });

  test('limit reached: the line says when to try again, from Retry-After', async ({ page }) => {
    await mockGenerate(page, answerWith(1500, { status: 429, headers: { 'Retry-After': '1500' }, json: { error: 'rate_limited' } }));
    await openPlay(page);
    await createBtn(page).click();
    await expect(waiting(page)).toBeVisible();
    await expect(waiting(page)).toHaveCount(0);
    await expect(alertLine(page)).toHaveText(/Try again in 25 minutes\.$/);
    await expect(topic(page)).toHaveValue('Football');
  });

  test('limit reached at once: no waiting screen, the line shows', async ({ page }) => {
    await watchForWaiting(page);
    await mockGenerate(page, answerWith(0, { status: 429, headers: { 'Retry-After': '3600' }, json: { error: 'rate_limited' } }));
    await openPlay(page);
    await createBtn(page).click();
    await expect(alertLine(page)).toHaveText(/Try again in 1 hour\.$/);
    expect(await sawWaiting(page)).toBe(false);
  });

  test('offline: nothing is sent, the offline line shows, the topic stays', async ({ page, context }) => {
    const seen = await mockGenerate(page, answerWith(0, { json: { code: CODE } }));
    await openPlay(page);
    await context.setOffline(true);
    await createBtn(page).click();
    await expect(alertLine(page)).toHaveText(/offline|No connection/);
    await expect(topic(page)).toHaveValue('Football');
    expect(seen).toHaveLength(0);
    await context.setOffline(false);
  });

  test('signal lost mid wait: the screen closes with the offline line', async ({ page, context }) => {
    await mockGenerate(page, async (r) => {
      await sleep(2500);
      await r.abort('internetdisconnected').catch(() => {});
    });
    await openPlay(page);
    await createBtn(page).click();
    await expect(waiting(page)).toBeVisible();
    await context.setOffline(true);
    await expect(waiting(page)).toHaveCount(0);
    await expect(alertLine(page)).toHaveText(/offline|No connection/);
    await expect(topic(page)).toHaveValue('Football');
    await context.setOffline(false);
  });

  test('past 5 minutes the request is stopped and the failure line shows', async ({ page }) => {
    // The page's clock is ours, so 5 minutes pass in a moment.
    await page.clock.install();
    await mockGenerate(page, () => {
      /* never answers */
    });
    await openPlay(page);
    const stopped = page.waitForEvent('requestfailed', (r) => r.url().endsWith('/api/generate'));
    await createBtn(page).click();
    await page.clock.runFor(1100);
    await expect(waiting(page)).toBeVisible();
    const first = await waiting(page).getByRole('status').textContent();

    // The line changes every 20 seconds, so a long wait does not look stuck.
    await page.clock.runFor(20_000);
    await expect(waiting(page).getByRole('status')).not.toHaveText(first!);

    // 298 seconds in: still waiting. 2.5 seconds more and the cap has passed.
    await page.clock.runFor(4 * 60 * 1000 + 37_000);
    await expect(waiting(page)).toBeVisible();
    await page.clock.runFor(2500);
    await stopped;
    await page.clock.runFor(1000);
    await expect(waiting(page)).toHaveCount(0);
    await expect(alertLine(page)).toHaveText(/hid too well|got away|Nothing hiding there yet|monocle fogged up/);
    await expect(topic(page)).toHaveValue('Football');
  });

  test('back button during the wait leaves cleanly, with no late jump to the puzzle', async ({ page }) => {
    await mockPuzzle(page);
    await mockGenerate(page, answerWith(3000, { json: { code: CODE } }));
    // Arrive at /play from the landing page inside the app, so Back is an in-app move.
    await page.goto('/play#any-topic');
    await page.getByRole('link', { name: 'Gazecraft home' }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/play#any-topic$/);
    await topic(page).fill('Football');
    await createBtn(page).click();
    await expect(waiting(page)).toBeVisible();

    await page.goBack();
    await expect(waiting(page)).toHaveCount(0);
    await expect(page).not.toHaveURL(/\/play(#any-topic)?$/);
    const left = page.url();
    await page.waitForTimeout(3500);
    expect(page.url()).toBe(left);
    await expect(waiting(page)).toHaveCount(0);
  });

  test('app switched mid wait: on return the wait carries on, then the puzzle opens', async ({ page }) => {
    await mockPuzzle(page);
    await mockGenerate(page, answerWith(3500, { json: { code: CODE } }));
    await openPlay(page);
    await createBtn(page).click();
    await expect(waiting(page)).toBeVisible();
    const hide = (hidden: boolean) =>
      page.evaluate((h) => {
        Object.defineProperty(document, 'visibilityState', { value: h ? 'hidden' : 'visible', configurable: true });
        Object.defineProperty(document, 'hidden', { value: h, configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      }, hidden);
    await hide(true);
    await page.waitForTimeout(800);
    await hide(false);
    await expect(waiting(page)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/p/${CODE}$`));
  });

  test('the same guest sees the same character each time', async ({ page }) => {
    await mockGenerate(page, answerWith(6000, { json: { code: CODE } }));
    const draw = async () => {
      await openPlay(page);
      await createBtn(page).click();
      await expect(waiting(page)).toBeVisible();
      const svg = await waiting(page).locator('svg').innerHTML();
      await waiting(page).getByRole('button', { name: 'Cancel' }).click();
      return svg;
    };
    const first = await draw();
    const seed = await page.evaluate(() => localStorage.getItem('gazecraft-guest-seed'));
    expect(await draw()).toBe(first);
    expect(await page.evaluate(() => localStorage.getItem('gazecraft-guest-seed'))).toBe(seed);
  });

  for (const theme of ['dark', 'light'] as const) {
    test(`320px wide, ${theme} theme: fits, wraps, and passes axe`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.addInitScript((t) => localStorage.setItem('gazecraft-theme', t), theme);
      await mockGenerate(page, answerWith(8000, { json: { code: CODE } }));
      // A long topic must not push anything off screen.
      await openPlay(page, 'Supercalifragilisticexpialidocious-and-then-some-more-words');
      expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe(theme);
      await createBtn(page).click();
      const w = waiting(page);
      await expect(w).toBeVisible();

      const box = async (sel: string) => (await w.locator(sel).first().boundingBox())!;
      for (const sel of ['svg', 'p[role="status"]', 'button']) {
        const b = await box(sel);
        expect(b.x, sel).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width, sel).toBeLessThanOrEqual(320);
        expect(b.y, sel).toBeGreaterThanOrEqual(0);
        expect(b.y + b.height, sel).toBeLessThanOrEqual(640);
      }
      // Avatar, dots, line, Cancel: top to bottom, none over another.
      const [a, l, c] = [await box('svg'), await box('p[role="status"]'), await box('button')];
      expect(a.y + a.height).toBeLessThanOrEqual(l.y);
      expect(l.y + l.height).toBeLessThanOrEqual(c.y + 1);
      expect(c.height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

      // It covers the page: the tab bar and the list are not on top of it.
      const top = await page.evaluate(() => {
        const r = document.querySelector('[data-waiting] p')!.getBoundingClientRect();
        return !!document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('[data-waiting]');
      });
      expect(top).toBe(true);

      const r = await new AxeBuilder({ page }).include('[data-waiting]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    });
  }

  test('motion: the avatar bobs and the dots hop in turn, from tokens', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await mockGenerate(page, answerWith(6000, { json: { code: CODE } }));
    await openPlay(page);
    await createBtn(page).click();
    await expect(waiting(page)).toBeVisible();
    const m = await page.evaluate(() => {
      const root = document.querySelector('[data-waiting]')!;
      const token = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
      const secs = (v: string) => (v.endsWith('ms') ? parseFloat(v) / 1000 : parseFloat(v));
      const dots = [...root.querySelectorAll('span[aria-hidden="true"] > span')].map((d) => getComputedStyle(d));
      const bob = getComputedStyle(root.querySelector('svg')!.parentElement!);
      return {
        bob: secs(bob.animationDuration),
        bobName: bob.animationName,
        dot: dots.map((d) => secs(d.animationDuration)),
        delay: dots.map((d) => secs(d.animationDelay)),
        want: { bob: secs(token('--dur-bob')), bounce: secs(token('--dur-bounce')), step: secs(token('--dur-bounce-step')) },
      };
    });
    expect(m.bobName).not.toBe('none');
    expect(m.bob).toBeCloseTo(m.want.bob);
    expect(m.dot).toEqual([m.want.bounce, m.want.bounce, m.want.bounce]);
    expect(m.delay[0]).toBe(0);
    expect(m.delay[1]).toBeCloseTo(m.want.step);
    expect(m.delay[2]).toBeCloseTo(m.want.step * 2);
  });

  test('reduced motion: nothing moves, and the line still changes', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install();
    await mockGenerate(page, () => {
      /* never answers */
    });
    await openPlay(page);
    await createBtn(page).click();
    await page.clock.runFor(1100);
    await expect(waiting(page)).toBeVisible();
    const names = await page.evaluate(() => {
      const root = document.querySelector('[data-waiting]')!;
      const moving = [root.querySelector('svg')!.parentElement!, ...root.querySelectorAll('span[aria-hidden="true"] > span')];
      return { names: moving.map((el) => getComputedStyle(el).animationName), running: root.getAnimations({ subtree: true }).length };
    });
    expect(names.names).toEqual(['none', 'none', 'none', 'none']);
    expect(names.running).toBe(0);

    const first = await waiting(page).getByRole('status').textContent();
    await page.clock.runFor(20_000);
    await expect(waiting(page).getByRole('status')).not.toHaveText(first!);
  });
});

test.describe('opening a puzzle by link', () => {
  test('fast: the puzzle opens and the waiting screen never appears', async ({ page }) => {
    await watchForWaiting(page);
    await mockPuzzle(page);
    await page.goto(`/p/${CODE}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('short words');
    expect(await sawWaiting(page)).toBe(false);
  });

  test('slower than 1 second: the waiting screen, then the puzzle, with 1 request', async ({ page }) => {
    let asked = 0;
    await page.route('**/rest/v1/rpc/get_game_by_code*', async (r) => {
      asked++;
      await sleep(2500);
      await r.fulfill({ json: [GAME] });
    });
    await page.goto(`/p/${CODE}`);
    const w = waiting(page);
    await expect(w).toBeVisible();
    await expect(w.locator('svg')).toHaveAttribute('width', '88');
    await expect(w.getByRole('status')).toHaveCount(1);
    // Not about making a puzzle: this one already exists.
    await expect(w.getByRole('status')).not.toContainText(/Making your puzzle/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('short words');
    await expect(waiting(page)).toHaveCount(0);
    expect(asked).toBe(1);
  });

  test('Cancel goes to the games list', async ({ page }) => {
    await mockPuzzle(page, 5000);
    await page.goto(`/p/${CODE}`);
    await waiting(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(page).toHaveURL(/\/play(#any-topic)?$/);
    await expect(waiting(page)).toHaveCount(0);
  });

  test('a code that is not a puzzle goes to the games list', async ({ page }) => {
    await page.route('**/rest/v1/rpc/get_game_by_code*', (r) => r.fulfill({ json: [] }));
    await page.goto(`/p/${CODE}`);
    await expect(page).toHaveURL(/\/play(#any-topic)?$/);
  });
});

test.describe('slow page load', () => {
  test('a page that takes longer than 1 second to fetch shows the waiting screen, a fast one does not', async ({ page }) => {
    await watchForWaiting(page);
    await page.goto('/');
    await expect(page.getByRole('link', { name: "Play today's daily" }).first()).toBeVisible();
    expect(await sawWaiting(page)).toBe(false);

    // Hold every script the next screen needs.
    await page.route('**/assets/*.js', async (r) => {
      await sleep(2200);
      await r.continue();
    });
    await page.getByRole('link', { name: "Play today's daily" }).first().click();
    const w = waiting(page);
    await expect(w).toBeVisible();
    await expect(w.locator('svg')).toHaveAttribute('width', '88');
    // A page load cannot be stopped, so there is no Cancel.
    await expect(w.getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
    await expect(waiting(page)).toHaveCount(0);
  });
});

test.describe('inline', () => {
  test('publishing in Make: button text stays, the waiting line shows only past 1 second', async ({ page }) => {
    await newPlayer(page, 'Waiter');
    await page.goto('/make');
    await page.getByLabel('Title').fill('House keys');
    await page.getByLabel('What is hidden').fill('short words');
    await page.getByLabel(/^Paragraph/).fill(GAME.text);
    await page.getByLabel(/^Hidden words/).fill('Amos, Atom, Gold, Rome');
    await expect(page.getByRole('status')).toContainText('4 words hidden. Ready.');

    let delay = 2500;
    let asked = 0;
    await page.route('**/api/puzzles', async (r) => {
      if (r.request().method() !== 'POST') return r.fallback();
      asked++;
      await sleep(delay);
      await r.fulfill({ status: 422, json: { error: 'not_hidden' } });
    });
    const publish = page.getByRole('button', { name: 'Publish puzzle' });

    await publish.click();
    await expect(publish).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Publishing...' })).toHaveCount(0);
    const w = waiting(page, 'inline');
    await expect(w).toBeVisible();
    await expect(w.locator('svg')).toHaveAttribute('width', '40');
    await expect(w.getByRole('status')).toHaveCount(1);
    // Inline: the dots sit beside the avatar, not under it.
    const a = (await w.locator('svg').boundingBox())!;
    const d = (await w.locator('span[aria-hidden="true"]').boundingBox())!;
    expect(d.x).toBeGreaterThanOrEqual(a.x + a.width);
    expect(d.y).toBeLessThan(a.y + a.height);
    await expect(w).toHaveCount(0);
    await expect(page.getByRole('status')).toContainText('Some words are not hidden yet. Check the list.');
    expect(asked).toBe(1);

    // Under a second: no waiting line at all.
    await watchForInline(page);
    delay = 100;
    await publish.click();
    await expect.poll(() => asked).toBe(2);
    await expect(page.getByRole('status')).toContainText('Some words are not hidden yet. Check the list.');
    await expect(publish).toBeEnabled();
    expect(await page.evaluate(() => (window as unknown as { __sawInline: boolean }).__sawInline)).toBe(false);
  });
});

/** Like `watchForWaiting`, for a page that is already open. */
async function watchForInline(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __sawInline: boolean };
    w.__sawInline = false;
    new MutationObserver(() => {
      if (document.querySelector('[data-waiting="inline"]')) w.__sawInline = true;
    }).observe(document, { childList: true, subtree: true });
  });
}
