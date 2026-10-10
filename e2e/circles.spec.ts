import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { newPlayer } from './helpers';

test('start a circle, invite a friend, see who has played', async ({ page, browser }) => {
  await newPlayer(page, 'Ada');
  await page.goto('/circles');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Circles.');
  await expect(page.getByText('You are not in a circle yet.')).toBeVisible();
  await page.getByLabel('Circle name').fill('Obi family');
  await page.getByRole('button', { name: 'Start circle' }).click();
  await expect(page).toHaveURL(/\/c\/[A-HJ-NP-Z2-9]{6}$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Obi family.');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('1 player.');
  const table = page.getByRole('list', { name: 'Today in this circle' });
  await expect(table.getByRole('listitem')).toHaveCount(1);
  await expect(table).toContainText('Not yet');
  const link = page.url();

  // A guest sees the invite, not the table.
  const guest = await browser.newPage();
  await guest.goto(link);
  await expect(guest.getByRole('heading', { level: 1 })).toContainText('Obi family.');
  await expect(guest.getByRole('link', { name: 'Sign in to join' })).toBeVisible();
  await expect(guest.getByRole('list', { name: 'Today in this circle' })).toHaveCount(0);
  await guest.close();

  // A friend joins from the link.
  const friend = await browser.newPage();
  await newPlayer(friend, 'Bisi');
  await friend.goto(link);
  await friend.getByRole('button', { name: 'Join Obi family' }).click();
  await expect(friend.getByRole('list', { name: 'Today in this circle' }).getByRole('listitem')).toHaveCount(2);
  await expect(friend.getByRole('heading', { level: 1 })).toContainText('2 players.');
  await friend.getByRole('radio', { name: '7 days' }).click();
  await expect(friend.getByRole('list', { name: 'Last 7 dailies in this circle' }).getByRole('listitem')).toHaveCount(2);

  // The owner sees them, and the circle is listed.
  await page.reload();
  await expect(table.getByRole('listitem')).toHaveCount(2);
  await expect(table.getByRole('button', { name: 'Remove Bisi' })).toBeVisible();
  await page.goto('/circles');
  await expect(page.getByRole('link', { name: /Obi family\s*2 players · You started it/ })).toBeVisible();

  // The friend leaves; the owner is alone again.
  await friend.getByRole('button', { name: 'Leave this circle' }).click();
  await expect(friend).toHaveURL(/\/circles$/);
  await friend.close();
});

test('circle names are checked, and a bad code goes home', async ({ page }) => {
  await newPlayer(page, 'Cy');
  await page.goto('/circles');
  await page.getByLabel('Circle name').fill('x');
  await page.getByRole('button', { name: 'Start circle' }).click();
  await expect(page.getByRole('alert')).toHaveText('Use 2 to 40 letters for the name.');
  await page.goto('/c/ZZZZZZ');
  await expect(page).toHaveURL(/\/circles$/);
});

test('circles page: guests are asked to sign in, and it is accessible', async ({ page }) => {
  await page.goto('/circles');
  await expect(page.getByRole('link', { name: 'Sign in' }).last()).toHaveAttribute('href', '/signin?next=%2Fcircles');
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);
});

