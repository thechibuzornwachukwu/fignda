// Pre-renders link preview images (1200x630) into public/og/. Run after games change: npm run og:render
//   og/default.png           home and anything without its own preview
//   og/<game>.png            /play/<game>
//   og/daily-<game>.png      /d/<n> (no count, no answers)
// Custom puzzles (/p/<code>) use the default image.

import { spawn, execSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const PORT = 4175;
const { games } = JSON.parse(readFileSync('data/games.json', 'utf8'));

execSync('npx vite build', { stdio: 'inherit', env: { ...process.env, VITE_E2E: '1' } });
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { shell: true, stdio: 'ignore' });

try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`http://localhost:${PORT}/`)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  mkdirSync('public/og', { recursive: true });
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const shots = [['default', ''], ...games.flatMap((g) => [[g.id, `game=${g.id}`], [`daily-${g.id}`, `game=${g.id}&daily=1`]])];
  for (const [name, q] of shots) {
    await page.goto(`http://localhost:${PORT}/__og?${q}`);
    const og = page.locator('[data-og]');
    await og.waitFor();
    await page.evaluate(() => document.fonts.ready);
    await og.screenshot({ path: `public/og/${name}.png` });
  }
  await b.close();
  console.log(`Rendered ${shots.length} previews into public/og/.`);
} finally {
  server.kill();
  if (process.platform === 'win32') {
    try {
      execSync(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${PORT} ^| findstr LISTENING') do taskkill /F /PID %a`, { stdio: 'ignore', shell: 'cmd.exe' });
    } catch {}
  }
}
