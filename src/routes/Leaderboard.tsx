import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { dailyGameId, dayNo } from '../engine/daily';
import { formatTime } from '../engine/time';
import { dailyPool, games, getGameDef } from '../games/catalog';
import { dailyDate } from '../games/daily';
import { fetchDailyBoard, fetchDailyRank, fetchFollowingBoard, fetchGameBoard, type BoardRow, type MyRank } from '../lib/api';
import { Segmented } from '../components/Segmented';
import { useAuth } from '../lib/auth';
import { Avatar } from '../components/Avatar';
import styles from './Leaderboard.module.css';

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; rows: BoardRow[]; me: MyRank | null };

function Board({ rows, me, myHandle, empty }: { rows: BoardRow[]; me: MyRank | null; myHandle?: string; empty: ReactNode }) {
  if (rows.length === 0) return <p className={styles.empty}>{empty}</p>;
  const meInTop = !!myHandle && rows.some((r) => r.handle === myHandle);
  const row = (r: BoardRow, mine: boolean) => (
    <li key={`${r.rank}-${r.handle}`} className={styles.row} data-mine={mine || undefined}>
      <span className={styles.rank}>{String(r.rank).padStart(2, '0')}</span>
      <Link to={`/u/${r.handle}`} className={styles.handle}>
        <Avatar handle={r.handle} size={28} />
        @{r.handle}
        {mine && <span className={styles.you}>You</span>}
      </Link>
      <span className={styles.found}>{r.total == null ? `${r.found} found` : `${r.found}/${r.total}`}</span>
      <span className={styles.time}>{formatTime(r.secs)}</span>
      <span className={styles.score}>{r.score.toLocaleString('en-US')}</span>
    </li>
  );
  return (
    <>
      <ol className={styles.board} aria-label="Top scores">
        {rows.map((r) => row(r, r.handle === myHandle))}
      </ol>
      {me && !meInTop && (
        <ol className={styles.board} aria-label="Your place">
          {row(me, true)}
        </ol>
      )}
      {me && (
        <p className={styles.meta}>
          You are #{me.rank} of {me.players}.
        </p>
      )}
    </>
  );
}

