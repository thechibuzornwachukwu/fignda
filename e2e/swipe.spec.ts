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

/** Low level touch path: points with optional pauses, ending wherever the last point is. */
async function touchPath(page: Page, points: Array<{ x: number; y: number; wait?: number }>, opts: { keepDown?: boolean } = {}) {
  const cdp = await page.context().newCDPSession(page);
  const [first, ...rest] = points;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: first!.x, y: first!.y, id: 1 }] });
  if (first!.wait) await page.waitForTimeout(first!.wait);
  for (const p of rest) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x, y: p.y, id: 1 }] });
    await page.waitForTimeout(p.wait ?? 16);
  }
  if (!opts.keepDown) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  return cdp;
}

test('a sideways swipe that wobbles up and down mid-drag still selects', async ({ page }) => {
  await page.goto('/play/bible');
  const i = await indexOf(page, 'amost');
  const a = await centerOf(page, i);
  const b = await centerOf(page, i + 3);
  // Sideways first, then a wobble of a whole line down and back: this used to cancel the selection on iOS.
  await touchPath(page, [
    { x: a.x, y: a.y },
    { x: a.x + 20, y: a.y + 2 },
    { x: a.x + 30, y: a.y + 40 },
    { x: a.x + 45, y: a.y - 30 },
    { x: b.x, y: b.y + 4 },
  ]);
  await expect(page.locator(`[data-li="${i}"]`)).toHaveAttribute('data-state', 'found');
});

test('press and hold, then drag down onto the next line, selects', async ({ page }) => {
  await page.goto('/play/bible');
  await page.locator('[data-li]').first().waitFor();
  const target = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-li]'));
    const S = els.map((e) => e.textContent).join('').toLowerCase();
    for (const w of ['judges', 'hebrews', 'esther', 'chronicles', 'philemon', 'lamentations', 'revelation', 'genesis', 'numbers', 'malachi']) {
      let i = S.indexOf(w);
      while (i >= 0) {
        if (els[i + w.length - 1]!.getBoundingClientRect().top - els[i]!.getBoundingClientRect().top > 5) return { i, len: w.length };
        i = S.indexOf(w, i + 1);
      }
    }
    return null;
  });
  test.skip(!target, 'No answer wraps at this width');
  const a = await centerOf(page, target!.i);
  const b = await centerOf(page, target!.i + target!.len - 1);
  // Hold still, then move straight down first (a vertical start would normally scroll).
  await touchPath(page, [{ x: a.x, y: a.y, wait: 400 }, { x: a.x, y: b.y }, { x: b.x, y: b.y }]);
  await expect(page.locator(`[data-li="${target!.i}"]`)).toHaveAttribute('data-state', 'found');
});

test('a bubble above the finger shows the letters being selected', async ({ page }) => {
  await page.goto('/play/bible');
  const i = await indexOf(page, 'amost');
  const a = await centerOf(page, i);
  const c = await centerOf(page, i + 2);
  const cdp = await touchPath(page, [{ x: a.x, y: a.y }, { x: a.x + 12, y: a.y }, { x: c.x, y: c.y }], { keepDown: true });
  await expect(page.getByText(/^AMO$/)).toBeVisible();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.getByText(/^AMO$/)).toHaveCount(0);
});
