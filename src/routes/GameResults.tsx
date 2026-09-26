import { Link, useLocation } from 'react-router-dom';
import { Button } from '../components/Button';
import { formatTime } from '../engine/time';
import styles from './GameResults.module.css';

type Props = {
  title: string;
  line: string;
  score: number;
  found: number;
  total: number;
  secs: number;
  canReplay: boolean;
  onReplay: () => void;
  guest: boolean;
};

export function GameResults({ title, line, score, found, total, secs, canReplay, onReplay, guest }: Props) {
  const { pathname } = useLocation();
  return (
    <section className={styles.results} aria-labelledby="results-title">
      <div className={styles.head}>
        <h2 id="results-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.line}>{line}</p>
      </div>
      <div className={styles.row}>
        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>Score</dt>
            <dd className={styles.statValue}>{score.toLocaleString('en-US')}</dd>
          </div>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>Found</dt>
            <dd className={styles.statValue}>
              {found}/{total}
            </dd>
          </div>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>Time</dt>
            <dd className={styles.statValue}>{formatTime(secs)}</dd>
          </div>
        </dl>
        <div className={styles.actions}>
          {canReplay && (
            <Button variant="secondary" onClick={onReplay}>
              Play again
            </Button>
          )}
          <Button variant="secondary" to="/play">
            More games
          </Button>
          {/* Share (accent) arrives with the share sheet in M7. */}
        </div>
      </div>
      {guest && (
        <div className={styles.guest}>
          <span className={styles.guestText}>
            Playing as a guest. Sign in to keep this score, your streak and your name on shared cards.
          </span>
          <Link className={styles.signin} to={`/signin?next=${encodeURIComponent(pathname)}`}>
            Sign in
          </Link>
        </div>
      )}
    </section>
  );
}
