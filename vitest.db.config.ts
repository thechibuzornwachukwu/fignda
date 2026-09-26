import { defineConfig } from 'vitest/config';

// Database security suite. Needs the local stack: `npm run db:start` then `npm run db:reset`.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['supabase/tests/**/*.test.ts', 'worker/test/**/*.db.test.ts'],
    globalSetup: ['supabase/tests/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
