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

/** Sign up a fresh player and land on /play. Returns their handle. */
export async function newPlayer(page: Page, name: string): Promise<string> {
  const email = `e2e-${uid()}@test.fignda.local`;
  const handle = `${name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 8)}_${uid()}`;
  await page.goto('/signin');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await page.getByLabel('Code').fill(await latestCode(email));
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Handle').fill(handle);
  await page.getByRole('button', { name: 'Start finding' }).click();
  await expect(page).toHaveURL(/\/play$/);
  return handle;
}
