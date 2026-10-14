import { useEffect, useState } from 'react';
import { Contrast } from 'lucide-react';
import { Icon } from './Icon';
import { currentTheme, followSystemTheme, setTheme, type Theme } from '../lib/theme';
import styles from './ThemeToggle.module.css';

export function ThemeToggle() {
  const [theme, setState] = useState<Theme>(currentTheme);

  // Until the user picks, track OS changes and keep the label in sync.
  useEffect(() => followSystemTheme(setState), []);

  const next: Theme = theme === 'light' ? 'dark' : 'light';
  const label = `Switch to ${next} theme`;

  return (
    <button
      type="button"
      className={styles.toggle}
      aria-label={label}
      title={label}
      onClick={() => {
        setTheme(next);
        setState(next);
      }}
    >
      <Icon icon={Contrast} size={18} />
    </button>
  );
}
