import { expect, test, type Page } from '@playwright/test';

// Runs against the local Supabase stack (`npm run db:start`). The app build reads
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from .env.local. Codes come from the local mail catcher.

const MAIL = 'http://127.0.0.1:54324';
const API = 'http://127.0.0.1:54321';

async function stackUp(): Promise<boolean> {
  try {
    const r = await fetch(`${API}/auth/v1/health`, { signal: AbortSignal.timeout(3000) });
    return r.status < 500;
  } catch {
    return false;
  }
}

test.beforeAll(async () => {
  test.skip(!(await stackUp()), 'Local Supabase is not running');
});

const uid = () => Math.random().toString(36).slice(2, 10);

async function latestCode(email: string): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    if (res.ok) {
      const body = (await res.json()) as { messages?: Array<{ ID: string }> };
      const id = body.messages?.[0]?.ID;
      if (id) {
        const msg = (await (await fetch(`${MAIL}/api/v1/message/${id}`)).json()) as { Text?: string; HTML?: string };
        const m = `${msg.Text ?? ''} ${msg.HTML ?? ''}`.match(/\b(\d{6})\b/);
        if (m) return m[1]!;
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No code arrived for ${email}`);
}

async function signIn(page: Page, email: string, next = '') {
  await page.goto(`/signin${next ? `?next=${encodeURIComponent(next)}` : ''}`);
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await expect(page.getByRole('heading', { name: 'Check your inbox.' })).toBeVisible();
  const code = await latestCode(email);
  await page.getByLabel('Code').fill(code);
}

async function createProfile(page: Page, name: string, handle: string) {
  await expect(page.getByRole('heading', { name: /What should\s*we call you\?/ })).toBeVisible();
  await page.getByLabel('Name').fill(name);
  await expect(page.getByLabel('Handle')).toHaveValue(name.split(' ')[0]!.toLowerCase());
  await page.getByLabel('Handle').fill(handle);
  await page.getByRole('button', { name: 'Start finding' }).click();
}

test('email code sign in, profile page, settings, sign out', async ({ page }) => {
  const email = `e2e-${uid()}@test.fignda.local`;
  const handle = `ada_${uid()}`;
  await signIn(page, email, '/play/bible');
  await createProfile(page, 'Ada Obi', handle);

  await expect(page).toHaveURL(/\/play\/bible$/);
  await expect(page.getByRole('link', { name: /Ada/ }).first()).toBeVisible();

  // Old /account links open your public profile.
  await page.goto('/account');
  await expect(page).toHaveURL(new RegExp(`/u/${handle}$`));
  await expect(page.getByRole('heading', { name: 'Ada Obi' })).toBeVisible();
  await expect(page.getByText(new RegExp(`@${handle} · Playing since`))).toBeVisible();
  // The profile never shows the email; settings shows it to its owner.
  await expect(page.getByText(email)).toHaveCount(0);
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByText(email)).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
});

test('a wrong code is refused', async ({ page }) => {
  const email = `e2e-${uid()}@test.fignda.local`;
  await page.goto('/signin');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await latestCode(email);
  await page.getByLabel('Code').fill('000000');
  await expect(page.getByRole('alert')).toHaveText('That code did not work. Check it or send a new one.');
  await expect(page.getByText(/Send a new code in \d+s/)).toBeVisible();
});

test('a bad email is caught before sending', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel('Email').fill('not-an-email');
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await expect(page.getByRole('alert')).toHaveText('That email looks off. Check it and try again.');
});

test('next cannot redirect off site', async ({ page }) => {
  const email = `e2e-${uid()}@test.fignda.local`;
  await signIn(page, email, '//evil.example');
  await createProfile(page, 'Eve', `eve_${uid()}`);
  await expect(page).toHaveURL(/\/play$/);
});

test('handle rules and a taken handle', async ({ page, browser }) => {
  const taken = `tk_${uid()}`;
  const first = await browser.newPage();
  await signIn(first, `e2e-${uid()}@test.fignda.local`);
  await createProfile(first, 'Tolu', taken);
  await expect(first).toHaveURL(/\/play$/);
  await first.close();

  await signIn(page, `e2e-${uid()}@test.fignda.local`);
  await expect(page.getByRole('heading', { name: /What should/ })).toBeVisible();
  await page.getByLabel('Name').fill('Tolu');
  for (const [h, msg] of [
    ['a', 'Handles need at least 2 letters or numbers.'],
    ['bad handle', 'Handles use a to z, 0 to 9, dots and underscores. Up to 20.'],
    ['admin', 'That handle is taken. Try another.'],
    [taken, 'That handle is taken. Try another.'],
  ] as const) {
    await page.getByLabel('Handle').fill(h);
    await page.getByRole('button', { name: 'Start finding' }).click();
    await expect(page.getByRole('alert')).toHaveText(msg);
  }
});

test('guest dailies merge into the account on sign in', async ({ page }) => {
  await page.goto('/');
  const yesterday = await page.evaluate(() => {
    const d = new Date();
    const n = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(2026, 0, 1)) / 864e5);
    const start = Date.now() - 120_000;
    localStorage.setItem(
      `fignda-daily-${n}`,
      JSON.stringify({ found: [], hinted: [], hints: 0, misses: 0, hintLi: -1, streak: 0, lastFindAt: null, startAt: start, endAt: start + 60_000, resultTitle: 'Next time.' }),
    );
    return n;
  });
  expect(yesterday).toBeGreaterThan(0);

  await signIn(page, `e2e-${uid()}@test.fignda.local`, '/account');
  await createProfile(page, 'Gbenga', `gb_${uid()}`);
  await expect(page).toHaveURL(/\/u\/gb_/);

  // Survives a wipe of this browser: the play now lives on the server.
  await page.evaluate(() => localStorage.removeItem(Object.keys(localStorage).find((k) => k.startsWith('fignda-daily-'))!));
  await page.reload();
  const played = page.getByText('Dailies', { exact: true }).locator('..');
  await expect(played).toContainText('1');
});

test('edit name, then delete the account', async ({ page }) => {
  const email = `e2e-${uid()}@test.fignda.local`;
  await signIn(page, email, '/account');
  await createProfile(page, 'Kemi', `km_${uid()}`);
  await expect(page).toHaveURL(/\/u\/km_/);

  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByLabel('Name')).toHaveValue('Kemi');
  await page.getByLabel('Name').fill('Kemi Ade');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toBeVisible();
  await page.getByRole('link', { name: 'View your profile' }).click();
  await expect(page.getByRole('heading', { name: 'Kemi Ade' })).toBeVisible();
  await page.getByRole('link', { name: 'Settings' }).click();

  // Esc closes the confirm without deleting.
  await page.getByRole('button', { name: 'Delete account' }).click();
  await expect(page.getByRole('dialog', { name: 'Delete account' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.getByRole('button', { name: 'Delete account' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete account' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();

  // Same email again is a brand new account.
  await signIn(page, email);
  await expect(page.getByRole('heading', { name: /What should/ })).toBeVisible();
});
