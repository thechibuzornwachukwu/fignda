import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { newPlayer } from './helpers';

// The path on the Games tab (BUILD_PLAN 3c, SPEC sections 6 and 8). Progress lives in the browser, so every
// test sets it up in localStorage before the page loads. Needs <Journey /> mounted on /play.

const journey = (page: Page) => page.locator('[data-journey]');
const clues = (page: Page) => journey(page).locator('[data-clue]');
const clue = (page: Page, id: string) => journey(page).locator(`[data-clue="${id}"]`);

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

const order = (page: Page) => clues(page).evaluateAll((els) => els.map((el) => el.getAttribute('data-clue')!));
/** Where a clue is played: a passage at /play/ID/N, the whole puzzle at /play/ID. */
const href = (id: string) => `/play/${id.replace('~', '/')}`;
const caseIds = (page: Page) => journey(page).locator('[data-case]').evaluateAll((els) => els.map((el) => el.getAttribute('data-case')!));
const statesOf = (page: Page) => clues(page).evaluateAll((els) => els.map((el) => el.getAttribute('data-state')));

test.describe('the journey', () => {
  test('a new guest: the first clue is next with their avatar on it, the rest are locked', async ({ page }) => {
    await open(page);
    await expect(journey(page)).toHaveAttribute('data-journey', 'going');
    await expect(journey(page).getByRole('heading', { level: 2, name: 'Your path' })).toBeVisible();
    const states = await statesOf(page);
    expect(states.length).toBeGreaterThan(1);
    expect(states[0]).toBe('next');
    expect(states.slice(1).every((s) => s === 'locked')).toBe(true);

    // One link on the path: the next clue. Locked clues are not links.
    await expect(journey(page).getByRole('link')).toHaveCount(1);
    const next = journey(page).locator('[data-state="next"]');
    await expect(next.getByRole('link')).toHaveAttribute('aria-current', 'step');
    await expect(next.locator('svg').first()).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('gazecraft-guest-seed'))).toMatch(/^[a-z0-9]{4,16}$/);

    const locked = journey(page).locator('[data-clue][data-state="locked"]').first();
    await expect(locked.locator('a')).toHaveCount(0);
    await expect(locked.locator('[aria-disabled="true"]')).toContainText(/Locked\..*Finish .+ to open this\./);
  });

  test('the open case shows its file, a clue fills a piece of the secret, and the unmasking closes the case', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    const [id] = await caseIds(page);
    const file = journey(page).locator('[data-case-file]');
    await expect(file).toHaveCount(1);
    await expect(file.locator('[data-culprit="masked"]')).toBeVisible();
    await expect(file.getByRole('img', { name: /^The secret: 0 of \d+ letters found\.$/ })).toBeVisible();

    // Clue 1: its result shows the piece it gave.
    await journey(page).getByRole('link').click();
    await page.getByRole('button', { name: "I'm done" }).click();
    const piece = page.locator('[data-case-piece]');
    await expect(piece.locator('[data-slot="on"]').first()).toBeVisible();
    await expect(piece).toContainText(/piece/);
    const held = await piece.locator('[data-slot="on"]').count();

    // Back on the path the same letters are in the file.
    await page.goto('/play');
    await expect(journey(page).locator('[data-case-file] [data-slot="on"]')).toHaveCount(held);

    // The whole puzzle: the mask is off, the stamp is down, the secret reads whole.
    await page.goto(`/play/${id}`);
    await page.getByRole('button', { name: "I'm done" }).click();
    const closed = page.locator('[data-case-closed]');
    await expect(closed.getByRole('heading', { name: 'Case closed' })).toBeVisible();
    await expect(closed.getByRole('img', { name: /^The secret: [A-Z]+\.$/ })).toBeVisible();
    await expect(closed.locator('[data-slot="off"]')).toHaveCount(0);
    await expect(closed).toContainText(/open eye/);
    expect(await closed.locator('[data-culprit] svg').last().evaluate((el) => getComputedStyle(el).opacity)).toBe('0');

    await page.goto('/play');
    await expect(journey(page).locator(`[data-case="${id}"]`)).toHaveAttribute('data-state', 'done');
  });

  test('the next clue opens its puzzle', async ({ page }) => {
    await open(page);
    const [first] = await order(page);
    await journey(page).getByRole('link').click();
    await expect(page).toHaveURL(new RegExp(`${href(first!)}$`));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('finished clues show a tick and stars, and can be replayed', async ({ page }) => {
    await open(page);
    const ids = await order(page);
    const [a, b, c] = ids as [string, string, string];
    await seed(page, { finished: [a], stars: { [a]: 3, [b]: 1 } });
    await page.reload();
    await expect(journey(page)).toBeVisible();

    expect((await statesOf(page)).slice(0, 3)).toEqual(['done', 'done', 'next']);
    await expect(clue(page, a).getByRole('img', { name: '3 of 3 stars' })).toBeVisible();
    await expect(clue(page, b).getByRole('img', { name: '1 of 3 stars' })).toBeVisible();
    await expect(clue(page, a).getByRole('link')).toHaveAccessibleName(/\. Done\. 3 of 3 stars ?\. Play again\.$/);
    await expect(clue(page, c).getByRole('link')).toHaveAttribute('aria-current', 'step');
    await expect(journey(page).getByRole('link')).toHaveCount(3);

    await clue(page, a).getByRole('link').click();
    await expect(page).toHaveURL(new RegExp(`${href(a)}$`));
  });

  test('history from before the path: a finished puzzle with no stars shows done, with no stars and no broken text', async ({ page }) => {
    await open(page);
    const [a] = await order(page);
    await seed(page, { finished: [a!] });
    await page.reload();
    await expect(clue(page, a!)).toHaveAttribute('data-state', 'done');
    await expect(clue(page, a!).locator('[data-stars]')).toHaveCount(0);
    await expect(clue(page, a!).getByRole('link')).toHaveAccessibleName(/\. Done\. Play again\.$/);
    await expect(journey(page)).not.toContainText(/undefined|NaN/);
  });

  test('a cleared case shows its badge, and the last clue of each case is the big one', async ({ page }) => {
    await open(page);
    const box = journey(page).locator('[data-case]').first();
    const mine = await box.locator('[data-clue]').evaluateAll((els) => els.map((el) => el.getAttribute('data-clue')!));
    await expect(box.locator('[data-clue]').last()).toHaveAttribute('data-big', 'true');
    const small = (await box.locator('[data-clue]').first().locator('[class*="disc"]').boundingBox())!;
    const big = (await box.locator('[data-big]').locator('[class*="disc"]').boundingBox())!;
    expect(big.width).toBeGreaterThan(small.width);

    await seed(page, { finished: mine });
    await page.reload();
    await expect(box).toHaveAttribute('data-state', 'done');
    await expect(box.locator('[data-case-badge]')).toContainText(/closed|found/i);
    // The clues fold away, and the title is the way back in.
    await expect(box.locator('[data-clue]')).toHaveCount(0);
    const again = (await box.getByRole('link').boundingBox())!;
    expect(again.height).toBeGreaterThanOrEqual(44);
    await expect(journey(page).locator('[data-case]').nth(1)).toHaveAttribute('data-state', 'open');
    await expect(journey(page).locator('[data-case-badge]')).toHaveCount(1);
  });

  test('every clue done: a calm finished state, no next clue, nothing locked', async ({ page }) => {
    await open(page);
    const ids = await caseIds(page);
    expect(ids.length).toBeGreaterThan(10);
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
    await expect(journey(page).locator('[data-clue="long-gone"]')).toHaveCount(0);
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
    await expect(links.nth(2)).toHaveAttribute('href', href(ids[2]!));
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${href(ids[2]!)}$`));
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

      // No sideways scroll, and every clue is inside the screen.
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const boxes = await clues(page).evaluateAll((els) => els.map((el) => el.firstElementChild!.getBoundingClientRect().toJSON() as DOMRect));
      for (const b of boxes) {
        expect(b.left).toBeGreaterThanOrEqual(0);
        expect(b.right).toBeLessThanOrEqual(320);
      }
      // Stops in a case run top to bottom and wind: not all in one column.
      const box = journey(page).locator('[data-case]').first();
      const centres = await box.locator('[data-clue]').evaluateAll((els) =>
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

  test('motion: back on the path after a finished clue, the avatar hops once and the new stars pop, from tokens', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open(page);
    const [a, b] = (await order(page)) as [string, string];
    expect(await page.evaluate(() => localStorage.getItem('gazecraft-journey-at'))).toBe(a);
    await expect(journey(page).locator('[data-hop]')).toHaveCount(0);

    // The clue is finished somewhere else, then the player comes back.
    await page.evaluate((id) => localStorage.setItem('gazecraft-stars', JSON.stringify({ [id]: 3 })), a);
    await page.reload();
    const rider = clue(page, b).locator('[data-hop]');
    await expect(rider).toHaveAttribute('data-hop', 'arc');
    const m = await page.evaluate(
      ([from, to]) => {
        const token = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
        const secs = (v: string) => (v.endsWith('ms') ? parseFloat(v) / 1000 : parseFloat(v));
        const hop = getComputedStyle(document.querySelector(`[data-clue="${to}"] [data-hop]`)!);
        const stars = [...document.querySelectorAll(`[data-clue="${from}"] [data-star="on"]`)].map((s) => getComputedStyle(s));
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

  test('reduced motion: the avatar is on the new clue and nothing moves', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    const [a, b] = (await order(page)) as [string, string];
    await page.evaluate((id) => localStorage.setItem('gazecraft-stars', JSON.stringify({ [id]: 3 })), a);
    await page.reload();
    await expect(clue(page, b)).toHaveAttribute('data-state', 'next');
    await expect(clue(page, b).locator('svg').first()).toBeVisible();
    const running = await page.evaluate(() => document.querySelector('[data-journey]')!.getAnimations({ subtree: true }).length);
    expect(running).toBe(0);
  });
});
