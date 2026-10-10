import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { dayNo } from '../engine/daily';
import { formatTime } from '../engine/time';
import { dailyIdFor, getGameDef } from '../games/catalog';
import { dailyDate, dailyLabel } from '../games/daily';
import {
  fetchDailyBoard,
  fetchDailyRank,
  fetchFollowing,
  fetchFollowingBoard,
  fetchGameBoard,
  fetchTogetherBoard,
  type BoardRow,
  type MyRank,
  type TeamRow,
} from '../lib/api';
import { CROWDS, askedCrowd, defaultCrowd, type Crowd } from '../lib/crowd';
import { sizeOf } from '../lib/unlocks';
import { PageHeader } from '../components/PageHeader';
import { SkeletonList } from '../components/Skeleton';
import { Segmented } from '../components/Segmented';
import { useAuth } from '../lib/auth';
import { Avatar } from '../components/Avatar';
import styles from './Leaderboard.module.css';

type Loaded = { rows: BoardRow[]; me: MyRank | null };
type Load = { status: 'loading' } | { status: 'error' } | ({ status: 'ready' } & Loaded);

function Board({ rows, me, myHandle, empty }: { rows: BoardRow[]; me: MyRank | null; myHandle?: string; empty: ReactNode }) {
  if (rows.length === 0) return <p className={styles.empty}>{empty}</p>;
  const meInTop = !!myHandle && rows.some((r) => r.handle === myHandle);
  const row = (r: BoardRow, mine: boolean, apart = false) => (
    <li key={`${r.rank}-${r.handle}`} className={styles.row} data-mine={mine || undefined} data-apart={apart || undefined}>
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
        {/* Your own row is pinned: it holds to the edge of the screen while the board scrolls past. Below the top, it is set apart. */}
        {me && !meInTop && row(me, true, true)}
      </ol>
      {me && Number.isFinite(me.rank) && Number.isFinite(me.players) && (
        <p className={styles.meta}>
          You are #{me.rank} of {me.players}.
        </p>
      )}
    </>
  );
}

