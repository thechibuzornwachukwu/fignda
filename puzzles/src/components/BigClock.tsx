import { formatTime } from '../engine/time';
import { useElapsed } from '../lib/useElapsed';
import styles from './BigClock.module.css';

type Props = { startAt: number; endAt: number | null };

/** Hidden under 760; the mobile bar carries the time there. */
export function BigClock({ startAt, endAt }: Props) {
  const secs = useElapsed(startAt, endAt);
  const done = endAt != null;
  return (
    <div className={styles.clock}>
      <span className={styles.label}>{done ? 'Final time' : 'Time'}</span>
      <span className={styles.digits} data-done={done || undefined} role="timer" aria-live="off">
        {formatTime(secs)}
      </span>
    </div>
  );
}

/** Small inline time for the mobile bar. */
export function Elapsed({ startAt, endAt }: Props) {
  return <>{formatTime(useElapsed(startAt, endAt))}</>;
}
