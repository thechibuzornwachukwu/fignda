import { expect, test, type Page } from '@playwright/test';

// Count every tone the page starts, so the test hears what a player would.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __tones: number };
    w.__tones = 0;
    const orig = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function (this: AudioContext) {
      w.__tones++;
      return orig.call(this);
    };
  });
});

const tones = (page: Page) => page.evaluate(() => (window as unknown as { __tones: number }).__tones);

async function drag(page: Page, from: number, to: number) {
  const at = async (li: number) => {
    const b = (await page.locator(`[data-li="${li}"]`).first().boundingBox())!;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  await page.locator(`[data-li="${to}"]`).first().scrollIntoViewIfNeeded();
  const a = await at(from);
  const b = await at(to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  for (let i = 1; i <= 4; i++) {
    await page.mouse.move(a.x + ((b.x - a.x) * i) / 4, a.y + ((b.y - a.y) * i) / 4);
    await page.waitForTimeout(60);
  }
  await page.mouse.up();
}

test('a find ticks per letter and chimes', async ({ page }) => {
  await page.goto('/');
  const S = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[aria-label="Demo sentence"] [data-li]'))
      .map((e) => e.textContent)
      .join('')
      .toLowerCase(),
  );
  const i = S.indexOf('amos');
  await page.locator('body').click({ position: { x: 5, y: 5 } }); // a first gesture wakes audio
  await drag(page, i, i + 3);
  await expect(page.getByRole('complementary', { name: 'Hidden above' })).toContainText('1 / 5');
  // At least a few ticks, plus the two notes of the chime.
  expect(await tones(page)).toBeGreaterThanOrEqual(5);
});

test('mute on the puzzle silences the board and is remembered', async ({ page }) => {
  await page.goto('/play/bible');
  const sound = page.getByRole('button', { name: 'Sound' });
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
  await drag(page, 0, 3);
  expect(await tones(page)).toBeGreaterThan(0);

  await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  const before = await tones(page);
  await drag(page, 5, 9);
  expect(await tones(page)).toBe(before);

  await page.reload();
  await expect(page.getByRole('button', { name: 'Sound' })).toHaveAttribute('aria-pressed', 'false');
});
