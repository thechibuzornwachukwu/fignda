import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Most tests run in plain Node. The few that need a page say so with `// @vitest-environment jsdom`.
const hasDom = typeof document !== 'undefined';

afterEach(() => {
  if (!hasDom) return;
  cleanup();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

// jsdom has no matchMedia.
if (hasDom && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
