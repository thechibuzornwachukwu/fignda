import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** Zero axe violations, WCAG 2.2 A and AA. */
async function audit(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const found = r.violations.map((v) => `${label}: ${v.id} (${v.impact}) ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
  expect(found, found.join('\n')).toEqual([]);
}

const ALL = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3 };

for (const scheme of ['dark', 'light'] as const) {
  test.describe(`${scheme} theme`, () => {
    // Reduced motion: colours switch instantly, so axe never measures a colour mid-fade.
    test.use({ colorScheme: scheme, reducedMotion: 'reduce' });

    for (const path of ['/', '/cases', '/case/the-long-spoon', '/case/the-long-spoon/1', '/open-eye', '/settings', '/signin', '/privacy']) {
      test(`page ${path}`, async ({ page }) => {
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        await audit(page, path);
      });
    }

    test('every kind of step, its result, and an ending', async ({ page }) => {
      await page.addInitScript((all) => {
        if (sessionStorage.getItem('seeded')) return;
        sessionStorage.setItem('seeded', '1');
        localStorage.setItem('lantern-chapters', JSON.stringify({ 'the-long-spoon': all, 'the-open-box': all, 'the-early-bus': { 1: 3, 2: 3, 3: 3 } }));
      }, ALL);
      await page.goto('/case/the-early-bus/4');
      await audit(page, 'a claim');
      await page.goto('/case/the-open-box/6');
      await audit(page, 'the ending');
      await page.goto('/case/the-long-spoon/1');
      await page.getByRole('button', { name: "I'm done" }).click();
      await audit(page, 'a step result');
    });
  });
}

test.describe('phone', () => {
  test.use({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true });
  test('a step with the bar under the thumb, and Cases with the dock', async ({ page }) => {
    await page.goto('/case/the-long-spoon/1');
    await audit(page, 'mobile step');
    await page.goto('/cases');
    await audit(page, 'mobile cases');
  });
});
