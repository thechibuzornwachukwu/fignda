import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import gamesFile from '../data/games.json' with { type: 'json' };

/** PNG width and height from the IHDR chunk. */
function pngSize(path: string) {
  const b = readFileSync(path);
  expect(b.subarray(1, 4).toString()).toBe('PNG');
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

async function finishAndOpenShare(page: Page, path: string) {
  await page.goto(path);
  // Desktop has "I'm done"; under 760px the mobile bar has "Done".
  await page.getByRole('button', { name: /^(I'm done|Done)$/ }).filter({ visible: true }).first().click();
  await page.getByRole('button', { name: 'Share' }).click();
  const sheet = page.getByRole('dialog', { name: 'Share' });
  await expect(sheet).toBeVisible();
  return sheet;
}

/** Force the download path (no Web Share with files), as on most desktops. */
async function noWebShare(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
  });
}

test.describe('export', () => {
  test.beforeEach(async ({ page }) => noWebShare(page));

  test('3 ratios export at 1080 wide', async ({ page }) => {
    const sheet = await finishAndOpenShare(page, '/play/bnote');
    const want = { '1:1': 1080, '4:5': 1350, '9:16': 1920 } as const;
    for (const [ratio, h] of Object.entries(want)) {
      await sheet.getByRole('radio', { name: ratio }).click();
      const [dl] = await Promise.all([page.waitForEvent('download'), sheet.getByRole('button', { name: 'Share image' }).click()]);
      expect(pngSize(await dl.path())).toEqual({ w: 1080, h });
      await expect(sheet.getByRole('status')).toHaveText('Saved.');
    }
  });

  test('Bible full puzzle at 4:5 gives 4 images', async ({ page }) => {
    const sheet = await finishAndOpenShare(page, '/play/bible');
    await sheet.getByRole('radio', { name: 'Puzzle' }).click();
    await sheet.getByRole('radio', { name: 'Full puzzle' }).click();
    await expect(sheet.locator('[aria-live="polite"]')).toHaveText('1 / 4');
    await expect(sheet.getByText('The whole text in 4 pages. Shares as a carousel.')).toBeVisible();
    const downloads: import('@playwright/test').Download[] = [];
    page.on('download', (d) => downloads.push(d));
    await sheet.getByRole('button', { name: 'Share 4 images' }).click();
    await expect(sheet.getByRole('status')).toHaveText('Saved 4 images.', { timeout: 30_000 });
    await expect.poll(() => downloads.length, { timeout: 15_000 }).toBe(4);
    for (const d of downloads) expect(pngSize((await d.path())!)).toEqual({ w: 1080, h: 1350 });
  });
});

test('daily locks finds', async ({ page }) => {
  await page.goto('/play');
  await page.getByRole('link', { name: /Daily #\d+/ }).click();
  await page.getByRole('button', { name: "I'm done" }).click();
  await page.getByRole('button', { name: 'Share' }).click();
  const sheet = page.getByRole('dialog', { name: 'Share' });
  // Result card for a daily never shows the total.
  await expect(sheet.getByText(/^\d+ found$/).first()).toBeVisible();
  await sheet.getByRole('radio', { name: 'Puzzle' }).click();
  const toggle = sheet.getByRole('switch', { name: /Show my finds/ });
  await expect(toggle).toContainText('Locked for daily puzzles until tomorrow');
  await expect(toggle).toHaveAttribute('aria-disabled', 'true');
  await toggle.click({ force: true }); // a determined click still cannot switch it on
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await expect(sheet.getByText('Contains answers')).toHaveCount(0);
  await expect(sheet.getByText(/How many .* can you find\?/).first()).toBeVisible();
});

test('show my finds stamps the card on a normal game', async ({ page }) => {
  const sheet = await finishAndOpenShare(page, '/play/bnote');
  await sheet.getByRole('radio', { name: 'Puzzle' }).click();
  await sheet.getByRole('switch', { name: /Show my finds/ }).click();
  await expect(sheet.getByText('Contains answers').first()).toBeVisible();
  await expect(sheet.getByText('Card is stamped Contains answers')).toBeVisible();
});

test('copy link', async ({ page, context, baseURL }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const sheet = await finishAndOpenShare(page, '/play/bible');
  await sheet.getByRole('button', { name: 'Copy link' }).click();
  await expect(sheet.getByRole('status')).toHaveText('Link copied.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${baseURL}/play/bible`);
});

test('Esc closes the sheet and focus returns to Share', async ({ page }) => {
  await finishAndOpenShare(page, '/play/bnote');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Share' })).toBeFocused();
});

test.describe('phone', () => {
  test.use({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true });

  test('share sheet fits at 375px with no horizontal scroll', async ({ page }) => {
    const sheet = await finishAndOpenShare(page, '/play/bible');
    for (const ratio of ['1:1', '4:5', '9:16']) {
      await sheet.getByRole('radio', { name: ratio }).click();
      const box = (await sheet.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(375);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    }
    await expect(sheet.getByRole('button', { name: /Share image/ })).toBeVisible();
  });
});

/** Every card for every game: readable, nothing clipped, text never under 38px. */
test.describe('readability of every card', () => {
  test.describe.configure({ timeout: 240_000 });
  const ids = (gamesFile as { games: Array<{ id: string }> }).games.map((g) => g.id);

  // The "With NAME" mark at its longest, on the longest puzzle and a short one.
  const marked = ['bible&with=1', 'bnote&with=1'];

  for (const id of [...ids, ...marked]) {
    test(id, async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 900 });
      await page.goto(`/__cards?game=${id}`);
      if (id.endsWith('with=1')) await expect(page.locator('[data-with]').first()).toBeVisible();
      // The harness is lazy loaded: wait for real cards before measuring anything.
      await expect(page.locator('[data-harness-card]').first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      // Then wait for any re-pagination to settle: the same non-empty state twice in a row.
      let last = '';
      await expect
        .poll(async () => {
          const now = await page.evaluate(() =>
            Array.from(document.querySelectorAll('[data-deck]'), (d) => `${(d as HTMLElement).dataset.budget}/${(d as HTMLElement).dataset.pages}`).join(),
          );
          const stable = now !== '' && now === last;
          last = now;
          return stable;
        }, { intervals: [400] })
        .toBe(true);

      // Guard: the harness really rendered (3 ratios x (8 decks + 2 results), at least one card each).
      expect(await page.locator('[data-harness-card]').count()).toBeGreaterThanOrEqual(30);

      const problems = await page.evaluate(() => {
        const out: string[] = [];
        document.querySelectorAll<HTMLElement>('[data-harness-card]').forEach((wrap, i) => {
          const card = wrap.firstElementChild as HTMLElement;
          const w = Number(wrap.dataset.w);
          const h = Number(wrap.dataset.h);
          const r = card.getBoundingClientRect();
          if (Math.round(r.width) !== w || Math.round(r.height) !== h) out.push(`#${i} size ${r.width}x${r.height}, want ${w}x${h}`);
          if (card.scrollHeight > card.clientHeight + 1) out.push(`#${i} ${card.dataset.card} content taller than the card`);
          const text = card.querySelector<HTMLElement>('[data-text]');
          if (text) {
            if (text.dataset.overflow !== 'false') out.push(`#${i} text overflows`);
            if (Number(text.dataset.fontSize) < 38) out.push(`#${i} text ${text.dataset.fontSize}px < 38px`);
          }
          // Every child row stays inside the card horizontally.
          const edge = card.getBoundingClientRect().right - parseFloat(getComputedStyle(card).paddingRight);
          card.querySelectorAll<HTMLElement>(':scope > *').forEach((row) => {
            if (row.scrollWidth <= row.clientWidth + 1) return;
            // Name the element that sticks out past the card's padding.
            const culprit = Array.from(row.querySelectorAll<HTMLElement>('*')).find((el) => el.getBoundingClientRect().right > edge + 1);
            out.push(`#${i} ${card.dataset.card} ${wrap.dataset.w}x${wrap.dataset.h}: "${(culprit?.textContent ?? '').slice(0, 30)}" ${culprit?.className.split('_')[1] ?? ''} ends at ${Math.round(culprit?.getBoundingClientRect().right ?? 0)}, edge ${Math.round(edge)}`);
          });
        });
        return out;
      });
      expect(problems).toEqual([]);
    });
  }

  test('Bible full puzzle at 4:5 is 4 pages without shrinking the budget', async ({ page }) => {
    await page.goto('/__cards?game=bible');
    const deck = page.locator('[data-deck="bible|4:5|full|false|false"]');
    await expect(deck).toHaveAttribute('data-pages', '4');
    await expect(deck).toHaveAttribute('data-budget', '1');
  });
});
