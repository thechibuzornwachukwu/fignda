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
  await expect(page.getByText(/Clue 2 of \d+/)).toBeVisible();
  await page.getByRole('button', { name: "I'm done" }).click();
  await page.locator('[data-clue-done]').getByRole('link', { name: 'Next clue' }).click();
  await expect(page).toHaveURL(/\/play\/bnote\/21$/);
  await expect(page.getByText(/Clue 3 of \d+/)).toBeVisible();

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
  await expect(page.locator('[data-clue-done]').getByRole('link', { name: /Next clue|The unmasking/ })).toBeVisible();
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
  await expect(page.locator('[data-clue-done]').getByRole('link', { name: 'The unmasking' })).toBeVisible();
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
    await page.getByRole('button', { name: 'Give me a hint' }).click();
    // A new player's pet is Detective X: the earliest run.
    await expect(page.locator(`[data-li="${runs[0]![0]}"]`)).toHaveAttribute('data-hint', 'true');
    await expect(page.getByText('1 hint')).toBeVisible();
    // Asked again with the hand still there: no second charge.
    await page.getByRole('button', { name: 'Give me a hint' }).click();
    await expect(page.getByText('1 hint')).toBeVisible();

    await page.goto('/play/bible/31');
    await stream(page);
    await page.getByRole('button', { name: 'Give me a hint' }).click();
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
      await page.getByRole('button', { name: 'Give me a hint' }).click();
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
      expect(await page.locator('[data-clue]').count()).toBeGreaterThanOrEqual(4);
      await page.screenshot({ path: info.outputPath('path.png'), fullPage: true });
    });
  });
}

