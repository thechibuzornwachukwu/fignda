import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const todayNo = () => {
  const d = new Date();
  return Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(2026, 0, 1)) / 864e5) + 1;
};

test('guest sees the daily board, a sign in prompt and puzzle boards', async ({ page }) => {
  await page.goto('/leaderboard');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leaders');
  await expect(page.getByText(`Today · Daily #${todayNo()}`)).toBeVisible();
  await expect(page.getByText("Today's totals stay hidden until midnight.")).toBeVisible();
  await expect(page.getByText('Guest scores stay on this device and are never ranked.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next day' })).toBeDisabled();
  await page.getByRole('button', { name: 'Previous day' }).click();
  await expect(page).toHaveURL(new RegExp(`day=${todayNo() - 1}$`));
  await expect(page.getByText(`Daily #${todayNo() - 1}`)).toBeVisible();
  await page.getByRole('link', { name: /The classic/ }).click();
  await expect(page).toHaveURL(/\/leaderboard\/bible$/);
  await expect(page.getByRole('link', { name: 'Play The classic' })).toBeVisible();
});

test('future days fall back to today', async ({ page }) => {
  await page.goto(`/leaderboard?day=${todayNo() + 5}`);
  await expect(page.getByText(`Today · Daily #${todayNo()}`)).toBeVisible();
});

test('results link to the right board', async ({ page }) => {
  await page.goto('/play/bnote');
  await page.getByRole('button', { name: "I'm done" }).click();
  await expect(page.getByRole('link', { name: 'See the leaderboard' })).toHaveAttribute('href', '/leaderboard/bnote');
});

test('header links to Leaders', async ({ page }) => {
  await page.goto('/play');
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Leaders' }).click();
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
