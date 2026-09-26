import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true });

/** A real finger gesture through Chrome's touch input (pointerType "touch"). */
async function swipe(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps = 8) {
  const cdp = await page.context().newCDPSession(page);
  const point = (p: { x: number; y: number }) => [{ x: p.x, y: p.y, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(from) });
  for (let i = 1; i <= steps; i++) {
    const p = { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(p) });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function centerOf(page: Page, li: number) {
  const l = page.locator(`[data-li="${li}"]`);
  await l.scrollIntoViewIfNeeded();
  const b = (await l.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

async function indexOf(page: Page, word: string) {
  await page.locator('[data-li]').first().waitFor();
  const S = await page.evaluate(() => Array.from(document.querySelectorAll('[data-li]'), (e) => e.textContent).join('').toLowerCase());
  return S.indexOf(word);
}

test('a sideways swipe across "a most" finds Amos', async ({ page }) => {
  await page.goto('/play/bible');
  const i = await indexOf(page, 'amost');
  await swipe(page, await centerOf(page, i), await centerOf(page, i + 3));
  await expect(page.locator(`[data-li="${i}"]`)).toHaveAttribute('data-state', 'found');
  await expect(page.getByRole('complementary').locator('li').first()).toContainText('Amos');
});

test('a vertical swipe over the text scrolls the page and selects nothing', async ({ page }) => {
  await page.goto('/play/bible');
  const i = await indexOf(page, 'amost');
  const start = await centerOf(page, i);
  const before = await page.evaluate(() => scrollY);
  await swipe(page, start, { x: start.x, y: start.y - 300 }, 10);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
  await expect(page.locator('[data-state="found"], [data-state="selecting"]')).toHaveCount(0);
});

test('a swipe that wraps onto the next line still selects the word', async ({ page }) => {
  await page.goto('/play/bible');
  // Find an answer whose first and last letters sit on different lines.
  await page.locator('[data-li]').first().waitFor();
  const target = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-li]'));
    const S = els.map((e) => e.textContent).join('').toLowerCase();
    for (const w of ['judges', 'hebrews', 'esther', 'chronicles', 'philemon', 'lamentations', 'revelation', 'genesis', 'numbers']) {
      let i = S.indexOf(w);
      while (i >= 0) {
        if (Math.abs(els[i]!.getBoundingClientRect().top - els[i + w.length - 1]!.getBoundingClientRect().top) > 5) return { i, len: w.length };
        i = S.indexOf(w, i + 1);
      }
    }
    return null;
  });
  test.skip(!target, 'No answer wraps at this width');
  const { i, len } = target!;
  await swipe(page, await centerOf(page, i), await centerOf(page, i + len - 1), 14);
  await expect(page.locator(`[data-li="${i}"]`)).toHaveAttribute('data-state', 'found');
});

test('tap first, tap last still works', async ({ page }) => {
  await page.goto('/play/bible');
  const i = await indexOf(page, 'amost');
  await page.locator(`[data-li="${i}"]`).tap();
  await page.locator(`[data-li="${i + 3}"]`).tap();
  await expect(page.locator(`[data-li="${i}"]`)).toHaveAttribute('data-state', 'found');
});
