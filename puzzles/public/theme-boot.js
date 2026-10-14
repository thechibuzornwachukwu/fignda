// Theme boot. Loaded as a blocking script in <head> so the theme is set before first paint (no flash).
// External file, not inline, so the Content-Security-Policy can forbid inline scripts. Keep in sync with src/lib/theme.ts.
(() => {
  let t = null;
  try {
    // The game was called Fignda. Carry what this browser saved under the old name across, once.
    for (const k of Object.keys(localStorage)) {
      const m = k.match(/^fignda([-:].*)$/);
      if (!m) continue;
      if (localStorage.getItem('gazecraft' + m[1]) === null) localStorage.setItem('gazecraft' + m[1], localStorage.getItem(k));
      localStorage.removeItem(k);
    }
    t = localStorage.getItem('gazecraft-theme');
  } catch {
    // Storage blocked: fall back to the system setting.
  }
  if (t !== 'light' && t !== 'dark') t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
})();
