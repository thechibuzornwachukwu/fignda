/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // No data: URIs: fonts and images ship as files so the CSP can keep font-src 'self' (design/SECURITY.md).
  build: { assetsInlineLimit: 0 },
  // /api goes to the Worker (`npm run worker:dev`) in development and preview.
  // Its own ports, so it can run beside the puzzle game. The Worker answers on 8788.
  server: { port: 5174, proxy: { '/api': 'http://127.0.0.1:8788' } },
  preview: { port: 4174, proxy: { '/api': 'http://127.0.0.1:8788' } },
  css: {
    modules: { localsConvention: 'camelCaseOnly' },
  },
  test: {
    // Plain Node by default: starting a browser-like page for every file took most of the run and made
    // workers time out on a busy machine. A test that needs a page starts with `// @vitest-environment jsdom`.
    environment: 'node',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
    // Two workers: fits next to Docker on low-memory machines without start-up timeouts.
    maxWorkers: 2,
    include: ['src/**/*.test.{ts,tsx}', 'worker/test/**/*.unit.test.ts'],
  },
});
