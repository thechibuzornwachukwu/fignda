import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { newPlayer } from './helpers';

// The path on the Games tab (BUILD_PLAN 3c, SPEC sections 6 and 8). Progress lives in the browser, so every
// test sets it up in localStorage before the page loads. Needs <Journey /> mounted on /play.

const journey = (page: Page) => page.locator('[data-journey]');
const stops = (page: Page) => journey(page).locator('[data-stop]');
const stop = (page: Page, id: string) => journey(page).locator(`[data-stop="${id}"]`);

async function seed(page: Page, data: { finished?: string[]; stars?: Record<string, number>; at?: string; theme?: 'dark' | 'light' }) {
  await page.addInitScript((d) => {
    // Once per test, not on every reload: later visits keep what the page saved.
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', '1');
    if (d.finished) localStorage.setItem('gazecraft-finished', JSON.stringify(d.finished));
    if (d.stars) localStorage.setItem('gazecraft-stars', JSON.stringify(d.stars));
    if (d.at) localStorage.setItem('gazecraft-journey-at', d.at);
    if (d.theme) localStorage.setItem('gazecraft-theme', d.theme);
  }, data);
}

async function open(page: Page) {
  await page.goto('/play');
  await expect(journey(page)).toBeVisible();
}

const order = (page: Page) => stops(page).evaluateAll((els) => els.map((el) => el.getAttribute('data-stop')!));
const statesOf = (page: Page) => stops(page).evaluateAll((els) => els.map((el) => el.getAttribute('data-state')));

