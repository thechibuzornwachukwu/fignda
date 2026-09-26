import { expect, test } from '@playwright/test';

const header = (page: import('@playwright/test').Page) => page.locator('header').first();

test.describe('header by context', () => {
  test('landing shows its own sections and Play, the app shows app links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'On this page' })).toContainText('How it works');
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
    await page.locator('header').getByRole('link', { name: 'Play', exact: true }).click();
    await expect(page).toHaveURL(/\/play$/);
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav).toHaveText(/Games\s*Leaders\s*Players/);
    await expect(page.getByRole('navigation', { name: 'On this page' })).toHaveCount(0);
  });
});

test.describe('quick return on a phone', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 375, height: 740 } });

  test('hides on scroll down, returns on scroll up, never at the top', async ({ page }) => {
    await page.goto('/');
    await expect(header(page)).not.toHaveAttribute('data-tucked');
    await page.mouse.wheel(0, 600);
    await expect(header(page)).toHaveAttribute('data-tucked', 'true');
    await page.mouse.wheel(0, -120);
    await expect(header(page)).not.toHaveAttribute('data-tucked');
    await expect(header(page)).toBeInViewport();
    await page.mouse.wheel(0, 400);
    await expect(header(page)).toHaveAttribute('data-tucked', 'true');
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(header(page)).not.toHaveAttribute('data-tucked');
  });

  test('on a puzzle the nav row steps aside and All games stays', async ({ page }) => {
    await page.goto('/play/bible');
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
    await expect(page.getByRole('link', { name: /All games/ })).toBeVisible();
  });
});
