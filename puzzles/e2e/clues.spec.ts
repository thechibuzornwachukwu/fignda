import { expect, test, type Page } from '@playwright/test';

/** The board as one string: letters or digits in order. */
async function stream(page: Page): Promise<string> {
  await page.locator('[data-li]').first().waitFor();
  return page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-li]'))
      .map((el) => el.textContent ?? '')
      .join(''),
  );
}

const tap = async (page: Page, a: number, b: number) => {
  await page.locator(`[data-li="${a}"]`).click();
  await page.locator(`[data-li="${b}"]`).click();
};

test('the rhythm: after 2 word clues comes a sums clue, played with the same taps', async ({ page }) => {
  await page.goto('/play/bnote/2');
  await expect(page.getByRole('list', { name: /clue 2 of \d+/ })).toBeVisible();
  await page.getByRole('button', { name: "I'm done" }).click();
  await page.locator('[data-clue-done]').getByRole('link', { name: 'Next puzzle' }).click();
  await expect(page).toHaveURL(/\/play\/bnote\/21$/);
  await expect(page.getByRole('list', { name: /clue 3 of \d+/ })).toBeVisible();

  const title = (await page.getByRole('heading', { level: 1 }).textContent()) ?? '';
  expect(title).toMatch(/^Find 3 runs that add up to 1[0-7]$/);
  const target = Number(title.match(/\d+$/)![0]);
  const digits = [...(await stream(page))].map(Number);
  expect(digits).toHaveLength(18);

  // Every run that reaches the target, worked out here the slow way.
  const runs: Array<[number, number]> = [];
  for (let a = 0; a < digits.length; a++) {
    let sum = digits[a]!;
    for (let b = a + 1; b < digits.length && sum < target; b++) {
      sum += digits[b]!;
      if (sum === target) runs.push([a, b]);
    }
  }
  expect(runs).toHaveLength(3);

  // A run that is not one of them is a wrong pick, and finds nothing.
  const [a0, b0] = runs[0]!;
  const wrong: [number, number] = b0 + 2 < digits.length ? [a0, b0 + 2] : [a0 - 2, b0];
  await tap(page, wrong[0], wrong[1]);
  await expect(page.locator('[data-state="found"]')).toHaveCount(0);

  for (const [a, b] of runs) {
    await tap(page, a, b);
    await expect(page.locator(`[data-li="${a}"]`)).toHaveAttribute('data-state', 'found');
  }
  // All 3 found ends the clue. It gives stars and leads on.
  await expect(page.locator('[aria-labelledby="results-title"]')).toBeVisible();
  await expect(page.locator('[data-clue-done]').getByRole('link', { name: 'Next puzzle' })).toBeVisible();
  await expect(page.locator('[data-case-closed]')).toHaveCount(0);
});

test('a Mirror clue: words that read right to left, found from either end', async ({ page }) => {
  await page.goto('/play/bible/31');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Find [3-5] words that read right to left$/);
  const S = (await stream(page)).toLowerCase();
  // The list names no word until it is found, so try the everyday ones this clue could hold.
  const back = (w: string) => [...w].reverse().join('');
  const known = ['live', 'evil', 'name', 'note', 'time', 'part', 'trap', 'star', 'rats', 'some', 'most', 'rule', 'tide', 'tale', 'help', 'ever', 'were', 'fast', 'girl', 'side', 'rate', 'tops', 'spot', 'pool', 'loop', 'nose', 'code', 'tone', 'more', 'less', 'even', 'draw', 'ward', 'tame', 'mane', 'lime', 'dime', 'rope', 'lever', 'recap', 'carol', 'snort', 'erase', 'caps', 'cent', 'melt', 'omit', 'peek', 'keep', 'node', 'gall', 'sane', 'ruse', 'rows', 'taut'];
  let found = 0;
  for (const word of known.filter((w) => S.includes(back(w)))) {
    const at = S.indexOf(back(word));
    // Tapped from its first letter (the right end) to its last. A word inside a longer listed one is not taken.
    await tap(page, at + word.length - 1, at);
    await page.waitForTimeout(250);
    if ((await page.locator(`[data-li="${at}"]`).getAttribute('data-state')) === 'found') found++;
    if (found === 2) break;
  }
  expect(found, 'words found by reading right to left').toBeGreaterThan(0);
  await page.getByRole('button', { name: "I'm done" }).click();
  await expect(page.locator('[aria-labelledby="results-title"]')).toBeVisible();
  // The Mirror clue is the last of its drill: it leads on to the next pack, never to an unmasking.
  const on = page.locator('[data-clue-done]').getByRole('link', { name: 'Next puzzle' });
  await expect(on).toBeVisible();
  await expect(on).not.toHaveAttribute('href', /\/play\/bible\//);
});

