import type { CSSProperties } from 'react';
import styles from './Burst.module.css';

const PIECES = 18;

/**
 * A burst of paper from one point, once: for a case closed and for 3 stars. Decorative, and it takes no
 * clicks. Under reduced motion there is none.
 */
export function Burst({ className }: { className?: string }) {
  return (
    <span className={[styles.burst, className].filter(Boolean).join(' ')} aria-hidden="true" data-burst>
      {Array.from({ length: PIECES }, (_, i) => (
        // Angles go round the circle, and every other piece flies a little shorter so it reads as a cloud.
        <span key={i} className={styles.bit} style={{ '--turn': `${(360 / PIECES) * i}deg`, '--reach': i % 2 ? 0.62 : 1, '--i': i } as CSSProperties} />
      ))}
    </span>
  );
}
