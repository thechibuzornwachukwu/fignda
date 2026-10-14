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
  await expect(page.getByRole('main').getByRole('link', { name: 'Carry on', exact: true })).toHaveAttribute('href', '/case/the-long-spoon/3');
});

test('a step that is not open says so, and one that does not exist leads back', async ({ page }) => {
  await page.goto(`${CASE}/4`);
  await expect(page.locator('[data-step="locked"]')).toBeVisible();
  await page.getByRole('link', { name: 'Back to the board' }).click();
  await expect(page).toHaveURL(/\/case\/the-long-spoon$/);
  await page.goto(`${CASE}/9`);
  await expect(page).toHaveURL(/\/case\/the-long-spoon$/);
});


test('a step fits a phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await seed(page, { 1: 3 });
  await page.goto(`${CASE}/2`);
  // A step has the whole screen: no dock, and the bar under the thumb has the tip-off and done.
  await expect(page.getByRole('navigation', { name: 'Tabs' })).toHaveCount(0);
  const bar = page.locator('[data-mobile-bar]');
  await expect(bar.getByRole('button', { name: 'Tip-off' })).toBeVisible();
  await bar.getByRole('button', { name: 'Done' }).click();
  await expect(bar).toHaveCount(0);
  await expect(page.locator('[data-step-result]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('the line-up: whoever is cleared cannot be named, and the right name closes the case', async ({ page }) => {
  await seed(page, { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 });
  await page.goto(`${CASE}/6`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Who took the Long Spoon?');
  await expect(page.locator('[data-tries]')).toHaveAttribute('data-tries', '2');
  await expect(page.locator('[data-choose]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Pick who is left' })).toBeDisabled();
  await page.locator('[data-choose="the photographer"]').click();
  await page.getByRole('button', { name: 'Name Theo' }).click();
  await expect(page.locator('[data-ending]')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Case closed');
  await expect(page.locator('[data-confession]')).toContainText('I was 14 when they planed her off');
  await expect(page.locator('[data-after]')).toContainText('The committee has until 6');
  await expect(page.getByRole('img', { name: '3 of 3 stars' })).toBeVisible();
  // Closed stays closed, and the brief leads to it.
  await page.goto(CASE);
  await page.getByRole('link', { name: 'See the line-up' }).click();
  await expect(page.locator('[data-ending]')).toBeVisible();
});

test('the line-up: 2 wrong names and the mask comes off anyway', async ({ page }) => {
  // Every step done with 1 star: the leads were given, nobody was cleared.
  await seed(page, { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 });
  await page.goto(`${CASE}/6`);
  await expect(page.locator('[data-choose]')).toHaveCount(4);
  await page.locator('[data-choose="the stall owner"]').click();
  await page.getByRole('button', { name: 'Name Rosa' }).click();
  await expect(page.locator('[data-tries]')).toHaveAttribute('data-tries', '1');
  await expect(page.locator('[data-choose]')).toHaveCount(3);
  await expect(page.getByText('Not them')).toBeVisible();
  await page.locator('[data-choose="the baker"]').click();
  await page.getByRole('button', { name: 'Name Marco' }).click();
  await expect(page.locator('[data-ending]')).toBeVisible();
  await expect(page.locator('[data-culprit-photo]')).toContainText('Theo');
  await expect(page.getByRole('img', { name: '1 of 3 stars' })).toBeVisible();
});

test('a new player lands in the brief, and finds the case again on Cases', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Open your first case' }).first().click();
  await expect(page).toHaveURL(/\/case\/the-long-spoon$/);
  await page.goto('/play');
  const card = page.locator('[data-chapter="the-long-spoon"]');
  await expect(card.getByRole('heading', { name: 'The long spoon' })).toBeVisible();
  await expect(card.getByRole('link', { name: 'Open the brief' })).toHaveAttribute('href', '/case/the-long-spoon');
});

test('half way through, the landing page and Cases say carry on, and a closed case leaves both', async ({ page }) => {
  await seed(page, { 1: 3, 2: 2 });
  await page.goto('/');
  // The Play button leads straight to the step that is open.
  await expect(page.getByRole('main').getByRole('link', { name: 'Carry on your case' })).toHaveAttribute('href', '/case/the-long-spoon/3');
  await page.goto('/play');
  await expect(page.locator('[data-chapter]').getByRole('img', { name: 'Step 3 of 6' })).toBeVisible();
  await expect(page.locator('[data-chapter]').getByRole('link', { name: 'Carry on', exact: true })).toBeVisible();
  // Closed, the next case in the casebook is the one that is open.
  await page.evaluate(() => localStorage.setItem('gazecraft-chapters', JSON.stringify({ 'the-long-spoon': { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3 } })));
  await page.goto('/play');
  await expect(page.locator('[data-chapter="the-open-box"]').getByRole('link', { name: 'Open the brief' })).toHaveAttribute('href', '/case/the-open-box');
  await page.evaluate(() => {
    const all = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3 };
    localStorage.setItem('gazecraft-chapters', JSON.stringify({ 'the-long-spoon': all, 'the-open-box': all, 'the-early-bus': all, 'the-year-that-is-missing': all, 'the-2-signs': all }));
  });
  await page.goto('/play');
  await expect(page.locator('[data-chapter]')).toHaveCount(0);
  await page.goto('/');
  await expect(page.getByRole('link', { name: /your (first )?case/ })).toHaveCount(0);
});

