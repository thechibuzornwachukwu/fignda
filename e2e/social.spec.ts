import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { newPlayer } from './helpers';

async function audit(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const found = r.violations.map((v) => `${label}: ${v.id} (${v.impact}) ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
  expect(found, found.join('\n')).toEqual([]);
}

test.use({ reducedMotion: 'reduce' });

test('a new player sees a welcome, not a wall of zeros', async ({ page, browser }) => {
  const me = await newPlayer(page, 'Ngozi');
  await page.goto(`/u/${me}`);
  const fresh = page.getByRole('region', { name: 'New player' });
  await expect(fresh.getByRole('heading', { name: 'Your run starts with one puzzle.' })).toBeVisible();
  await expect(fresh.getByRole('link', { name: "Play today's daily" })).toBeVisible();
  await expect(page.getByText('Best streak')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Last 14 dailies' })).toHaveCount(0);
  await audit(page, 'new profile');

  // Someone else looking at the same page is told the player is new.
  const other = await browser.newPage();
  await other.goto(`/u/${me}`);
  await expect(other.getByRole('heading', { name: 'Ngozi is new here.' })).toBeVisible();
  await other.close();
});

test('friend streak: a link starts it in one tap, and either side can end it', async ({ page, browser }) => {
  await newPlayer(page, 'Ada');
  // A new player has not unlocked friend streaks yet (3 dailies). The direct link always works.
  await page.goto('/players');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Squad');
  await expect(page.getByRole('region', { name: 'Friend streaks' })).toHaveCount(0);
  await page.goto('/players#friend-streaks');
  const mine = page.getByRole('region', { name: 'Friend streaks' });
  await expect(mine).toContainText('A streak you share with a friend');
  await audit(page, 'players with friend streaks');

  // Your link, as the Invite button would share it.
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await mine.getByRole('button', { name: 'Invite a friend' }).click();
  await expect(mine.getByRole('status')).toContainText('Link copied');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const link = copied.match(/\/s\/[A-HJ-NP-Z2-9]{8}/)![0];

  // The friend opens it signed out, signs up, and lands back on it.
  const ctx = await browser.newContext();
  const friend = await ctx.newPage();
  await friend.goto(link);
  await expect(friend.getByRole('heading', { name: /Ada wants a streak with you/ })).toBeVisible();
  await audit(friend, 'streak invite');
  await expect(friend.getByRole('link', { name: 'Sign in to start' })).toHaveAttribute('href', `/signin?next=${encodeURIComponent(link)}`);
  await newPlayer(friend, 'Bisi');
  await friend.goto(link);
  await friend.getByRole('button', { name: 'Start the streak' }).click();
  await expect(friend).toHaveURL(/\/players#friend-streaks$/);
  const theirs = friend.getByRole('region', { name: 'Friend streaks' });
  await expect(theirs.getByRole('listitem')).toContainText('Ada');
  await expect(theirs.getByRole('listitem')).toContainText('Nobody has played today yet');
  await expect(theirs.getByRole('listitem')).toContainText('0 days');

  // Ada sees it too, and ends it.
  await page.reload();
  const row = page.getByRole('region', { name: 'Friend streaks' }).getByRole('listitem');
  await expect(row).toContainText('Bisi');
  await row.getByRole('button', { name: 'End streak with Bisi' }).click();
  await expect(page.getByRole('region', { name: 'Friend streaks' })).toContainText('A streak you share with a friend');
  await ctx.close();
});

test('a bad streak link says so', async ({ page }) => {
  await page.goto('/s/ZZZZZZZZ');
  await expect(page.getByRole('heading', { name: 'This link has run out.' })).toBeVisible();
});

test('start a streak from a profile: one asks, the other says yes', async ({ page, browser }) => {
  const ctx = await browser.newContext();
  const other = await ctx.newPage();
  const b = await newPlayer(other, 'Bola');
  const a = await newPlayer(page, 'Kunle');
  await page.goto(`/u/${b}`);
  await page.getByRole('button', { name: 'Start a streak' }).click();
  await expect(page.getByRole('button', { name: 'Streak asked' })).toBeDisabled();

  await other.goto('/players');
  const row = other.getByRole('region', { name: 'Friend streaks' }).getByRole('listitem').filter({ hasText: 'Kunle' });
  await expect(row).toContainText('Wants a streak with you');
  await row.getByRole('button', { name: 'Start' }).click();
  await expect(row).toContainText('0 days');
  await other.goto(`/u/${a}`);
  await expect(other.getByRole('link', { name: '0 day streak' })).toBeVisible();
  await ctx.close();
});

test('make a puzzle: every word is checked as you type', async ({ page }) => {
  await page.goto('/make');
  await expect(page).toHaveURL(/\/signin\?next=%2Fmake$/);
  await newPlayer(page, 'Maker');
  // The link on the games screen appears after 5 plays. The address always works.
  await page.goto('/play');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cases');
  await expect(page.getByRole('link', { name: 'Make a puzzle' })).toHaveCount(0);
  await page.goto('/make');
  await expect(page).toHaveURL(/\/make$/);

  await page.getByLabel('Title').fill('House keys');
  await page.getByLabel('What is hidden').fill('short words');
  await page.getByLabel(/^Paragraph/).fill('It was a most ordinary day until Pat omitted the big old key from each drawer in the house.');
  await page.getByLabel(/^Hidden words/).fill('Amos, Atom, Gold, Zebra, house');
  const check = page.getByRole('list', { name: 'Word check' });
  await expect(check.getByRole('listitem').filter({ hasText: 'Amos' })).toContainText('Hidden');
  await expect(check.getByRole('listitem').filter({ hasText: 'Zebra' })).toContainText('Not in your paragraph');
  await expect(check.getByRole('listitem').filter({ hasText: 'house' })).toContainText('In plain sight');
  await expect(page.getByRole('status')).toContainText('Hide at least 4 words. 3 so far.');

  await page.getByLabel(/^Hidden words/).fill('Amos, Atom, Gold, Rome');
  await expect(page.getByRole('status')).toContainText('4 words hidden. Ready.');
  await audit(page, 'make');
});

test("answers: a past daily lists its words; today's are never shown", async ({ page }) => {
  const today = await page.evaluate(() => Math.floor((Date.now() - Date.UTC(2026, 0, 1)) / 864e5) + 1);
  await page.goto(`/d/${today - 1}/answers`);
  await expect(page.getByRole('heading', { name: /^Answers\./ })).toBeVisible();
  expect(await page.getByRole('list', { name: 'Answers' }).getByRole('listitem').count()).toBeGreaterThan(3);
  await expect(page.getByRole('link', { name: "Play today's daily" })).toHaveAttribute('href', `/d/${today}`);
  await audit(page, 'answers');

  await page.goto(`/d/${today}/answers`);
  await expect(page).toHaveURL(/\/play$/);
});

test('the Naija packs are on the games list and playable', async ({ page }) => {
  await page.goto('/play?f=Naija');
  for (const title of ['Party at ours', 'Farm visit', 'Aunty Mary', 'Band practice']) await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible();
  await page.goto('/play/lagos');
  await expect(page.getByRole('heading', { name: 'Find 16 Lagos places' })).toBeVisible();
});

test('puzzle board switches between Solo and Together', async ({ page }) => {
  await page.goto('/leaderboard/bnote');
  await page.getByRole('radio', { name: 'Together' }).click();
  await expect(page).toHaveURL(/board=together$/);
  await expect(page.getByText('Best teams.')).toBeVisible();
  await expect(page.getByText(/Guests are not ranked\./)).toBeVisible();
  await audit(page, 'together board');
});

test('notifications: a follow rings the bell, the list explains it, opening it clears the count', async ({ page, browser }) => {
  const me = await newPlayer(page, 'Zainab');
  await expect(page.locator('header').getByRole('link', { name: 'Notifications', exact: true })).toBeVisible();
  await page.goto('/notifications');
  await expect(page.getByText('Nothing yet.')).toBeVisible();
  await audit(page, 'notifications empty');

  // Someone follows Zainab.
  const ctx = await browser.newContext();
  const other = await ctx.newPage();
  await newPlayer(other, 'Emeka');
  await other.goto(`/u/${me}`);
  await other.getByRole('button', { name: 'Follow' }).click();
  await expect(other.getByRole('button', { name: 'Following' })).toBeVisible();
  await ctx.close();

  await page.goto('/play');
  const bell = page.locator('header').getByRole('link', { name: 'Notifications, 1 new' });
  await expect(bell).toBeVisible();
  await bell.click();
  const row = page.getByRole('listitem').filter({ hasText: 'Emeka followed you.' });
  await expect(row).toBeVisible();
  await expect(row.getByRole('link')).toHaveAttribute('href', /^\/u\/emeka_/);
  await audit(page, 'notifications');
  // Read now: the count is gone, here and on the next page.
  await expect(page.locator('header').getByRole('link', { name: 'Notifications', exact: true })).toBeVisible();
  await page.goto('/play');
  await expect(page.locator('header').getByRole('link', { name: 'Notifications', exact: true })).toBeVisible();
});

test.describe('phone', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 375, height: 740 } });

  test('the header stays one row with the bell, signed in', async ({ page }) => {
    await newPlayer(page, 'Tolu');
    for (const path of ['/', '/play', '/notifications']) {
      await page.goto(path);
      await expect(page.locator('header').getByRole('link', { name: 'Notifications', exact: true })).toBeVisible();
      const box = (await page.locator('header').first().boundingBox())!;
      expect(box.height, path).toBeLessThanOrEqual(66);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), path).toBe(true);
    }
  });
});
