import { expect, test, type Page } from '@playwright/test';

const DEMO = ['amos', 'atom', 'data', 'rome', 'gold'];

async function letters(page: Page): Promise<string> {
  await page.locator('[aria-label="Demo sentence"] [data-li]').first().waitFor();
  return page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('[aria-label="Demo sentence"] [data-li]'))
      .map((el) => el.textContent ?? '')
      .join('')
      .toLowerCase(),
  );
}

async function dragWord(page: Page, S: string, word: string) {
  const i = S.indexOf(word);
  expect(i, word).toBeGreaterThanOrEqual(0);
  // Scroll the word into view first, as a player would.
  await page.locator(`[data-li="${i + word.length - 1}"]`).scrollIntoViewIfNeeded();
  await page.locator(`[data-li="${i}"]`).scrollIntoViewIfNeeded();
  const at = async (li: number) => {
    const b = (await page.locator(`[data-li="${li}"]`).boundingBox())!;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const from = await at(i);
  const to = await at(i + word.length - 1);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up();
}

const cta = (page: Page) => page.getByRole('link', { name: 'Now find thirty' });
const list = (page: Page) => page.getByRole('complementary', { name: 'Hidden above' });

test('demo completes by drag and links to /play/bible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Find it\.\s*Figure it out\./);
  const S = await letters(page);
  await expect(cta(page)).toHaveCount(0);

  for (const [n, w] of DEMO.entries()) {
    await dragWord(page, S, w);
    await expect(list(page)).toContainText(`${n + 1} / 5`);
  }

  await expect(cta(page)).toBeVisible();
  await expect(cta(page)).toHaveAttribute('href', '/play/bible');
  await expect(page.getByRole('button', { name: 'Play again' })).toBeVisible();
  await cta(page).click();
  await expect(page).toHaveURL(/\/play\/bible$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Find 30 books of the Bible');
});

test('hint cycles Give me a hint, Show it, Play again', async ({ page }) => {
  await page.goto('/');
  const S = await letters(page);
  const hint = page.locator('#how').getByRole('button', { name: /Give me a hint|Show it|Play again/ });

  for (const w of DEMO) {
    await expect(hint).toHaveText('Give me a hint');
    await hint.click();
    await expect(page.locator(`[data-li="${S.indexOf(w)}"]`)).toHaveAttribute('data-hint', 'true');
    await expect(hint).toHaveText('Show it');
    await hint.click();
    await expect(page.getByRole('status').filter({ hasText: 'was hiding there.' })).toBeVisible();
  }

  await expect(list(page)).toContainText('5 / 5');
  await expect(cta(page)).toBeVisible();
  await expect(hint).toHaveText('Play again');
  await hint.click();
  await expect(list(page)).toContainText('0 / 5');
  await expect(cta(page)).toHaveCount(0);
});

test('sections and anchors', async ({ page }) => {
  await page.goto('/#about');
  await expect(page.getByRole('heading', { name: 'About' })).toBeInViewport();
  await expect(page.getByRole('heading', { name: 'Pick a topic' })).toBeVisible();
  await page.getByRole('link', { name: /Nigerian names\s*26 words · Hard/ }).click();
  await expect(page).toHaveURL(/\/play\/nigeria$/);
});

test.describe('touch', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 375, height: 740 } });

  test('demo by two taps, no horizontal scroll', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Swipe across the letters, or tap the first and then the last.', { exact: false })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const S = await letters(page);
    const i = S.indexOf('amos');
    await page.locator(`[data-li="${i}"]`).tap();
    await page.locator(`[data-li="${i + 3}"]`).tap();
    await expect(list(page)).toContainText('1 / 5');
  });
});

test('a guest on the landing page never loads the auth client', async ({ page }) => {
  const calls: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes(':54321') || r.url().includes('supabase')) calls.push(r.url());
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(calls).toEqual([]);
});
