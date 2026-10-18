import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
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

/** The puzzle behind CODE, after `delay` ms. */
async function mockPuzzle(page: Page, delay = 0) {
  await page.route('**/rest/v1/rpc/get_game_by_code*', async (r) => {
    if (delay) await sleep(delay);
    await r.fulfill({ json: [GAME] });
  });
}


test.describe('the waiting screen', () => {
  test('the same guest sees the same character each time', async ({ page }) => {
    await mockPuzzle(page, 6000);
    const draw = async () => {
      await page.goto(`/p/${CODE}`);
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
      await mockPuzzle(page, 8000);
      await page.goto(`/p/${CODE}`);
      expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe(theme);
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
    await mockPuzzle(page, 6000);
    await page.goto(`/p/${CODE}`);
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
    await page.route('**/rest/v1/rpc/get_game_by_code*', () => {
      /* never answers */
    });
    await page.goto(`/p/${CODE}`);
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
    await expect(page.getByRole('link', { name: 'Play your first puzzle' }).first()).toBeVisible();
    expect(await sawWaiting(page)).toBe(false);

    // Hold every script the next screen needs.
    await page.route('**/assets/*.js', async (r) => {
      await sleep(2200);
      await r.continue();
    });
    await page.getByRole('link', { name: 'Play your first puzzle' }).first().click();
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
