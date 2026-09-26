/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // No data: URIs: fonts and images ship as files so the CSP can keep font-src 'self' (design/SECURITY.md).
  build: { assetsInlineLimit: 0 },
  // /api goes to the Worker (`npm run worker:dev`) in development and preview.
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
  preview: { proxy: { '/api': 'http://127.0.0.1:8787' } },
  css: {
    modules: { localsConvention: 'camelCaseOnly' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
    // Two workers: fits next to Docker on low-memory machines without start-up timeouts.
    maxWorkers: 2,
    include: ['src/**/*.test.{ts,tsx}', 'worker/test/**/*.unit.test.ts'],
  },
});