test.describe('the journey', () => {
  test('a new guest: the first stop is next with their avatar on it, the rest are locked', async ({ page }) => {
    await open(page);
    await expect(journey(page)).toHaveAttribute('data-journey', 'going');
    await expect(journey(page).getByRole('heading', { level: 2, name: 'Your path' })).toBeVisible();
    const states = await statesOf(page);
    expect(states.length).toBeGreaterThan(10);
    expect(states[0]).toBe('next');
    expect(states.slice(1).every((s) => s === 'locked')).toBe(true);

    // One link on the path: the next stop. Locked stops are not links.
    await expect(journey(page).getByRole('link')).toHaveCount(1);
    const next = journey(page).locator('[data-state="next"]');
    await expect(next.getByRole('link')).toHaveAttribute('aria-current', 'step');
    await expect(next.locator('svg').first()).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('gazecraft-guest-seed'))).toMatch(/^[a-z0-9]{4,16}$/);

    const locked = journey(page).locator('[data-state="locked"]').first();
    await expect(locked.locator('a')).toHaveCount(0);
    await expect(locked.locator('[aria-disabled="true"]')).toContainText(/Locked\..*Finish .+ to open this\./);
  });

  test('the next stop opens its puzzle', async ({ page }) => {
    await open(page);
    const [first] = await order(page);
    await journey(page).getByRole('link').click();
    await expect(page).toHaveURL(new RegExp(`/play/${first}$`));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('finished stops show a tick and stars, and can be replayed', async ({ page }) => {
    await open(page);
    const ids = await order(page);
    const [a, b, c] = ids as [string, string, string];
    await seed(page, { finished: [a], stars: { [a]: 3, [b]: 1 } });
    await page.reload();
    await expect(journey(page)).toBeVisible();

    expect((await statesOf(page)).slice(0, 4)).toEqual(['done', 'done', 'next', 'locked']);
    await expect(stop(page, a).getByRole('img', { name: '3 of 3 stars' })).toBeVisible();
    await expect(stop(page, b).getByRole('img', { name: '1 of 3 stars' })).toBeVisible();
    await expect(stop(page, a).getByRole('link')).toHaveAccessibleName(/\. Done\. 3 of 3 stars ?\. Play again\.$/);
    await expect(stop(page, c).getByRole('link')).toHaveAttribute('aria-current', 'step');
    await expect(journey(page).getByRole('link')).toHaveCount(3);

    await stop(page, a).getByRole('link').click();
    await expect(page).toHaveURL(new RegExp(`/play/${a}$`));
  });

  test('history from before the path: a finished puzzle with no stars shows done, with no stars and no broken text', async ({ page }) => {
    await open(page);
    const [a] = await order(page);
    await seed(page, { finished: [a!] });
    await page.reload();
    await expect(stop(page, a!)).toHaveAttribute('data-state', 'done');
    await expect(stop(page, a!).locator('[data-stars]')).toHaveCount(0);
    await expect(stop(page, a!).getByRole('link')).toHaveAccessibleName(/\. Done\. Play again\.$/);
    await expect(journey(page)).not.toContainText(/undefined|NaN/);
  });

  test('a cleared chapter shows its badge, and the last stop of each chapter is the big one', async ({ page }) => {
    await open(page);
    const chapter = journey(page).locator('[data-chapter]').first();
    const mine = await chapter.locator('[data-stop]').evaluateAll((els) => els.map((el) => el.getAttribute('data-stop')!));
    await expect(chapter.locator('[data-stop]').last()).toHaveAttribute('data-big', 'true');
    const small = (await chapter.locator('[data-stop]').first().locator('[class*="disc"]').boundingBox())!;
    const big = (await chapter.locator('[data-big]').locator('[class*="disc"]').boundingBox())!;
    expect(big.width).toBeGreaterThan(small.width);

    await seed(page, { finished: mine });
    await page.reload();
    await expect(chapter).toHaveAttribute('data-state', 'done');
    await expect(chapter.locator('[data-chapter-badge]')).toContainText(/cleared|done/);
    await expect(journey(page).locator('[data-chapter-badge]')).toHaveCount(1);
  });

  test('every stop done: a calm finished state, no next stop, nothing locked', async ({ page }) => {
    await open(page);
    const ids = await order(page);
    await seed(page, { finished: ids });
    await page.reload();
    await expect(journey(page)).toHaveAttribute('data-journey', 'complete');
    await expect(journey(page).locator('[data-journey-note="complete"]')).toContainText(/played again|Play any one again/);
    await expect(journey(page).locator('[aria-current]')).toHaveCount(0);
    await expect(journey(page).locator('[aria-disabled]')).toHaveCount(0);
    await expect(journey(page).getByRole('link')).toHaveCount(ids.length);
  });

  test('ids that are not in the catalogue, and broken storage, change nothing', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('gazecraft-finished', '{not json');
      localStorage.setItem('gazecraft-stars', JSON.stringify({ 'long-gone': 3, bible: 'x' }));
      localStorage.setItem('gazecraft-journey-at', 'long-gone');
    });
    await open(page);
    const states = await statesOf(page);
    expect(states[0]).toBe('next');
    expect(states.slice(1).every((s) => s === 'locked')).toBe(true);
    await expect(journey(page).locator('[data-stop="long-gone"]')).toHaveCount(0);
    await expect(journey(page).locator('[data-hop]')).toHaveCount(0);
  });

  test('keyboard: Tab walks the links in path order, and Enter opens one', async ({ page }) => {
    await open(page);
    const ids = await order(page);
    await seed(page, { finished: [ids[0]!, ids[1]!] });
    await page.reload();
    await expect(journey(page)).toBeVisible();
    const links = journey(page).getByRole('link');
    await links.first().focus();
    await expect(links.nth(0)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(links.nth(1)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(links.nth(2)).toBeFocused();
    await expect(links.nth(2)).toHaveAttribute('href', `/play/${ids[2]}`);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/play/${ids[2]}$`));
  });

  test('a signed in player travels the path with their own avatar', async ({ page }) => {
    await newPlayer(page, 'Walker');
    await expect(journey(page)).toBeVisible();
    await expect(journey(page).locator('[data-state="next"] svg').first()).toBeVisible();
    await expect(journey(page).getByRole('link').first()).toHaveAttribute('aria-current', 'step');
  });

  for (const theme of ['dark', 'light'] as const) {
    test(`320px wide, ${theme} theme: fits, nothing overlaps, and passes axe`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await seed(page, { theme });
      await open(page);
      const ids = await order(page);
      await page.evaluate(([a, b]) => {
        localStorage.setItem('gazecraft-finished', JSON.stringify([a, b]));
        localStorage.setItem('gazecraft-stars', JSON.stringify({ [a!]: 2 }));
      }, ids);
      await page.reload();
      await expect(journey(page)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe(theme);

      // No sideways scroll, and every stop is inside the screen.
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const boxes = await stops(page).evaluateAll((els) => els.map((el) => el.firstElementChild!.getBoundingClientRect().toJSON() as DOMRect));
      for (const b of boxes) {
        expect(b.left).toBeGreaterThanOrEqual(0);
        expect(b.right).toBeLessThanOrEqual(320);
      }
      // Stops in a chapter run top to bottom and wind: not all in one column.
      const chapter = journey(page).locator('[data-chapter]').first();
      const centres = await chapter.locator('[data-stop]').evaluateAll((els) =>
        els.map((el) => {
          const r = el.firstElementChild!.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top };
        }),
      );
      for (let i = 1; i < centres.length; i++) expect(centres[i]!.y).toBeGreaterThan(centres[i - 1]!.y);
      expect(new Set(centres.map((c) => Math.round(c.x))).size).toBeGreaterThan(1);
      // Every link is big enough to tap.
      for (const link of await journey(page).getByRole('link').all()) {
        const b = (await link.boundingBox())!;
        expect(b.width).toBeGreaterThanOrEqual(44);
        expect(b.height).toBeGreaterThanOrEqual(44);
      }

      const r = await new AxeBuilder({ page }).include('[data-journey]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    });
  }

  test('desktop: the path fits and passes axe', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const r = await new AxeBuilder({ page }).include('[data-journey]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });

  test('motion: back on the path after a finished stop, the avatar hops once and the new stars pop, from tokens', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open(page);
    const [a, b] = (await order(page)) as [string, string];
    expect(await page.evaluate(() => localStorage.getItem('gazecraft-journey-at'))).toBe(a);
    await expect(journey(page).locator('[data-hop]')).toHaveCount(0);

    // The stop is finished somewhere else, then the player comes back.
    await page.evaluate((id) => localStorage.setItem('gazecraft-stars', JSON.stringify({ [id]: 3 })), a);
    await page.reload();
    const rider = stop(page, b).locator('[data-hop]');
    await expect(rider).toHaveAttribute('data-hop', 'arc');
    const m = await page.evaluate(
      ([from, to]) => {
        const token = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
        const secs = (v: string) => (v.endsWith('ms') ? parseFloat(v) / 1000 : parseFloat(v));
        const hop = getComputedStyle(document.querySelector(`[data-stop="${to}"] [data-hop]`)!);
        const stars = [...document.querySelectorAll(`[data-stop="${from}"] [data-star="on"]`)].map((s) => getComputedStyle(s));
        return {
          hopName: hop.animationName,
          hop: secs(hop.animationDuration),
          star: stars.map((s) => secs(s.animationDuration)),
          delay: stars.map((s) => secs(s.animationDelay)),
          want: { hop: secs(token('--dur-hop')), star: secs(token('--dur-star')), step: secs(token('--dur-star-step')) },
        };
      },
      [a, b],
    );
    expect(m.hopName).not.toBe('none');
    expect(m.hop).toBeCloseTo(m.want.hop);
    expect(m.star).toEqual([m.want.star, m.want.star, m.want.star]);
    expect(m.delay[0]).toBe(0);
    expect(m.delay[1]).toBeCloseTo(m.want.step);
    expect(m.delay[2]).toBeCloseTo(m.want.step * 2);
    expect(await page.evaluate(() => localStorage.getItem('gazecraft-journey-at'))).toBe(b);

    // The next visit: nothing hops, nothing pops.
    await page.reload();
    await expect(journey(page)).toBeVisible();
    await expect(journey(page).locator('[data-hop]')).toHaveCount(0);
    await expect(journey(page).locator('[data-pop]')).toHaveCount(0);
  });

  test('reduced motion: the avatar is on the new stop and nothing moves', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    const [a, b] = (await order(page)) as [string, string];
    await page.evaluate((id) => localStorage.setItem('gazecraft-stars', JSON.stringify({ [id]: 3 })), a);
    await page.reload();
    await expect(stop(page, b)).toHaveAttribute('data-state', 'next');
    await expect(stop(page, b).locator('svg').first()).toBeVisible();
    const running = await page.evaluate(() => document.querySelector('[data-journey]')!.getAnimations({ subtree: true }).length);
    expect(running).toBe(0);
  });
});
