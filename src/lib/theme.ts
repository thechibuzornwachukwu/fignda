import { storage } from './storage';

export type Theme = 'dark' | 'light';

export const THEME_KEY = 'gazecraft-theme';

const isTheme = (v: unknown): v is Theme => v === 'dark' || v === 'light';

export function storedTheme(): Theme | null {
  const v = storage.get(THEME_KEY);
  return isTheme(v) ? v : null;
}

export function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/** The theme on <html>, set before paint by the boot script in index.html. */
export function currentTheme(): Theme {
  const v = document.documentElement.getAttribute('data-theme');
  return isTheme(v) ? v : storedTheme() ?? systemTheme();
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

export function setTheme(theme: Theme): void {
  applyTheme(theme);
  storage.set(THEME_KEY, theme);
}

/** Follow the OS setting until the user picks a theme. Returns an unsubscribe. */
export function followSystemTheme(onApply?: (theme: Theme) => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  const onChange = () => {
    if (storedTheme()) return;
    const t = systemTheme();
    applyTheme(t);
    onApply?.(t);
  };
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