test('design your character: pick parts, save, and it shows as you', async ({ page }) => {
  const handle = await newPlayer(page, 'Dayo');
  await page.goto('/me');
  await expect(page.getByRole('region', { name: 'Your detective and your partner' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit character' }).click();
  const editor = page.getByRole('dialog', { name: 'Edit your character' });
  const tab = (name: string) => editor.getByRole('tab', { name, exact: true });
  const pick = (name: string) => editor.getByRole('button', { name, exact: true });
  const save = editor.getByRole('button', { name: 'Keep this look' });

  // Four icon tabs. Face opens first; colours are dots, and only this tab's parts show.
  await expect(editor.getByRole('tab')).toHaveText(['Face', 'Hair', 'Wear', 'Scene']);
  await expect(tab('Face')).toHaveAttribute('aria-selected', 'true');
  await expect(editor.getByRole('button', { name: /^Skin: / })).toHaveCount(6);
  await expect(editor.getByRole('button', { name: /^Hair and headwear: / })).toHaveCount(0);
  await pick('Skin marks: Tribal marks').click();
  // A mood sets the eyes and the mouth together.
  await pick('Mood: Lovestruck').click();
  await expect(pick('Eyes: Heart eyes')).toHaveAttribute('aria-pressed', 'true');
  await expect(pick('Mouth: Smile')).toHaveAttribute('aria-pressed', 'true');
  await expect(pick('Mood: Lovestruck')).toHaveAttribute('aria-pressed', 'true');

  // Hair comes in families, so nobody wades through all 41 at once.
  await tab('Hair').click();
  await editor.getByRole('button', { name: 'Headwear', exact: true }).click();
  await expect(editor.getByRole('button', { name: /^Hair and headwear: / })).toHaveCount(6);
  await pick('Hair and headwear: Gele').click();
  await expect(editor.getByRole('region', { name: 'Hair and headwear' })).toContainText('Gele');
  await tab('Wear').click();
  await pick('Outfit: Buba and beads').click();
  await tab('Scene').click();
  await pick('Festive: Santa hat').click();
  await tab('Wear').click();
  // Arrow keys move between tabs.
  await tab('Wear').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(tab('Hair')).toHaveAttribute('aria-selected', 'true');
  // Hair opens on the family of the chosen style.
  await expect(editor.getByRole('button', { name: 'Headwear', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(pick('Hair and headwear: Gele')).toHaveAttribute('aria-pressed', 'true');

  // Surprise me keeps the person: the tribal marks and bare face stay, and Undo brings the exact design back.
  await expect(editor.getByRole('button', { name: 'Undo' })).toBeDisabled();
  await editor.getByRole('button', { name: 'Surprise me' }).click();
  await tab('Face').click();
  await expect(pick('Skin marks: Tribal marks')).toHaveAttribute('aria-pressed', 'true');
  await expect(pick('Facial hair: None')).toHaveAttribute('aria-pressed', 'true');
  await editor.getByRole('button', { name: 'Undo' }).click();
  await expect(editor.getByRole('button', { name: 'Undo' })).toBeDisabled();
  await tab('Hair').click();
  await expect(pick('Hair and headwear: Gele')).toHaveAttribute('aria-pressed', 'true');

  await expect(editor.getByText('Not saved yet.')).toBeVisible();
  await save.click();
  await expect(editor.getByText('Saved. This is you on every board.')).toBeVisible();
  await expect(save).toBeDisabled();
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);
  await editor.getByRole('button', { name: 'Done' }).click();
  await expect(editor).toBeHidden();

  // Saved for real: a reload keeps the choices, and the profile draws the saved design.
  await page.reload();
  await page.getByRole('button', { name: 'Edit character' }).click();
  await tab('Hair').click();
  await expect(pick('Hair and headwear: Gele')).toHaveAttribute('aria-pressed', 'true');
  await tab('Wear').click();
  await expect(pick('Outfit: Buba and beads')).toHaveAttribute('aria-pressed', 'true');
  await tab('Scene').click();
  await expect(pick('Festive: Santa hat')).toHaveAttribute('aria-pressed', 'true');
  await tab('Face').click();
  await expect(pick('Mood: Lovestruck')).toHaveAttribute('aria-pressed', 'true');
  await tab('Wear').click();
  // Cancel throws away what was not kept.
  await pick('Outfit: Suit').click();
  await editor.getByRole('button', { name: 'Cancel' }).click();
  await page.goto(`/u/${handle}`);
  await expect(page.locator('main svg[viewBox="-7 -2 110 110"]').first()).toBeVisible();
  // The gele fabric colour is on the page: the saved design is what is drawn.
  await expect(page.locator('main svg path[fill="#b0336f"]').first()).toBeAttached();
});

test('detective pieces are earned: locked until a case is closed, then they can be worn and saved', async ({ page }) => {
  await newPlayer(page, 'Sola');
  await page.goto('/me');
  await page.getByRole('button', { name: 'Edit character' }).click();
  const editor = page.getByRole('dialog', { name: 'Edit your character' });
  await editor.getByRole('tab', { name: 'Wear', exact: true }).click();

  // In sight, and not for choosing. Each says how it is earned.
  const badge = editor.getByRole('button', { name: /^Detective kit: Badge/ });
  await expect(badge).toHaveAccessibleName('Detective kit: Badge. Locked. Close 1 case.');
  await expect(badge).toHaveAttribute('aria-disabled', 'true');
  await expect(editor.getByRole('button', { name: 'Detective kit: Detective hat. Locked. Reach the rank of Detective.' })).toBeVisible();
  await expect(editor.getByRole('button', { name: 'Outfit: Detective coat. Locked. Reach the rank of Inspector.' })).toBeVisible();
  await expect(editor.locator('[data-locked]')).toHaveCount(5);
  await badge.click({ force: true });
  await expect(editor.getByRole('region', { name: 'Detective kit' })).toContainText('None');
  // Everything else stays free.
  await expect(editor.getByRole('button', { name: 'Outfit: Agbada', exact: true })).not.toHaveAttribute('aria-disabled', 'true');

  // A case closed in this browser earns the badge.
  await page.evaluate(() => localStorage.setItem('gazecraft-finished', JSON.stringify(['bnote'])));
  await page.reload();
  await page.getByRole('button', { name: 'Edit character' }).click();
  await editor.getByRole('tab', { name: 'Wear', exact: true }).click();
  const earned = editor.getByRole('button', { name: 'Detective kit: Badge', exact: true });
  await expect(earned).not.toHaveAttribute('aria-disabled', 'true');
  await expect(editor.locator('[data-locked]')).toHaveCount(4);
  await earned.click();
  await expect(earned).toHaveAttribute('aria-pressed', 'true');
  await expect(editor.getByRole('region', { name: 'Detective kit' })).toContainText('Badge');
});

test('partners: a guest picks one on the first screen, it shows at the end of a game, and Settings shows who is held', async ({ page }) => {
  await page.goto('/welcome');
  const pick = page.getByRole('group', { name: /your partner/i });
  await expect(pick.getByRole('button')).toHaveText(['Detective X', 'Detective Tobs', 'Detective Puff']);
  // Left alone, it is Detective X.
  await expect(pick.getByRole('button', { name: 'Detective X' })).toHaveAttribute('aria-pressed', 'true');
  await pick.getByRole('button', { name: 'Detective Puff' }).click();
  await expect(pick.getByRole('button', { name: 'Detective Puff' })).toHaveAttribute('aria-pressed', 'true');
  await expect(pick.getByRole('button', { name: 'Detective X' })).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gazecraft-partner')!).current)).toBe('dog');
  for (const img of await pick.locator('img').all()) expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);

  // The partner is there when a game ends, in a picture that loads.
  await page.goto('/play/bnote');
  await page.getByRole('button', { name: "I'm done" }).click();
  const there = page.locator('[aria-labelledby="results-title"] img[data-partner="dog"]');
  await expect(there).toHaveAttribute('data-moment', 'done');
  expect(await there.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
});

test('You is a stage: tap a partner or a piece of gear to try it, and one button chooses it', async ({ page }) => {
  await newPlayer(page, 'Tari');
  await page.goto('/me');
  const stage = page.getByRole('region', { name: 'Your detective and your partner' });
  await expect(stage).toContainText('Tari');
  await expect(stage).toContainText('Detective X');
  await expect(stage.locator('[data-stage-line]')).toHaveText('Detective X is with you.');

  // A locked partner can be tried on the stage, and says what opens it.
  const partners = page.getByRole('region', { name: 'Partners' });
  await expect(partners.getByRole('button')).toHaveCount(3);
  await partners.getByRole('button', { name: 'Detective Tobs. Locked. 3,000 points.' }).click();
  await expect(stage).toContainText('Detective Tobs');
  await expect(stage.locator('img[data-partner="dino"]')).toBeVisible();
  await expect(stage.locator('[data-stage-line]')).toHaveText('Locked. 3,000 points to go.');
  await expect(stage.getByRole('button', { name: /^Select / })).toHaveCount(0);

  // Gear: locked pieces say how they are earned. A case closed here opens the badge, and one button wears it.
  const gear = page.getByRole('region', { name: 'Detective gear' });
  await expect(gear.getByRole('button')).toHaveCount(6);
  await gear.getByRole('button', { name: 'Badge. Locked. Close 1 case.' }).click();
  await expect(stage.locator('[data-stage-line]')).toHaveText('Locked. Close 1 case.');
  await page.evaluate(() => localStorage.setItem('gazecraft-finished', JSON.stringify(['bnote'])));
  await page.reload();
  await gear.getByRole('button', { name: 'Badge. Yours.' }).click();
  await stage.getByRole('button', { name: 'Wear the badge' }).click();
  await expect(gear.getByRole('button', { name: 'Badge. On you.' })).toBeVisible();
  await expect(stage.locator('[data-stage-line]')).toHaveText('Detective X is with you.');

  // No sideways scroll on a phone: the rows swipe, the page does not.
  await page.setViewportSize({ width: 360, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator('body')).not.toContainText(/robo/i);
  // Settings no longer holds any of this: it points here.
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Your character' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'You', exact: true }).first()).toBeVisible();
});

test('a guest plays 2 games, then is asked to sign in, and what they played stays open', async ({ page }) => {
  await page.goto('/play/bnote/1');
  await page.getByRole('button', { name: "I'm done" }).click();
  await page.goto('/play/bnote/2');
  await page.getByRole('button', { name: "I'm done" }).click();
  // The result of the 2nd game is theirs to read.
  await expect(page.locator('[aria-labelledby="results-title"]')).toBeVisible();
  // A 3rd game asks them to sign in.
  await page.goto('/play/bnote');
  const wall = page.locator('[data-guest-wall]');
  await expect(wall.getByRole('heading', { level: 1, name: 'Sign in to keep playing' })).toBeVisible();
  await expect(wall.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/welcome?from=%2Fplay%2Fbnote');
  await expect(page.getByRole('button', { name: "I'm done" })).toHaveCount(0);
  // A game already played opens as before.
  await page.goto('/play/bnote/1');
  await expect(page.locator('[data-guest-wall]')).toHaveCount(0);
  await expect(page.locator('[aria-labelledby="results-title"]')).toBeVisible();
});

test('copy result puts the spoiler free text on the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/play/bible');
  await page.locator('[data-li]').first().waitFor();
  const S = await page.evaluate(() => Array.from(document.querySelectorAll('[data-li]'), (e) => e.textContent).join('').toLowerCase());
  const i = S.indexOf('amost');
  await page.locator(`[data-li="${i}"]`).click();
  await page.locator(`[data-li="${i + 3}"]`).click();
  await expect(page.locator(`[data-li="${i}"]`)).toHaveAttribute('data-state', 'found');
  await page.locator('[data-li="0"]').click();
  await page.locator('[data-li="6"]').click();
  // The range shows for a moment before it is checked: let the miss land.
  await expect(page.locator('[data-li="3"]')).not.toHaveAttribute('data-state', 'selecting');
  await page.getByRole('button', { name: "I'm done" }).first().click();
  await page.getByRole('button', { name: 'Copy result' }).click();
  await expect(page.getByText('Copied. Paste it in your group.')).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  // Windows clipboards hand text back with CRLF line ends.
  const lines = text.split(/\r?\n/);
  expect(lines[0]).toBe('Gazecraft · The classic');
  expect(lines[1]).toMatch(/^1\/30 · \d+:\d\d · [\d,]+$/);
  expect(lines[2]).toBe('🟩⬜');
  expect(lines[3]).toMatch(/^Beat it: http.*\/play\/bible$/);
  expect(text).not.toMatch(/amos/i);
});

test.describe('designer on a phone', () => {
  test.use({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true });

  test('the editor fills the screen, the character never leaves it, and only the choices scroll', async ({ page }) => {
    await newPlayer(page, 'Efe');
    await page.goto('/me');
    await page.getByRole('button', { name: 'Edit character' }).tap();
    const editor = page.getByRole('dialog', { name: 'Edit your character' });
    const hero = editor.locator('svg[width="168"]');
    const pane = editor.getByRole('tabpanel');
    await editor.getByRole('tab', { name: 'Hair' }).tap();
    await editor.getByRole('button', { name: 'Braids and locs', exact: true }).tap();

    const pageAt = await page.evaluate(() => window.scrollY);
    // Scroll the choices to the very end and pick the last part on the tab.
    await pane.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await editor.getByRole('button', { name: 'Hair ties: Headband' }).tap();
    await expect(hero).toBeInViewport();
    await expect(editor.getByRole('button', { name: 'Keep this look' })).toBeInViewport();
    await expect(editor.getByRole('tab', { name: 'Hair' })).toBeInViewport();

    // One scroll area: the page behind did not move, and nothing scrolls sideways anywhere in the editor.
    expect(await page.evaluate(() => window.scrollY)).toBe(pageAt);
    const sideways = await editor.evaluate(
      (el) =>
        [el, ...el.querySelectorAll('*')].filter((n) => {
          const o = getComputedStyle(n).overflowX;
          return n.scrollWidth > n.clientWidth + 1 && o !== 'visible' && o !== 'hidden';
        }).length,
    );
    expect(sideways).toBe(0);
    const scrollers = await editor.evaluate(
      (el) => [...el.querySelectorAll('*')].filter((n) => ['auto', 'scroll'].includes(getComputedStyle(n).overflowY) && n.scrollHeight > n.clientHeight + 1).length,
    );
    expect(scrollers).toBe(1);

    // Touch targets: tabs, family chips, swatches and tiles are all at least 36px.
    await editor.getByRole('tab', { name: 'Face' }).tap();
    const sizes = await editor.evaluate((el) =>
      [...el.querySelectorAll('[role="tab"], button[aria-pressed]')].map((n) => Math.min(n.getBoundingClientRect().width, n.getBoundingClientRect().height)),
    );
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(36);
  });
});
