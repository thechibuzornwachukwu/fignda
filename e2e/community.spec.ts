import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { newPlayer } from './helpers';

test('players page: search by handle, wildcards find nothing, lists render', async ({ page, browser }) => {
  const other = await browser.newPage();
  const handle = await newPlayer(other, 'Zainab');
  await other.close();

  await page.goto('/players');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Players.');
  await expect(page.getByRole('heading', { name: 'Longest streaks' })).toBeVisible();
  await page.getByLabel('Search by handle').fill(handle.slice(0, 7));
  await expect(page.getByRole('link', { name: new RegExp(`@${handle}`) })).toBeVisible();
  await page.getByLabel('Search by handle').fill('%');
  await expect(page.getByText('No handle starts with @%.')).toBeVisible();
});

test('follow, counts, lists, remove a follower, following board', async ({ page, browser }) => {
  const bPage = await browser.newPage();
  const b = await newPlayer(bPage, 'Bisi');
  const a = await newPlayer(page, 'Ade');

  // A follows B.
  await page.goto(`/u/${b}`);
  await page.getByRole('button', { name: 'Follow' }).click();
  await expect(page.getByRole('button', { name: 'Following' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: /1 follower$/ })).toBeVisible();
  await expect(page.locator('#followers').getByRole('link', { name: new RegExp(`@${a}`) })).toBeVisible();

  // The Following board is there for signed-in players.
  await page.goto('/leaderboard');
  await page.getByRole('radio', { name: 'Following' }).click();
  await expect(page).toHaveURL(/board=following/);

  // B removes A from their followers.
  await bPage.goto(`/u/${b}`);
  await bPage.getByRole('button', { name: `Remove @${a} from your followers` }).click();
  await expect(bPage.getByText('Nobody yet. Share your profile to get followers.')).toBeVisible();

  // A sees they no longer follow B.
  await page.goto(`/u/${b}`);
  await expect(page.getByRole('button', { name: 'Follow' })).toBeVisible();
  await bPage.close();
});

test('guests are asked to sign in to follow', async ({ page, browser }) => {
  const other = await browser.newPage();
  const h = await newPlayer(other, 'Tayo');
  await other.close();
  await page.goto(`/u/${h}`);
  await expect(page.getByRole('link', { name: 'Follow', exact: true })).toHaveAttribute('href', `/signin?next=%2Fu%2F${h}`);
});

test('axe: players page', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/players');
  await page.waitForLoadState('networkidle');
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
});

test.describe('phone', () => {
  test.use({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true });
  test('header with Players still fits at 375px', async ({ page }) => {
    for (const p of ['/', '/players', '/leaderboard']) {
      await page.goto(p);
      await page.waitForLoadState('networkidle');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), p).toBeLessThanOrEqual(0);
    }
  });
});
