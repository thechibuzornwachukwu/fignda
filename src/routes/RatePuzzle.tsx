import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPuzzleRating, ratePuzzle, type PuzzleRating } from '../lib/api';
import { useAuth } from '../lib/auth';
import styles from './GameResults.module.css';

/** Under the result of a player-made puzzle: who made it, and one thumb each from signed in players. */
export function RatePuzzle({ code }: { code: string }) {
  const auth = useAuth();
  const [r, setR] = useState<PuzzleRating | null>(null);
  const [mine, setMine] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    fetchPuzzleRating(code).then((x) => {
      if (!alive || !x) return;
      setR(x);
      setMine(x.mine);
    });
    return () => {
      alive = false;
    };
  }, [code]);

  // Puzzles made from a topic have no maker and are not rated.
  if (!r || !r.maker) return null;
  const rate = (up: boolean) => {
    setMine(up);
    void ratePuzzle(code, up);
  };
  return (
    <div className={styles.rate}>
      <span className={styles.guestText}>
        Made by{' '}
        <Link to={`/u/${r.maker}`} className={styles.signin}>
          @{r.maker}
        </Link>
        .{r.own ? ` ${r.ups} liked it.` : auth.profile ? ' Was it a good one?' : ''}
      </span>
      {!r.own && auth.profile && (
        <span className={styles.rateButtons}>
          <button type="button" className={styles.rateButton} aria-pressed={mine === true} onClick={() => rate(true)}>
            Good one
          </button>
          <button type="button" className={styles.rateButton} aria-pressed={mine === false} onClick={() => rate(false)}>
            Not for me
          </button>
        </span>
      )}
    </div>
  );
}