test.describe('the unmasking', () => {
  // The culprit of a case is the same on every device: for bnote it is the usher. U is given, S H E R are to find.
  const keys = async (page: Page) => {
    await page.locator('[data-key]').first().waitFor();
    return page.locator('[data-key]').evaluateAll((els) => els.map((el) => el.getAttribute('data-key')!));
  };
  const decoys = async (page: Page) => (await keys(page)).filter((ch) => !'sher'.includes(ch));

  test('it opens made to be won: a line about the culprit, the first letter given, and a small bank of letters', async ({ page }) => {
    await page.goto('/play/bnote/40');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Who is behind the mask?');
    await expect(page.locator('[data-about]')).toHaveText('Shows people to their seats.');
    await expect(page.getByRole('img', { name: '6 tries left' })).toBeVisible();
    const slots = page.locator('[data-unmask] [data-slot]');
    await expect(slots).toHaveCount(5);
    await expect(slots.first()).toHaveText('U');
    await expect(page.locator('[data-unmask] [data-slot][data-filled]')).toHaveCount(1);
    // An empty slot keeps its place: the player can count the letters of the name.
    const widths = await slots.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
    for (const w of widths) expect(w).toBeGreaterThanOrEqual(20);
    // The 4 letters to find and 6 that are not in the name, in alphabet order, and U is not among them.
    const bank = await keys(page);
    expect(bank).toHaveLength(10);
    expect([...bank].sort()).toEqual(bank);
    expect(bank).toEqual(expect.arrayContaining(['s', 'h', 'e', 'r']));
    expect(bank).not.toContain('u');
    // No word list and no giving up. There is a hint.
    await expect(page.getByRole('button', { name: "I'm done" })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Give me a hint' })).toBeVisible();
  });

  test('a hint rings a key that is in the name, and asked again it costs nothing more', async ({ page }) => {
    await page.goto('/play/bnote/40');
    await page.getByRole('button', { name: 'Give me a hint' }).click();
    const ringed = page.locator('[data-key][data-hint]');
    await expect(ringed).toHaveCount(1);
    const ch = (await ringed.getAttribute('data-key'))!;
    expect('sher').toContain(ch);
    await page.getByRole('button', { name: 'Give me a hint' }).click();
    await expect(page.locator('[data-key][data-hint]')).toHaveAttribute('data-key', ch);
    // Picking it clears the ring, and a hinted game is not 3 stars.
    await ringed.click();
    await expect(page.locator('[data-key][data-hint]')).toHaveCount(0);
    for (const k of 'sher'.replace(ch, '')) await page.locator(`[data-key="${k}"]`).click();
    await expect(page.locator('[data-clue-done] [data-stars]')).toHaveAttribute('data-stars', '2');
  });

  test('spelling the name closes the case, with a popup that shows who it was', async ({ page }) => {
    await page.goto('/play/bnote/40');
    const [wrong] = await decoys(page);
    await page.locator(`[data-key="${wrong}"]`).click();
    await expect(page.getByRole('img', { name: '5 tries left' })).toBeVisible();
    await expect(page.locator(`[data-key="${wrong}"]`)).toBeDisabled();
    for (const ch of 'she') await page.locator(`[data-key="${ch}"]`).click();
    await expect(page.locator('[data-unmask] [data-slot][data-filled]')).toHaveCount(4);
    await page.locator('[data-key="r"]').click();

    const pop = page.locator('[data-clue-done]');
    await expect(pop).toBeVisible();
    await expect(pop.locator('[data-case-closed]')).toContainText('Case closed');
    await expect(pop.locator('[data-case-closed]')).toContainText('the usher');
    await expect(pop).toContainText('4 of 4 letters, 1 wrong');
    await expect(pop.locator('[data-stars]')).toHaveAttribute('data-stars', '2');
    await expect(pop.getByRole('link')).toHaveText(/next case/i);
    // Closing the popup leaves the full result, and the path has the case closed.
    await pop.getByRole('button', { name: 'See the result' }).click();
    await expect(pop).toBeHidden();
    await expect(page.locator('[aria-labelledby="results-title"]')).toBeVisible();
    await page.goto('/play');
    await expect(page.locator('[data-case="bnote"]')).toHaveAttribute('data-state', 'done');
  });

  test('typed on a keyboard, with no wrong letter, it is 3 stars. A letter that is not in the bank does nothing', async ({ page }) => {
    await page.goto('/play/bnote/40');
    await page.locator('[data-key]').first().waitFor();
    const outside = [...'abcdefghijklmnopqrstuvwxyz'];
    const bank = await keys(page);
    await page.keyboard.type(outside.filter((ch) => !bank.includes(ch)).join(''), { delay: 20 });
    await page.keyboard.type('u1 ', { delay: 20 });
    await expect(page.getByRole('img', { name: '6 tries left' })).toBeVisible();
    await page.keyboard.type('sher', { delay: 220 });
    const pop = page.locator('[data-clue-done]');
    await expect(pop.locator('[data-stars]')).toHaveAttribute('data-stars', '3');
    await expect(pop).toContainText('4 of 4 letters, 0 wrong');
    await expect(pop.locator('[data-burst]').first()).toBeAttached();
  });

  test('every wrong letter in the bank ends it, and the mask comes off anyway', async ({ page }) => {
    await page.goto('/play/bnote/40');
    const wrong = await decoys(page);
    expect(wrong).toHaveLength(6);
    for (const ch of wrong) await page.locator(`[data-key="${ch}"]`).click();
    const pop = page.locator('[data-clue-done]');
    await expect(pop).toBeVisible();
    await expect(pop.locator('[data-case-closed]')).toContainText('the usher');
    await expect(pop).toContainText('0 of 4 letters, 6 wrong');
    await expect(pop.locator('[data-stars]')).toHaveAttribute('data-stars', '1');
    // The keys are done with. A reload shows the result, not a new game and not a second popup.
    await pop.getByRole('button', { name: 'See the result' }).click();
    // The reveal is the screen now: the question, the keys and the top bar are gone.
    await expect(page.locator('[data-key]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();
    await expect(page.locator('[aria-labelledby="results-title"] [data-case-closed]')).toHaveCount(1);
    await page.reload();
    await expect(page.locator('[aria-labelledby="results-title"]')).toBeVisible();
    await expect(page.locator('[data-clue-done]')).toBeHidden();
  });

  test('left half way, it comes back with the letters and the tries as they were', async ({ page }) => {
    await page.goto('/play/bnote/40');
    const [a, b] = await decoys(page);
    for (const ch of ['s', a!, b!]) await page.locator(`[data-key="${ch}"]`).click();
    await page.reload();
    await expect(page.getByRole('img', { name: '4 tries left' })).toBeVisible();
    await expect(page.locator('[data-key="s"]')).toHaveAttribute('data-state', 'hit');
    await expect(page.locator(`[data-key="${a}"]`)).toHaveAttribute('data-state', 'miss');
    await expect(page.locator('[data-unmask] [data-slot][data-filled]')).toHaveCount(2);
  });

  test('a key tapped twice fast, or tapped after the end, picks once', async ({ page }) => {
    await page.goto('/play/bnote/40');
    await page.locator('[data-key="s"]').dblclick();
    await expect(page.getByRole('img', { name: '6 tries left' })).toBeVisible();
    await expect(page.locator('[data-unmask] [data-slot][data-filled]')).toHaveCount(2);
    const [wrong] = await decoys(page);
    await page.locator(`[data-key="${wrong}"]`).dblclick({ force: true });
    await expect(page.getByRole('img', { name: '5 tries left' })).toBeVisible();
  });

  for (const [name, width, height] of [
    ['phone 320', 320, 568],
    ['phone 360', 360, 640],
    ['phone on its side', 740, 360],
    ['tablet 768', 768, 1024],
  ] as const) {
    // Every case, so the longest name and the widest bank are in it.
    test(`${name}: on every case the name, its slots and the bank fit, and the popup fits`, async ({ browser }, info) => {
      test.setTimeout(120_000);
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: true });
      const page = await context.newPage();
      await page.goto('/play');
      await page.locator('[data-case]').first().waitFor();
      const ids = await page.locator('[data-case]').evaluateAll((els) => els.map((el) => el.getAttribute('data-case')!));
      expect(ids.length).toBeGreaterThan(10);
      for (const id of ids) {
        await page.goto(`/play/${id}/40`);
        await page.locator('[data-key]').first().waitFor();
        expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), `${id} sideways scroll`).toBeLessThanOrEqual(0);
        const bad = await page.evaluate(() => {
          const off = (sel: string, least: number) =>
            Array.from(document.querySelectorAll<HTMLElement>(sel)).filter((el) => {
              const r = el.getBoundingClientRect();
              return r.left < 0 || r.right > window.innerWidth + 0.5 || r.width < least;
            }).length;
          return { keys: off('[data-key]', 40), slots: off('[data-unmask] [data-slot]', 12) };
        });
        expect(bad, id).toEqual({ keys: 0, slots: 0 });
        const count = await page.locator('[data-key]').count();
        expect(count, `${id} bank`).toBeGreaterThanOrEqual(8);
        expect(count, `${id} bank`).toBeLessThanOrEqual(12);
      }
      await page.screenshot({ path: info.outputPath('unmask.png') });
      // Finish the last one by tapping through the bank.
      for (const ch of await keys(page)) {
        if (await page.locator('[data-clue-done]').isVisible()) break;
        await page.locator(`[data-key="${ch}"]`).tap();
      }
      const pop = page.locator('[data-clue-done]');
      await expect(pop).toBeVisible();
      const box = (await pop.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      // On a short screen the popup scrolls inside itself: the way on can always be reached.
      await pop.getByRole('link').scrollIntoViewIfNeeded();
      await expect(pop.getByRole('link')).toBeInViewport();
      await page.waitForTimeout(1600);
      await page.screenshot({ path: info.outputPath('unmasked.png') });
      await context.close();
    });
  }
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
  await pop.getByRole('link', { name: 'Next clue' }).click();
  await expect(page).toHaveURL(/\/play\/bnote\/2$/);
  // The result opened again has no popup.
  await page.goto('/play/bnote/1');
  await expect(page.locator('[aria-labelledby="results-title"]')).toBeVisible();
  await expect(page.locator('[data-clue-done]')).toBeHidden();
});
