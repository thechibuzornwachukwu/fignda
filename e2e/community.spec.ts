import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { newPlayer } from './helpers';

test('players page: search by handle, wildcards find nothing, lists render', async ({ page, browser }) => {
  const other = await browser.newPage();
  const handle = await newPlayer(other, 'Zainab');
  await other.close();

  await page.goto('/players');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Squad');
  // One section leads. The 4 top lists are one section with a switch.
  await expect(page.getByRole('region', { name: 'People to follow' })).toBeVisible();
  const top = page.getByRole('region', { name: 'Top players' });
  await expect(top.getByRole('radio', { name: 'Streaks' })).toHaveAttribute('aria-checked', 'true');
  await top.getByRole('radio', { name: 'New' }).click();
  await expect(top.getByRole('listitem').first()).toBeVisible();
  await page.getByLabel('Find a player by handle').fill(handle.slice(0, 7));
  await expect(page.getByRole('link', { name: new RegExp(`@${handle}`) })).toBeVisible();
  await page.getByLabel('Find a player by handle').fill('%');
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

  // The board opens on your crowd: A follows someone and has no circle, so it opens on Following.
  await page.goto('/leaderboard');
  await expect(page.getByRole('radio', { name: 'Following' })).toHaveAttribute('aria-checked', 'true');
  // Everyone is one tap away, and the choice is kept in the address.
  await page.getByRole('radio', { name: 'Everyone' }).click();
  await expect(page).toHaveURL(/board=everyone/);
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

test('people to follow: follow from the list without opening a profile', async ({ page, browser }) => {
  const other = await browser.newPage();
  const b = await newPlayer(other, 'Bola');
  await other.close();
  const me = await newPlayer(page, 'Kunle');
  await page.goto('/players');
  const suggested = page.getByRole('region', { name: 'People to follow' });
  await expect(suggested.getByRole('listitem').first()).toBeVisible();
  // Nobody is offered themselves.
  await expect(suggested.getByText(`@${me}`, { exact: true })).toHaveCount(0);

  // Follow straight from a search row.
  await page.getByLabel('Find a player by handle').fill(b);
  const row = page.getByRole('listitem').filter({ hasText: `@${b}` });
  await row.getByRole('button', { name: 'Follow Bola' }).click();
  await expect(row.getByRole('button', { name: 'Following Bola' })).toHaveAttribute('aria-pressed', 'true');

  // It is a real follow: the profile agrees, and a fresh search remembers it.
  await page.goto(`/u/${b}`);
  await expect(page.getByRole('button', { name: 'Following' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: /1 follower$/ })).toBeVisible();
  await page.goto('/players');
  await page.getByLabel('Find a player by handle').fill(b);
  await expect(page.getByRole('listitem').filter({ hasText: `@${b}` }).getByRole('button', { name: 'Following Bola' })).toBeVisible();
  // And once followed, they leave the suggestions.
  await page.getByLabel('Find a player by handle').fill('');
  const list = page.getByRole('region', { name: 'People to follow' });
  await expect(list.getByRole('listitem').first()).toBeVisible();
  await expect(list.getByText(`@${b}`, { exact: true })).toHaveCount(0);
});

test('guests see people to follow and are asked to sign in', async ({ page }) => {
  await page.goto('/players');
  const suggested = page.getByRole('region', { name: 'People to follow' });
  await expect(suggested.getByRole('listitem').first()).toBeVisible();
  await expect(suggested.getByRole('button')).toHaveCount(0);
  await expect(suggested.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/signin?next=%2Fplayers');
});

test('your records show on your own page only, and a new player sees a calm line', async ({ page, browser }) => {
  const handle = await newPlayer(page, 'Recorda');
  await page.goto(`/u/${handle}`);
  // No plays yet: no records block, no level.
  await expect(page.getByRole('heading', { name: 'Your run starts with one puzzle.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your records' })).toHaveCount(0);

  // Records live in this browser. Unreadable ones are dropped, never shown.
  await page.evaluate(() => localStorage.setItem('gazecraft-records', '{not json'));
  await page.goto(`/u/${handle}`);
  await expect(page.getByText('undefined')).toHaveCount(0);

  const other = await browser.newPage();
  await other.addInitScript(() => localStorage.setItem('gazecraft-records', JSON.stringify({ clean: { Bible: 75 }, daily: 7, long: null })));
  await other.goto(`/u/${handle}`);
  await expect(other.getByRole('heading', { name: 'Your records' })).toHaveCount(0);
  await other.close();
});

test('the owner page is not found for anyone who is not an owner', async ({ page }) => {
  await page.goto('/owner/puzzles');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Hidden puzzles' })).toHaveCount(0);

  await newPlayer(page, 'Notowner');
  await page.goto('/owner/puzzles');
  await expect(page).toHaveURL(/\/$/);
});
