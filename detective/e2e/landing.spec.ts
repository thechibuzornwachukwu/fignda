import { expect, test, type Page } from '@playwright/test';

// The landing page and the way around: the dock on a phone, the header on a wide screen, and settings.

const ALL = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3 };
const CASES = ['the-long-spoon', 'the-open-box', 'the-early-bus', 'the-year-that-is-missing', 'the-light-in-the-hall', 'the-2-signs', 'the-other-spoon', 'who-carries-the-cards'];

async function seed(page: Page, kept: Record<string, Record<number, number>>) {
  await page.addInitScript((k) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('lantern-chapters', JSON.stringify(k));
  }, kept);
}
const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test('a new player: the name, the first board, and 1 tap to the first brief', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Lantern Row');
  await expect(page.locator('[data-case-board]')).toBeVisible();
  await page.getByRole('main').getByRole('link', { name: 'Open your case' }).click();
  await expect(page).toHaveURL(/\/case\/the-long-spoon$/);
});

test('half way: the landing page leads straight to the step that is open', async ({ page }) => {
  await seed(page, { 'the-long-spoon': { 1: 3, 2: 2 } });
  await page.goto('/');
  await expect(page.getByRole('main').getByRole('link', { name: 'Carry on your case' })).toHaveAttribute('href', '/case/the-long-spoon/3');
});

test('every case closed: the way in is the casebook, and it ends on the next one shut', async ({ page }) => {
  await seed(page, Object.fromEntries(CASES.map((c) => [c, ALL])));
  await page.goto('/');
  await page.getByRole('main').getByRole('link', { name: 'See your cases' }).click();
  await expect(page).toHaveURL(/\/cases$/);
  await expect(page.locator('[data-next-book]')).toContainText('Casebook 2');
  await expect(page.locator('[data-chapter]')).toHaveCount(0);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 320, height: 700 }, hasTouch: true });

  test('the dock: Cases, Notebook, Play, Ranks with no account set up, Settings', async ({ page }) => {
    await page.goto('/cases');
    const dock = page.getByRole('navigation', { name: 'Tabs' });
    await expect(dock.getByRole('link')).toHaveText(['Cases', 'Notebook', 'Play', 'Ranks', 'Settings']);
    await expect(dock.getByRole('link', { name: 'Open your case' })).toHaveAttribute('href', '/case/the-long-spoon');
    expect(await noSideScroll(page)).toBe(true);
    // No account to rank: Ranks goes back to the cases.
    await dock.getByRole('link', { name: 'Ranks' }).click();
    await expect(page).toHaveURL(/\/cases$/);
  });

  test('a step has the whole screen: no dock', async ({ page }) => {
    await page.goto('/case/the-long-spoon/1');
    await expect(page.getByRole('navigation', { name: 'Tabs' })).toHaveCount(0);
  });
});

test('settings: any of the 4 pets, free, and it is the pet on every screen', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.locator('[data-pet]')).toHaveCount(4);
  await page.locator('[data-pet="robot"]').click();
  await expect(page.locator('[data-pet="robot"]')).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/notebook');
  await expect(page.locator('[data-partner="robot"]').first()).toBeVisible();
});

test('an address that is not a page goes home, and a case that is not written says so', async ({ page }) => {
  await page.goto('/play/bible');
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/case/no-such-case');
  await expect(page.locator('[data-brief="missing"]')).toBeVisible();
});