/** Every run on a sums board that reaches the target. */
async function runsOn(page: Page): Promise<Array<[number, number]>> {
  const title = (await page.getByRole('heading', { level: 1 }).textContent()) ?? '';
  const target = Number(title.match(/\d+$/)![0]);
  const digits = [...(await stream(page))].map(Number);
  const runs: Array<[number, number]> = [];
  for (let a = 0; a < digits.length; a++) {
    let sum = digits[a]!;
    for (let b = a + 1; b < digits.length && sum < target; b++) {
      sum += digits[b]!;
      if (sum === target) runs.push([a, b]);
    }
  }
  return runs;
}

test.describe('edges', () => {
  test('a clue number the case does not have opens the whole puzzle', async ({ page }) => {
    // bnote has 2 passages: one sums clue (21), so no 22, and nothing at 20, 30, 39, 41 or 99.
    for (const n of ['22', '20', '30', '39', '41', '99', '3']) {
      await page.goto(`/play/bnote/${n}`);
      await expect(page, n).toHaveURL(/\/play\/bnote$/);
    }
  });

  test('a sums clue left half done comes back as it was, and the same row every time', async ({ page }) => {
    await page.goto('/play/bnote/21');
    const row = await stream(page);
    const [first] = await runsOn(page);
    await tap(page, first![0], first![1]);
    await expect(page.locator(`[data-li="${first![0]}"]`)).toHaveAttribute('data-state', 'found');
    await page.reload();
    expect(await stream(page)).toBe(row);
    await expect(page.locator(`[data-li="${first![0]}"]`)).toHaveAttribute('data-state', 'found');
    await expect(page.getByText('1 / 3').first()).toBeVisible();
    // The same run again is not a second find.
    await tap(page, first![0], first![1]);
    await expect(page.getByText('1 / 3').first()).toBeVisible();
  });

  test('a single digit, a run dragged backwards and a near miss on a sums clue', async ({ page }) => {
    await page.goto('/play/bnote/21');
    const runs = await runsOn(page);
    const [a, b] = runs[0]!;
    // One digit twice is no pick at all.
    await tap(page, a, a);
    await expect(page.locator('[data-state="found"]')).toHaveCount(0);
    // One digit short is a near miss: nothing found, nothing lost.
    await tap(page, a, b - 1 > a ? b - 1 : b + 1);
    await expect(page.locator('[data-state="found"]')).toHaveCount(0);
    // Last digit first.
    await tap(page, b, a);
    await expect(page.locator(`[data-li="${a}"]`)).toHaveAttribute('data-state', 'found');
  });

  test('a hint on a sums clue marks the first digit of a run, and on a Mirror clue the right end of a word', async ({ page }) => {
    await page.goto('/play/bnote/21');
    const runs = await runsOn(page);
    await page.getByRole('button', { name: 'Ask for a tip-off' }).click();
    // A new player's pet is Mochi: the earliest run.
    await expect(page.locator(`[data-li="${runs[0]![0]}"]`)).toHaveAttribute('data-hint', 'true');
    await expect(page.getByText('1 tip-off')).toBeVisible();
    // Asked again with the hand still there: no second charge.
    await page.getByRole('button', { name: 'Ask for a tip-off' }).click();
    await expect(page.getByText('1 tip-off')).toBeVisible();

    await page.goto('/play/bible/31');
    await stream(page);
    await page.getByRole('button', { name: 'Ask for a tip-off' }).click();
    const at = Number(await page.locator('[data-hint="true"]').getAttribute('data-li'));
    // Tapping the hinted letter and one 3 to the left is a word of 4 that starts at the hand, or a longer one does.
    const S = (await stream(page)).toLowerCase();
    expect(at).toBeGreaterThanOrEqual(3);
    expect(S[at]).toMatch(/[a-z]/);
  });

  test("each pet's hint picks its own answer: the robot the shortest run, the dino the longest", async ({ page }) => {
    for (const [pet, pick] of [
      ['robot', (rs: Array<[number, number]>) => rs.reduce((m, r) => (r[1] - r[0] < m[1] - m[0] ? r : m))],
      ['dino', (rs: Array<[number, number]>) => rs.reduce((m, r) => (r[1] - r[0] > m[1] - m[0] ? r : m))],
    ] as const) {
      await page.goto('/');
      await page.evaluate((id) => {
        localStorage.clear();
        localStorage.setItem('gazecraft-partner', JSON.stringify({ current: id, owned: [id] }));
      }, pet);
      await page.goto('/play/bnote/21');
      const runs = await runsOn(page);
      await page.getByRole('button', { name: 'Ask for a tip-off' }).click();
      await expect(page.locator('[data-hint="true"]'), pet).toHaveAttribute('data-li', String(pick(runs)[0]));
    }
  });
});

