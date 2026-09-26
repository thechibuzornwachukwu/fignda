import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** Zero axe violations, WCAG 2.2 A and AA. */
async function audit(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const found = r.violations.map((v) => `${label}: ${v.id} (${v.impact}) ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
  expect(found, found.join('\n')).toEqual([]);
}

for (const scheme of ['dark', 'light'] as const) {
  test.describe(`${scheme} theme`, () => {
    // Reduced motion: colours switch instantly, so axe never measures a colour mid-fade.
    test.use({ colorScheme: scheme, reducedMotion: 'reduce' });

    for (const path of ['/', '/play', '/signin', '/privacy', '/play/bible']) {
      test(`page ${path}`, async ({ page }) => {
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        await audit(page, path);
      });
    }

    test('game after a find, a hint and results, then the share sheet', async ({ page }) => {
      await page.goto('/play/bnote');
      await page.getByRole('button', { name: 'Give me a hint' }).click();
      await audit(page, 'playing');
      await page.getByRole('button', { name: "I'm done" }).click();
      await audit(page, 'results');
      await page.getByRole('button', { name: 'Share' }).click();
      await expect(page.getByRole('dialog', { name: 'Share' })).toBeVisible();
      await page.getByRole('radio', { name: 'Puzzle' }).click();
      await audit(page, 'share sheet');
    });
  });
}

test.describe('phone', () => {
  test.use({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true });
  test('game with the mobile bar', async ({ page }) => {
    await page.goto('/play/bible');
    await audit(page, 'mobile game');
  });
});
