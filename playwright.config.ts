import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Vite gives .env.production priority over .env.local in builds, which would point these tests at the real
// project. Refuse to run rather than touch production.
if (existsSync('.env.production') || existsSync('.env.production.local')) {
  throw new Error('Remove .env.production: e2e must build against the local Supabase stack (.env.local).');
}

const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    env: { VITE_E2E: '1' },
    timeout: 120_000,
  },
});