for (const [name, width, height] of [
  ['phone 360', 360, 640],
  ['phone 390', 390, 844],
  ['tablet 768', 768, 1024],
  ['tablet wide 1024', 1024, 768],
] as const) {
  test.describe(name, () => {
    test.use({ viewport: { width, height }, hasTouch: true });

    test('sums and Mirror clues fit the screen and play by tap', async ({ page }, info) => {
      for (const path of ['/play/bnote/21', '/play/bible/22', '/play/bible/31']) {
        await page.goto(path);
        await stream(page);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `${path} sideways scroll`).toBeLessThanOrEqual(0);
        // Every digit or letter sits inside the screen, and is big enough to tap near.
        const off = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('[data-li]')).filter((el) => {
          const r = el.getBoundingClientRect();
          return r.left < 0 || r.right > window.innerWidth || r.width === 0;
        }).length);
        expect(off, `${path} letters off screen`).toBe(0);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await page.screenshot({ path: info.outputPath(`${path.replace(/\W+/g, '-')}.png`) });
      }
      await page.goto('/play/bnote/21');
      const [first] = await runsOn(page);
      await page.locator(`[data-li="${first![0]}"]`).tap();
      await page.locator(`[data-li="${first![1]}"]`).tap();
      await expect(page.locator(`[data-li="${first![0]}"]`)).toHaveAttribute('data-state', 'found');
    });

    test('the path shows the longer case without scrolling sideways', async ({ page }, info) => {
      await page.goto('/play');
      await page.locator('[data-clue]').first().waitFor();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      expect(await page.locator('[data-clue]').count()).toBeGreaterThanOrEqual(3);
      await page.screenshot({ path: info.outputPath('path.png'), fullPage: true });
    });
  });
}

// A pack is a drill (set 4c): it has no unmasking, and an old link to one opens the whole puzzle.
test('an old link to an unmasking opens the whole puzzle: a drill has none', async ({ page }) => {
  await page.goto('/play/bnote/40');
  await expect(page).toHaveURL(/\/play\/bnote$/);
  await expect(page.locator('[data-key]')).toHaveCount(0);
});