// Cases 2 and 3 (SPEC section 6, Which account fits, Could it be done). A case opens when the one before is closed.

const ALL = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3 };

async function seedCases(page: Page, kept: Record<string, Record<number, number>>) {
  await page.addInitScript((k) => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', '1');
    localStorage.setItem('gazecraft-chapters', JSON.stringify(k));
  }, kept);
}

test('the next case is not open until the one before it is closed', async ({ page }) => {
  await page.goto('/case/the-open-box');
  await expect(page.locator('[data-brief="locked"]')).toBeVisible();
  await page.getByRole('link', { name: 'Open the case before it' }).click();
  await expect(page).toHaveURL(/\/case\/the-long-spoon$/);
});

test('which account fits: a wrong pick shows what strikes it out, and the right one closes the case', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await seedCases(page, { 'the-long-spoon': ALL, 'the-open-box': { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 } });
  await page.goto('/case/the-open-box/6');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Which account fits?');
  await expect(page.locator('[data-tries]')).toHaveAttribute('data-tries', '2');
  // 3 files, 1 open at a time. The first is open.
  await expect(page.getByRole('tabpanel')).toContainText('take votes out');
  await page.getByRole('button', { name: 'This one stands' }).click();
  await expect(page.locator('[data-account="0"]')).toHaveAttribute('data-state', 'struck');
  await expect(page.locator('[data-struck-by]')).toContainText('41 names, 41 cards');
  await expect(page.getByRole('button', { name: 'This one stands' })).toBeDisabled();
  await page.getByRole('tab', { name: 'Account 3' }).click();
  await expect(page.getByRole('tabpanel')).toContainText('The wedding ran late.');
  await page.getByRole('button', { name: 'This one stands' }).click();
  await expect(page.locator('[data-account="2"]')).toHaveAttribute('data-state', 'stands');
  await expect(page.locator('[data-account="1"]')).toHaveAttribute('data-state', 'struck');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.getByRole('button', { name: 'See how it ends' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Case closed');
  await expect(page.locator('[data-found]')).toBeInViewport();
  await expect(page.locator('[data-found]')).toContainText('Nothing was taken.');
  await expect(page.getByRole('img', { name: '2 of 3 stars' })).toBeVisible();
  // The ending is read a card at a time, and the way out is on the last.
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.locator('[data-confession]')).toBeInViewport();
  await expect(page.locator('[data-found]')).not.toBeInViewport();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.locator('[data-after]')).toBeInViewport();
  await expect(page.getByRole('link', { name: 'Back to cases' })).toHaveAttribute('href', '/play');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  // Closed stays closed, and the brief leads to its ending.
  await page.goto('/case/the-open-box');
  await page.getByRole('link', { name: 'See the ending' }).click();
  await expect(page.locator('[data-ending="the-open-box"]')).toBeVisible();
});

test('could it be done: the fact that decides and the verdict end the step on its lead', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await seedCases(page, { 'the-long-spoon': ALL, 'the-open-box': ALL, 'the-early-bus': { 1: 3, 2: 3, 3: 3 } });
  await page.goto('/case/the-early-bus');
  await expect(page.locator('[data-case-board]')).toHaveAttribute('data-suspects', '1');
  await page.getByRole('main').getByRole('link', { name: 'Carry on', exact: true }).click();
  await expect(page).toHaveURL(/\/case\/the-early-bus\/4$/);
  await expect(page.locator('[data-claim-says]')).toContainText('Nobody gets to that clock and back in 4.');
  await expect(page.getByRole('button', { name: 'Say so' })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.getByRole('button', { name: /60 paces/ }).click();
  await page.getByRole('radio', { name: 'Could be done' }).click();
  await page.getByRole('button', { name: 'Say so' }).click();
  await expect(page.locator('[data-fact]')).toContainText('It could be done.');
  await expect(page.locator('[data-proof="chance"]')).toHaveAttribute('data-state', 'new');
  await expect(page.getByRole('img', { name: '3 of 3 stars' })).toBeVisible();
  await page.getByRole('link', { name: 'Go to the cab' }).click();
  await expect(page).toHaveURL(/\/case\/the-early-bus\/5$/);
});

