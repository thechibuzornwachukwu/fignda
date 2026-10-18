import { expect, test } from '@playwright/test';

// Every badge popup, earned or not, opens whole inside the screen on a small phone, a phone, a tablet and a desktop.
const SIZES = [
  { width: 320, height: 568 },
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
];

for (const size of SIZES) {
  test(`badge popups fit at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/__medals');
    const medals = page.locator('[data-medals] button[data-medal]');
    await expect(medals).toHaveCount(9);
    const n = await medals.count();
    for (let i = 0; i < n; i++) {
      const medal = medals.nth(i);
      const key = await medal.getAttribute('data-medal');
      const earned = (await medal.getAttribute('data-earned')) != null;
      await medal.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog, key!).toBeVisible();
      const open = dialog.locator(`[data-medal-open="${key}"]`);
      await expect(open).toBeVisible();
      const box = (await open.boundingBox())!;
      expect(box.x, `${key} left`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `${key} right`).toBeLessThanOrEqual(size.width + 1);
      expect(box.y, `${key} top`).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height, `${key} bottom`).toBeLessThanOrEqual(size.height + 1);
      await expect(dialog.getByRole('heading', { level: 2 })).toBeVisible();
      // The picture a share is made from stays wholly off screen, whatever the width.
      for (const card of await dialog.locator('[data-medal-card]').all()) {
        const c = (await card.boundingBox())!;
        expect(c.x + c.width, `${key} share picture`).toBeLessThanOrEqual(0);
      }
      // Earned: Share is there and in view. Not earned: nothing to share.
      const share = dialog.getByRole('button', { name: /Share/ });
      if (earned) await expect(share).toBeInViewport();
      else await expect(share).toHaveCount(0);
      if (earned) await page.screenshot({ path: `test-results/medal-popup-${size.width}.png` });
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    }
  });
}
