import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { PartnerNote } from '../components/PartnerNote';
import { SkeletonList } from '../components/Skeleton';
import { chapters } from '../games/chapters';
import { fetchChapterBoard, type CaseRow } from '../lib/api';
import { useAuth } from '../lib/auth';
import { openCase } from '../lib/firstCase';
import styles from './Ranks.module.css';

/**
 * /ranks. The board of the case that is open, or the first one: who has worked it, by the points their steps
 * earned, with steps done and stars. Signed in players only are on it.
 */
export function Ranks() {
  const auth = useAuth();
  const chapter = useMemo(() => openCase()?.chapter ?? chapters[0], []);
  const id = chapter?.id ?? null;
  const [state, setState] = useState<{ id: string; rows: CaseRow[] | 'error' } | null>(null);
  useEffect(() => {
    if (!id || !auth.enabled) return;
    let alive = true;
    fetchChapterBoard(id)
      .then((rows) => alive && setState({ id, rows: Array.isArray(rows) ? rows : [] }))
      .catch(() => alive && setState({ id, rows: 'error' }));
    return () => {
      alive = false;
    };
  }, [id, auth.enabled]);

  // With no accounts there is nobody to rank.
  if (!auth.enabled) return <Navigate to="/cases" replace />;
  if (!chapter) return null;
  const rows = state?.id === id ? state.rows : null;
  const steps = chapter.steps.length;
  const me = auth.profile?.handle;

  return (
    <div className={styles.page}>
      <PageHeader title="Ranks" />
      <section className={styles.section} aria-labelledby="case-title" data-case-ranks={chapter.id}>
        <div className={styles.head}>
          <div className={styles.headText}>
            <span className={styles.kicker}>Case · {steps} steps</span>
            <h2 id="case-title" className={styles.h2}>
              {chapter.title}
            </h2>
          </div>
          <Button to={`/case/${chapter.id}`} variant="secondary" size="sm">
            Open the case
          </Button>
        </div>
        {rows == null && <SkeletonList rows={5} />}
        {rows === 'error' && (
          <PartnerNote moment="error" layout="screen">
            <p>The board did not load. Try again in a moment.</p>
          </PartnerNote>
        )}
        {Array.isArray(rows) && rows.length === 0 && (
          <PartnerNote layout="screen" title="The board is open">
            <p>Nobody is on it yet. Finish a step signed in and you are.</p>
          </PartnerNote>
        )}
        {Array.isArray(rows) && rows.length > 0 && (
          <ol className={styles.board} aria-label="Case board">
            {rows.map((r) => (
              <li key={r.handle} className={styles.row} data-mine={r.handle === me || undefined}>
                <span className={styles.rank}>{String(r.rank).padStart(2, '0')}</span>
                <span className={styles.handle}>
                  @{r.handle}
                  {r.handle === me && <span className={styles.you}>You</span>}
                </span>
                <span className={styles.found}>
                  {Math.min(r.steps, steps)}/{steps}
                </span>
                <span className={styles.time}>{r.stars === 1 ? '1 star' : `${r.stars} stars`}</span>
                <span className={styles.score}>{r.score.toLocaleString('en-US')}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
      {!auth.profile && !auth.loading && (
        <p className={styles.guest}>
          <Link to="/signin?next=%2Franks" className={styles.inline}>
            Sign in
          </Link>{' '}
          to get on the board.
        </p>
      )}
    </div>
  );
}
