import { expect, test, type Page } from '@playwright/test';

const theme = (page: Page) => page.evaluate(() => document.documentElement.getAttribute('data-theme'));

test('defaults to prefers-color-scheme', async ({ browser }) => {
  for (const scheme of ['light', 'dark'] as const) {
    const ctx = await browser.newContext({ colorScheme: scheme });
    const page = await ctx.newPage();
    await page.goto('/');
    expect(await theme(page)).toBe(scheme);
    await ctx.close();
  }
});

test('toggle persists across reloads', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  expect(await theme(page)).toBe('dark');

  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  expect(await theme(page)).toBe('light');
  expect(await page.evaluate(() => localStorage.getItem('fignda-theme'))).toBe('light');

  await page.reload();
  expect(await theme(page)).toBe('light');
  await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible();
});

test('no flash: stored theme is set before first paint', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => {
    localStorage.setItem('fignda-theme', 'light');
    // Record the theme and body background at the first DOM moment and first frame.
    const w = window as unknown as { __seen: string[] };
    w.__seen = [];
    const record = () => {
      const d = document.documentElement;
      w.__seen.push(`${d.getAttribute('data-theme')}|${document.body ? getComputedStyle(document.body).backgroundColor : ''}`);
    };
    document.addEventListener('DOMContentLoaded', record);
    requestAnimationFrame(record);
  });
  await page.goto('/');
  await page.waitForLoadState('load');
  const seen = await page.evaluate(() => (window as unknown as { __seen: string[] }).__seen);
  expect(seen.length).toBeGreaterThan(0);
  for (const s of seen) {
    const [t, bg] = s.split('|');
    expect(t).toBe('light');
    if (bg) expect(bg).toBe('rgb(246, 246, 247)');
  }
});

test('Manrope is the loaded font', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('800 18px Manrope'))).toBe(true);
  const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(family).toContain('Manrope');
});

test('headings are Bungee, in the softer ink', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/play');
  // Bungee is only requested once a heading is on the page.
  await expect(page.locator('h1')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('400 36px Bungee'))).toBe(true);
  const h1 = await page.evaluate(() => {
    const s = getComputedStyle(document.querySelector('h1')!);
    return { family: s.fontFamily, weight: s.fontWeight, color: s.color };
  });
  expect(h1.family).toContain('Bungee');
  expect(h1.weight).toBe('400');
  expect(h1.color).toBe('rgb(192, 192, 193)');
});

test('header fits at 375 with no horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
