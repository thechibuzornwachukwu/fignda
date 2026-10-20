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
  await expect(fresh.getByRole('link', { name: 'Open a case' })).toBeVisible();
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
  // A new player has not unlocked friend streaks yet (1 daily). The direct link always works.
  await page.goto('/players');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your People');
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
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your Puzzles');
  await expect(page.getByRole('link', { name: 'Make a puzzle' })).toHaveCount(0);
  await page.goto('/make');
  await expect(page).toHaveURL(/\/make$/);

  await page.getByRole('button', { name: 'Write it myself' }).click();
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

test('the Naija packs are cases on the path and playable', async ({ page }) => {
  await page.goto('/play');
  for (const title of ['Party at ours', 'Farm visit', 'Aunty Mary', 'Band practice']) await expect(page.locator('[data-journey]').getByRole('heading', { level: 3, name: new RegExp(title) })).toBeVisible();
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

test('Your People: a follow puts a dot on the tab and a line in the feed; a cheer reaches the medal', async ({ page, browser }) => {
  const me = await newPlayer(page, 'Zainab');
  await page.goto('/players');
  await expect(page.getByRole('region', { name: 'Feed' })).toBeVisible();
  await audit(page, 'your people empty');

  // Someone follows Zainab.
  const ctx = await browser.newContext({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true });
  const other = await ctx.newPage();
  await newPlayer(other, 'Emeka');
  await other.goto(`/u/${me}`);
  await other.getByRole('button', { name: 'Follow' }).click();
  await expect(other.getByRole('button', { name: 'Following' })).toBeVisible();
  await ctx.close();

  await page.goto('/players');
  const row = page.getByRole('article').filter({ hasText: 'Emeka followed you.' });
  await expect(row).toBeVisible();
  await expect(row.getByRole('link')).toHaveAttribute('href', /^\/u\/emeka_/);
  await audit(page, 'your people');
  // No page of its own any more: the old address opens Your People.
  await page.goto('/notifications');
  await expect(page).toHaveURL(/\/players$/);
  await expect(page.locator('header').getByRole('link', { name: /Notifications/ })).toHaveCount(0);
});

test.describe('phone', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 375, height: 740 } });

  test('something new puts a dot on Your People, and opening it clears the dot', async ({ page, browser }) => {
    const me = await newPlayer(page, 'Tolu');
    const ctx = await browser.newContext();
    const other = await ctx.newPage();
    await newPlayer(other, 'Kemi');
    await other.goto(`/u/${me}`);
    await other.getByRole('button', { name: 'Follow' }).click();
    await expect(other.getByRole('button', { name: 'Following' })).toBeVisible();
    await ctx.close();

    await page.goto('/play');
    const tabs = page.getByRole('navigation', { name: 'Tabs' });
    await tabs.getByRole('link', { name: 'Your People, 1 new' }).click();
    await expect(page).toHaveURL(/\/players$/);
    await expect(page.getByRole('article').filter({ hasText: 'Kemi followed you.' })).toBeVisible();
    await page.goto('/play');
    await expect(tabs.getByRole('link', { name: 'Your People', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