function useBoard(key: string, load: () => Promise<{ rows: BoardRow[]; me: MyRank | null }>): Load {
  // Results are tagged with the key they answer, so a new key reads as loading without a reset.
  const [state, setState] = useState<{ key: string; load: Load } | null>(null);
  useEffect(() => {
    let alive = true;
    load()
      .then((r) => alive && setState({ key, load: { status: 'ready', ...r } }))
      .catch(() => alive && setState({ key, load: { status: 'error' } }));
    return () => {
      alive = false;
    };
    // `key` captures every input of `load`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state?.key === key ? state.load : { status: 'loading' };
}

function GuestNote({ next }: { next: string }) {
  const auth = useAuth();
  if (auth.profile || auth.loading) return null;
  return (
    <p className={styles.guest}>
      Guest scores stay on this device and are never ranked.{' '}
      <Link to={`/signin?next=${encodeURIComponent(next)}`} className={styles.inline}>
        Sign in
      </Link>{' '}
      to get on the board.
    </p>
  );
}

/** /leaderboard?day=N. Daily boards, newest first, plus a board for every curated puzzle. */
export function Leaderboard() {
  const auth = useAuth();
  const [params, setParams] = useSearchParams();
  const today = dayNo();
  const asked = Number(params.get('day'));
  const day = Number.isInteger(asked) && asked >= 1 && asked <= today ? asked : today;
  const game = getGameDef(dailyGameId(day, dailyPool));
  const me = auth.profile?.handle;
  const circle = params.get('board') === 'following' && !!me;

  const state = useBoard(`${day}|${me ?? ''}|${circle}`, async () => {
    if (circle) return { rows: await fetchFollowingBoard(day), me: null };
    const [rows, mine] = await Promise.all([fetchDailyBoard(day), me ? fetchDailyRank(day, me) : Promise.resolve(null)]);
    return { rows, me: mine };
  });

  if (!auth.enabled) return <Navigate to="/play" replace />;
  const setQuery = (d: number, following: boolean) => {
    const q: Record<string, string> = {};
    if (d !== today) q.day = String(d);
    if (following) q.board = 'following';
    setParams(q, { replace: true });
  };
  const go = (d: number) => setQuery(d, circle);

  return (
    <div className={styles.page}>
      <div className={styles.topLinks}>
        <Link to="/circles" className={styles.findPlayers}>
          Your circles
        </Link>
        <Link to="/players" className={styles.findPlayers}>
          Find players
        </Link>
      </div>
      <h1 className={styles.title}>
        Leaderboard.
        <br />
        <span className={styles.sub}>Verified only.</span>
      </h1>

      <section className={styles.section} aria-labelledby="daily-title">
        <div className={styles.head}>
          <div className={styles.headText}>
            <span className={styles.kicker}>
              {day === today ? 'Today' : dailyDate(day)} · Daily #{day}
            </span>
            <h2 id="daily-title" className={styles.h2}>
              {game ? (day === today ? `Hidden ${game.noun}` : game.title) : 'Daily'}
            </h2>
          </div>
          <div className={styles.dayNav}>
            <button type="button" className={styles.navBtn} aria-label="Previous day" onClick={() => go(day - 1)} disabled={day <= 1}>
              <Icon icon={ChevronLeft} size={18} />
            </button>
            <button type="button" className={styles.navBtn} aria-label="Next day" onClick={() => go(day + 1)} disabled={day >= today}>
              <Icon icon={ChevronRight} size={18} />
            </button>
          </div>
        </div>

        {me && (
          <div className={styles.switch}>
            <Segmented
              label="Board"
              hideLabel
              options={[
                ['everyone', 'Everyone'],
                ['following', 'Following'],
              ]}
              value={circle ? 'following' : 'everyone'}
              onChange={(v) => setQuery(day, v === 'following')}
            />
          </div>
        )}
        {state.status === 'loading' && <div className={styles.loading} aria-busy="true" />}
        {state.status === 'error' && <p className={styles.empty}>The board did not load. Try again in a moment.</p>}
        {state.status === 'ready' && (
          <Board
            rows={state.rows}
            me={state.me}
            myHandle={me}
            empty={
              circle ? (
                <>
                  Nobody you follow has a verified score here yet.{' '}
                  <Link to="/players" className={styles.inline}>
                    Find players
                  </Link>
                  .
                </>
              ) : day === today ? (
                <>
                  No verified scores yet today.{' '}
                  <Link to={`/d/${today}`} className={styles.inline}>
                    Be the first
                  </Link>
                  .
                </>
              ) : (
                'Nobody was ranked on this day.'
              )
            }
          />
        )}
        {day === today && <p className={styles.meta}>Today's totals stay hidden until midnight.</p>}
        <GuestNote next="/leaderboard" />
      </section>

      <section className={styles.section} aria-labelledby="puzzles-title">
        <h2 id="puzzles-title" className={styles.h2}>
          Puzzle boards
        </h2>
        <ul className={styles.puzzles}>
          {games.map((g) => (
            <li key={g.id}>
              <Link to={`/leaderboard/${g.id}`} className={styles.puzzleLink}>
                <span className={styles.puzzleCat}>{g.category}</span>
                {g.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** /leaderboard/:id. Best verified play per player on one curated puzzle. */
export function GameLeaderboard() {
  const { id = '' } = useParams();
  const auth = useAuth();
  const g = getGameDef(id);
  const state = useBoard(id, async () => ({ rows: await fetchGameBoard(id), me: null }));

  if (!auth.enabled || !g) return <Navigate to="/leaderboard" replace />;

  return (
    <div className={styles.page}>
      <Link to="/leaderboard" className={styles.back}>
        <Icon icon={ChevronLeft} size={16} />
        Leaderboard
      </Link>
      <h1 className={styles.title}>
        {g.title}.
        <br />
        <span className={styles.sub}>Best scores.</span>
      </h1>
      <section className={styles.section} aria-label={`${g.title} board`}>
        {state.status === 'loading' && <div className={styles.loading} aria-busy="true" />}
        {state.status === 'error' && <p className={styles.empty}>The board did not load. Try again in a moment.</p>}
        {state.status === 'ready' && (
          <Board
            rows={state.rows}
            me={null}
            myHandle={auth.profile?.handle}
            empty={<>No verified scores on this puzzle yet.</>}
          />
        )}
        <div>
          <Button to={`/play/${g.id}`}>Play {g.title}</Button>
        </div>
        <GuestNote next={`/leaderboard/${g.id}`} />
      </section>
    </div>
  );
}