/** `load` is null while there is nothing to ask for yet: the board reads as loading. */
function useBoard(key: string, load: (() => Promise<Loaded>) | null): Load {
  // Results are tagged with the key they answer, so a new key reads as loading without a reset.
  const [state, setState] = useState<{ key: string; load: Load } | null>(null);
  const idle = !load;
  useEffect(() => {
    if (!load) return;
    let alive = true;
    load()
      // A reply that is not a list is an empty board, never a crash.
      .then((r) => alive && setState({ key, load: { status: 'ready', ...r, rows: Array.isArray(r.rows) ? r.rows : [] } }))
      .catch(() => alive && setState({ key, load: { status: 'error' } }));
    return () => {
      alive = false;
    };
    // `key` captures every input of `load`, and `idle` whether there is one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, idle]);
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

/** How many people you follow: what decides which board opens. A lookup that fails counts as none. Null until known. */
function useFollowing(handle: string | undefined): number | null {
  const [state, setState] = useState<{ handle: string; following: number } | null>(null);
  useEffect(() => {
    if (!handle) return;
    let alive = true;
    fetchFollowing(handle)
      .catch(() => [])
      .then((f) => alive && setState({ handle, following: sizeOf(f) }));
    return () => {
      alive = false;
    };
  }, [handle]);
  return handle && state?.handle === handle ? state.following : null;
}

const CROWD_LABEL: Record<Crowd, string> = { following: 'Following', everyone: 'Everyone' };

/** /leaderboard?day=N&board=following|everyone. Where you stand today: one board at a time, your own row pinned in view. Circles are on Squad. */
export function Leaderboard() {
  const auth = useAuth();
  const [params, setParams] = useSearchParams();
  const today = dayNo();
  const wanted = Number(params.get('day'));
  const day = Number.isInteger(wanted) && wanted >= 1 && wanted <= today ? wanted : today;
  const game = getGameDef(dailyIdFor(day));
  const me = auth.profile?.handle;
  const following = useFollowing(me);
  // An old link to the circle board names no board here: it opens on your crowd.
  const asked = askedCrowd(params.get('board'));
  // Guests have no crowd. Signed in, the address wins; otherwise wait to know who your crowd is.
  const crowd: Crowd | null = !me ? 'everyone' : (asked ?? (following != null ? defaultCrowd(following) : null));

  const state = useBoard(
    `${day}|${me ?? ''}|${crowd ?? ''}`,
    !crowd
      ? null
      : async () => {
          // Your own row comes with either board, so it can be pinned when you are below the top.
          const rank = me ? fetchDailyRank(day, me).catch(() => null) : Promise.resolve(null);
          if (crowd === 'following') return { rows: await fetchFollowingBoard(day), me: null };
          const [rows, mine] = await Promise.all([fetchDailyBoard(day), rank]);
          return { rows, me: mine };
        },
  );

  if (!auth.enabled) return <Navigate to="/play" replace />;
  const setQuery = (d: number, board: Crowd | null) => {
    const q: Record<string, string> = {};
    if (d !== today) q.day = String(d);
    if (board) q.board = board;
    setParams(q, { replace: true });
  };
  const go = (d: number) => setQuery(d, asked);
  const options = CROWDS.map((c) => [c, CROWD_LABEL[c]] as const);

  return (
    <div className={styles.page}>
      <PageHeader title="Ranks" />

      <section className={styles.section} aria-labelledby="daily-title">
        <div className={styles.head}>
          <div className={styles.headText}>
            <span className={styles.kicker}>
              {day === today ? 'Today' : dailyDate(day)} · {dailyLabel(day)} #{day}
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

        {me && crowd && (
          <div className={styles.switch}>
            <Segmented label="Board" hideLabel options={options} value={crowd} onChange={(v) => setQuery(day, v)} />
          </div>
        )}
        {state.status === 'loading' && <SkeletonList rows={8} avatar={28} />}
        {state.status === 'error' && <p className={styles.empty}>The board did not load. Try again in a moment.</p>}
        {state.status === 'ready' && (
          <Board
            rows={state.rows}
            me={state.me}
            myHandle={me}
            empty={
              crowd === 'following' ? (
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
        {day === today ? (
          <p className={styles.meta}>Today's totals stay hidden until midnight.</p>
        ) : (
          <p className={styles.meta}>
            <Link to={`/d/${day}/answers`} className={styles.inline}>
              See that day's answers
            </Link>
          </p>
        )}
        <GuestNote next="/leaderboard" />
      </section>
    </div>
  );
}

function TeamBoard({ rows, myHandle }: { rows: TeamRow[]; myHandle?: string }) {
  if (rows.length === 0) {
    return <p className={styles.empty}>No teams on this puzzle yet. Open it, choose Play together and send the invite.</p>;
  }
  return (
    <ol className={styles.board} aria-label="Top teams">
      {rows.map((t) => (
        <li key={t.rank} className={styles.team} data-mine={t.players.some((p) => p.handle === myHandle) || undefined}>
          <span className={styles.rank}>{String(t.rank).padStart(2, '0')}</span>
          <ul className={styles.members} aria-label="Team">
            {t.players.map((p) => (
              <li key={p.handle} className={styles.member}>
                <Link to={`/u/${p.handle}`} className={styles.handle}>
                  <Avatar handle={p.handle} size={28} />
                  @{p.handle}
                </Link>
                <span className={styles.found}>{p.finds === 1 ? '1 word' : `${p.finds} words`}</span>
              </li>
            ))}
          </ul>
          <span className={styles.time}>{formatTime(t.secs)}</span>
          <span className={styles.score}>
            {t.words}/{t.total}
          </span>
        </li>
      ))}
    </ol>
  );
}

type GameLoad = { status: 'loading' } | { status: 'error' } | { status: 'solo'; rows: BoardRow[] } | { status: 'together'; rows: TeamRow[] };

/** /leaderboard/:id. Best verified play per player on one curated puzzle, or its teams with ?board=together. */
export function GameLeaderboard() {
  const { id = '' } = useParams();
  const auth = useAuth();
  const [params, setParams] = useSearchParams();
  const together = params.get('board') === 'together';
  const g = getGameDef(id);
  const key = `${id}|${together}`;
  const [loaded, setLoaded] = useState<{ key: string; load: GameLoad } | null>(null);
  useEffect(() => {
    let alive = true;
    const load: Promise<GameLoad> = together
      ? fetchTogetherBoard(id).then((rows) => ({ status: 'together', rows }))
      : fetchGameBoard(id).then((rows) => ({ status: 'solo', rows }));
    load.then((l) => alive && setLoaded({ key, load: l })).catch(() => alive && setLoaded({ key, load: { status: 'error' } }));
    return () => {
      alive = false;
    };
  }, [id, together, key]);
  const state: GameLoad = loaded?.key === key ? loaded.load : { status: 'loading' };

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
        <span className={styles.sub}>{together ? 'Best teams.' : 'Best scores.'}</span>
      </h1>
      <section className={styles.section} aria-label={`${g.title} board`}>
        <div className={styles.switch}>
          <Segmented
            label="Board"
            hideLabel
            options={[
              ['solo', 'Solo'],
              ['together', 'Together'],
            ]}
            value={together ? 'together' : 'solo'}
            onChange={(v) => setParams(v === 'together' ? { board: 'together' } : {}, { replace: true })}
          />
        </div>
        {state.status === 'loading' && <SkeletonList rows={8} avatar={28} />}
        {state.status === 'error' && <p className={styles.empty}>The board did not load. Try again in a moment.</p>}
        {state.status === 'solo' && (
          <Board rows={state.rows} me={null} myHandle={auth.profile?.handle} empty={<>No verified scores on this puzzle yet.</>} />
        )}
        {state.status === 'together' && <TeamBoard rows={state.rows} myHandle={auth.profile?.handle} />}
        {together && (
          <p className={styles.meta}>
            Most words found together, then the faster team. Each player's count is the words they found first. Guests are not ranked.
          </p>
        )}
        <div>
          <Button to={`/play/${g.id}`}>Play {g.title}</Button>
        </div>
        <GuestNote next={`/leaderboard/${g.id}`} />
      </section>
    </div>
  );
}
