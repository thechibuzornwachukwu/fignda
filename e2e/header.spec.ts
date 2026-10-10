import { expect, test } from '@playwright/test';
import { newPlayer } from './helpers';

const header = (page: import('@playwright/test').Page) => page.locator('header').first();

test.describe('header by context', () => {
  test('landing shows its own sections and Play, the app shows app links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'On this page' })).toContainText('How it works');
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
    await page.locator('header').getByRole('link', { name: 'Play', exact: true }).click();
    await expect(page).toHaveURL(/\/play$/);
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav).toHaveText(/Cases\s*Ranks\s*Squad/);
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

  test('the header is one row on every kind of page, signed out', async ({ page }) => {
    for (const path of ['/', '/play', '/play/bible', '/leaderboard']) {
      await page.goto(path);
      const box = (await page.locator('header').first().boundingBox())!;
      expect(box.height, path).toBeLessThanOrEqual(66);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), path).toBeLessThanOrEqual(0);
    }
    await page.goto('/');
    await expect(page.locator('header').getByRole('link', { name: 'Play', exact: true })).toBeVisible();
    await expect(page.locator('header').getByRole('link', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'On this page' })).toBeHidden();
  });

  test('signed in on the landing page: one row with your face, the theme and Play', async ({ page }) => {
    await newPlayer(page, 'Chibuzor Test');
    await page.goto('/');
    const header = page.locator('header').first();
    expect((await header.boundingBox())!.height).toBeLessThanOrEqual(66);
    const me = header.getByRole('link', { name: 'Chibuzor, your profile' });
    await expect(me).toBeVisible();
    await expect(me.locator('svg')).toBeVisible();
    // The name is for wider screens; the link still says who it is.
    await expect(me.getByText('Chibuzor')).toBeHidden();
    await expect(header.getByRole('link', { name: 'Play', exact: true })).toBeVisible();
    await expect(header.getByRole('button', { name: /Switch to/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });

  test('on a puzzle the nav row steps aside and the way back to Cases stays', async ({ page }) => {
    await page.goto('/play/bible');
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
    await expect(page.getByRole('link', { name: /Cases/ }).first()).toBeVisible();
  });
});
