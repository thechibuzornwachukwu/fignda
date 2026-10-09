import { expect, test, type Locator, type Page } from '@playwright/test';

/** Letter-stream index range of the first occurrence of `word` on the board. */
async function spanOf(page: Page, word: string): Promise<[number, number]> {
  // Screens load on demand: wait for the board before reading it.
  await page.locator('[data-li]').first().waitFor();
  const S = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-li]'))
      .map((el) => el.textContent ?? '')
      .join('')
      .toLowerCase(),
  );
  const i = S.indexOf(word);
  expect(i, `"${word}" in letter stream`).toBeGreaterThanOrEqual(0);
  return [i, i + word.length - 1];
}

const letter = (page: Page, li: number) => page.locator(`[data-li="${li}"]`);

async function center(l: Locator) {
  const b = (await l.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

async function drag(page: Page, a: number, b: number) {
  await letter(page, b).scrollIntoViewIfNeeded();
  await letter(page, a).scrollIntoViewIfNeeded();
  const from = await center(letter(page, a));
  const to = await center(letter(page, b));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 });
  await page.mouse.move(to.x, to.y, { steps: 4 });
  await page.mouse.up();
}

const firstRow = (page: Page) => page.getByRole('complementary').locator('li').first();

test.describe('desktop', () => {
  test('"a most" found as Amos by drag, and it moves to the top of the list', async ({ page }) => {
    await page.goto('/play/bible');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Find 30 books of the Bible');
    await expect(firstRow(page)).not.toContainText('Amos');

    const [a, b] = await spanOf(page, 'amost');
    await drag(page, a, a + 3);

    await expect(letter(page, a)).toHaveAttribute('data-state', 'found');
    await expect(letter(page, a + 3)).toHaveAttribute('data-state', 'found');
    expect(b).toBe(a + 4);
    await expect(firstRow(page)).toContainText('Amos');
    await expect(page.getByRole('status')).toContainText('Amos');
    await expect(page.getByText('1 / 30').first()).toBeVisible();
    // The ring beside the count fills by found over total: 1 of 30.
    await expect(page.getByRole('progressbar', { name: 'Found' })).toHaveAttribute('aria-valuenow', '3');

    // The space inside "a most" shares the found bar.
    const bridged = await letter(page, a).evaluate((el) => (el.nextElementSibling as HTMLElement).dataset.state);
    expect(bridged).toBe('found');
  });

  test('keyboard: Shift+arrows select, Enter checks', async ({ page }) => {
    await page.goto('/play/bible');
    const [a] = await spanOf(page, 'amos');
    const board = page.getByLabel('Puzzle text');
    await board.focus();
    for (let i = 0; i < a; i++) await page.keyboard.press('ArrowRight');
    for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Enter');
    await expect(letter(page, a)).toHaveAttribute('data-state', 'found');
  });

  test('hint marks the first letter of the earliest unfound answer', async ({ page }) => {
    await page.goto('/play/bible');
    const [a] = await spanOf(page, 'amos');
    await page.getByRole('button', { name: 'Give me a hint' }).click();
    await expect(letter(page, a)).toHaveAttribute('data-hint', 'true');
    await expect(page.getByText('1 hint')).toBeVisible();
  });

  test("I'm done shows results and shades misses", async ({ page }) => {
    await page.goto('/play/bnote');
    await page.getByRole('button', { name: "I'm done" }).click();
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
    await expect(page.getByText('The ones you missed are shaded below.')).toBeVisible();
    await expect(page.locator('[data-state="missed"]').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play again' })).toBeVisible();
    await expect(page.getByText('Playing as a guest.', { exact: false })).toBeVisible();
  });

  test('what you missed steps through each word where it hides', async ({ page }) => {
    await page.goto('/play/bible');
    const [a, b] = await spanOf(page, 'amos');
    await drag(page, a, b);
    await page.getByRole('button', { name: "I'm done" }).click();
    const reveal = page.getByRole('region', { name: 'What you missed' });
    await expect(reveal).toContainText('1 of 29');
    const first = await reveal.locator('mark').innerText();
    await reveal.getByRole('button', { name: 'Next missed word' }).click();
    await expect(reveal).toContainText('2 of 29');
    await expect(reveal.locator('mark')).not.toHaveText(first);
    // It wraps around, and the buttons work from the keyboard.
    await reveal.getByRole('button', { name: 'Previous missed word' }).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await expect(reveal).toContainText('29 of 29');
    await expect(reveal.getByRole('button', { name: 'Previous missed word' })).toBeFocused();
  });

  test('every word with no hint and no wrong pick is a clean read, with nothing left to reveal', async ({ page }) => {
    await page.goto('/play/bnote');
    for (const w of ['mark', 'luke', 'amos', 'joel', 'acts', 'ruth', 'job']) {
      const [a, b] = await spanOf(page, w);
      await drag(page, a, b);
    }
    await expect(page.getByText('Every answer found.')).toBeVisible();
    await expect(page.getByText(/clean read/i)).toBeVisible();
    // A catalogue puzzle played alone earns stars. A first finish raises them, so the line is said.
    await expect(page.getByRole('img', { name: '3 of 3 stars' })).toBeVisible();
    await expect(page.getByText(/3 of 3 stars/)).toBeVisible();
    await expect(page.getByRole('region', { name: 'What you missed' })).toHaveCount(0);
  });

  test('a wrong pick on the way is not a clean read', async ({ page }) => {
    await page.goto('/play/bnote');
    const [x] = await spanOf(page, 'remark');
    await drag(page, x, x + 5);
    for (const w of ['mark', 'luke', 'amos', 'joel', 'acts', 'ruth', 'job']) {
      const [a, b] = await spanOf(page, w);
      await drag(page, a, b);
    }
    await expect(page.getByText('Every answer found.')).toBeVisible();
    await expect(page.getByText(/clean read/i)).toHaveCount(0);
    // Every word with no hint is still said, and it is 2 stars, not 3.
    await expect(page.getByText(/no hints\.$/)).toBeVisible();
    await expect(page.getByRole('img', { name: '2 of 3 stars' })).toBeVisible();
  });

  test('games list filters and opens a game', async ({ page }) => {
    await page.goto('/play');
    await page.getByRole('button', { name: 'Football', exact: true }).click();
    const rows = page.locator('ul li a');
    await expect(rows).toHaveCount(2);
    // The shelf line counts the category from the catalogue. A new guest has finished none.
    await expect(page.getByText('0 of 2 finished')).toBeVisible();
    await rows.first().click();
    await expect(page).toHaveURL(/\/play\/(football|legends)$/);
  });

  test('daily hides the count and shows only found rows', async ({ page }) => {
    await page.goto('/play');
    await page.getByRole('link', { name: /Daily #\d+/ }).click();
    await expect(page).toHaveURL(/\/d\/\d+$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Find the hidden /);
    await expect(page.getByText('0 found').first()).toBeVisible();
    await expect(page.getByText('More are hiding. How many? That is the game.')).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Found' })).toHaveCount(0);
  });
});

test.describe('reduced motion', () => {
  async function findAmosAndCountAnimations(page: Page) {
    await page.goto('/play/bible');
    const [a] = await spanOf(page, 'amos');
    // Record row animations started by the reorder.
    await page.evaluate(() => {
      const w = window as unknown as { __flips: number };
      w.__flips = 0;
      const orig = Element.prototype.animate;
      Element.prototype.animate = function (...args) {
        if ((this as HTMLElement).dataset.row) w.__flips++;
        return orig.apply(this, args);
      };
    });
    await drag(page, a, a + 3);
    await expect(firstRow(page)).toContainText('Amos');
    return page.evaluate(() => (window as unknown as { __flips: number }).__flips);
  }

  test('FLIP runs normally', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    expect(await findAmosAndCountAnimations(page)).toBeGreaterThan(0);
  });

  test('reduced motion disables FLIP', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await findAmosAndCountAnimations(page)).toBe(0);
  });
});

test.describe('touch', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 375, height: 740 } });

  test('"a most" found as Amos by two taps', async ({ page }) => {
    await page.goto('/play/bible');
    await expect(page.getByText('Swipe across the letters. Or tap the first letter of a word, then the last.')).toBeVisible();
    const [a] = await spanOf(page, 'amost');
    await letter(page, a).tap();
    await expect(letter(page, a)).toHaveAttribute('data-state', 'selecting');
    await letter(page, a + 3).tap();
    await expect(letter(page, a)).toHaveAttribute('data-state', 'found');
    await expect(firstRow(page)).toContainText('Amos');
  });

  test('375px: bottom bar visible, no horizontal scroll', async ({ page }) => {
    for (const path of ['/play', '/play/bible', '/play/nigeria']) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
    await page.goto('/play/bible');
    const bar = page.locator('[data-mobile-bar]');
    await expect(bar).toBeVisible();
    await expect(bar.getByRole('button', { name: 'Hint' })).toBeVisible();
    await expect(bar.getByRole('button', { name: 'Done' })).toBeVisible();
    const box = (await bar.boundingBox())!;
    expect(Math.round(box.y + box.height)).toBe(740);
    await expect(page.getByRole('timer')).toBeHidden();
  });
});
