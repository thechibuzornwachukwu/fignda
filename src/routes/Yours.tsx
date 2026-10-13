import { formatTime } from '../engine/time';
import { loadRecords } from '../lib/records';
import styles from './Yours.module.css';

/** The player's bests. They live in this browser, so only the player sees them. Stored junk was dropped on read. */
export function RecordList() {
  const rec = loadRecords();
  const packs = Object.entries(rec.clean).sort((a, b) => a[1] - b[1]);
  if (packs.length === 0 && rec.daily <= 0 && rec.long == null) {
    return <p className={styles.muted}>Your bests show here once you have some.</p>;
  }
  return (
    <dl className={styles.records}>
      {packs.map(([pack, secs]) => (
        <div key={pack} className={styles.record}>
          <dt className={styles.label}>Fastest clean read, {pack}</dt>
          <dd className={styles.value}>{formatTime(secs)}</dd>
        </div>
      ))}
      {rec.daily > 0 && (
        <div className={styles.record}>
          <dt className={styles.label}>Most found in a daily</dt>
          <dd className={styles.value}>{rec.daily}</dd>
        </div>
      )}
      {rec.long && (
        <div className={styles.record}>
          <dt className={styles.label}>Longest word</dt>
          <dd className={styles.value}>
            {rec.long.word}
            <span className={styles.unit}> {rec.long.len} letters</span>
          </dd>
        </div>
      )}
    </dl>
  );
}
