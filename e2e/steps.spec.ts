import { expect, test, type Page } from '@playwright/test';

// The steps of a written chapter (BUILD_PLAN set 1d, SPEC section 6, Step). Progress lives in the browser.

const CASE = '/case/the-long-spoon';

async function seed(page: Page, stars: Record<number, number>) {
  await page.addInitScript((s) => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', '1');
    localStorage.setItem('gazecraft-chapters', JSON.stringify({ 'the-long-spoon': s }));
  }, stars);
}

test('the brief leads to the first step, and a step ends on its fact and its lead', async ({ page }) => {
  await page.goto(CASE);
  await page.getByRole('link', { name: 'Go to the store room' }).click();
  await expect(page).toHaveURL(/\/case\/the-long-spoon\/1$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The store room');
  await expect(page.getByText('They read right to left.')).toBeVisible();
  await expect(page.locator('[data-marks] li')).toHaveCount(6);
  await expect(page.locator('[data-marks] li[data-state="here"]')).toHaveCount(1);

  await page.getByRole('button', { name: "I'm done" }).click();
  await expect(page.locator('[data-fact]')).toContainText('Key 7 went out at 6.40 pm');
  await expect(page.locator('[data-lead]')).toContainText('Her till roll can say.');
  // Step 1 gives the chance: its tag is the one lit, and the other 2 are still open.
  await expect(page.locator('[data-proof="chance"]')).toHaveAttribute('data-state', 'new');
  await expect(page.locator('[data-proof="means"]')).toHaveAttribute('data-state', 'open');

  await page.getByRole('link', { name: "Go to Rosa's night stall" }).click();
  await expect(page).toHaveURL(/\/case\/the-long-spoon\/2$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("Rosa's night stall");
  await expect(page.getByText(/Find \d runs that add up to 1\d\./)).toBeVisible();
});

test('the lead is given, the clearing is earned', async ({ page }) => {
  await seed(page, { 1: 3 });
  await page.goto(`${CASE}/2`);
  await page.getByRole('button', { name: "I'm done" }).click();
  // Finished with nothing found: 1 star. The lead is there, the stall owner is not cleared.
  await expect(page.locator('[data-lead]')).toBeVisible();
  await expect(page.locator('[data-suspect="the stall owner"]')).toBeVisible();
  await expect(page.locator('[data-suspect="the stall owner"]')).not.toHaveAttribute('data-cleared', /.*/);
  await expect(page.locator('[data-not-cleared]')).toContainText('2 stars or more');
  await expect(page.getByRole('link', { name: 'Go to the bakery' })).toHaveAttribute('href', '/case/the-long-spoon/3');
});

test('the board fills in as steps are done', async ({ page }) => {
  await seed(page, { 1: 3, 2: 2 });
  await page.goto(CASE);
  await expect(page.locator('[data-case-board] [data-find]')).toHaveCount(2);
  await expect(page.locator('[data-case-board] [data-cleared]')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Carry on' })).toHaveAttribute('href', '/case/the-long-spoon/3');
});

test('a step that is not open says so, and one that does not exist leads back', async ({ page }) => {
  await page.goto(`${CASE}/4`);
  await expect(page.locator('[data-step="locked"]')).toBeVisible();
  await page.getByRole('link', { name: 'Back to the board' }).click();
  await expect(page).toHaveURL(/\/case\/the-long-spoon$/);
  await page.goto(`${CASE}/9`);
  await expect(page).toHaveURL(/\/case\/the-long-spoon$/);
});

test('the line-up waits, with the board as filled', async ({ page }) => {
  await seed(page, { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 });
  await page.goto(`${CASE}/6`);
  await expect(page.locator('[data-step="soon"]')).toBeVisible();
  await expect(page.locator('[data-case-board] [data-find]')).toHaveCount(5);
  await expect(page.locator('[data-case-board] [data-cleared]')).toHaveCount(3);
});

test('a step fits a phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await seed(page, { 1: 3 });
  await page.goto(`${CASE}/2`);
  await page.getByRole('button', { name: "I'm done" }).click();
  await expect(page.locator('[data-step-result]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