// Case 4, the casebook, cold cases and the interlude (SPEC section 6).

test('the trail: each find is pinned to a place, and the walk ends on its lead', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await seedCases(page, { 'the-long-spoon': ALL, 'the-open-box': ALL, 'the-early-bus': ALL, 'the-year-that-is-missing': { 1: 3, 2: 3, 3: 3, 4: 3 } });
  await page.goto('/case/the-year-that-is-missing/5');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The library door');
  await expect(page.locator('[data-stop]')).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  // 4 finds, 1 pick each. Wrong places cost a star and never the lead.
  for (let i = 0; i < 4; i++) await page.locator('[data-stop="0"] button').click();
  await expect(page.locator('[data-trail="done"]')).toBeVisible();
  await expect(page.locator('[data-lead]')).toContainText('3 accounts are going round.');
  await expect(page.getByRole('link', { name: 'Weigh the accounts' })).toHaveAttribute('href', '/case/the-year-that-is-missing/6');
});

test('Cases is the casebook: closed files fold, the open one leads in, and practice is at the foot', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await seedCases(page, { 'the-long-spoon': ALL, 'the-open-box': { 1: 3 } });
  await page.goto('/play');
  await expect(page.getByRole('heading', { level: 2, name: 'Lantern Row' })).toBeVisible();
  await expect(page.locator('[data-file="the-long-spoon"]')).toHaveAttribute('data-state', 'closed');
  await expect(page.locator('[data-file][data-state="locked"]')).toHaveCount(3);
  await expect(page.locator('[data-next-file]')).toContainText('Case 5');
  await expect(page.getByRole('heading', { level: 2, name: 'Practice' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  // A closed case can be worked cold: its own stars, an empty board, and no tip-off.
  await page.locator('[data-file="the-long-spoon"] [data-cold]').click();
  await expect(page).toHaveURL(/\/cold\/the-long-spoon$/);
  await expect(page.locator('[data-case-board] [data-find]')).toHaveCount(0);
  await page.getByRole('link', { name: 'Go to the store room' }).click();
  await expect(page).toHaveURL(/\/cold\/the-long-spoon\/1$/);
  await expect(page.locator('[data-mobile-bar]').getByRole('button', { name: 'Tip-off' })).toHaveCount(0);
  await expect(page.locator('[data-mobile-bar]').getByRole('button', { name: 'Done' })).toBeVisible();
});

test('the interlude opens once case 4 is closed, and is 1 board', async ({ page }) => {
  await seedCases(page, { 'the-long-spoon': ALL, 'the-open-box': ALL, 'the-early-bus': ALL, 'the-year-that-is-missing': ALL });
  await page.goto('/play');
  await page.getByRole('link', { name: 'The bookmark' }).click();
  await expect(page).toHaveURL(/\/interlude\/the-bookmark$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The bookmark');
  await page.getByRole('button', { name: "I'm done" }).click();
  await expect(page.locator('[data-fact]')).toContainText('Hall. Glow. Key. Dark.');
  await page.getByRole('link', { name: 'Back to cases' }).click();
  await expect(page.locator('[data-interlude]')).toHaveAttribute('data-state', 'read');
});

test('the missing step: the thing that fits fills the gap', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await seedCases(page, { 'the-long-spoon': ALL, 'the-open-box': ALL, 'the-early-bus': ALL, 'the-year-that-is-missing': ALL, 'the-2-signs': { 1: 3, 2: 3 } });
  await page.goto('/case/the-2-signs/3');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("The watchman's hut");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.locator('[data-option="0"]').click();
  await expect(page.locator('[data-tries]')).toHaveAttribute('data-tries', '1');
  await page.locator('[data-option="1"]').click();
  await expect(page.locator('[data-gap="filled"]')).toContainText('Both signs are painted over');
  await expect(page.getByRole('img', { name: '2 of 3 stars' })).toBeVisible();
  await page.getByRole('link', { name: 'Go to the pot store' }).click();
  await expect(page).toHaveURL(/\/case\/the-2-signs\/4$/);
});
