import { useEffect, useState } from 'react';
import { pick } from '../copy';
import { Partner } from './Partner';
import { WAIT_LINE_MS } from './useDelayedWaiting';
import styles from './Waiting.module.css';

/**
 * The one waiting screen: the player's pet thinking it over, 3 dots and one line. Mount it through
 * `useDelayedWaiting`, so a wait under 1 second never shows it.
 */
export function Waiting({ size = 'full' }: { size?: 'full' | 'inline' }) {
  const [line, setLine] = useState(() => pick('waiting'));
  useEffect(() => {
    const t = setInterval(() => setLine(pick('waiting')), WAIT_LINE_MS);
    return () => clearInterval(t);
  }, []);
  return (
    <div className={[styles.waiting, styles[size]].filter(Boolean).join(' ')} data-waiting={size}>
      <span className={styles.bob}>
        <Partner moment="loading" size={size === 'full' ? 88 : 40} />
      </span>
      <span className={styles.dots} aria-hidden="true">
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </span>
      <p className={styles.line} role="status">
        {line}
      </p>
    </div>
  );
}
