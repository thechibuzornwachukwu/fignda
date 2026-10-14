import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('Ranks is the board of the open case, with a sign in prompt for a guest and no daily', async ({ page }) => {
  await page.goto('/leaderboard');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ranks');
  await expect(page.locator('[data-case-ranks="the-long-spoon"]')).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'The long spoon' })).toBeVisible();
  await expect(page.getByText('Guest scores stay on this device and are never ranked.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Previous day' })).toHaveCount(0);
  await expect(page.getByText(/Daily #\d+/)).toHaveCount(0);
  await page.getByRole('link', { name: 'Open the case' }).click();
  await expect(page).toHaveURL(/\/case\/the-long-spoon$/);
  // An old link to a puzzle's board still opens.
  await page.goto('/leaderboard/bible');
  await expect(page.getByRole('link', { name: 'Play The classic' })).toBeVisible();
});

test('an old link to a day, or to a daily, opens what is there now', async ({ page }) => {
  await page.goto('/leaderboard?day=3&board=following');
  await expect(page.getByRole('heading', { level: 2, name: 'The long spoon' })).toBeVisible();
  await page.goto('/d/5');
  await expect(page).toHaveURL(/\/play$/);
  await page.goto('/d/5/answers');
  await expect(page).toHaveURL(/\/play$/);
});

test('a puzzle played alone has no board of its own', async ({ page }) => {
  await page.goto('/play/bnote');
  await page.getByRole('button', { name: "I'm done" }).click();
  await expect(page.locator('[aria-labelledby="results-title"]')).toBeVisible();
  await expect(page.getByRole('link', { name: 'See the leaderboard' })).toHaveCount(0);
});

test('header links to Leaders', async ({ page }) => {
  await page.goto('/play');
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Ranks' }).click();
  await expect(page).toHaveURL(/\/leaderboard$/);
});

for (const path of ['/leaderboard', '/leaderboard/bible']) {
  test(`axe: ${path}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle');
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });
}

test.describe('phone', () => {
  test.use({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true });
  test('fits at 375px', async ({ page }) => {
    await page.goto('/leaderboard');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
});
