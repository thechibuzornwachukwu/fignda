import { formatTime } from '../engine/time';
import { BADGES } from '../lib/notifications';
import { loadRecords } from '../lib/records';
import styles from './Yours.module.css';

/** Badges as pills: the earned ones, then the next few to aim for, said as not earned yet. Nothing to show draws nothing. */
export function BadgePills({ codes, next = 0 }: { codes: readonly string[]; next?: number }) {
  const earned = BADGES.filter((b) => codes.includes(b.code));
  const ahead = BADGES.filter((b) => !codes.includes(b.code)).slice(0, Math.max(0, next));
  if (earned.length === 0 && ahead.length === 0) return null;
  return (
    <ul className={styles.badges}>
      {earned.map((b) => (
        <li key={b.code} className={styles.badge}>
          {b.label}
        </li>
      ))}
      {ahead.map((b) => (
        <li key={b.code} className={styles.badge} data-locked title={b.how}>
          {b.label}
          <span className={styles.srOnly}>. Not earned yet. {b.how}</span>
        </li>
      ))}
    </ul>
  );
}

/** The player's bests. They live in this browser, so only the player sees them. Stored junk was dropped on read. */
export function RecordList() {
  const rec = loadRecords();
  const packs = Object.entries(rec.clean).sort((a, b) => a[1] - b[1]);
  if (packs.length === 0 && rec.daily <= 0 && rec.long == null) {
    return <p className={styles.muted}>Read a puzzle clean, finish a daily or find a long word and your best shows here. Records are kept in this browser.</p>;
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