test('a clue done opens a popup once: stars, the count, and the way on', async ({ page }) => {
  await page.goto('/play/bnote/1');
  await page.locator('[data-li]').first().waitFor();
  await page.getByRole('button', { name: "I'm done" }).click();
  const pop = page.locator('[data-clue-done]');
  await expect(pop).toBeVisible();
  await expect(pop).toContainText(/0 of \d found/);
  await expect(pop.locator('[data-stars]')).toHaveAttribute('data-stars', '1');
  // Less than 3 stars: no paper.
  await expect(pop.locator('[data-burst]')).toHaveCount(0);
  await pop.getByRole('link', { name: 'Next puzzle' }).click();
  await expect(page).toHaveURL(/\/play\/bnote\/2$/);
  // The result opened again has no popup.
  await page.goto('/play/bnote/1');
  await expect(page.locator('[aria-labelledby="results-title"]')).toBeVisible();
  await expect(page.locator('[data-clue-done]')).toBeHidden();
});

test.describe('the top of a clue', () => {
  test('the pack is a row of marks: done, this one and those to come, and no unmasking', async ({ page }) => {
    await page.goto('/play/bible/1');
    const marks = page.locator('[data-trail] li');
    await marks.first().waitFor({ state: 'attached' });
    const count = await marks.count();
    expect(count).toBeGreaterThanOrEqual(6);
    await expect(page.getByRole('list', { name: new RegExp(`Bible, clue 1 of ${count}$`) })).toBeVisible();
    await expect(marks.first()).toHaveAttribute('data-state', 'here');
    await expect(marks.nth(1)).toHaveAttribute('data-state', 'todo');
    await expect(marks.nth(2)).toHaveAttribute('data-kind', 'sums');
    await expect(page.locator('[data-trail] li[data-kind="unmask"]')).toHaveCount(0);
    // A clue with stars shows as done on the next one.
    await page.evaluate(() => localStorage.setItem('gazecraft-stars', JSON.stringify({ 'bible~1': 2 })));
    await page.goto('/play/bible/2');
    await expect(page.locator('[data-trail] li').first()).toHaveAttribute('data-state', 'done');
    await expect(page.locator('[data-trail] li').nth(1)).toHaveAttribute('data-state', 'here');
  });

  test('the pet stands beside the line it says, and changes with what happens', async ({ page }) => {
    await page.goto('/play/bnote/21');
    await page.locator('[data-li]').first().waitFor();
    const pet = page.locator('img[src^="/pets/"]:visible').first();
    await expect(pet).toHaveAttribute('src', /cat-calm/);
    await page.getByRole('button', { name: 'Ask for a tip-off' }).click();
    await expect(pet).toHaveAttribute('src', /cat-thinking/);
    const runs = await runsOn(page);
    await tap(page, runs[0]![0], runs[0]![1]);
    await expect(pet).toHaveAttribute('src', /cat-found/);
    const [a, b] = runs[1]!;
    await tap(page, a, b + 3 < 18 ? b + 3 : a - 3);
    await expect(pet).toHaveAttribute('src', /cat-stumped/);
  });

  for (const [name, width, height] of [
    ['phone 320', 320, 568],
    ['tablet 768', 768, 1024],
  ] as const) {
    test(`${name}: the marks of the longest case fit beside the way back`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: true });
      const page = await context.newPage();
      await page.goto('/play/bible/5');
      await page.locator('[data-trail]').waitFor();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
      const trail = (await page.locator('[data-trail]').boundingBox())!;
      const back = (await page.getByRole('link', { name: 'Packs' }).boundingBox())!;
      expect(trail.x).toBeGreaterThanOrEqual(back.x + back.width);
      expect(trail.x + trail.width).toBeLessThanOrEqual(width);
      // One row.
      expect(trail.height).toBeLessThanOrEqual(24);
      await context.close();
    });
  }
});
