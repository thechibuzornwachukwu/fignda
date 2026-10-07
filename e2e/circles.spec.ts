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
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Your character' })).toBeVisible();
  const save = page.getByRole('button', { name: 'Keep this look' });
  const tab = (name: string) => page.getByRole('tab', { name, exact: true });
  // One category shows at a time; the first is Skin.
  await expect(tab('Skin')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: /^Skin: / })).toHaveCount(6);
  await expect(page.getByRole('button', { name: /^Hair and headwear: / })).toHaveCount(0);
  await tab('Hair and headwear').click();
  await page.getByRole('button', { name: 'Hair and headwear: Gele' }).click();
  await tab('Outfit').click();
  await page.getByRole('button', { name: 'Outfit: Agbada' }).click();
  await tab('Skin marks').click();
  await page.getByRole('button', { name: 'Skin marks: Tribal marks', exact: true }).click();
  // Arrow keys move between tabs.
  await tab('Skin marks').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(tab('Facial hair')).toHaveAttribute('aria-selected', 'true');
  await tab('Hair and headwear').click();
  await expect(page.getByRole('button', { name: 'Hair and headwear: Gele' })).toHaveAttribute('aria-pressed', 'true');
  await save.click();
  await expect(page.getByText('Saved. This is you on every board.')).toBeVisible();
  await expect(save).toBeDisabled();

  // Saved for real: a reload keeps the choices, and the profile shows a drawn character.
  await page.reload();
  await page.getByRole('tab', { name: 'Hair and headwear' }).click();
  await expect(page.getByRole('button', { name: 'Hair and headwear: Gele' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('tab', { name: 'Outfit' }).click();
  await expect(page.getByRole('button', { name: 'Outfit: Agbada' })).toHaveAttribute('aria-pressed', 'true');
  await page.goto(`/u/${handle}`);
  await expect(page.locator('main svg[viewBox="-7 -2 110 110"]').first()).toBeVisible();
  // The gele fabric colour is on the page: the saved design is what is drawn.
  await expect(page.locator('main svg path[fill="#b0336f"]').first()).toBeAttached();

  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);
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
  expect(lines[0]).toBe('Fignda · The classic');
  expect(lines[1]).toMatch(/^1\/30 · \d+:\d\d · [\d,]+$/);
  expect(lines[2]).toBe('🟩⬜');
  expect(lines[3]).toMatch(/^Beat it: http.*\/play\/bible$/);
  expect(text).not.toMatch(/amos/i);
});

test.describe('designer on a phone', () => {
  test.use({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true });

  test('the preview stays on screen while picking from the longest list, and nothing overflows sideways', async ({ page }) => {
    await newPlayer(page, 'Efe');
    await page.goto('/settings');
    await page.getByRole('tab', { name: 'Hair and headwear' }).tap();
    const panel = page.getByRole('tabpanel');
    const preview = page.locator('svg[width="120"]');
    // As a player would have it: the designer at the top of the screen.
    await preview.evaluate((el) => el.scrollIntoView({ block: "start" }));
    // Scroll to the last hairstyle inside the panel: the page itself does not move, the preview stays.
    const before = await page.evaluate(() => window.scrollY);
    await panel.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await page.getByRole('button', { name: 'Hair and headwear: Durag' }).tap();
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThanOrEqual(60);
    await expect(preview).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Hair and headwear: Durag' })).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    // Every tab is a full size touch target.
    for (const h of await page.getByRole('tab').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(44);
  });
});
