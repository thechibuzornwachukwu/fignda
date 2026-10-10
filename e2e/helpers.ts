import { expect, type Page } from '@playwright/test';

// Shared sign-in helpers against the local Supabase stack. Codes come from the local mail catcher.
const MAIL = 'http://127.0.0.1:54324';

export const uid = () => Math.random().toString(36).slice(2, 10);

export async function latestCode(email: string): Promise<string> {
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

/** A new player's first minute: skip the character and outfit steps until the name step shows. */
export async function skipToName(page: Page): Promise<void> {
  const nameField = page.getByLabel('Name');
  for (let i = 0; i < 4; i++) {
    await expect(nameField.or(page.getByRole('button', { name: 'Skip' })).first()).toBeVisible();
    if (await nameField.isVisible()) return;
    await page.getByRole('button', { name: 'Skip' }).click();
  }
}

/** The first minute after the code: skip to the name step, give a name, and land on /play. */
export async function finishWelcome(page: Page, name: string, handle: string): Promise<void> {
  const nameField = page.getByLabel('Name');
  await skipToName(page);
  await nameField.fill(name);
  await page.getByLabel('Handle').fill(handle);
  await page.getByRole('button', { name: 'Start finding' }).click();
  // Play first: the flow ends in the next clue (or today's daily). The specs start from the games screen.
  await expect(page).toHaveURL(/\/(d\/\d+|play(\/[a-z0-9-]+(\/\d+)?)?)$/);
  await page.goto('/play');
}

/** Sign up a fresh player and land on /play. Returns their handle. */
export async function newPlayer(page: Page, name: string): Promise<string> {
  const email = `e2e-${uid()}@test.gazecraft.local`;
  const handle = `${name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 8)}_${uid()}`;
  await page.goto('/signin');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await page.getByLabel('Code').fill(await latestCode(email));
  await finishWelcome(page, name, handle);
  return handle;
}
