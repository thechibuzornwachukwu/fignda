import type { ReactNode } from 'react';
import { Button } from './Button';
import { Ring } from './Ring';
import styles from './MobileBar.module.css';

type Props = {
  count: string;
  /** 0 to 1. `null` hides the ring: a daily keeps its count hidden until the last few. */
  progress: number | null;
  /** "3 left", when the daily is nearly done. */
  left?: string;
  time: ReactNode;
  /** Visual only. The page's live region announces it. */
  message: string;
  onHint: () => void;
  onDone: () => void;
};

/** Fixed bottom bar under 760 while playing. */
export function MobileBar({ count, progress, left, time, message, onHint, onDone }: Props) {
  return (
    <div className={styles.bar} data-mobile-bar="">
      <div className={styles.top}>
        {progress != null && <Ring value={progress} label="Progress" />}
        <span className={styles.count}>{count}</span>
        {left && <span className={styles.left}>{left}</span>}
        <span className={styles.time}>{time}</span>
      </div>
      <div className={styles.bottom}>
        <span className={styles.msg} aria-hidden="true">
          {message}
        </span>
        <Button variant="secondary" size="touch" onClick={onHint}>
          Hint
        </Button>
        <Button variant="primary" size="touch" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}
