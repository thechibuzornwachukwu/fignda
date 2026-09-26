// Theme boot. Loaded as a blocking script in <head> so the theme is set before first paint (no flash).
// External file, not inline, so the Content-Security-Policy can forbid inline scripts. Keep in sync with src/lib/theme.ts.
(() => {
  let t = null;
  try {
    t = localStorage.getItem('fignda-theme');
  } catch {
    // Storage blocked: fall back to the system setting.
  }
  if (t !== 'light' && t !== 'dark') t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
})();
