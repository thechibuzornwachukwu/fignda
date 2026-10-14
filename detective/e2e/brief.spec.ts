import { expect, test, type Page } from '@playwright/test';

// The brief of a written chapter and its case board (BUILD_PLAN set 1c, SPEC section 6, Brief).

const board = (page: Page) => page.locator('[data-case-board]');
const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

/** Redraw the row of faces with n suspects, each with the longest name and role there can be. */
async function crowd(page: Page, n: number) {
  await page.evaluate((count) => {
    const row = document.querySelector<HTMLElement>('[data-faces]')!;
    const first = row.querySelector('[data-face]')!;
    row.replaceChildren(...Array.from({ length: count }, () => first.cloneNode(true)));
    row.style.setProperty('--faces', String(count));
    row.style.setProperty('--rows-of', String(count <= 3 ? count : count === 4 ? 2 : 3));
    for (const face of row.querySelectorAll('[data-face]')) {
      const [name, role] = face.querySelectorAll<HTMLElement>('[title]');
      name!.textContent = 'Alexandria';
      role!.textContent = 'Neighbour from 2 doors down';
    }
  }, n);
}

for (const width of [320, 390]) {
  test.describe(`${width} wide`, () => {
    test.use({ viewport: { width, height: 760 } });

    test('the long spoon opens on its board', async ({ page }) => {
      await page.goto('/case/the-long-spoon');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('The long spoon');
      await expect(board(page)).toBeVisible();
      await expect(board(page).locator('[data-face]')).toHaveCount(4);
      expect(await noSideScroll(page)).toBe(true);
    });

    for (const n of [1, 2, 3, 5]) {
      test(`${n} suspects fit, and a long name is cut, never the board widened`, async ({ page }) => {
        await page.goto('/case/the-long-spoon');
        await expect(board(page)).toBeVisible();
        await crowd(page, n);
        await expect(board(page).locator('[data-face]')).toHaveCount(n);
        expect(await noSideScroll(page)).toBe(true);
        const fits = await page.evaluate(() => {
          const b = document.querySelector('[data-case-board]')!.getBoundingClientRect();
          return [...document.querySelectorAll('[data-face]')].every((f) => {
            const r = f.getBoundingClientRect();
            return r.left >= b.left - 6 && r.right <= b.right + 6;
          });
        });
        expect(fits).toBe(true);
        // The role is longer than any photo is wide: it is on 1 line and cut.
        const cut = await page.evaluate(() => {
          const role = document.querySelectorAll<HTMLElement>('[data-face] [title]')[1]!;
          return role.scrollWidth > role.clientWidth && role.getBoundingClientRect().height < 24;
        });
        expect(cut).toBe(true);
      });
    }
  });
}

test('a case that is not written leads back to cases', async ({ page }) => {
  await page.goto('/case/nothing');
  await expect(page.locator('[data-brief="missing"]')).toBeVisible();
  await page.getByRole('link', { name: 'Back to cases' }).click();
  await expect(page).toHaveURL(/\/cases$/);
});
