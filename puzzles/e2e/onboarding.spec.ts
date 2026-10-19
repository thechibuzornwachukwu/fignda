import { expect, test } from '@playwright/test';

// A brand new visitor, on a phone and on a desktop: the landing page, one tap to the first puzzle, a finish, a
// result that leads on, and the path that shows it done. Nothing asks them to sign in before they have played.
for (const size of [{ width: 375, height: 812 }, { width: 1280, height: 800 }]) {
  test(`a new visitor plays a first puzzle and is led on, at ${size.width} wide`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Sign in/ }).first()).toBeVisible();
    await page.getByRole('main').getByRole('link', { name: 'Play your first puzzle' }).first().click();
    await expect(page).toHaveURL(/\/play\/[a-z0-9-]+\/1$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // No wall before the first puzzle.
    await expect(page.getByRole('heading', { name: /Sign in to keep/ })).toHaveCount(0);

    // A phone has Done in the bar under the thumb; a desktop has I'm done under the board.
    await page.getByRole('button', { name: /^(I'm done|Done)$/ }).locator('visible=true').first().click();
    const done = page.locator('[data-clue-done]');
    await expect(done).toBeVisible();
    await expect(done.getByRole('link', { name: 'Next puzzle' })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await done.getByRole('button', { name: 'See the result' }).click();
    await expect(page.locator('#results-title')).toBeVisible();

    await page.goto('/play');
    await expect(page.locator('[data-clue][data-state="done"]').first()).toBeVisible();
  });
}
