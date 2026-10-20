import { useEffect, useState } from 'react';
import { pick } from '../copy';
import { openCase } from '../lib/firstCase';
import { Partner } from './Partner';
import { WAIT_LINE_MS } from './useDelayedWaiting';
import styles from './Waiting.module.css';

/**
 * What the case has given so far: the item, and the fact of every step already done. Never a step still to play,
 * so a wait gives nothing away.
 */
function caseFacts(): string[] {
  const open = openCase();
  if (!open) return [];
  const { chapter, solved } = open;
  return [chapter.item.line, ...chapter.steps.slice(0, solved).map((s) => s.fact)];
}

/** A fact while the player waits: about the street, the game, or the case they are on. */
function fact(): string {
  const mine = caseFacts();
  // About 1 time in 3, the case; otherwise the street and the game.
  return mine.length > 0 && Math.random() < 1 / 3 ? mine[Math.floor(Math.random() * mine.length)]! : pick('waiting');
}

/**
 * The one waiting screen: the player's pet thinking it over, 3 dots and one fact. Mount it through
 * `useDelayedWaiting`, so a wait under 1 second never shows it.
 */
export function Waiting({ size = 'full' }: { size?: 'full' | 'inline' }) {
  const [line, setLine] = useState(fact);
  useEffect(() => {
    const t = setInterval(() => setLine(fact()), WAIT_LINE_MS);
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
