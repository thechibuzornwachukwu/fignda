import type { ReactNode } from 'react';
import { Button } from './Button';
import { ProgressLine } from './ProgressLine';
import styles from './MobileBar.module.css';

type Props = {
  count: string;
  progress: number;
  time: ReactNode;
  /** Visual only. The page's live region announces it. */
  message: string;
  onHint: () => void;
  onDone: () => void;
};

/** Fixed bottom bar under 760 while playing. */
export function MobileBar({ count, progress, time, message, onHint, onDone }: Props) {
  return (
    <div className={styles.bar} data-mobile-bar="">
      <div className={styles.top}>
        <span className={styles.count}>{count}</span>
        <ProgressLine value={progress} label="Progress" className={styles.progress} />
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
